// R29 QA-04/SYS-06: execute THREE actual 29h research CLI runs on this runner.
// No-source October gap, synthetic profit, and a synthetic loss + 6 shadows.
// Neither mode imports the 65 winner references, calls provider APIs, starts
// GPT Dots, publishes GitHub orders, or modifies Windows-client Paper state.
import {spawnSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateManualBacktestRequest} from '../src/v19-manual-backtest-request.mjs';

const date='2026-10-12';
const syntheticPath='research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json';
const acceptance=validateManualBacktestRequest({
 date,inputPath:syntheticPath,ref:process.env.GITHUB_REF||
 'refs/heads/codex/r29-cleanroom-paper-20261121'
});
const manifest=JSON.parse(await readFile(syntheticPath,'utf8'));
if(acceptance.paper_order_publication_allowed!==false
 ||manifest.date!==date||manifest.kind!=='R29_V18_ASOF_REPLAY_INPUT'
 ||manifest.selected_from_future_winner_list!==false
 ||manifest.snapshots?.length!==4
 ||!manifest.snapshots.every(row=>row.provenance==='SYNTHETIC_TEST'
   &&row.source_class==='SYNTHETIC_TEST')
 ||manifest.real_historical_provider_evidence_count!==0)
 throw Error('QA04_SYNTHETIC_FIXTURE_NOT_ISOLATED');

await mkdir('probe-artifacts',{recursive:true});
async function runScenario(name,inputPath=null){
 const filename='probe-artifacts/v19-qa04-'+name+'-29h-'+date+'.json';
 const args=['scripts/v18-backtest-on-demand.mjs','--date',date,
  '--output',filename,...(inputPath?['--input',inputPath]:[])];
 const execution=spawnSync(process.execPath,args,{
  encoding:'utf8',maxBuffer:5*1024*1024,timeout:120_000,
  env:{...process.env,R29_MODE:'PAPER',R29_ENABLE_LIVE:''}
 });
 if(execution.status!==0||execution.signal)
  throw Error('QA04_CLI_FAILED_'+name+': '+(execution.stderr||execution.stdout).slice(0,2500));
 if(!execution.stdout.includes('R29_V18_BACKTEST_ON_DEMAND'))
  throw Error('QA04_CLI_NOT_EXECUTED_'+name);
 const bytes=await readFile(filename),record=JSON.parse(bytes.toString('utf8'));
 if(record.requested_backtest?.date!==date
  ||record.protected_files_unchanged?.status!=='UNCHANGED'
  ||record.protected_files_unchanged?.proves_remote_Windows_files_unchanged!==false
  ||record.isolated_model_ledger_audit?.status!=='MODEL_CASH_AND_LOTS_RECONCILED'
  ||record.research_only_receipt?.simulation!==true
  ||record.research_only_receipt?.not_a_paper_client_receipt!==true
  ||record.research_only_receipt?.never_post_to_github_signals!==true
  ||record.requested_backtest?.confirmed_paper_fills!==0
  ||record.requested_backtest?.confirmed_paper_orders!==0
  ||record.requested_backtest?.historical_proven_trades!==0
  ||record.requested_backtest?.historical_gpt_dot_runs!==0
  ||record.requested_backtest?.on_demand_29h_timeline?.hourly_ticks!==29)
  throw Error('QA04_REPLAY_RESULT_DID_NOT_PASS_GATES_'+name);
 const report=record.requested_backtest,audit=record.isolated_model_ledger_audit;
 const research=record.offline_research_experiments;
 if(research?.kind!=='R29_V19_SIX_OFFLINE_BACKLOG_SHADOW_EXPERIMENTS'
   ||research.actual_gpt_dots_executed!==0||research.paper_orders_authorized!==0
   ||research.d1_07_cadence_utility?.budgets?.length!==4)
   throw Error('OFFLINE_SIX_SHADOWS_MISSING_FROM_REAL_CLI_'+name);
 return {name,source_scope:inputPath?'SYNTHETIC_QA_ONLY':'OCTOBER_NO_INDEPENDENT_ORIGINAL_INPUT',
  artifact:filename,sha256:createHash('sha256').update(bytes).digest('hex'),
  source_evidence_claim:report.status,
  warmup_ticks:report.on_demand_29h_timeline.warmup_hours,
  decision_ticks:report.on_demand_29h_timeline.decision_hours,
  adaptive_gpt_review_target_not_actual_gpt:report.model_replay_summary.fullReviews,
  data_gap_hours:report.model_replay_summary.dataGap,
  model_buys:audit.modeled_buys,model_sells:audit.modeled_sells,
  synthetic_model_receipts:audit.model_receipt_count,
  initial_cash_test_usdc:audit.starting_cash_test_usdc,
  final_cash_test_usdc:audit.modeled_cash_end_test_usdc,
  modeled_realized_pnl_test_usdc:audit.modeled_realized_pnl_test_usdc,
  shadow_cadence_budgets:research.d1_07_cadence_utility.budgets.map(x=>x.target_model_reviews_per_24h),
  shadow_regimes:research.d4_02_regime.map(x=>x.regime),
  shadow_protective_statuses:research.d4_04_protective.checks.map(x=>x.status),
  shadow_reentry_watch:research.d4_05_loss_reentries.map(x=>x.experimental_reentry_watch),
  shadow_horizon_dense:research.d4_06_forecast_paths.map(x=>x.horizon_metrics[6]?.dense_sampling_within_horizon),
  shadow_validation_statuses:research.d5_05_temporal_holdout.map(x=>x.cohorts.VALIDATION.metric_status),
  genuine_holdout_evaluations:research.d5_05_temporal_holdout.filter(x=>x.genuine_market_holdout_performance_verified).length,
  no_actual_paper_fills:true,verified_remote_windows_files:false};
}
const empty=await runScenario('no-contemporaneous-source');
if(empty.source_evidence_claim!=='DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE'
 ||empty.data_gap_hours!==24||empty.model_buys!==0||empty.model_sells!==0
 ||empty.synthetic_model_receipts!==0||empty.initial_cash_test_usdc!==5000
 ||empty.final_cash_test_usdc!==5000)
 throw Error('QA04_NO_SOURCE_MUST_REMAIN_DATA_GAP');
