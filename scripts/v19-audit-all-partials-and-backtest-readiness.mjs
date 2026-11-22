// Read-only local/GitHub CI acceptance audit. NO network access, order
// publication, trading, Dots or modifications of persisted research state.
// The output is an isolated Actions artifact, not a verified GPT run.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {auditAllPartialOriginalAcceptance}
 from '../src/v19-partial-acceptance-readiness.mjs';
import {verifyArchivedHttpBytes} from '../src/v19-source-integrity.mjs';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
const [originalCatalog,strictRegister,latestCaptureReport,providerBudget,holdout]=
 await Promise.all([
  readFile('docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md','utf8'),
  read('research/audits/2026-11-22/r29-v19-offline-61-task-reconciliation.json'),
  read('research/feeds/latest.json'),
  read('research/state/provider-budget.json'),
  read('research/state/prospective-holdout-freeze.json')
 ]);
const latestCaptureEvidence=await read(latestCaptureReport.evidence_path);
const asOfUtc=process.env.R29_ACCEPTANCE_AUDIT_ASOF_UTC??new Date().toISOString();
const results=auditAllPartialOriginalAcceptance({
 originalCatalog,strictRegister,latestCaptureEvidence,
 latestCaptureReport,providerBudget,holdout,asOfUtc
});
const receipts=[];
for(const item of latestCaptureEvidence.api_evidence){
 const raw=await readFile(item.body_path,'utf8');
 const check=verifyArchivedHttpBytes({
  rawText:raw,evidence:item,sourcePath:item.body_path,asOfUtc
 });
 if(check.status!=='SOURCE_BYTES_VERIFIED'
  &&check.status!=='HTTP_ERROR_ARCHIVED')
  throw Error('LATEST_PUBLIC_RAW_BYTES_NOT_VERIFIED_'+item.body_path);
 receipts.push({source_path:item.body_path,sha256:sha(raw),
  http_status:item.http_status,check_status:check.status,
  source_received_at_utc:item.received_at_utc});
}
if(receipts.length===0||!receipts.some(x=>x.http_status===200)
 ||results.counted_partial_tasks!==46)
 throw Error('NO_VERIFIABLE_CAPTURE_OR_UNRECONCILED_PARTIALS');
const end=Date.parse(holdout.holdout_end_utc);
const report={...results,
 source_git_commit:process.env.GITHUB_SHA??null,
 real_original_capture_raw_sha256_verified:true,
 captured_original_raw_http_receipts:receipts,
 required_backtest_gates:{
  historical_october_29h:{
   period_start_utc:'2026-10-11T19:00:00.000Z',
   period_end_utc:'2026-10-13T00:00:00.000Z',
   warmup_hours:5,decision_hours:24,
   required_neutral_original_asof_market_input_verified:false,
   execution_allowed_for_research:'DATA_GAP_ONLY_UNLESS_AUTHENTICATED_OCTOBER_INPUT_PROVIDED',
   expected_trade_count_if_no_original_data:0,
   fake_synthetic_winner_data_forbidden:true
  },
  prospective_november_holdout:{
   frozen_at_utc:holdout.frozen_at_utc,
   validation_start_utc:holdout.validation_start_utc,
   validation_end_utc:holdout.validation_end_utc,
   holdout_start_utc:holdout.holdout_start_utc,
   holdout_end_utc:holdout.holdout_end_utc,
   full_window_matured:Date.parse(asOfUtc)>=end,
   authenticated_neutral_outcomes_with_negatives_verified:false,
   new_scan_evidence_is_not_independent_gpt_or_client_replay:true,
   safe_to_claim_real_performance:false
  }
 },
 actual_client_account_bytes_read:false,
 any_order_or_paper_fill_published:false,
 actual_gpt_review_count_in_this_audit:0,
 no_automatic_trading_activation:true
};
await mkdir('probe-artifacts',{recursive:true});
const target='probe-artifacts/v19-all-46-partial-acceptance-and-backtest-readiness.json';
await writeFile(target,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('R29_ALL_46_PARTIAL_ACCEPTANCE_AUDIT',JSON.stringify({
 status:'PASS',original_tasks:61,partial:46,pass:13,open:2,
 domains:report.domain_counts,
 latest_http_receipts:receipts.length,
 latest_http200:report.current_live_capture.http200,
 latest_http429:report.current_live_capture.http429,
 raw_sha256_verified:report.real_original_capture_raw_sha256_verified,
 original_october_market_data_ready:false,
 future_holdout_window_elapsed:report.precommitted_holdout.holdout_window_elapsed,
 gpt_executed_here:0,client_fills_here:0,orders:0,
 output:target
 }));
