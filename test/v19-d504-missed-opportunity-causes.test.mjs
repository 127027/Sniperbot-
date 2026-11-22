import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeNeutralEvaluationPopulation} from '../src/v19-neutral-evaluation-population.mjs';
import {diagnoseMissedOpportunities} from '../src/v19-missed-opportunity-root-causes.mjs';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
const now='2026-11-22T20:00:00.000Z',earlier='2026-11-22T19:00:00Z';
const addr=i=>'0x'+i.toString(16).padStart(40,'0');
function pop(){
 let m=emptyMarketMemory();
 for(let i=1;i<=3;i++){
 m=mergeMemory(m,{candidates:[{chain:'base',pool:addr(i),
  contract:i===1?null:addr(100+i),observed_at_utc:earlier}],
  sourcePath:'research/feeds/2026-11-22/fixture'+i+'.json',
  sourceCapturedAtUtc:earlier}).memory;
 }
 return makeNeutralEvaluationPopulation({memory:m,asOfUtc:now});
}
test('D5-04: every neutrally observed pool gets a cause/gap and concrete next action, NOT a fake missed winner',()=>{
 const p=pop(),r=diagnoseMissedOpportunities({population:p,asOfUtc:now});
 assert.equal(r.per_pool.length,3);
 assert.equal(r.root_cause_taxonomy.length,9);
 assert.equal(r.stats.NO_CONTRACT.pools_with_any_gap,1);
 assert.equal(r.stats.NO_QUOTE.pools_with_any_gap,3);
 assert.equal(r.observed_missed_winners,null);
 assert.equal(r.estimated_missed_pnl_test_usdc,null);
 assert.ok(r.per_pool.every(x=>x.process_causes.every(c=>c.next_action.length>20)));
 assert.equal(r.orders_authorized,0);
});
test('D5-04: proof must exist before attributing NO_CASH, NO_FILL, GPT_BUDGET or EARLY_SELL',()=>{
 const p=pop(),id=p.entries[1].legacy_pool_key;
 const unproven=[{legacy_pool_key:id,type:'CASH_REJECTION',verified:false,
  available_at_utc:earlier,source_path:'research/receipts/fake.json'},
 {legacy_pool_key:id,type:'EARLY_EXIT',verified:true,
  available_at_utc:'2026-11-23T00:00:00Z',source_path:'research/receipts/future.json'},
 {legacy_pool_key:id,type:'NO_FILL',verified:true,
  available_at_utc:earlier,source_path:'research/receipts/invalid-category.json'}];
 const r=diagnoseMissedOpportunities({population:p,asOfUtc:now,verifiedEvents:unproven});
 assert.equal(r.rejected_unverified_events.length,3);
 assert.equal(r.stats.NO_CASH.verified_process_cause_events,0);
 assert.equal(r.stats.NO_FILL.verified_process_cause_events,0);
 assert.equal(r.stats.NO_GPT_BUDGET.verified_process_cause_events,0);
 assert.equal(r.stats.EARLY_SELL.verified_process_cause_events,0);
});
test('D5-04: verified process failure classes retain evidence and timestamps but no profit estimate',()=>{
 const p=pop(),id=p.entries[2].legacy_pool_key;
 const causes=['DISCOVERY_MISS','LATE_DISCOVERY','CONTRACT_GAP','QUOTE_GAP',
  'RISK_BLOCK','GPT_CAPACITY_BLOCK','CASH_REJECTION','UNFILLED_ORDER','EARLY_EXIT'];
 const events=causes.map((type,i)=>({
   legacy_pool_key:id,type,verified:true,available_at_utc:earlier,
   source_path:'research/events/source-'+i+'.json'}));
 const r=diagnoseMissedOpportunities({population:p,asOfUtc:now,verifiedEvents:events});
 const reasons=r.per_pool.find(x=>x.legacy_pool_key===id).process_causes;
 assert.deepEqual(new Set(reasons.map(x=>x.reason)),new Set([
 'NOT_FOUND','TOO_LATE','NO_CONTRACT','NO_QUOTE','RISK','NO_GPT_BUDGET',
 'NO_CASH','NO_FILL','EARLY_SELL']));
 assert.equal(r.stats.NO_CASH.verified_process_cause_events,1);
 assert.equal(r.stats.EARLY_SELL.verified_process_cause_events,1);
 assert.ok(reasons.every(x=>x.next_action));
 assert.equal(r.observed_missed_winners,null);
});
test('D5-04: actual 409 pool source report keeps unknown missed-outcome rates unknown',async()=>{
 const original=JSON.parse(await readFile('research/state/market-memory.json','utf8'));
 const p=makeNeutralEvaluationPopulation({memory:original,asOfUtc:now});
 const r=diagnoseMissedOpportunities({population:p,asOfUtc:now});
 assert.equal(r.neutral_observed_pool_population,409);
 assert.equal(r.per_pool.length,409);
 assert.equal(r.observed_missed_winners,null);
 assert.equal(r.estimated_missed_pnl_test_usdc,null);
 assert.equal(r.stats.NO_CASH.verified_process_cause_events,0);
 assert.equal(r.stats.NO_GPT_BUDGET.verified_process_cause_events,0);
 assert.equal(r.stats.EARLY_SELL.verified_process_cause_events,0);
});
test('D5-04: existing source runner archives process-gap triage without changing cash',async()=>{
 const s=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(s,/diagnoseMissedOpportunities\(\{/);
 assert.match(s,/verifiedEvents:\[\]/);
 assert.match(s,/missed-opportunity-process-gaps\.json/);
 assert.doesNotMatch(s,/writeFile\('signals\/orders\//);
});
