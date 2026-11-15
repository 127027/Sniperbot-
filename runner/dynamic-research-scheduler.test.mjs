import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {adaptiveActivity,planAdaptiveReview,buildAdaptiveReview,
  adaptiveResearchTick} from './dynamic-research-scheduler.mjs';

const when='2026-11-15T10:00:00.000Z';
const t=Date.parse(when);
const instant=ms=>new Date(ms).toISOString();
function token(i,at=t) {
 const addr='0x'+String(i).padStart(40,'0');
 return {candidate_id:'base:'+addr+':'+addr,
   chain:'base',token_address:addr,pool_address:addr,
   price_usd:0.0002,liquidity_usd:75000,volume_m5_usd:10000+i*1500,
   buys_m5:20,sells_m5:6,pool_created_at_utc:instant(at-10*60000),
   promotion_biased:false,source:'GECKOTERMINAL_NEW_POOLS'};
}
function alert(c,at=t) {
 return {event_id:'research-alert-'+c.token_address.slice(-32),
  candidate_id:c.candidate_id,event_type:'MARKET_ACCELERATION',
  paper_only:true,actionable:false,observed_at_utc:instant(at)};
}
function snap({time=t,young=0,alerts=0,available=true}={}){
 const candidates=Array.from({length:young},(_,i)=>token(i+1,time));
 return {schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
   published_at_utc:instant(time),
   collection_status:available?'OBSERVED_OR_PARTIAL':'BLOCKED_RESEARCH_DATA_ACCESS',
   candidates,research_alerts:candidates.slice(0,alerts).map(x=>alert(x,time))};
}
test('dynamic adaptive frequency uses DISTINCT early pools and validated alerts, not fake social certainty',()=>{
 assert.equal(adaptiveActivity(snap({young:0})).frequency_per_day,1);
 assert.equal(adaptiveActivity(snap({young:3})).frequency_per_day,4);
 assert.equal(adaptiveActivity(snap({young:3,alerts:1})).frequency_per_day,12);
 assert.equal(adaptiveActivity(snap({young:4,alerts:4})).frequency_per_day,24);
 assert.equal(adaptiveActivity(snap({young:4,alerts:4,available:false})).frequency_per_day,1);
 const promoted=snap({young:4,alerts:0});
 promoted.candidates.forEach(x=>x.promotion_biased=true);
 assert.equal(adaptiveActivity(promoted).frequency_per_day,1);
 const stale=snap({young:4,alerts:4});
 stale.research_alerts.forEach(x=>x.observed_at_utc=instant(t-2*3600000));
 assert.equal(adaptiveActivity(stale).frequency_per_day,4);
 const bad=snap({young:4,alerts:4});
 bad.research_alerts.forEach(x=>x.actionable=true);
 assert.equal(adaptiveActivity(bad).frequency_per_day,4);
 const badSource=snap({young:2,alerts:0});badSource.actionable=true;
 assert.throws(()=>adaptiveActivity(badSource),/UNTRUSTED/);
});
test('bounded adaptive cadence is 1 to 24 per UTC day, never more',()=>{
 let previous=null,events=0;
 for(let i=0;i<24*30;i++){
   const s=snap({time:t+i*2*60000,young:4,alerts:4});
   const p=planAdaptiveReview(s,previous);
   if(p.due){
     events++;
     previous={schema:'sniper_r29_dynamic_research_status.v1',
       first_seen_at_utc:previous?.first_seen_at_utc||p.first_seen_at_utc,
       last_review_at_utc:p.at_utc,day_utc:p.day_utc,
       day_review_count:p.day_review_count+1,total_review_count:events};
   }
 }
 assert(events>=1&&events<=24);
 const calm={schema:'sniper_r29_dynamic_research_status.v1',
   first_seen_at_utc:when,last_review_at_utc:when,day_utc:when.slice(0,10),
   day_review_count:1};
 const same=planAdaptiveReview(snap({time:t+2*60000}),calm);
 assert.equal(same.due,false);
 const next=planAdaptiveReview(snap({time:t+24*3600000}),calm);
 assert.equal(next.due,true);
 assert.equal(next.experiment_phase,'OBSERVATION_WARMUP_30_DAYS');
 const holdout=planAdaptiveReview(snap({time:t+30*24*3600000}),calm);
 assert.equal(holdout.experiment_phase,'LOCKED_FORWARD_TEST_30_DAYS');
 assert.equal(holdout.experiment_day_index,30);
 const future=planAdaptiveReview(snap({time:t+61*24*3600000}),calm);
 assert.equal(future.experiment_phase,'ONGOING_FORWARD_EVALUATION');
 assert.throws(()=>planAdaptiveReview(snap({time:t-2*60000}),calm),/INVALID_PREVIOUS/);
});
test('immutable local decision journal survives restart, is paper-only, excludes secrets and portfolios',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'r29-adaptive-'));
 try{
   const s=snap({young:4,alerts:4});
   const first=await adaptiveResearchTick(s,{folder:dir});
   assert.equal(first.created,true);
   assert.equal(first.plan.frequency_per_day,24);
   assert.equal(first.review.validated_buy_count,0);
   assert.equal(first.review.simulated_pnl,null);
   assert.equal(first.review.decision,'OBSERVE_ONLY_EVIDENCE_GAP');
   assert(first.review.candidates.every(x=>x.score_0_100===null&&
     x.gpt_action==='NO_ORDER_UNVERIFIED_SECURITY'));
   const read=await readFile(first.filename,'utf8');
   assert(!read.includes('cashUsdc'));
   assert(!read.includes('privateKey'));
   assert(!read.includes('github_pat_'));
   assert.equal((await adaptiveResearchTick(s,{folder:dir})).created,false);
   const later=snap({time:t+3600000,young:4,alerts:4});
   assert.equal((await adaptiveResearchTick(later,{folder:dir})).created,true);
   const status=JSON.parse(await readFile(path.join(dir,'status.json'),'utf8'));
   assert.equal(status.day_review_count,2);
   assert.equal(status.can_authorize_trades,false);
   const records=await readdir(path.join(dir,'reviews','2026-11-15'));
   assert.equal(records.length,2);
   const tomorrow=snap({time:t+24*3600000,young:0});
   const next=await adaptiveResearchTick(tomorrow,{folder:dir});
   assert.equal(next.created,true);
   assert.equal(next.plan.experiment_phase,'OBSERVATION_WARMUP_30_DAYS');
   assert.equal(next.plan.frequency_per_day,1);
   assert.equal(JSON.parse(await readFile(path.join(dir,'status.json'),'utf8')).day_review_count,1);
   assert.equal((await readdir(path.join(dir,'reviews','2026-11-15'))).length,2);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('missing source is DATA GAP not profitable NO_TRADE, and never fakes a 100 score',()=>{
 const s=snap({young:0,available:false});
 const plan=planAdaptiveReview(s);
 const record=buildAdaptiveReview(s,plan);
 assert.equal(record.validated_buy_count,0);
 assert.equal(record.validated_sell_count,0);
 assert.equal(record.simulated_pnl,null);
 assert.equal(record.universe_complete,false);
 assert(record.missing_sources.includes('INDEPENDENT_SECURITY_PROOFS'));
 assert(record.paper_only===true&&record.actionable===false);
 assert.equal(record.outcome_status,'PENDING_FUTURE_OBSERVATION_NOT_TRADE');
});
