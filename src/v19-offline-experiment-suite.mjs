// Offline research-only bridge: six precommitted ORIGINAL backlog items
// use the single existing replay, never an alternative BUY/SELL engine.
// Optional panels must be provided in an explicit synthetic/as-of manifest.
import {measureAsOfMarketRegime} from './v19-offline-regime-shadow.mjs';
import {auditOfflineProtectiveExits} from './v19-offline-protective-shadow-audit.mjs';
import {studyLossReentryRecovery} from './v19-offline-loss-reentry.mjs';
import {analyzeAsOfForecastPath} from './v19-offline-horizon-paths.mjs';
import {scoreFrozenTemporalOutcomes} from './v19-offline-holdout-scorecard.mjs';
import {freezeProspectiveHoldout} from './v19-prospective-holdout-freeze.mjs';
import {compareOfflineCadenceBudgets} from './v19-offline-cadence-shadow-utility.mjs';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const asArray=(m,key)=>m?.[key]??[];
export function buildOfflineResearchExperimentSuite({report,manifest=null}={}){
 if(report?.kind!=='R29_V18_ON_DEMAND_FIVE_ROLE_SHADOW_BACKTEST'
  ||!Array.isArray(report.isolated_model_receipts)
  ||!Array.isArray(report.role_audit?.dot4_strategy?.timeline))
  throw Error('INVALID_OFFLINE_EXPERIMENT_REPORT');
 const source=manifest||{};
 const keys=['shadow_regime_panels','shadow_protective_checks',
  'shadow_loss_reentries','shadow_forecast_paths','shadow_holdout_scorecards'];
 for(const key of keys)if(!Array.isArray(asArray(source,key))
  ||asArray(source,key).length>500)
  throw Error('INVALID_OFFLINE_EXPERIMENT_PANEL_'+key);
 const asOf=report.end_utc;
 const requirePast=v=>{
  const stamp=ms(v);
  if(stamp===null||stamp>ms(asOf))throw Error('EXPERIMENT_USES_FUTURE_ASOF');
 };
 const map=(key,fn)=>asArray(source,key).map((r)=>{
  requirePast(r.as_of_utc);
  return fn(r);
 });
 const regime=map('shadow_regime_panels',r=>measureAsOfMarketRegime({
  chain:r.chain,pool:r.pool,contract:r.contract,
  observations:r.observations,asOfUtc:r.as_of_utc,
  policyFrozenAtUtc:r.policy_frozen_at_utc
 }));
 const protective=auditOfflineProtectiveExits({
  modeledReceipts:report.isolated_model_receipts,
  samples:asArray(source,'shadow_protective_checks').map(row=>({
   ...row,model_buy_order_id:row.model_buy_order_id==='FIRST_ISOLATED_MODEL_BUY'
    ?report.isolated_model_receipts.find(r=>r.action==='BUY')?.id
    :row.model_buy_order_id
  })),
  asOfUtc:asOf
 });
 const reentries=map('shadow_loss_reentries',r=>{
  const sale=r.model_loss_receipt_id==='FIRST_ISOLATED_MODEL_LOSS_SELL'
   ?report.isolated_model_receipts.find(x=>x.action==='SELL'&&x.realized_pnl_test_usdc<0)
   :report.isolated_model_receipts.find(x=>x.id===r.model_loss_receipt_id);
  if(!sale)throw Error('REENTRY_RECEIPT_NOT_IN_MODEL');
  return studyLossReentryRecovery({
   lossReceipt:sale,observations:r.observations,
   asOfUtc:r.as_of_utc,policyFrozenAtUtc:r.policy_frozen_at_utc
  });
 });
 const horizons=map('shadow_forecast_paths',r=>analyzeAsOfForecastPath({
  startAtUtc:r.start_at_utc,entryPriceUsd:r.entry_price_usd,
  observations:r.observations,asOfUtc:r.as_of_utc
 }));
 const holdouts=map('shadow_holdout_scorecards',r=>{
  // This optionally recreates a purely SYNTHETIC exercise freeze; it never
  // changes the immutable prospective Nov-2026 production holdout file.
  const synthetic=Array.isArray(r.samples)&&r.samples.length>0
   &&r.samples.every(x=>x.source_class==='SYNTHETIC_TEST');
  const freeze=r.synthetic_freeze_at_utc&&synthetic
   ?freezeProspectiveHoldout({frozenAtUtc:r.synthetic_freeze_at_utc})
   :r.freeze;
  return scoreFrozenTemporalOutcomes({
   freeze,samples:r.samples,asOfUtc:r.as_of_utc,
   neutralDenominatorProven:r.synthetic_cohort_complete===true&&synthetic
  });
 });
 const cadence=compareOfflineCadenceBudgets({
  replayEvents:report.role_audit.dot4_strategy.timeline,
  policyFrozenAtUtc:report.historical_warmup_start_utc,
  asOfUtc:report.end_utc
 });
 return {schema:1,kind:'R29_V19_SIX_OFFLINE_BACKLOG_SHADOW_EXPERIMENTS',
  report_date:report.date,as_of_utc:asOf,
  original_61_backlog_ids:['D1-07','D4-02','D4-04','D4-05','D4-06','D5-05'],
  d1_07_cadence_utility:cadence,
  d4_02_regime:regime,
  d4_04_protective:protective,
  d4_05_loss_reentries:reentries,
  d4_06_forecast_paths:horizons,
  d5_05_temporal_holdout:holdouts,
  source_original_authenticity_unverified:report.independent_risk_and_source_authenticity_verified!==true,
  precommitted_rules_unchanged:true,
  no_synthetic_trade_claimed_as_historical:true,
  actual_gpt_dots_executed:0,real_paper_client_receipts:0,
  paper_orders_authorized:0,real_money_orders_authorized:0};
}
