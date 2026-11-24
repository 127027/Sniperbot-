import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateRetrospectiveEntry,evaluateRetrospectiveExit} from '../src/r29-retrospective-execution.mjs';
import {comparisonMarketInputHash} from '../src/r29-hourly-interval-session.mjs';
import {comparisonDigest as hash,openSealedComparison,sealedInputs,commitSealedHour,dispatchSealedObservation,closeSealedHour,sealCheckpoint,resumeSealedComparison,sealedSummary} from '../src/r29-sealed-comparison.mjs';
const tickUtc='2026-10-12T00:00:00.000Z',mint='fixture-mint',pool='fixture-pool';
const p={virtual_sol:'33000000000',virtual_token:'960000000000000',real_sol:'3000000000',real_token:'680000000000000'};
const earlier={receipt_id:1,slot:1,mint,pool,signature:'sell',block_time_utc:'2026-10-11T23:55:00Z',source_sha256:'a'.repeat(64),post:{...p,virtual_sol:'30000000000',virtual_token:'1000000000000000'},side:'SELL',event_flow_verified:true};
const later={receipt_id:2,slot:2,mint,pool,signature:'buy',block_time_utc:'2026-10-11T23:58:00Z',source_sha256:'b'.repeat(64),post:p,side:'BUY',event_flow_verified:true};
const pair={mint,pool,earlier:1,later:2,source_time:later.block_time_utc,source_signature:'buy',source_sha256:later.source_sha256,asof_event_state:p,fee_observation:{protocol_bps:'95',creator_bps:'30'}};
const fx={pair:'SOL-USDC',modeled_available_at_utc:'2026-10-11T23:59:00Z',close_usdc_per_sol:111,high_micro_usdc_per_sol:'111000000',low_micro_usdc_per_sol:'111000000',source_sha256:'c'.repeat(64)};
const rows=[{mint,signature:'init',block_time_utc:'2026-10-11T23:53:00Z',controls:[{type:'initializeMint2',info:{mint,decimals:6,mintAuthority:'auth'}},{type:'setAuthority',info:{mint,authority:'auth',authorityType:'mintTokens',newAuthority:null}}],unknown:[]},... [earlier,later].map(s=>({mint,signature:s.signature,block_time_utc:s.block_time_utc,controls:[],unknown:[]}))];
const input={pair,states:[earlier,later],fx,tickUtc,riskInput:{rows,expectedSignatures:['init','sell','buy'],archiveExhausted:true}};

