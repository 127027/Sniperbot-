// R29 original 61-task contract: re-audit each PARTIAL against the ORIGINAL
// acceptance sentence, not the implementation-coverage percentage.
// A public API HTTP200 or passing test cannot promote live GPT / Windows /
// independent sellability / genuine October as-of data into a PASS.
const groups=Object.freeze({
 CAPTURE_AND_PROVIDER_SLA:[
  'SYS-05','SYS-10','SYS-11','SYS-14','D1-04','D1-05','D2-01',
  'D2-02','D2-04','D2-05','D2-07','D2-08','QA-03'
 ],
 SOURCE_IDENTITY_AND_RISK:[
  'SYS-07','D2-03','D2-10','D3-02','D3-03','D3-06','D3-07'
 ],
 ACTUAL_GPT_REVIEW_AND_CADENCE:[
  'SYS-08','D1-01','D1-02','D1-03','D1-06','D1-07','D4-01',
  'D5-03','D5-07'
 ],
 NEUTRAL_OUTCOMES_AND_HOLDOUT:[
  'SYS-12','D4-02','D4-03','D4-05','D4-06','D5-01','D5-04',
  'D5-05','QA-05'
 ],
 REAL_WINDOWS_PAPER_RECEIPTS:[
  'SYS-09','D4-04','D4-08','D4-09','D5-02','D5-06','QA-01','QA-04'
 ]
});
export const PARTIAL_NEXT_EVIDENCE=Object.freeze({
 'SYS-05':'Repeat small six-chain bounded captures across consecutive windows; audit failed-page resume and complete candidate queue.',
 'SYS-07':'Recheck every original raw byte/hash/Git-blob and timestamp; require independently authenticated October capture time before claiming it.',
 'SYS-08':'Obtain actual signed distinct GPT review journals for five roles; keep deterministic model events separately marked.',
 'SYS-09':'Obtain independent read-only before/after hashes of the existing Windows paper account; do not operate on its files here.',
 'SYS-10':'Prove immutable evidence replay after restart across months; do not mistake temporary Actions gzip artifacts for permanent storage.',
 'SYS-11':'Exercise additional real cooldown/retry windows and verify no silent provider-limit or page loss.',
 'SYS-12':'Create a frozen neutral complete as-of pool denominator, including negative and untradeable pools and honest unknown labels.',
 'SYS-14':'Measure multi-hour provider/queue/GPT and Actions cost; missing financial and token readings remain null.',
 'D1-01':'Compare matched 24h activity cohorts across high/low momentum to test rate response rather than one-page counts.',
 'D1-02':'Demonstrate DATA_GAP → source retry, not quiet market, over a real review cycle.',
 'D1-03':'Verify first GPT review can request 24 then hysteretically decrease 24/12/8/4 on genuine executed full reviews.',
 'D1-04':'Provide actual independent frequent quote/position monitoring while full GPT reviews remain only 4 in a real day.',
 'D1-05':'Measure real six-chain coverage and P95 wait/max page backlog aging across subsequent provider windows.',
 'D1-06':'Compare actual GPT completion receipts, skipped reviews, token and cost accounting for 4/8/12/24.',
 'D1-07':'Evaluate pre-frozen cost/utility thresholds prospectively using real reviews and independent outcomes.',
 'D2-01':'Prove all six chains receive scheduled and HTTP200 page captures in the specified warmup/evaluation window.',
 'D2-02':'Verify each requested page in a bounded shifting-offset page set and preserve missing page IDs for retry.',
 'D2-03':'Resolve or explicitly quarantine all 65 post-event identities using exact typed chain/pool/token, never winner symbols for entry.',
 'D2-04':'Capture at least two real same-pool price observations separated in time; retro-OHLCV must remain separate from original as-of.',
 'D2-05':'Obtain real older-pool reactivation observations available before any decision and compare to never-seen prior pools.',
 'D2-07':'Measure Hot versus Fair queue P95 fresh-to-risk and ensure no starvation of old/negative pools over multiple captures.',
 'D2-08':'Track every original pool through ranking/deferred/hot-recheck queue and verify no truncation before Top-K.',
 'D2-10':'Validate exact onchain typed chain, contract and pool matching for the five provider chains, including negative cases.',
 'D3-02':'Prove distinct underlying upstream prices rather than merely two HTTP hostnames for exact same market.',
 'D3-03':'Independently verify upstream provider quote-as-of and source-age classes; never backfill timestamp from HTTP arrival.',
 'D3-06':'Compare pre-frozen size/slippage/risk sensitivities with neutral false-buy and missed-buy outcomes.',
 'D3-07':'Measure genuine risk-unblock latency and evidence TTL from authorized recheck to final decision, with retries.',
 'D4-01':'Run same unified Dot4 decision through trusted signed Dot3 publisher and separately verified Paper-client receipt.',
 'D4-02':'Prospectively evaluate frozen momentum/volume/liquidity regimes against untouched baseline and losers.',
 'D4-03':'Evaluate fixed TP, trailing, partial and timed exit including slippage on neutral matured paths.',
 'D4-04':'Demonstrate real read-only independent position monitoring and protected exit between GPT reviews; no quote=no fill.',
 'D4-05':'Study genuine realized loss lot and later reentry on neutral holdout without cherry-picked recoveries.',
 'D4-06':'Score 1/3/6h endpoint, observed intrahorizon peak and drawdown on dense time-matured neutral paths.',
 'D4-08':'Prove STOP+Dot4 concurrent SELL idempotent within actual client order/accept/fill/blocked/receipt chain.',
 'D4-09':'Verify real dashboard shows all open client positions and last known quote/risk/receipt age with no fabricated fill.',
 'D5-01':'Join 65 winner oracle references only after decision end to a complete unselected October pool denominator.',
 'D5-02':'Provide signed end-to-end event lineage from original source and risk through actual decision, order and receipt.',
 'D5-03':'Cross-check real GPT inputs, outputs and costs against deterministic simulated role timeline.',
 'D5-04':'Verify each claimed missed opportunity with actual event+outcome evidence; leave unmeasured profit null.',
 'D5-05':'Evaluate 1/3/6h mature positive/negative holdout cohorts with purging and frozen predecision parameters.',
 'D5-06':'Prove original Oracle, synthetic model and real client-Paper profit ledgers never mix and source-specific totals reconcile.',
 'D5-07':'Measure real per-Dot tasks/queue/duration/P50/P95/errors/token costs, not approximate HTTP activity.',
 'QA-01':'Demonstrate same versioned state and input has equal action/reason in historical/current modes with independent risk proof.',
 'QA-03':'Run multi-window six-chain paging/429 provider recovery, demonstrating preserved pending pages across restarts.',
 'QA-04':'Perform isolated true October 29h E2E with source-time-authenticated neutral population and separate client-level receipts.',
 'QA-05':'Wait for genuine frozen Nov prospective validation+holdout windows and score a complete neutral denominator.'
});
const clk=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function auditAllPartialOriginalAcceptance({
 originalCatalog,strictRegister,latestCaptureEvidence,
 latestCaptureReport,providerBudget,holdout,asOfUtc
}={}){
 const now=clk(asOfUtc);
 if(now===null||typeof originalCatalog!=='string'
  ||strictRegister?.kind!=='R29_V19_STRICT_OFFLINE_RECONCILED_61_TASK_REGISTER'
  ||!Array.isArray(strictRegister.tasks)||strictRegister.tasks.length!==61
  ||latestCaptureEvidence?.kind!=='DOT2_PUBLIC_CAPTURE_EVIDENCE'
  ||latestCaptureReport?.kind!=='LATEST_DOT2_PUBLIC_CAPTURE_POINTER'
  ||latestCaptureReport.evidence_path===undefined
  ||latestCaptureEvidence.request_path!==latestCaptureReport.request_path
  ||providerBudget?.kind!=='R29_V19_PERSISTENT_PROVIDER_BUDGET'
  ||holdout?.kind!=='R29_V19_PRECOMMITTED_TEMPORAL_HOLDOUT')
  throw Error('INVALID_ORIGINAL_ACCEPTANCE_REAUDIT');
 const catalog=new Map();
 for(const line of originalCatalog.split('\n')){
  if(!/^\| (?:SYS|D[1-5]|QA)-\d{2}\s*\|/.test(line))continue;
  const fields=line.split('|').slice(1).map(v=>v.trim());
  if(catalog.has(fields[0]))throw Error('DUPLICATE_ORIGINAL_TASK_ID');
  catalog.set(fields[0],{id:fields[0],priority:fields[1],
   original_problem:fields[2],planned_solution:fields[3],
   original_acceptance:fields[4]||fields[3]||null});
 }
 const entries=strictRegister.tasks;
 if(catalog.size!==61||new Set(entries.map(x=>x.id)).size!==61
  ||entries.some(x=>!catalog.has(x.id))||entries.some(x=>!['PASS','PARTIAL','OPEN'].includes(x.status)))
  throw Error('ORIGINAL_61_CATALOG_OR_REGISTER_MISMATCH');
 const expected=new Map();
 for(const [domain,ids] of Object.entries(groups))for(const id of ids){
  if(expected.has(id))throw Error('DUPLICATE_PARTIAL_DOMAIN_'+id);
  expected.set(id,domain);
 }
 const selected=entries.filter(e=>e.status==='PARTIAL');
 if(selected.length!==46||expected.size!==46
  ||Object.keys(PARTIAL_NEXT_EVIDENCE).length!==46
  ||selected.some(e=>!expected.has(e.id)||!PARTIAL_NEXT_EVIDENCE[e.id]))
  throw Error('UNRECONCILED_46_PARTIAL_TASKS');
 const urls=(latestCaptureEvidence.api_evidence||[]).map(r=>r.body_path);
 if(!urls.length||urls.some(x=>typeof x!=='string'||!x.startsWith('research/feeds/')))
  throw Error('MISSING_LATEST_RAW_RECEIPT_REFERENCES');
 const http200=latestCaptureEvidence.api_evidence.filter(r=>r.http_status===200).length,
  http429=latestCaptureEvidence.api_evidence.filter(r=>r.http_status===429).length;
 const recorded=clk(latestCaptureEvidence.captured_completed_at_utc);
 if(recorded===null||recorded>now)throw Error('FUTURE_OR_MISSING_LATEST_CAPTURE');
 const validationMature=now>=clk(holdout.validation_end_utc),
  holdoutMature=now>=clk(holdout.holdout_end_utc);
 const blockers={
  CAPTURE_AND_PROVIDER_SLA:'NO_PROVEN_LONGITUDINAL_SIX_CHAIN_AND_QUEUE_COVERAGE',
  SOURCE_IDENTITY_AND_RISK:'NO_INDEPENDENT_UPSTREAM_AND_AUTHENTICATED_HISTORICAL_SOURCE_PROOF',
  ACTUAL_GPT_REVIEW_AND_CADENCE:'NO_VERIFIED_FIVE_DOT_GPT_EXECUTION_IN_THIS_CAPTURE',
  NEUTRAL_OUTCOMES_AND_HOLDOUT:'NO_COMPLETE_MATURED_NEUTRAL_ORIGINAL_OCTOBER_UNIVERSE',
  REAL_WINDOWS_PAPER_RECEIPTS:'NO_AUTHENTICATED_LOCAL_WINDOWS_CLIENT_ORDER_AND_RECEIPT_AUDIT'
 };
 const reviews=selected.map(task=>{
  const original=catalog.get(task.id),group=expected.get(task.id);
  const notice=group==='NEUTRAL_OUTCOMES_AND_HOLDOUT'&&!holdoutMature
   ?'PRECOMMITTED_FUTURE_HOLDOUT_NOT_MATURE'
   :blockers[group];
  return {
   task_id:task.id,original_priority:original.priority,
   status:'PARTIAL_UNTIL_ORIGINAL_ACCEPTANCE',
   domain:group,
   original_acceptance_sentence:original.original_acceptance,
   original_problem:original.original_problem,
   next_verifiable_action:PARTIAL_NEXT_EVIDENCE[task.id],
   primary_unmet_gate:notice,
   current_live_capture_http200:http200,
   latest_source_archive:latestCaptureReport.evidence_path,
   true_gpt_reviews_verified_by_this_capture:0,
   true_windows_client_receipts_verified_by_this_capture:0,
   original_october_market_observations_authenticated_by_this_capture:0,
   any_order_published_from_this_audit:false,
   do_not_promote_to_PASS_from_unit_tests_alone:true
  };
 });
 const counts=Object.fromEntries(Object.keys(groups).map(k=>[k,reviews.filter(x=>x.domain===k).length]));
 return {
  schema:1,kind:'R29_V19_ALL_46_ORIGINAL_PARTIAL_ACCEPTANCE_REAUDIT',
  as_of_utc:asOfUtc,catalog_task_count:61,
  counted_pass_tasks:entries.filter(x=>x.status==='PASS').length,
  counted_partial_tasks:reviews.length,
  counted_open_tasks:entries.filter(x=>x.status==='OPEN').length,
  current_technical_worked_on_pct:strictRegister.technically_touched_pct,
  strict_pass_pct:strictRegister.fully_accepted_pct,
  task_id_integrity_checked:true,domain_counts:counts,
  current_live_capture:{evidence_path:latestCaptureReport.evidence_path,
   recorded_at_utc:latestCaptureEvidence.captured_completed_at_utc,
   raw_receipt_count:urls.length,http200,http429,
   all_raw_paths_retained:urls,
   external_origin_capture_timestamp_independently_proven:false},
  provider_cooldown_until_utc:providerBudget.providers?.GECKOTERMINAL?.cooldown_until_utc??null,
  precommitted_holdout:{frozen_at_utc:holdout.frozen_at_utc,
   validation_start_utc:holdout.validation_start_utc,
   validation_end_utc:holdout.validation_end_utc,
   holdout_start_utc:holdout.holdout_start_utc,
   holdout_end_utc:holdout.holdout_end_utc,
   validation_window_elapsed:validationMature,
   holdout_window_elapsed:holdoutMature,
   outcome_denominator_verified:false},
  historical_original_october_29h_universe_verified:false,
  next_backtest_mode:'OCTOBER_ORIGINAL_DATA_GAP_SEPARATE_FROM_PROSPECTIVE_NOVEMBER_HOLDOUT',
  fully_accepted_tasks_not_inflated:true,
  no_paper_orders_published:true,
  // GitHub-only data cannot inspect ChatGPT automation enabled state.
  // The five independent Dots were explicitly resumed outside GitHub.
  dot_automation_enabled_state_verified_from_this_github_capture:null,
  dot_automations_can_run_independently_of_provider_capture:true,
  actual_gpt_dot_reviews_authenticated_by_this_capture:0,
  review_entries:reviews
 };
}
