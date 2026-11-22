import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {emptyPageCoverage,updatePageCoverage} from '../src/v19-page-coverage.mjs';
import {planMultiChainCapture} from '../src/v19-discovery-budget-plan.mjs';
import {chainServiceSignals,summarizeChainServiceSla} from '../src/v19-chain-service-sla.mjs';
const chains=['solana','base','ethereum','bsc','robinhood','cronos'];
const stamp='2026-11-22T19:00:00.000Z';
const next='2026-11-22T20:00:00.000Z';
const E=n=>'0x'+n.toString(16).padStart(40,'0');
test('D1-05: as-of chain demand observes missing-identity and pending-page load with true unknown age',()=>{
 const mem=mergeMemory(emptyMarketMemory(),{
  candidates:[{chain:'base',pool:E(1),contract:null,observed_at_utc:stamp},
   {chain:'ethereum',pool:E(2),contract:E(22),observed_at_utc:stamp}],
  sourcePath:'research/feeds/test.json',sourceCapturedAtUtc:stamp}).memory;
 const coverage=updatePageCoverage(emptyPageCoverage(),{
  asOfUtc:stamp,deferred:[{chain:'base',page:3},{chain:'robinhood',page:2}]
 }).updated_memory;
 const x=chainServiceSignals({memory:mem,coverage,asOfUtc:next});
 assert.equal(x.demand.base.pending_page_count,1);
 assert.equal(x.demand.base.recent_identity_gaps,1);
 assert.equal(x.demand.base.observed_recent_pool_count,1);
 assert.ok(x.demand.base.demand_weight>x.demand.ethereum.demand_weight);
 assert.equal(x.demand.base.backlog_age_minutes,null);
 assert.equal(x.unmeasured_backlog_age_is_null,true);
});
test('D1-05: 1-request budgets must serve all six chains even when Base demand stays high',()=>{
 let mem=emptyMarketMemory(),coverage=emptyPageCoverage();
 const served=[];
 for(let tick=0;tick<6;tick++){
  const at=new Date(Date.parse(next)+tick*60000).toISOString();
  const signals=chainServiceSignals({memory:mem,coverage,asOfUtc:at});
  signals.demand.base.demand_weight=100;
  const plan=planMultiChainCapture({networks:chains,checkpoints:mem.checkpoints,
    pageCoverage:coverage,chainService:signals,budget:1,asOfUtc:at});
  assert.equal(plan.tasks.length,1);
  assert.equal(plan.incomplete_chain_attempts_are_a_data_gap,true);
  const c=plan.tasks[0].chain;
  assert.equal(served.includes(c),false,'older last-attempt must outrank recurring hot chain');
  served.push(c);
  mem.checkpoints[c+':GECKOTERMINAL']={
   chain:c,provider:'GECKOTERMINAL',
   last_attempt_at_utc:at,next_page_to_consider:2};
 }
 assert.deepEqual(new Set(served),new Set(chains));
});
test('D1-05: expired 429 repair outranks demand, active 429 chain excluded',()=>{
 const mem=emptyMarketMemory();
 mem.checkpoints['ethereum:GECKOTERMINAL']={
  failed_page_to_retry:3,retry_after_utc:stamp,last_attempt_at_utc:stamp};
 mem.checkpoints['cronos:GECKOTERMINAL']={
  failed_page_to_retry:4,retry_after_utc:'2026-11-22T23:00:00Z',
  last_attempt_at_utc:'2026-11-22T18:00:00Z'};
 const signals=chainServiceSignals({memory:mem,coverage:emptyPageCoverage(),asOfUtc:next});
 signals.demand.base.demand_weight=100;
 const plan=planMultiChainCapture({networks:chains,checkpoints:mem.checkpoints,
  pageCoverage:emptyPageCoverage(),chainService:signals,budget:3,asOfUtc:next});
 assert.equal(plan.tasks[0].chain,'ethereum');
 assert.equal(plan.tasks[0].page,3);
 assert.equal(plan.tasks.some(x=>x.chain==='cronos'),false);
 assert.deepEqual(plan.unscheduled_chains_due_to_cooldown,['cronos']);
});
test('D1-05: six-chain slots and actual HTTP200 are measured separately',()=>{
 const mem=emptyMarketMemory();
 const coverage=emptyPageCoverage();
 const signals=chainServiceSignals({memory:mem,coverage,asOfUtc:next});
 const plan=planMultiChainCapture({networks:chains,checkpoints:{},
   pageCoverage:coverage,budget:6,asOfUtc:next,chainService:signals});
 const report=summarizeChainServiceSla({signals,plan,asOfUtc:next,
   actualHttpReceipts:[{chain:'base',provider:'GECKOTERMINAL',http_status:200},
    {chain:'ethereum',provider:'GECKOTERMINAL',http_status:429}]});
 assert.equal(report.scheduled_due_chain_coverage_pct,100);
 assert.equal(report.verified_http200_chain_count,1);
 assert.equal(report.per_chain.find(x=>x.chain==='ethereum').actual_http_attempts_in_report,1);
 assert.equal(report.per_chain.find(x=>x.chain==='ethereum').actual_http200_pages_in_report,0);
 assert.equal(report.max_backlog_age_minutes,null);
 assert.equal(report.p95_actual_queue_wait_minutes,null);
 assert.equal(report.orders_authorized,0);
});
test('D1-05: source runner uses chain demand before planned requests and stores SLA',async()=>{
 const code=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.ok(code.indexOf('chainServiceSignals({')<code.indexOf('const capturePlan=planMultiChainCapture'));
 assert.match(code,/asOfUtc:now\(\),chainService/);
 assert.match(code,/metrics\.v19_chain_service_sla=summarizeChainServiceSla/);
});