const H=3600000,roles=['TEMPO','DISCOVERY','RISK','STRATEGY','QA'],tick=i=>new Date(Date.parse(tickUtc)+i*H).toISOString(),h='a'.repeat(64);
const entry={...input,strategyPolicy:'GPT_RESEARCH_V1'};
const buyState={...later,signature:'later-buy',block_time_utc:'2026-10-12T00:01:00Z',fees:pair.fee_observation};
const buyFill={mint,tickUtc:'2026-10-12T00:03:00.000Z',observations:[earlier,later,buyState],fx,riskInput:{rows:[...rows,{mint,signature:buyState.signature,block_time_utc:buyState.block_time_utc,controls:[],unknown:[]}],expectedSignatures:['init','sell','buy','later-buy'],archiveExhausted:true}};
const sellState={...later,block_time_utc:'2026-10-12T01:58:00Z',post:{...p,virtual_sol:'50000000000',virtual_token:'700000000000000',real_sol:'20000000000'},fees:pair.fee_observation};
const fx2={...fx,modeled_available_at_utc:'2026-10-12T01:59:00Z'};
const exit={mint,state:sellState,fx:fx2,tickUtc:tick(2),strategyPolicy:'GPT_RESEARCH_V1'};
const sellFill={mint,tickUtc:'2026-10-12T02:03:00.000Z',observations:[{...sellState,signature:'later-sell',block_time_utc:'2026-10-12T02:01:00Z'}],fx:fx2};
function prep(i){const c={mint,status:i===0?'MODEL_INPUT_VERIFIED':'REJECTED_WITH_EVIDENCE',reason:'synthetic fixture',knowledge_at_utc:'2026-10-11T23:58:00Z',evidence_sha256:h,...(i===0?{entry_market_sha256:comparisonMarketInputHash(entry)}:i===2?{exit_market_sha256:comparisonMarketInputHash(exit)}:{})};return {tickUtc:tick(i),requiredSources:['fixture'],coverage:[{source:'fixture',status:'VERIFIED_DECLARED_SCOPE_COMPLETE',evidence_sha256:h,knowledge_at_utc:c.knowledge_at_utc}],candidates:[c],screenedCount:1,preparedBeforeDecision:true,sourceScope:'fixture'};}
const frames=Array.from({length:24},(_,i)=>({index:i+1,tick_utc:tick(i),preparation_sha256:hash(prep(i)),coverage_sha256:h,coverage_status:'DECLARED_SCOPE_VERIFIED',observations:(i===0?[buyFill]:i===2?[sellFill]:[]).map(x=>({mint:x.mint,tick_utc:x.tickUtc,input_sha256:hash(x)}))}));
const manifest={kind:'R29_SEALED_COMPARISON_MARKET_V1',scope:'SYNTHETIC_FIXTURE',start_utc:tickUtc,policy_sha256:h,frames};
const open=()=>openSealedComparison({comparisonId:'sealed',manifest,expectedManifestSha256:hash(manifest),preparation:prep(0)}).state;
function reviews(s,i,actions=['BUY','BUY']){
 const p=prep(i),inputs=sealedInputs(s,p),out={};
 for(const [j,arm] of ['SINGLE_GPT','FIVE_DOTS'].entries()){
  const action=actions[j],d={mint,action,reason:'synthetic '+arm};
  const review={mint,pool,tick_utc:tick(i),action,reason:d.reason,counterargument:'fixture downside',invalidation:'fixture thesis failed',review_id:arm+tick(i)};
  if(action==='BUY')d.entryInput={...entry,gptReview:{...review,input_sha256:evaluateRetrospectiveEntry(entry).input_sha256}};
  if(action==='SELL')d.exitInput={...exit,gptReview:{...review,input_sha256:evaluateRetrospectiveExit({...exit,position:s.comparison.arms[arm].ledger.positions[mint]}).input_sha256}};
  const ds=[d],base={arm,session_id:s.comparison.arms[arm].session_id,input_sha256:inputs[arm].input_sha256,tick_utc:tick(i),analysis:'synthetic test',decisions_sha256:hash(ds)};
  out[arm]={arm,input_sha256:base.input_sha256,decisions:ds,...(j===0?{singleReview:{...base,review_id:review.review_id,journal_sha256:hash([arm,i]),scope:roles}}:{roleReviews:roles.map(role=>({...base,role,review_id:role+i,journal_sha256:hash([role,i]),dependency_sha256s:({TEMPO:[],DISCOVERY:[],RISK:['DISCOVERY'],STRATEGY:roles.slice(0,3),QA:roles.slice(0,4)})[role].map(r=>hash([r,i]))}))})};
 }
 return out;
}
function commit(s,i,actions){return commitSealedHour(s,{preparation:prep(i),reviews:reviews(s,i,actions)});}
const close=s=>closeSealedHour(s,{reason:'fixture'});
test('both arms BUY HOLD SELL using identical sealed evidence but separate GPT reviews and ledgers',()=>{
 let s=commit(open(),0);assert.equal(s.comparison.arms.SINGLE_GPT.ledger.cash_micro,'5000000000');
 assert.throws(()=>close(s),/OBSERVATIONS_NOT_DISPATCHED/);
 let r=dispatchSealedObservation(s,buyFill);s=r.state;assert.equal(r.events.SINGLE_GPT.execution,'RETROSPECTIVE_MODEL_FILL');assert.equal(r.events.FIVE_DOTS.execution,'RETROSPECTIVE_MODEL_FILL');
 assert.throws(()=>dispatchSealedObservation(s,buyFill),/OBSERVATION_MISMATCH/);
 const cp=sealCheckpoint(s);s=resumeSealedComparison(JSON.parse(JSON.stringify(cp)),cp.sha256);assert.equal(s.observation_index,1);s=close(s);
 s=close(commit(s,1,['HOLD','HOLD']));s=commit(s,2,['SELL','SELL']);r=dispatchSealedObservation(s,sellFill);s=close(r.state);
 for(const arm of ['SINGLE_GPT','FIVE_DOTS']){const l=s.comparison.arms[arm].ledger;assert.deepEqual(l.positions,{});assert.ok(BigInt(l.realized_pnl_micro)>0n);assert.equal(l.orders,0);}
 assert.equal(s.comparison.arms.SINGLE_GPT.ledger.cash_micro,s.comparison.arms.FIVE_DOTS.ledger.cash_micro);assert.equal(sealedSummary(s).real_backtest_verified,false);
});
test('different choices do not force equal portfolios or different source data',()=>{
 let s=commit(open(),0,['BUY','WATCH']);const r=dispatchSealedObservation(s,buyFill);s=close(r.state);
 assert.equal(r.events.FIVE_DOTS.execution,'NO_PENDING_SIGNAL');assert.ok(s.comparison.arms.SINGLE_GPT.ledger.positions[mint]);assert.deepEqual(s.comparison.arms.FIVE_DOTS.ledger.positions,{});
 s=close(commit(s,1,['HOLD','NO_TRADE']));assert.notEqual(s.comparison.arms.SINGLE_GPT.ledger.cash_micro,s.comparison.arms.FIVE_DOTS.ledger.cash_micro);
});
test('manifest, market-input and checkpoint tampering are blocked',()=>{
 const s=open();const p=prep(0);p.coverage[0].evidence_sha256='b'.repeat(64);assert.throws(()=>sealedInputs(s,p),/PREPARATION_MISMATCH/);
 const r=reviews(s,0);r.SINGLE_GPT.decisions[0].entryInput.fx.close_usdc_per_sol=112;assert.throws(()=>commitSealedHour(s,{preparation:prep(0),reviews:r}),/ENTRY_INPUT_NOT_BOUND/);
 const a=commit(open(),0);assert.throws(()=>dispatchSealedObservation(a,{...buyFill,fx:fx2}),/OBSERVATION_MISMATCH/);
 const cp=sealCheckpoint(a);cp.state.comparison.arms.SINGLE_GPT.ledger.cash_micro='999';assert.throws(()=>resumeSealedComparison(cp,cp.sha256),/CHECKPOINT_DIGEST_MISMATCH/);
});
