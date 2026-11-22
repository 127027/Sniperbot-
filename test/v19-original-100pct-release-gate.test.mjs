import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectR29OriginalAcceptanceReleaseGate}
 from '../src/v19-original-acceptance-release-gate.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const load=async()=>({
 originalCatalog:await readFile('docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md','utf8'),
 taskRegister:await read('research/audits/2026-11-22/r29-v19-offline-61-task-reconciliation.json'),
 holdout:await read('research/state/prospective-holdout-freeze.json'),
 currentMarketMemory:await read('research/state/market-memory.json'),
 asOfUtc:'2026-11-22T22:30:00.000Z'
});
test('Original 61-task backtest release gate is BLOCKED until 61 real PASS, not 96.72% touched',async()=>{
 const r=inspectR29OriginalAcceptanceReleaseGate(await load());
 assert.equal(r.original_task_count,61);
 assert.deepEqual(r.original_status_counts,{PASS:13,PARTIAL:46,OPEN:2});
 assert.equal(r.strict_fully_accepted_pct,21.31);
 assert.equal(r.technical_touched_pct,96.72);
 assert.ok(r.persisted_pool_count>=606);
 assert.equal(r.readiness,'NOT_READY_BLOCKED_BY_ORIGINAL_EVIDENCE');
 assert.equal(r.release_authorized,false);
 assert.equal(r.allow_backtest_run,false);
 assert.equal(r.live_trade_authorized,false);
 assert.equal(r.orders_published,0);
 assert.ok(r.blockers.find(x=>x.gate==='DOT3_CHAIN_SELLABILITY'));
 assert.equal(r.blockers.find(x=>x.gate==='ORIGINAL_TASK_ACCEPTANCE')
   .outstanding_task_ids.length,48);
});
test('Even a forged JSON registry with 61 PASS cannot independently attest onchain or Windows proof',async()=>{
 const x=await load();
 for(const t of x.taskRegister.tasks)t.status='PASS';
 x.taskRegister.status_counts={PASS:61,PARTIAL:0,OPEN:0};
 const r=inspectR29OriginalAcceptanceReleaseGate(x);
 assert.equal(r.all_original_acceptance_items_passed,true);
 assert.equal(r.strict_fully_accepted_pct,100);
 assert.equal(r.release_authorized,false);
 assert.equal(r.independently_authenticated_historical_market,false);
 assert.equal(r.windows_origin_and_external_client_receipts_verified,false);
 assert.equal(r.independent_risk_and_sellability_proven,false);
 assert.ok(r.blockers.some(x=>x.gate==='DOT3_INDEPENDENT_ISSUER_AND_QUOTE'));
 assert.ok(r.blockers.some(x=>x.gate==='WINDOWS_CLIENT_END_TO_END'));
});
test('Precommit future holdout is blocked by maturity and outcome completeness',async()=>{
 const x=await load();
 const r=inspectR29OriginalAcceptanceReleaseGate(x);
 assert.equal(r.precommitted_holdout_window_elapsed,false);
 assert.ok(r.blockers.some(x=>x.gate==='PROSPECTIVE_HOLDOUT'
  &&x.reason==='PRECOMMITTED_HOLDOUT_WINDOW_NOT_YET_ELAPSED'));
 x.asOfUtc='2026-11-26T15:00:00.000Z';
 const late=inspectR29OriginalAcceptanceReleaseGate(x);
 assert.equal(late.precommitted_holdout_window_elapsed,true);
 assert.equal(late.release_authorized,false);
 assert.ok(late.blockers.some(x=>x.gate==='PROSPECTIVE_HOLDOUT_OUTCOMES'));
});
test('Tampered count, unknown ID, forged holdout or invalid Windows proof fail closed',async()=>{
 const x=await load();
 x.taskRegister.status_counts.PASS=14;
 assert.throws(()=>inspectR29OriginalAcceptanceReleaseGate(x),
  /REPORTED_ACCEPTANCE_STATUS_NOT_EQUAL_TO_ORIGINAL_61/);
 const y=await load();
 y.taskRegister.tasks[0].id='UNKNOWN-99';
 assert.throws(()=>inspectR29OriginalAcceptanceReleaseGate(y),
  /ORIGINAL_61_TASKS_CANNOT_BE_RECONCILED/);
 const z=await load();z.holdout.rules.paper_entry_amount_test_usdc=10000;
 assert.throws(()=>inspectR29OriginalAcceptanceReleaseGate(z),
  /INVALID_FROZEN_HOLDOUT/);
 const w=await load();
 assert.throws(()=>inspectR29OriginalAcceptanceReleaseGate({
  ...w,independentWindowsProof:{kind:'USER_SAYS_ALL_IS_FINE'}}),
 /INVALID_LOCAL_CLIENT_PROOF_KIND/);
});
test('Gate CLI has no Backtest, API request, client writer, GitHub publisher or order',async()=>{
 const code=await readFile('scripts/v19-verify-100pct-before-backtest.mjs','utf8');
 assert.match(code,/inspectR29OriginalAcceptanceReleaseGate/);
 assert.match(code,/--require-ready/);
 assert.doesNotMatch(code,/v18-backtest-on-demand|replay-v16|backtestOnRequest|child_process/);
 assert.doesNotMatch(code,/\bfetch\s*\(|https?\.request|publishPaperOrder|settlePaper/);
 assert.doesNotMatch(code,/signals\/orders|R29_ENABLE_LIVE/);
});
