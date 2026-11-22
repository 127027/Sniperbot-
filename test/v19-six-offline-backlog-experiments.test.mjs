import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {measureAsOfMarketRegime} from '../src/v19-offline-regime-shadow.mjs';
import {auditOfflineProtectiveExits} from '../src/v19-offline-protective-shadow-audit.mjs';
import {studyLossReentryRecovery} from '../src/v19-offline-loss-reentry.mjs';
import {analyzeAsOfForecastPath} from '../src/v19-offline-horizon-paths.mjs';
import {scoreFrozenTemporalOutcomes} from '../src/v19-offline-holdout-scorecard.mjs';
import {freezeProspectiveHoldout} from '../src/v19-prospective-holdout-freeze.mjs';
import {compareOfflineCadenceBudgets} from '../src/v19-offline-cadence-shadow-utility.mjs';
import {buildOfflineResearchExperimentSuite} from '../src/v19-offline-experiment-suite.mjs';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';

const date='2026-10-12',frozen='2026-10-11T19:00:00.000Z';
const asAt=i=>new Date(Date.parse('2026-10-12T06:34:00Z')+i*30*60000).toISOString();
const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40),symbol:'QA04'};
const shadow=(i,p,v=100,l=20000)=>({source_class:'SYNTHETIC_TEST',
 source_path:'research/backtest-inputs/2026-10-12/qa04-regime-synthetic.json',
 chain:'base',contract:coin.contract,pool:coin.pool,
 observed_at_utc:asAt(i),available_at_utc:asAt(i),price_usdc:p,
 volume_24h_usd:v,liquidity_usd:l});
const read=async path=>JSON.parse(await readFile(path,'utf8'));

