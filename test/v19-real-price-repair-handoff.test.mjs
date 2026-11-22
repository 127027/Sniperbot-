// Read-only integration test using an immutable actual 22-Nov pool batch.
// Captures and paper orders are never executed by this test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {scoreAsOf} from '../src/forward-learning.mjs';
import {planEvidenceRepairRechecks} from '../src/v19-evidence-repair-queue.mjs';
import {planHotFairRechecks} from '../src/v19-hot-fair-recheck.mjs';
const at='2026-11-22T15:19:00.000Z';
test('actual 99-plus November observations yield bounded price repair without oracle BUY',async()=>{
 const [obText,memText]=await Promise.all([
  readFile('research/observations/2026-11-22/45036887325.json','utf8'),
  readFile('research/state/market-memory.json','utf8')
 ]);
 const batch=JSON.parse(obText),memory=JSON.parse(memText);
 const ranking=scoreAsOf({batches:[batch],asOfUtc:at,maxCandidates:100000});
 const repair=planEvidenceRepairRechecks({ranking,memory,asOfUtc:at,maxCandidates:100});
 assert.ok(repair.all_due_candidates>=50);
 const fresh={chain:'base',pool:'0x'+'f'.repeat(40),
  contract:'0x'+'e'.repeat(40),symbol:'BRANDNEW',
  observed_at_utc:at,pool_created_at_utc:at,
  observed_price_usd:0.0001,liquidity_usd:50000,volume_24h_usd:70000};
 const old={chain:'base',pool:'0x'+'c'.repeat(40),contract:'0x'+'d'.repeat(40)};
 const job=planHotFairRechecks({
  freshCandidates:[fresh],fairCandidates:[old],
  repairCandidates:repair.selected,maxChecks:2,
  asOfUtc:at,round:3});
 assert.equal(job.selected_count,2);
 assert.equal(job.hot_selected,1);
 assert.equal(job.repair_selected,1);
 assert.equal(job.fair_selected,0);
 assert.ok(job.deferred_repair_pool_count>0);
 assert.equal(new Set(job.selected.map(x=>x.key)).size,2);
 assert.equal(job.trade_authorized,false);
 assert.equal(repair.actual_requests,0);
});
test('capture runner reads only old forward observations before any new DEX selection',async()=>{
 const source=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 const rankIndex=source.indexOf('const repairRanking=scoreAsOf(');
 const planIndex=source.indexOf('const recheckPlan=planHotFairRechecks(');
 const requestIndex=source.indexOf('for(const c of targets){');
 assert.ok(rankIndex>0&&planIndex>rankIndex&&requestIndex>planIndex);
 assert.match(source,/repairCandidates:repairProposal\.selected/);
 assert.match(source,/metrics\.v19_evidence_repair_rechecks=/);
 assert.match(source,/selected_for_actual_dex_attempt:recheckPlan\.repair_selected/);
 assert.match(source,/no_provider_calls_claimed_from_proposal:true/);
 assert.equal(source.includes('R29_ENABLE_LIVE=true'),false);
});


test('real 22-Nov repair had an HTTP200 DEX response but zero usable second price',async()=>{
 const evidence=JSON.parse(await readFile('research/feeds/2026-11-22/45044300013/evidence.json','utf8'));
 const q=evidence.metrics.v19_hot_fair_recheck_plan.selected.filter(x=>x.queue==='EVIDENCE_REPAIR');
 assert.equal(q.length,1);
 const dex=evidence.dex_checks.find(x=>x.chain===q[0].chain&&x.pool===q[0].pool);
 const request=evidence.api_evidence.find(x=>x.body_path===dex.source);
 assert.ok(request);
 assert.equal(request.http_status,200);
 assert.equal(dex.status,'NO_MATCHING_CHAIN_POOL_BASE_TOKEN');
 assert.equal(dex.matched,false);
 assert.equal(dex.returned_pairs,0);
 assert.equal(evidence.verified_client_fills,0);
 assert.equal(evidence.published_paper_orders,0);
});
test('new runner metrics must distinguish selected, attempted, exact-pair match and recorded price',async()=>{
 const source=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(source,/repairActualAttempts=attempts\.filter/);
 assert.match(source,/repairActualDexResponses=dexChecks\.filter/);
 assert.match(source,/repairTruePriceObservations=rechecked\.filter/);
 assert.match(source,/actually_attempted_dex_checks:repairActualAttempts\.length/);
 assert.match(source,/new_observed_repair_prices:repairTruePriceObservations\.length/);
 assert.match(source,/attempt_status_counts:repairStatusCounts/);
});
