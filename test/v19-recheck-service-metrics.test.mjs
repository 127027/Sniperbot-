import test from 'node:test';
import assert from 'node:assert/strict';
import {planHotFairRechecks} from '../src/v19-hot-fair-recheck.mjs';
import {summarizeRecheckService} from '../src/v19-recheck-service-metrics.mjs';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {fairRecheckPlan,recordRecheckAttempt} from '../src/discovery-fair-queue.mjs';

const pool=n=>'0x'+n.toString(16).padStart(40,'0');
const token='0x'+'a'.repeat(40),at='2026-11-22T09:15:00.000Z';
const fresh=(n)=>({chain:'base',pool:pool(n),contract:token,
 symbol:'HOT'+n,observed_at_utc:'2026-11-22T09:00:00.000Z',
 observed_price_usd:.001,volume_24h_usd:100000,liquidity_usd:20000});
const fair=n=>({chain:'base',pool:pool(n),contract:token,
 symbol:'FAIR'+n,last_seen_at_utc:'2026-11-22T08:00:00.000Z'});
test('P50/P95 and explicit hot SLA are calculated from observed timestamps, not invented',()=>{
 const plan=planHotFairRechecks({asOfUtc:at,
  freshCandidates:[fresh(1),fresh(2),fresh(3),fresh(4)],
  fairCandidates:[fair(101),fair(102),fair(103),fair(104)],maxChecks:4});
 const attempts=plan.selected.map((c,i)=>({chain:c.chain,pool:c.pool,
  checked_at_utc:new Date(Date.parse('2026-11-22T09:04:00Z')+i*60000).toISOString(),
  status:'TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY'}));
 const r=summarizeRecheckService({plan,attempts,asOfUtc:at,hotSlaMinutes:10});
 assert.equal(r.attempted_rechecks,4);
 assert.equal(r.hot_checked_with_time,2);
 assert.equal(r.fair_checked_with_time,2);
 assert.equal(r.hot_p50_wait_minutes,4);
 assert.equal(r.hot_p95_wait_minutes,5);
 assert.equal(r.fair_p95_wait_minutes,67);
 assert.equal(r.hot_sla_met_pct,100);
 assert.equal(r.trade_authorized,false);
 assert.equal(r.actual_paper_fills,0);
});
test('no recorded attempt leaves latency and SLA unknown, not a false zero',()=>{
 const plan=planHotFairRechecks({asOfUtc:at,freshCandidates:[fresh(1)],maxChecks:1});
 const r=summarizeRecheckService({plan,attempts:[],asOfUtc:at});
 assert.equal(r.hot_p95_wait_minutes,null);
 assert.equal(r.hot_sla_met_pct,null);
 assert.equal(r.still_pending,1);
});
test('three of six FAIR slots per run eventually service every old pool despite unlimited HOT arrivals',()=>{
 const initial='2026-11-22T08:00:00.000Z';
 const candidates=Array.from({length:18},(_,i)=>({...fair(i+101),observed_at_utc:initial}));
 let memory=mergeMemory(emptyMarketMemory(),{candidates,
  sourcePath:'research/feeds/2026-11-22/test-fair.json',
  sourceCapturedAtUtc:initial}).memory;
 const seen=new Set();
 for(let round=0;round<6;round++){
  const now=new Date(Date.parse('2026-11-22T09:15:00Z')+round*3600000).toISOString();
  const fairPlan=fairRecheckPlan(memory,{asOfUtc:now,maxRechecks:6});
  const hot=Array.from({length:20},(_,i)=>({...fresh(i+1000),
   observed_at_utc:new Date(Date.parse(now)-60000).toISOString()}));
  const plan=planHotFairRechecks({asOfUtc:now,freshCandidates:hot,
    fairCandidates:fairPlan.candidates,maxChecks:6,round});
  assert.equal(plan.hot_selected,3);
  assert.equal(plan.fair_selected,3);
  for(const item of plan.selected.filter(x=>x.queue==='PERSISTENT_FAIR_RECHECK')){
   assert.equal(seen.has(item.key),false);
   seen.add(item.key);
   memory=recordRecheckAttempt(memory,{chain:item.chain,pool:item.pool,
    pool_kind:item.pool_kind,attemptAtUtc:now,status:'SOURCE_CHECKED',
    sourcePath:'research/feeds/2026-11-22/fair-run'+round+'.json'});
  }
 }
 assert.equal(seen.size,18);
 assert.equal(fairRecheckPlan(memory,{asOfUtc:'2026-11-22T16:00:00Z'}).never_checked_count,0);
});


test('real November EHUNT REPAIR was executed but DEX provider returned no exact matching pair',async()=>{
 const {readFile}=await import('node:fs/promises');
 const original=JSON.parse(await readFile('research/observations/2026-11-22/45036887325.json','utf8'));
 const evidence=JSON.parse(await readFile('research/feeds/2026-11-22/45044300013/evidence.json','utf8'));
 const queued=evidence.metrics.v19_hot_fair_recheck_plan.selected.find(x=>x.queue==='EVIDENCE_REPAIR');
 assert.equal(queued.chain,'cronos');
 const observed=original.observations.find(x=>x.chain===queued.chain&&x.pool===queued.pool);
 assert.ok(observed);
 assert.equal(observed.liquidity_usd,0.0005);
 const actual=evidence.dex_checks.find(x=>x.chain===queued.chain&&x.pool===queued.pool);
 assert.equal(actual.status,'NO_MATCHING_CHAIN_POOL_BASE_TOKEN');
 assert.equal(actual.returned_pairs,0);
 const plan={kind:'R29_V19_HOT_FAIR_RISK_RECHECK_PLAN',selected:[{
  chain:queued.chain,pool:queued.pool,queue:queued.queue,
  observed_at_utc:observed.captured_at_utc
 }]};
 const review=summarizeRecheckService({plan,asOfUtc:evidence.metrics.v19_hot_fair_service.as_of_utc,
  attempts:[{chain:actual.chain,pool:actual.pool,
   checked_at_utc:actual.checked_at_utc,status:actual.status}]});
 assert.equal(review.attempted_rechecks,1);
 assert.equal(review.repair_attempted,1);
 assert.equal(review.repair_checked_with_time,1);
 assert.equal(review.repair_unmatched_identity,1);
 assert.equal(review.repair_indicative_quotes,0);
 assert.ok(review.repair_p50_wait_minutes>80&&review.repair_p50_wait_minutes<82);
 assert.equal(review.trade_authorized,false);
 assert.equal(review.actual_paper_fills,0);
});
test('research-only matching REPAIR is measurable but does not authorize a paper order',()=>{
 const ts='2026-11-22T09:15:00.000Z',source='2026-11-22T09:00:00.000Z';
 const p={kind:'R29_V19_HOT_FAIR_RISK_RECHECK_PLAN',selected:[
  {chain:'base',pool:pool(8),queue:'EVIDENCE_REPAIR',observed_at_utc:source}
 ]};
 const r=summarizeRecheckService({plan:p,asOfUtc:ts,
  attempts:[{chain:'base',pool:pool(8),status:'TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY',
   checked_at_utc:'2026-11-22T09:14:00.000Z'}]});
 assert.equal(r.repair_attempted,1);
 assert.equal(r.repair_indicative_quotes,1);
 assert.equal(r.repair_unmatched_identity,0);
 assert.equal(r.repair_p50_wait_minutes,14);
 assert.equal(r.trade_authorized,false);
});