test('D4-02: three point-in-time matched snapshots yield acceleration only in shadow',()=>{
 const observations=[shadow(-2,1,100,20000),shadow(-1,1.05,110,21000),
  shadow(0,1.15,150,22000)];
 const r=measureAsOfMarketRegime({...coin,observations,
  policyFrozenAtUtc:frozen,asOfUtc:'2026-10-12T06:35:00.000Z'});
 assert.equal(r.status,'SHADOW_REGIME_MEASURED');
 assert.equal(r.regime,'ACCELERATING_SHADOW');
 assert.equal(r.entry_signal_authorized,false);
 assert.equal(r.orders_authorized,0);
 assert.ok(r.acceleration_pct_points>0);
 const future=shadow(1,30);future.future_winner_label='AFTER_EVENT';
 const controlled=measureAsOfMarketRegime({...coin,observations:[...observations,future],
  policyFrozenAtUtc:frozen,asOfUtc:'2026-10-12T06:35:00.000Z'});
 assert.equal(controlled.regime,r.regime);
 assert.equal(controlled.rejected_count,1);
 const sparse=measureAsOfMarketRegime({...coin,observations:[observations[2]],
  policyFrozenAtUtc:frozen,asOfUtc:'2026-10-12T06:35:00.000Z'});
 assert.equal(sparse.status,'INSUFFICIENT_ASOF_REGIME_PANEL');
 assert.equal(sparse.regime,null);
});
test('D4-04: independent protective read-only checker tests a model BUY lot between 4/8 reviews',async()=>{
 const fixture=await read('research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json');
 const report=backtestOnRequest({date,manifest:fixture});
 const buy=report.isolated_model_receipts[0],at='2026-10-12T06:45:00.000Z';
 assert.equal(buy.action,'BUY');
 const sources=['https://www.geckoterminal.com/base/pools/'+coin.pool,
  'https://dexscreener.com/base/'+coin.pool];
 const two=sources.map((source_url,i)=>({...coin,source_url,
  provider_id:'test-shadow-'+i,captured_at_utc:'2026-10-12T06:44:00.000Z',
  provider_quote_asof_utc:'2026-10-12T06:44:00.000Z',
  price_usdc:.0014,liquidity_usdc:20000,
  source_archive_blob_sha:'a'.repeat(40)}));
 const response=auditOfflineProtectiveExits({
  modeledReceipts:report.isolated_model_receipts,
  asOfUtc:report.end_utc,
  samples:[{model_buy_order_id:buy.id,as_of_utc:at,observations:two},
   {model_buy_order_id:buy.id,as_of_utc:'2026-10-12T07:45:00.000Z',observations:two},
   {model_buy_order_id:buy.id,as_of_utc:'2026-10-12T06:50:00.000Z',observations:[]}]
 });
 assert.equal(response.checks[0].status,'SHADOW_SELL_CANDIDATE');
 assert.equal(response.checks[0].trigger_reason,'TAKE_PROFIT');
 assert.equal(response.checks[1].status,'MODEL_POSITION_ALREADY_CLOSED');
 assert.equal(response.checks[2].status,'EXIT_DATA_GAP');
 assert.equal(response.checks[0].actual_exit_executed,false);
 assert.equal(response.checks[0].quote_authenticity_verified,false);
 assert.equal(response.orders_created,0);
 assert.equal(response.paper_fills,0);
});
test('D4-05: prior negative MODEL receipt permits reentry shadow WATCH only after genuine recovery panel',()=>{
 const sale={id:'shadow-sell-loss-01',timestamp:'2026-10-12T06:35:00.000Z',
  action:'SELL',status:'MODELED_FILL_NOT_CLIENT',provenance:'SYNTHETIC_REPLAY_ONLY',
  verified_client_fill:false,coin,realized_pnl_test_usdc:-8.75};
 const obs=[shadow(3,.0008,100,10000),shadow(4,.0009,150,12000)];
 const p=studyLossReentryRecovery({lossReceipt:sale,observations:obs,
  asOfUtc:'2026-10-12T08:35:00.000Z',policyFrozenAtUtc:frozen});
 assert.equal(p.experimental_reentry_watch,'RECOVERY_WATCH_ONLY');
 assert.equal(p.eligible_to_instruct_gpt_buy,false);
 assert.equal(p.orders_authorized,0);
 assert.equal(p.comparative_future_pnl_test_usdc,null);
 const quiet=studyLossReentryRecovery({lossReceipt:sale,observations:obs.slice(0,1),
  asOfUtc:'2026-10-12T08:35:00.000Z',policyFrozenAtUtc:frozen});
 assert.equal(quiet.experimental_reentry_watch,'NO_CONFIRMED_RECOVERY');
 const bad=structuredClone(sale);bad.realized_pnl_test_usdc=5;
 assert.throws(()=>studyLossReentryRecovery({lossReceipt:bad,observations:obs,
  asOfUtc:'2026-10-12T08:35:00.000Z',policyFrozenAtUtc:frozen}),
  /INVALID_SHADOW_LOSS_REENTRY_STUDY/);
});
test('D4-06: mature dense 1/3/6h path scores real observed endpoint separately from intrahorizon peaks',()=>{
 const start='2026-10-12T00:00:00.000Z';
 const obs=Array.from({length:12},(_,i)=>({
  source_class:'SYNTHETIC_TEST',source_path:'research/backtest-inputs/paths.json',
  observed_at_utc:new Date(Date.parse(start)+(i+1)*30*60000).toISOString(),
  available_at_utc:new Date(Date.parse(start)+(i+1)*30*60000).toISOString(),
  price_usd:i===2?1.4:i===3?1.1:1+.02*(i+1)
 }));
 const s=analyzeAsOfForecastPath({startAtUtc:start,entryPriceUsd:1,
  observations:obs,asOfUtc:'2026-10-12T06:00:00.000Z'});
 assert.equal(s.horizon_metrics[1].endpoint_label_mature_and_present,true);
 assert.ok(s.horizon_metrics[1].observed_end_return_pct>0);
 assert.ok(s.horizon_metrics[3].observed_intrahorizon_peak_return_pct>
  s.horizon_metrics[3].observed_end_return_pct);
 assert.ok(s.horizon_metrics[3].observed_intrahorizon_max_drawdown_pct>0);
 assert.equal(s.horizon_metrics[6].endpoint_label_mature_and_present,true);
 assert.equal(s.model_orders_authorized,0);
 const sparse=analyzeAsOfForecastPath({startAtUtc:start,entryPriceUsd:1,
  observations:[obs[1],obs[5],obs[11]],asOfUtc:'2026-10-12T06:00:00.000Z'});
 assert.equal(sparse.horizon_metrics[1].dense_sampling_within_horizon,false);
 assert.equal(sparse.horizon_metrics[1].observed_intrahorizon_peak_return_pct,null);
 assert.equal(sparse.horizon_metrics[1].observed_end_return_pct,obs[1].price_usd/1*100-100);
 const early=analyzeAsOfForecastPath({startAtUtc:start,entryPriceUsd:1,
  observations:obs,asOfUtc:'2026-10-12T00:35:00.000Z'});
 assert.equal(early.horizon_metrics[1].observed_end_return_pct,null);
 assert.equal(early.horizon_metrics[6].observed_intrahorizon_max_drawdown_pct,null);
});
test('D5-05: frozen 6h purges and future-holdout outcome scarcity remain unknown, not zero wins',()=>{
 const freeze=freezeProspectiveHoldout({frozenAtUtc:'2026-10-12T00:00:00.000Z'});
 const row={source_class:'SYNTHETIC_TEST',
  source_path:'research/backtest-inputs/synthetic-labels.json',
  pool_key:'base:0x'+'a'.repeat(40),horizon_hours:1,
  predicted_probability:.9,observed_end_return_pct:30};
 const badPurge={...row,decision_at_utc:'2026-10-12T03:00:00Z',
  outcome_available_at_utc:'2026-10-12T05:00:00Z'};
 const future={...row,decision_at_utc:'2026-10-13T12:30:00Z',
  outcome_available_at_utc:'2026-10-13T13:35:00Z'};
 const at='2026-10-13T07:00:00Z';
 const s=scoreFrozenTemporalOutcomes({freeze,samples:[badPurge,future],
  asOfUtc:at,neutralDenominatorProven:true,minimumMatureLabeled:1});
 assert.equal(s.cohorts.HOLDOUT.mature_labeled_count,0);
 assert.equal(s.cohorts.HOLDOUT.horizons[1].brier,null);
 assert.equal(s.cohorts.VALIDATION.horizons[1].precision,null);
 assert.equal(s.genuine_market_holdout_performance_verified,false);
 assert.ok(s.excluded.some(x=>x.reason==='EXCLUDED_PURGED_OR_OUTSIDE_WINDOW'));
 const full=scoreFrozenTemporalOutcomes({
  freeze,samples:[{...row,decision_at_utc:'2026-10-12T07:30:00Z',
   outcome_available_at_utc:'2026-10-12T08:35:00Z'}],
  asOfUtc:'2026-10-15T00:00:00.000Z',
  minimumMatureLabeled:1,neutralDenominatorProven:true});
 assert.equal(full.cohorts.VALIDATION.metric_status,'SYNTHETIC_COHORT_SCORE_ONLY');
 assert.equal(full.cohorts.VALIDATION.horizons[1].brier,.01);
 assert.equal(full.cohorts.VALIDATION.horizons[1].precision,1);
 assert.equal(full.cohorts.VALIDATION.horizons[1].recall,1);
 const real=scoreFrozenTemporalOutcomes({
  freeze,samples:[{...row,source_class:'ORIGINAL_CAPTURE',
   decision_at_utc:'2026-10-12T07:30:00Z',
   outcome_available_at_utc:'2026-10-12T08:35:00Z'}],
  asOfUtc:'2026-10-15T00:00:00.000Z',
  minimumMatureLabeled:1,neutralDenominatorProven:true});
 assert.equal(real.cohorts.VALIDATION.horizons[1].brier,null);
 assert.equal(real.genuine_market_holdout_performance_verified,false);
});
test('D1-07: compare same 24 hourly replay windows with 4/8/12/24 shadow rates, zero tokens',()=>{
 const report=backtestOnRequest({date});
 const r=compareOfflineCadenceBudgets({
  replayEvents:report.role_audit.dot4_strategy.timeline,
  policyFrozenAtUtc:report.historical_warmup_start_utc,asOfUtc:report.end_utc
 });
 assert.deepEqual(r.budgets.map(x=>x.hypothetical_review_slots),[4,8,12,24]);
 assert.deepEqual(r.budgets.map(x=>x.sampled_hours_without_fresh_quotes),[4,8,12,24]);
 assert.equal(r.selected_optimum,null);
 assert.equal(r.actual_gpt_tokens_used,0);
 assert.equal(r.paper_orders_authorized,0);
 const manipulated=structuredClone(report.role_audit.dot4_strategy.timeline);
 manipulated[4].at_utc='2026-10-14T04:35:00.000Z';
 assert.throws(()=>compareOfflineCadenceBudgets({replayEvents:manipulated,
  policyFrozenAtUtc:report.historical_warmup_start_utc,
  asOfUtc:report.end_utc}),/CADENCE_HISTORICAL_ASOF_WINDOW_INCOMPLETE/);
});
test('Six-backlog suite is attached to the ACTUAL replay only as research, never as trading strategy',async()=>{
 const fixture=await read('research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json');
 const report=backtestOnRequest({date,manifest:fixture});
 const experiments=buildOfflineResearchExperimentSuite({report,manifest:fixture});
 assert.deepEqual(experiments.original_61_backlog_ids,
  ['D1-07','D4-02','D4-04','D4-05','D4-06','D5-05']);
 assert.equal(experiments.d1_07_cadence_utility.budgets[3].hypothetical_review_slots,24);
 assert.equal(experiments.d4_04_protective.evaluated_samples,0);
 assert.equal(experiments.paper_orders_authorized,0);
 assert.equal(experiments.real_paper_client_receipts,0);
 const cli=await readFile('scripts/v18-backtest-on-demand.mjs','utf8');
 assert.match(cli,/buildOfflineResearchExperimentSuite\(\{report,manifest\}\)/);
 assert.match(cli,/offline_research_experiments:offlineResearchExperiments/);
 assert.ok(cli.indexOf('const offlineResearchExperiments=buildOfflineResearchExperimentSuite')<
  cli.indexOf('await writeFile(target'));
 const future=structuredClone(fixture);
 future.shadow_regime_panels=[{as_of_utc:'2026-10-14T00:00:00Z'}];
 assert.throws(()=>buildOfflineResearchExperimentSuite({report,manifest:future}),
  /EXPERIMENT_USES_FUTURE_ASOF/);
});
