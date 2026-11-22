import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditAllPartialOriginalAcceptance,PARTIAL_NEXT_EVIDENCE}
 from '../src/v19-partial-acceptance-readiness.mjs';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const load=async()=>{
 const [originalCatalog,strictRegister,latestCaptureReport,providerBudget,holdout]=await Promise.all([
  readFile('docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md','utf8'),
  read('research/audits/2026-11-22/r29-v19-offline-61-task-reconciliation.json'),
  read('research/feeds/latest.json'),
  read('research/state/provider-budget.json'),
  read('research/state/prospective-holdout-freeze.json')
 ]);
 const latestCaptureEvidence=await read(latestCaptureReport.evidence_path);
 return {originalCatalog,strictRegister,latestCaptureReport,
  latestCaptureEvidence,providerBudget,holdout,
  asOfUtc:'2026-11-22T20:10:00.000Z'};
};
test('all 46 PARTIAL original acceptance tasks individually evaluated, never promoted by unit test',async()=>{
 const report=auditAllPartialOriginalAcceptance(await load());
 assert.equal(report.kind,'R29_V19_ALL_46_ORIGINAL_PARTIAL_ACCEPTANCE_REAUDIT');
 assert.deepEqual([report.counted_pass_tasks,report.counted_partial_tasks,
  report.counted_open_tasks],[13,46,2]);
 assert.equal(report.task_id_integrity_checked,true);
 assert.deepEqual(Object.values(report.domain_counts).sort((a,b)=>a-b),
  [7,8,9,9,13]);
 assert.equal(Object.keys(PARTIAL_NEXT_EVIDENCE).length,46);
 assert.equal(new Set(report.review_entries.map(x=>x.task_id)).size,46);
 for(const t of report.review_entries){
  assert.equal(t.status,'PARTIAL_UNTIL_ORIGINAL_ACCEPTANCE',t.task_id);
  assert.ok(t.original_acceptance_sentence?.length>20,t.task_id);
  assert.ok(t.next_verifiable_action?.length>20,t.task_id);
  assert.equal(t.do_not_promote_to_PASS_from_unit_tests_alone,true,t.task_id);
  assert.equal(t.true_windows_client_receipts_verified_by_this_capture,0);
  assert.equal(t.original_october_market_observations_authenticated_by_this_capture,0);
 }
 assert.equal(report.fully_accepted_tasks_not_inflated,true);
 assert.equal(report.no_paper_orders_published,true);
});
test('new real API data does not retroactively establish historic October 29h or an immature Nov holdout',async()=>{
 const r=auditAllPartialOriginalAcceptance(await load());
 assert.equal(r.current_live_capture.raw_receipt_count,3);
 assert.equal(r.current_live_capture.http200,3);
 assert.equal(r.current_live_capture.http429,0);
 assert.equal(r.current_live_capture.external_origin_capture_timestamp_independently_proven,false);
 assert.equal(r.historical_original_october_29h_universe_verified,false);
 assert.equal(r.precommitted_holdout.validation_window_elapsed,false);
 assert.equal(r.precommitted_holdout.holdout_window_elapsed,false);
 assert.equal(r.precommitted_holdout.outcome_denominator_verified,false);
 assert.equal(r.next_backtest_mode,
  'OCTOBER_ORIGINAL_DATA_GAP_SEPARATE_FROM_PROSPECTIVE_NOVEMBER_HOLDOUT');
});
test('catalog tampering, status inflation, false capture provenance and future timestamps fail closed',async()=>{
 const x=await load();
 const c=structuredClone(x);
 c.strictRegister.tasks.pop();
 assert.throws(()=>auditAllPartialOriginalAcceptance(c),
  /INVALID_ORIGINAL_ACCEPTANCE_REAUDIT/);
 const y=await load();y.originalCatalog=y.originalCatalog.replace(
  '| SYS-05 |','| SYS-500 |');
 assert.throws(()=>auditAllPartialOriginalAcceptance(y),
  /ORIGINAL_61_CATALOG_OR_REGISTER_MISMATCH/);
 const z=await load();z.latestCaptureEvidence.request_path='research/requests/fake.json';
 assert.throws(()=>auditAllPartialOriginalAcceptance(z),
  /INVALID_ORIGINAL_ACCEPTANCE_REAUDIT/);
 const v=await load();v.asOfUtc='2026-11-22T19:59:00.000Z';
 assert.throws(()=>auditAllPartialOriginalAcceptance(v),
  /FUTURE_OR_MISSING_LATEST_CAPTURE/);
});
test('audit CLI only reads persisted sources and writes isolated probe artifact; no requests or orders',async()=>{
 const s=await readFile('scripts/v19-audit-all-partials-and-backtest-readiness.mjs','utf8');
 assert.match(s,/auditAllPartialOriginalAcceptance/);
 assert.match(s,/verifyArchivedHttpBytes/);
 assert.match(s,/research\/feeds\/latest\.json/);
 assert.match(s,/original_october_29h/);
 assert.match(s,/prospective_november_holdout/);
 assert.doesNotMatch(s,/\bfetch\s*\(/);
 assert.doesNotMatch(s,/\bhttps?\.request\s*\(/);
 assert.doesNotMatch(s,/writeFile\([^\n]*signals\//);
});
