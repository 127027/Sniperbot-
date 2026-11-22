import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assessCaptureCompletion} from '../src/v19-capture-completion-gate.mjs';

const root='research/feeds/2026-11-22/45057658912/';
async function archived(){
 const [journal,evidence,request]=await Promise.all([
  readFile(root+'inflight-capture.json','utf8').then(JSON.parse),
  readFile(root+'evidence.json','utf8').then(JSON.parse),
  readFile('research/requests/2026-11-22/20261122T185300Z-v19-sys11-qa03-recovery-A.json','utf8').then(JSON.parse)
 ]);
 return {journal,evidence,request,runId:'45057658912'};
}
test('QA-03: real 5/6 capture with a Base HTTP429 must NOT report a successful GitHub capture',async()=>{
 const args=await archived();
 const outcome=assessCaptureCompletion(args);
 assert.equal(outcome.status,'PARTIAL_OR_INVALID_CAPTURE');
 assert.equal(outcome.workflow_may_report_success,false);
 assert.equal(outcome.planned_page_count,6);
 assert.equal(outcome.verified_http200_planned_pages,5);
 assert.deepEqual(outcome.missing_requested_chains,['base']);
 assert.deepEqual(outcome.unresolved_planned_pages,[{chain:'base',page:2}]);
 assert.ok(outcome.reasons.includes('PROVIDER_HTTP_FAILURES'));
 assert.ok(outcome.reasons.includes('JOURNAL_CONFIRMS_INCOMPLETE_CAPTURE'));
 assert.equal(outcome.global_market_coverage_proven,false);
 assert.equal(outcome.paper_orders_authorized,0);
});
test('QA-03: synthetic six-chain all-HTTP200 journal may pass the requested sample, never market completeness',async()=>{
 const args=await archived();
 args.journal=structuredClone(args.journal);
 args.evidence=structuredClone(args.evidence);
 const last=args.journal.http_receipts.find(x=>x.http_status===429&&x.body_path.includes('gecko-base-page2'));
 assert.ok(last,'fixture must have real original HTTP429');
 last.http_status=200; // Deliberately SYNTHETIC only; never rewrite the real file.
 args.journal.unresolved_planned_pages_this_run=[];
 args.journal.has_unresolved_page_gaps=false;
 args.journal.status_is_not_successful_capture=false;
 args.journal.proven_successful_pages_this_run=6;
 args.evidence.page_capture_failures=[];
 args.evidence.page_capture_deferred=[];
 const outcome=assessCaptureCompletion(args);
 assert.equal(outcome.workflow_may_report_success,true);
 assert.equal(outcome.verified_http200_planned_pages,6);
 assert.equal(outcome.status,'REQUESTED_SAMPLE_COMPLETE');
 assert.equal(outcome.global_market_coverage_proven,false);
 assert.equal(outcome.paper_orders_authorized,0);
});
test('QA-03: a missing requested chain or unfinalized runner is not a complete sample',async()=>{
 const args=await archived();
 const incomplete=structuredClone(args.journal);
 incomplete.http_receipts=incomplete.http_receipts.filter(x=>!x.body_path.includes('gecko-robinhood-page2'));
 incomplete.planned_pages=incomplete.planned_pages.filter(x=>x.chain!=='robinhood');
 incomplete.unresolved_planned_pages_this_run=[];
 incomplete.proven_successful_pages_this_run=5;
 incomplete.has_unresolved_page_gaps=false;
 incomplete.status_is_not_successful_capture=false;
 const altered=assessCaptureCompletion({...args,journal:incomplete});
 assert.ok(altered.missing_requested_chains.includes('robinhood'));
 assert.equal(altered.workflow_may_report_success,false);
 const notFinal=assessCaptureCompletion({...args,journal:{...args.journal,state:'STARTED_NOT_FINALIZED'}});
 assert.ok(notFinal.reasons.includes('RUNNER_NOT_FINALIZED'));
});
test('QA-03: a deliberately bounded two-chain page budget is valid incremental progress, not an API failure',async()=>{
 const args=await archived();
 const selected=new Set(['ethereum','bsc']);
 const journal=structuredClone(args.journal);
 journal.planned_pages=journal.planned_pages.filter(p=>selected.has(p.chain));
 journal.http_receipts=journal.http_receipts.filter(r=>
  r.provider!=='GECKOTERMINAL'||[...selected].some(c=>r.body_path.includes('gecko-'+c+'-page')));
 journal.proven_successful_pages_this_run=2;
 journal.unresolved_planned_pages_this_run=[];
 journal.has_unresolved_page_gaps=false;
 journal.status_is_not_successful_capture=false;
 const evidence=structuredClone(args.evidence);
 evidence.page_capture_failures=[];
 evidence.page_capture_deferred=[];
 const outcome=assessCaptureCompletion({...args,journal,evidence});
 assert.equal(outcome.workflow_may_report_success,true);
 assert.equal(outcome.status,'BOUNDED_SAMPLE_COMPLETE_COVERAGE_INCOMPLETE');
 assert.equal(outcome.verified_http200_planned_pages,2);
 assert.equal(outcome.missing_requested_chains.length,4);
 assert.deepEqual(outcome.reasons,[]);
 assert.deepEqual(outcome.coverage_warnings,['REQUESTED_CHAINS_OUTSIDE_SUCCESSFUL_SAMPLE']);
 assert.equal(outcome.global_market_coverage_proven,false);
});

test('QA-03: workflow always commits any partial raw and state before refusing to report success',async()=>{
 const yaml=await readFile('.github/workflows/cleanroom-dot2-capture.yml','utf8');
 const commit=yaml.indexOf('Commit research feed and partial recovery state');
 const verification=yaml.indexOf('Report incomplete or failed research capture honestly');
 assert.ok(commit>0&&verification>commit);
 assert.ok(yaml.slice(verification).includes('node scripts/v19-assert-capture-completion.mjs'));
 assert.ok(yaml.slice(commit,verification).includes('git add research/feeds/ research/state/'));
 assert.match(yaml,/if: \$\{\{ always\(\) && steps\.dot2_capture\.outcome != 'skipped' \}\}/);
 assert.doesNotMatch(yaml,/signals\/orders\//);
});
