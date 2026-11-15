import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {r27Compare,r27Frame,r27Schedule,validateR27Bundle,
 validateR27Decision,emptyR27Bundle,R27_WINDOW} from './r27-asof-frequency.mjs';
import {researchR27WithOpenAI} from './r27-historical-ai.mjs';
import {buildR27Capture,appendR27Capture} from '../../runner/r27-prospective-capture.mjs';
import {collectR27MarketRegime} from '../../runner/r27-market-regime.mjs';

const h=s=>createHash('sha256').update(s).digest('hex');
const base='2026-10-30T00:00:00Z',candidate='eth:0x'+'a'.repeat(40);
const origin='https://example.org/public-report';
function archived({id='news-1',kind='NEWS',candidate_id=null,
  event='2026-10-30T00:01:00Z',captured='2026-10-30T00:05:00Z',
  original='source original',data={headline:'Unverified public article'}}={}){
 const digits=captured.replace(/[-:T.Z]/g,'').slice(0,14);
 return {id,kind,candidate_id,event_at_utc:event,available_at_utc:captured,data,
  proof:{method:'CONTEMPORANEOUS_ARCHIVE',verified:true,original,sha256:h(original),
   captured_at_utc:captured,archive_url:'https://web.archive.org/web/'+digits+'/'+origin}};
}
function chain({id='pool',kind='POOL',candidate_id=candidate,
  time='2026-10-30T00:04:00Z'}={}){
 return {id,kind,candidate_id,event_at_utc:time,available_at_utc:time,
  data:{chain:'eth',address:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40)},
  proof:{method:'ONCHAIN_LEDGER',verified:true,block_hash:'0x'+'a'.repeat(64),
   block_number:23000000,block_time_utc:time,
   source_url:'https://etherscan.io/block/23000000'}};
}
function attest(category,end='2026-10-30T06:00:00Z'){
 return {category,start_utc:base,end_exclusive_utc:end,source_count:1,
  complete:true,independently_audited:true,attested_at_utc:'2026-10-29T23:59:00Z',
  attestation_ref:'https://archive.example.org/cover-proof'};
}
test('R27 counts 615 and never reports fake gains when all historical sources absent',async()=>{
 const r=await r27Compare(emptyR27Bundle(),{model:()=>{throw Error('should not be called')}});
 assert.equal(r.summary.total_scheduled_analyses,615);
 assert.equal(r.summary.total_historical_model_calls,0);
 assert.equal(r.summary.total_historical_fills,0);
 assert.equal(r.summary.frequency_winner,null);
 assert.deepEqual(r.runs.map(x=>x.scheduled_analyses),[15,60,180,360]);
 assert.deepEqual(r.runs.map(x=>x.data_gap_analyses),[15,60,180,360]);
 assert(r.runs.every(x=>x.net_pnl_test_usdc===null&&x.ending_test_usdc===null));
});
test('R27 archive must predate the cutoff; forged hashes and late captures are rejected',()=>{
 const bad=archived({id:'future',captured:'2026-11-15T00:05:00Z'});
 const tampered=archived({id:'tampered'});tampered.proof.sha256='0'.repeat(64);
 const accepted=archived();
 const b=emptyR27Bundle();b.records=[bad,tampered,accepted,chain()];
 const inspection=validateR27Bundle(b);
 assert.equal(inspection.records.length,2);
 assert.equal(inspection.rejected.length,2);
 const at=r27Frame(inspection,'2026-10-30T00:03:00Z');
 assert.equal(at.frame.evidence.length,0);
 const later=r27Frame(inspection,'2026-10-30T00:06:00Z');
 assert.equal(later.frame.evidence.length,2);
 assert(!JSON.stringify(later.frame).includes('future'));
 assert(!JSON.stringify(later.frame).includes('tampered'));
});
test('R27 source attestation is separate from per-article publication and price history',async()=>{
 const b=emptyR27Bundle();
 b.records=[archived(),chain()];
 b.coverage=['POOL_UNIVERSE','NEWS_SOCIAL','ONCHAIN_MARKET'].map(x=>attest(x));
 let called=0;
 const report=await r27Compare(b,{model:async frame=>{
  called++;
  assert(frame.evidence.every(x=>Date.parse(x.available_at_utc)<=Date.parse(frame.at_utc)));
  assert(!JSON.stringify(frame).includes('2026-11-15T'));
  return {summary:'Coverage-limited research hypothesis only',
   decisions:[{candidate_id:candidate,action:'WATCH',score:50,
    evidence_ids:['pool'],reason:'No security or exit evidence'}]};
 }});
 assert(called>0);
 assert.equal(report.summary.total_historical_model_calls,called);
 assert.equal(report.summary.total_historical_fills,0);
 assert(report.runs.every(x=>x.net_pnl_test_usdc===null));
 assert(report.runs.some(x=>x.research_eligible_analyses>0));
 const view=r27Frame(validateR27Bundle(b),'2026-10-30T00:00:00Z');
 assert.equal(view.researchReady,true);
 assert.equal(view.executionReady,false);
 assert.throws(()=>validateR27Decision(view,{summary:'',decisions:[{
  candidate_id:'eth:unknown',action:'BUY',score:99,
  evidence_ids:[],reason:'No proof'}]}),/R27_INVALID_DECISION_EVIDENCE/);
});
test('R27 venue coverage cannot be self-certified with a late public news article',()=>{
 const b=emptyR27Bundle();
 b.coverage=[{...attest('POOL_UNIVERSE'),attested_at_utc:'2026-11-15T00:00:00Z'},
  {...attest('NEWS_SOCIAL'),independently_audited:false}];
 const x=validateR27Bundle(b);
 assert.equal(x.coverage.length,0);
 assert.equal(x.invalidCoverage.length,2);
});
test('R27 historical model has NO web/tool calls and cannot touch wallets',async()=>{
 const frame={schema:'r27_ai_frame.v1',at_utc:base,candidate_ids:[candidate],
  evidence:[{id:'pool',kind:'POOL',candidate_id:candidate}],
  coverage_categories:['POOL_UNIVERSE'],available_source_ids:['pool'],
  mode:'RESEARCH_ONLY_NO_ORDERS'};
 let input=null;
 const fake=async(_url,args)=>{
  input=JSON.parse(args.body);
  return {ok:true,json:async()=>({status:'completed',output:[{type:'message',
   content:[{type:'output_text',text:JSON.stringify({summary:'Watch only',
    decisions:[{candidate_id:candidate,action:'WATCH',score:42,
     evidence_ids:['pool'],reason:'insufficient security proof'}]})}]}]})};
 };
 const result=await researchR27WithOpenAI(frame,{fetcher:fake,
  apiKey:'sk-test-only-not-real-key-123'});
 assert.equal(result.decisions[0].action,'WATCH');
 assert.deepEqual(input.tools,[]);
 assert.equal(input.store,false);
 assert(!JSON.stringify(input).includes('walletPassword'));
});
test('R27 capture is write-once, public-only and stores provider timestamps as claims',async()=>{
 const folder=mkdtempSync(path.join(os.tmpdir(),'r27-captures-'));
 const captured='2026-11-15T06:05:00Z';
 const snap={schema:'research_market_snapshot.v1',paper_only:true,
  actionable:false,collection_status:'OBSERVED_OR_PARTIAL',coverage:[],
  candidates:[{chain:'eth',token_address:'0x'+'a'.repeat(40),pool_address:'0x'+'b'.repeat(40),
   candidate_id:'eth:0x'+'b'.repeat(40),
   pool_created_at_utc:'2026-11-14T01:00:00Z',
   observed_at_utc:captured,source:'GECKOTERMINAL_NEW_POOLS',
   price_usd:.5,liquidity_usd:45000,volume_m5_usd:2200,
   source_urls:['https://api.geckoterminal.com/api/v2']}]};
 const news={coverage:[],leads:[]};
 try{
  const proof=buildR27Capture(snap,news,{now:captured});
  assert.equal(proof.independent_external_asof_attestation,false);
  assert.equal(proof.public_pool_observations[0].first_local_observed_at_utc,captured);
  assert.equal(proof.public_pool_observations[0].advertised_pool_created_at_utc,'2026-11-14T01:00:00Z');
  const a=await appendR27Capture(snap,news,{folder,now:captured});
  const b=await appendR27Capture(snap,news,{folder,now:captured});
  assert.equal(a.created,true);
  assert.equal(b.created,false);
  const file=readFileSync(a.filename,'utf8');
  assert(!file.includes('private_key'));
  assert.equal(JSON.parse(file).sha256_payload,proof.sha256_payload);
 }finally{rmSync(folder,{recursive:true,force:true})}
});
test('R27 broad market circuit breaker blocks under source outage and observed crash',async()=>{
 const unknown=await collectR27MarketRegime({fetcher:async()=>{throw Error('offline')}});
 assert.equal(unknown.buys_allowed,false);
 const now=Date.parse('2026-11-15T12:30:00Z');
 const bars=Array.from({length:72},(_,i)=>{
  const t=now-(72-i)*3600000;
  return [t,'100','102','95','100','0',t+3599999];
 });
 const response=async url=>({ok:true,json:async()=>{
  if(url.includes('ETHUSDT')){
   return bars.map((r,i)=>[...r.slice(0,4),(i<60?'100':'89'),'0',r[6]]);
  }
  return bars;
 }});
 const risk=await collectR27MarketRegime({fetcher:response,now});
 assert.equal(risk.status,'RISK_OFF');
 assert.equal(risk.buys_allowed,false);
});
