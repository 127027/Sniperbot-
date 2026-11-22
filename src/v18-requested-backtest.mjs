// R29 V1.8: on-demand 24-hour historical SHADOW evaluator for the five roles.
// NO provider requests, GitHub writes, order publication, wallet, or real Paper balance changes.
// The five roles below are deterministic REPLAY AUDITS, not historical GPT-Dot executions.
import {replaySignalDecisions} from './point-in-time-strategy.mjs';
import {build29HourAsOfTimeline} from './v19-backtest-window.mjs';
import {auditFiveDotExecution} from './v19-dot-execution-audit.mjs';
import {buildDotExecutionTruth} from './v19-dot5-execution-truth.mjs';
import {buildSeparatedPerformanceLedgers} from './v19-three-ledger-report.mjs';
import {summarizeDot3RiskStatuses} from './v19-dot3-risk-status.mjs';
import {resolveSharedPaperPolicy,DEFAULT_BUDGET_SETTINGS} from './v19-paper-budget-policy.mjs';
const dayMs=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)
  &&Number.isFinite(Date.parse(d+'T00:00:00Z'))?Date.parse(d+'T00:00:00Z'):null;
const stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
const sha=v=>typeof v==='string'&&/^[0-9a-f]{40}$/.test(v);
const VALID_INPUT_KINDS=['CONTEMPORANEOUS_RECORD','SYNTHETIC_TEST'];
export function backtestOnRequest({date,manifest=null,forceHourlyDiagnostic=false,
 paperBudgetSettings=DEFAULT_BUDGET_SETTINGS}={}){
 const start=dayMs(date);
 if(start===null||typeof forceHourlyDiagnostic!=='boolean')throw Error('INVALID_BACKTEST_DAY_OR_MODE');
 const source=manifest??{schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',date,
  selected_from_future_winner_list:false,snapshots:[],activity_observations:[]};
 if(source.schema!==1||source.kind!=='R29_V18_ASOF_REPLAY_INPUT'||source.date!==date
    ||source.selected_from_future_winner_list!==false
    ||!Array.isArray(source.snapshots)||!Array.isArray(source.activity_observations)
    ||(source.activity_page_captures!==undefined&&!Array.isArray(source.activity_page_captures))
    ||(source.claimed_gpt_journals!==undefined&&!Array.isArray(source.claimed_gpt_journals))
    ||(source.dot3_risk_handoffs!==undefined&&!Array.isArray(source.dot3_risk_handoffs)))
   throw Error('UNTRUSTED_OR_HINDSIGHT_UNIVERSE');
 const paperBudget=resolveSharedPaperPolicy(paperBudgetSettings);
 const sources=source.snapshots;
 const accepted=[],rejected=[],first=start,end=start+86400000;
 for(let i=0;i<sources.length;i++){
   const s=sources[i],at=stamp(s?.observed_at_utc),captured=stamp(s?.archived_at_utc);
   if(!VALID_INPUT_KINDS.includes(s?.provenance)){
     rejected.push({index:i,reason:'POST_EVENT_OR_UNKNOWN_ORIGIN'});continue;
   }
   if(at===null||captured===null||at>=end||captured>=end||captured<at){
     rejected.push({index:i,reason:'DATE_OR_CAPTURE_CONFLICT'});continue;
   }
   if(s.provenance==='CONTEMPORANEOUS_RECORD'&&!sha(s.source_archive_sha)){
     rejected.push({index:i,reason:'ARCHIVE_DIGEST_NOT_SUPPLIED'});continue;
   }
   accepted.push(s);
 }
 // Synthetic inputs are for software regression only. They can never prove
 // a real historical market, even if the model produces simulated fills.
 const timeLine=build29HourAsOfTimeline({date,snapshots:accepted,warmupHours:5});
 const result=replaySignalDecisions({date,snapshots:accepted,
  activityObservations:source.activity_observations,
  activityPageCaptures:source.activity_page_captures||[],
  forceHourlyReview:forceHourlyDiagnostic,targetPer24h:forceHourlyDiagnostic?24:4,
  paperPolicy:paperBudget.policy});
 const executionProvenance=auditFiveDotExecution({
   events:result.events,asOfUtc:new Date(end).toISOString(),
   mode:'HISTORICAL_ASOF',
   claimedGptJournals:source.claimed_gpt_journals||[]
 });
 const original=accepted.filter(s=>s.provenance==='CONTEMPORANEOUS_RECORD');
 const simulated=accepted.filter(s=>s.provenance==='SYNTHETIC_TEST');
 // Replay and current Dot2 capture use the same Dot3 status engine.
 // These optional imported handoffs remain unverified research only: they
 // never make an actual GPT run, Dot3 signature or an executable Paper order.
 const dot3RiskPreviews=(source.dot3_risk_handoffs||[]).map(({as_of_utc,handoff})=>{
   const at=stamp(as_of_utc),captured=stamp(handoff?.source_capture_utc);
   if(at===null||at<start-5*3600000||at>=end
     ||captured===null||captured>at)
     throw Error('FUTURE_OR_UNVERIFIED_DOT3_REPLAY_HANDOFF');
   return summarizeDot3RiskStatuses({
     handoff,asOfUtc:as_of_utc,mode:'HISTORICAL_ASOF'
   });
 });
 const perRole={
  dot1_tempo:{full_reviews:result.summary.fullReviews,
   selected_levels:result.events.map(e=>({at_utc:e.at_utc,target:e.target_per_24h,due:e.full_review,
    reason:e.cadence_reason,measured_activity:e.measured_page_activity?.metrics??null})),
   coverage_recovery_plans:result.events.map(e=>({at_utc:e.at_utc,
    missing_or_stale_chains:e.data_gap_capture_recommendations?.missing_or_stale_chains??null,
    recommended_capture_requests:e.data_gap_capture_recommendations?.recommended_capture_requests??[]})),
   coverage_recovery_is_planning_not_api_execution:true,
   observed_source_pages:source.activity_page_captures?.length||0,
   observed_page_activity_is_not_all_market_coverage:true,
   simulation_not_autonomous_gpt:true},
  dot2_discovery:{accepted_input_snapshots:accepted.length,original_capture_claims:original.length,
   synthetic_test_snapshots:simulated.length,rejected_input_snapshots:rejected.length,
   all_discovery_original_sources_independently_verified:false,
   known_original_full_market_universe:false},
  dot3_risk:{snapshots_claiming_eligible:accepted.filter(s=>s.risk?.status==='ELIGIBLE').length,
   approved_independent_dot3_evidence_proven:false,
   actual_dot3_paper_approvals:0,
   common_risk_status_engine:'R29_V19_DOT3_RISK_STATE',
   risk_status_previews:dot3RiskPreviews,
   risk_status_previews_are_not_issuer_authenticated:true},
  dot4_strategy:{decision_source:'DETERMINISTIC_SHARED_DOT4_SIGNAL_KERNEL_NOT_GPT',
    decision_engine:'UNIFIED_V18_SIGNAL_V1',same_signal_and_evidence_gates_as_live_paper:true,
   model_buys:result.summary.buys,model_sells:result.summary.sells,
   timeline:result.events,actual_git_orders:0,client_fills:0},
  dot5_control:{future_winner_labels_used_for_entries:false,
   skipped_inputs:rejected,
   data_gap_hours:result.summary.dataGap,
   verified_history_not_assumed_from_sha_text:true,
   result_not_a_live_paper_receipt:true}
 };
 const missing=original.length===0;
 const report={schema:1,kind:'R29_V18_ON_DEMAND_FIVE_ROLE_SHADOW_BACKTEST',
  date,start_utc:new Date(first).toISOString(),end_utc:new Date(end).toISOString(),
  historical_warmup_start_utc:timeLine.begin_utc,
  historical_warmup_hours:timeLine.warmup_hours,
  on_demand_29h_timeline:timeLine,
  status:missing?'DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE':'PROVISIONAL_ASOF_SOURCE_AUTHENTICITY_NOT_VERIFIED',
  mode:forceHourlyDiagnostic?'EXPLICIT_FIXED_24_HOURLY_DIAGNOSTIC':'ADAPTIVE_4_8_12_24',
  start_capital_test_usdc:paperBudget.policy.startingBalance,
  amount_per_coin_test_usdc:paperBudget.policy.entryAmount,
  max_open_positions:paperBudget.policy.maxPositions,
  shared_paper_budget_policy_id:paperBudget.policy_id,
  source_input_kind:source.kind,common_signal_engine:'UNIFIED_V18_SIGNAL_V1',
   same_signal_engine_for_live_and_backtest:true,
   source_input_count:sources.length,
  accepted_input_count:accepted.length,rejected_input_count:rejected.length,
  role_audit:perRole,role_execution_provenance:executionProvenance,
  model_replay_summary:result.summary,
  // Model exchange receipts stay in a separate provenance namespace and are
  // NEVER accepted as real Windows/GitHub client fills or actual GPT outputs.
  isolated_model_receipts:result.isolated_model_receipts,
  isolated_model_trade_history:result.isolated_model_trade_history,
  model_ending_cash_test_usdc:result.ending_cash_test_usdc,
  model_open_positions:result.positions_end,
  historical_proven_trades:0,confirmed_paper_orders:0,confirmed_paper_fills:0,
  historical_gpt_dot_runs:0,
  independent_risk_and_source_authenticity_verified:false,
  retrospective_oracle_consulted_before_decisions:false,
  outcome_labels_consulted_before_decisions:false,
  must_not_report_as_real_gpt_decision_or_historical_pnl:true,
  warnings:[
   'Five named roles represent replay assessments, not five actual autonomously running GPT tasks.',
   'Claimed source SHA strings are not independent proof that a Git commit or provider quote existed at the historical decision time.',
   'No hindsight winner list is loaded into historical decision inputs.',
   'Oracle or future outcome labels must be evaluated in a separate post-replay step.',
   'No GitHub signal, local paper account, wallet, or receipt is modified.'
  ]};
 report.dot_execution_truth=buildDotExecutionTruth({
  roleAudit:executionProvenance,asOfUtc:report.end_utc});
 report.separated_performance_ledgers=buildSeparatedPerformanceLedgers({
  replayReport:report,asOfUtc:report.end_utc});
 return report;
}