const synthetic=await runScenario('synthetic-model-buy-sell',syntheticPath);
if(synthetic.source_evidence_claim!=='DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE'
 ||synthetic.model_buys!==1||synthetic.model_sells!==1
 ||synthetic.synthetic_model_receipts!==2
 ||synthetic.initial_cash_test_usdc!==5000
 ||synthetic.modeled_realized_pnl_test_usdc<=0)
 throw Error('QA04_SYNTHETIC_MODEL_CHAIN_NOT_VERIFIED');
const shadowLoss=await runScenario('synthetic-loss-six-shadows',
 'research/backtest-inputs/2026-10-12/qa80-six-offline-shadows-synthetic.json');
if(shadowLoss.source_evidence_claim!=='DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE'
 ||shadowLoss.model_buys!==1||shadowLoss.model_sells!==1
 ||shadowLoss.synthetic_model_receipts!==2
 ||shadowLoss.modeled_realized_pnl_test_usdc>=0
 ||JSON.stringify(shadowLoss.shadow_cadence_budgets)!=='[4,8,12,24]'
 ||JSON.stringify(shadowLoss.shadow_regimes)!=='["ACCELERATING_SHADOW"]'
 ||JSON.stringify(shadowLoss.shadow_protective_statuses)!=='["SHADOW_SELL_CANDIDATE"]'
 ||JSON.stringify(shadowLoss.shadow_reentry_watch)!=='["RECOVERY_WATCH_ONLY"]'
 ||JSON.stringify(shadowLoss.shadow_horizon_dense)!=='[true]'
 ||JSON.stringify(shadowLoss.shadow_validation_statuses)!=='["SYNTHETIC_COHORT_SCORE_ONLY"]'
 ||shadowLoss.genuine_holdout_evaluations!==0)
 throw Error('QA80_SIX_BACKLOG_SHADOW_ACTUAL_CLI_NOT_VERIFIED');
const summary={schema:1,kind:'R29_V19_29H_REAL_OFFLINE_CLI_ACCEPTANCE',
 executed_at_utc:new Date().toISOString(),
 source_commit_sha:process.env.GITHUB_SHA||null,
 workflow_run_id:process.env.GITHUB_RUN_ID||null,
 requested_date:date,historical_window_utc:{
  from:'2026-10-11T19:00:00.000Z',through:'2026-10-13T00:00:00.000Z'
 },
 scenarios:[empty,synthetic,shadowLoss],
 oracle_winner_references_used_as_discovery_inputs:false,
 exchange_receipts_proven:'SYNTHETIC_MODEL_ONLY',
 actual_gpt_dots_executed:0,real_provider_http_requests:0,
 real_or_existing_client_orders_created:0,
 remote_windows_client_balance_observed_or_verified:false,
 synthetic_pnl_must_not_be_reported_as_historical_performance:true,
 nontrading_checkout_without_push_permissions:true};
const out='probe-artifacts/v19-qa04-29h-acceptance-summary.json';
await writeFile(out,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log('R29_V19_29H_OFFLINE_ACCEPTANCE',JSON.stringify({
 status:'PASS',scenarios:summary.scenarios,
 actual_gpt_dots:summary.actual_gpt_dots_executed,actual_trades:0,
 source_commit_sha:summary.source_commit_sha,summary_path:out
}));
