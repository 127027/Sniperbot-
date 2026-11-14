import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {dayTicks,hourTicks,PEPE_WINDOW,compileAsOfCorpus,inspectAsOfFrame} from './asof-feed.mjs';
import {validateDataset,initialPortfolio,frame,blindReadiness} from './engine.mjs';
import {initialize,runPath} from './controller.mjs';
import fs from 'node:fs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const window={start:'2023-03-14T00:00:00Z',end:'2023-03-16T23:59:59Z'};
function corpus(sources=[],overrides={}){
 return {schema:'asof_corpus.v1',window,
  universe:{selection:'ASOF_COHORT',provenance:'neutral chain creation events',selection_policy:'all pool creates in bounded chain and interval'},sources,...overrides};
}
const fixed=(id,kind,at,payload={},proofOverride={})=>{
 const raw='asof-original-'+id;
 return {
  id,kind,candidate_id:id.startsWith('b')?'chain:tokenB:poolB':'chain:tokenA:poolA',
  event_at:at,
  payload,
  proof:{
   method:'ONCHAIN_LEDGER',original:raw,sha256:sha(raw),
   verified:true,ref:'chain-log-'+id,block_time:at,
   historical_ledger_verified:true,
   ...proofOverride
  }
 };
};
const p=(id,at)=>fixed(id,'POOL',at,{chain:'ethereum',token:'0xaaa',pool:'0xbbb'});
function social(id,posted,captured){
 const original='date-bound original post '+id;
 return {id,kind:'SOCIAL',candidate_id:'chain:tokenA:poolA',event_at:posted,
  payload:{body:original,authors:1,interactions:3,post_ath:99999,hidden_winner:'AFTER'},
  proof:{method:'CONTEMPORANEOUS_ARCHIVE',original,sha256:sha(original),verified:true,
   ref:'historical-archive-raw-source-'+id,published_at:posted,captured_at:captured}
 };
}
test('exact 62 UTC calendar days and hourly granularity for PEPE window',()=>{
 const daily=dayTicks(PEPE_WINDOW),hourly=hourTicks(PEPE_WINDOW);
 assert.equal(daily.length,62);assert.equal(hourly.length,1488);
 assert.equal(daily[0],'2023-03-14T23:59:59Z');
 assert.equal(daily[61],'2023-05-14T23:59:59Z');
 assert.equal(hourly[0],'2023-03-14T00:59:59Z');
});
test('historical window excludes every source before and after it',()=>{
 const {dataset,audit}=compileAsOfCorpus(corpus([
  p('a-before','2023-03-13T23:59:59Z'),
  p('a-inside','2023-03-14T14:00:00Z'),
  p('a-after','2023-03-17T00:00:00Z')
 ]));
 assert.deepEqual(dataset.events.map(x=>x.id),['a-inside']);
 assert.deepEqual(audit.excluded.map(x=>x.reason),['BEFORE_WINDOW','AFTER_WINDOW']);
 assert.equal(dataset.ticks.length,3);
 assert.equal(dataset.window.start,window.start);
});
test('future post must not leak to an earlier day, even if publication date looks older',()=>{
 const {dataset}=compileAsOfCorpus(corpus([
  social('a-social','2023-03-14T07:00:00Z','2023-03-16T12:00:00Z')
 ]));
 assert.equal(inspectAsOfFrame(dataset,0).events.length,0);
 assert.equal(inspectAsOfFrame(dataset,1).events.length,0);
 assert.equal(inspectAsOfFrame(dataset,2).events.length,1);
 assert.equal(inspectAsOfFrame(dataset,2).events[0].available_at,'2023-03-16T12:00:00.000Z');
});
test('retrospective archive capture from outside test interval cannot be a 2023 signal',()=>{
 const {dataset,audit}=compileAsOfCorpus(corpus([
  social('a-retrospective','2023-03-14T07:00:00Z','2026-11-13T18:00:00Z')
 ]));
 assert.equal(dataset.events.length,0);
 assert.equal(audit.excluded[0].reason,'NOT_EVIDENCED_WITHIN_WINDOW');
});
test('source hash tampering and invalid provenance fail closed',()=>{
 const b=p('a-pool','2023-03-14T07:00:00Z');
 b.proof.original='later edited document';
 assert.throws(()=>compileAsOfCorpus(corpus([b])),/RAW_HASH_MISMATCH/);
 const c=p('a-chain','2023-03-14T09:00:00Z');
 c.proof.block_time='2023-03-15T09:00:00Z';
 const x=compileAsOfCorpus(corpus([c]));
 assert.equal(x.audit.excluded[0].reason,'UNVERIFIED_OR_MISMATCHED_CHAIN_TIME');
});
test('social timestamp without independently captured original is rejected',()=>{
 const b=social('a-social','2023-03-14T06:00:00Z','2023-03-15T09:00:00Z');
 delete b.proof.captured_at;
 const {audit,dataset}=compileAsOfCorpus(corpus([b]));
 assert.equal(audit.excluded[0].reason,'UNPROVEN_PUBLICATION_OR_CAPTURE');
 assert.equal(dataset.events.length,0);
});
test('market quotes cannot become executable from weak historic provider evidence',()=>{
 const b=fixed('a-market','MARKET','2023-03-15T09:00:00Z',{
  reserve_token:1000,reserve_quote:1000,fee_bps:30,gas_quote:1,
  quote_asset:'TEST_USDC',execution_verified:true
 });
 const x=compileAsOfCorpus(corpus([b]));
 assert.equal(x.dataset.events.length,0);
 assert.equal(x.audit.excluded[0].reason,'MARKET_NOT_EXECUTABLE_ASOF');
 b.proof.historical_pool_state_verified=true;
 b.proof.historical_execution_quote_verified=true;
 const y=compileAsOfCorpus(corpus([b]));
 assert.equal(y.dataset.events.length,1);
 assert.equal(y.dataset.events[0].execution_verified,true);
 assert.equal(inspectAsOfFrame(y.dataset,0).events.length,0);
 assert.equal(inspectAsOfFrame(y.dataset,1).events.length,1);
});
test('security flags are never accepted without historic block-state verification',()=>{
 const b=fixed('a-security','SECURITY','2023-03-15T09:00:00Z',{
  scope:'BLOCK_STATE',buy_allowed:true,sell_allowed:true
 });
 const x=compileAsOfCorpus(corpus([b]));
 assert.equal(x.dataset.events.length,0);
 assert.equal(x.audit.excluded[0].reason,'HISTORICAL_SECURITY_NOT_VERIFIED');
 b.proof.historical_block_state_verified=true;
 const y=compileAsOfCorpus(corpus([b]));
 assert.equal(y.dataset.events.length,1);
});
test('known-winner, ATH and outcome metadata never reach a role',()=>{
 const b=social('a-post','2023-03-14T06:00:00Z','2023-03-14T07:00:00Z');
 b.outcome='WINNER';b.future_ath=1234;
 const c=corpus([b],{known_winner:'PEPE',later_ath:100000,labels:{a:'WINNER'}});
 const {dataset,audit}=compileAsOfCorpus(c);
 const agentFrame=inspectAsOfFrame(dataset,0);
 const serialized=JSON.stringify(agentFrame);
 assert.ok(serialized.includes('date-bound original post'));
 assert.ok(!serialized.includes('PEPE')&&!serialized.includes('future_ath')&&!serialized.includes('post_ath')&&!serialized.includes('hidden_winner')&&!serialized.includes('historical-archive-raw-source'));
 assert.ok(audit.privateSources[0].proof_ref.includes('historical-archive-raw-source'));
});
test('source selection and fresh agent contexts cannot be certified by compilation',()=>{
 const a=p('a-pool','2023-03-14T09:00:00Z');
 const b=p('b-pool','2023-03-15T09:00:00Z');
 const {dataset,audit}=compileAsOfCorpus(corpus([a,b]));
 assert.equal(new Set(dataset.events.map(x=>x.candidate_id)).size,2);
 assert.equal(audit.blind_readiness.eligible,false);
 assert.equal(dataset.universe.complete,false);
 assert.ok(audit.blind_readiness.reasons.includes('NO_DOCUMENTED_ASOF_COHORT'));
 assert.ok(audit.blind_readiness.reasons.includes('CONTEXT_NOT_ISOLATED:scout'));
 assert.throws(()=>initialize('must-not-create-blind-'+process.pid,dataset),/BLIND_TEST_BLOCKED/);
});
test('core rejects future ticks and manual injection of sources outside window',()=>{
 const {dataset}=compileAsOfCorpus(corpus([p('a-one','2023-03-14T08:00:00Z')]));
 const early=structuredClone(dataset);early.ticks.unshift('2023-03-13T23:59:59Z');
 assert.throws(()=>validateDataset(early),/TICK_OUTSIDE_TIME_WINDOW/);
 const late=structuredClone(dataset);
 late.events[0].available_at='2023-03-17T00:00:00Z';
 assert.throws(()=>validateDataset(late),/SOURCE_OUTSIDE_TIME_WINDOW/);
 assert.throws(()=>frame(dataset,999,initialPortfolio()),/FRAME_INDEX/);
});
test('duplicate source IDs cannot silently overwrite an earlier original',()=>{
 const b=p('a-dup','2023-03-14T08:00:00Z');
 assert.throws(()=>compileAsOfCorpus(corpus([b,b])),/DUPLICATE_SOURCE_ID/);
});
