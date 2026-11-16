// R29 purely RESEARCH exploratory historical stop-after-repeat-loss diagnostic.
// IMPORTANT: cohort and BUY signals were already retrospectively selected by
// a different CEX strategy. The holdout was previously seen. Any apparent
// improvement is DATA-SNOOPING RISK, not validation/edge or GPT performance.
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chooseRiskStake,modeledNetPnl} from "./tiered-stake-cex-shadow.mjs";
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const HOUR=3600000, DAY=24*HOUR;
const round=x=>Math.round(x*1000000)/1000000;
const validIso=x=>typeof x==="string"&&Number.isFinite(Date.parse(x));
function amount(x){if(typeof x!=="number"||!Number.isFinite(x)||x<0)throw Error("R29_INVALID_MONEY");return x}
function context(orders){
 if(!Array.isArray(orders)||orders.length!==69)throw Error("R29_NOT_FULL_ORIGINAL_69_EVENTS");
 const buy=new Map(),sell=new Map();
 for(const o of orders){
  if(!validIso(o.at_utc)||typeof o.source_signal!=="string"||
   typeof o.symbol!=="string"||!o.symbol.endsWith("USDT")||
   !["BUY","SELL"].includes(o.action))throw Error("R29_SOURCE_EVENT_INVALID");
  if(o.action==="BUY"){
   if(buy.has(o.source_signal))throw Error("R29_DUPLICATE_SOURCE_BUY");
   if(o.historical_future_price_used_in_stake_decision!==false)
    throw Error("R29_PRIOR_ORIGINAL_BUY_HAS_FUTURE_INFO");
   buy.set(o.source_signal,o);
  }else{
   if(sell.has(o.source_signal))throw Error("R29_DUPLICATE_SOURCE_SELL");
   sell.set(o.source_signal,o);
  }
 }
 if(buy.size!==36||sell.size!==33)throw Error("R29_36_33_SOURCE_COUNTS_INVALID");
 for(const [id,s] of sell){
  const b=buy.get(id);
  if(!b||b.symbol!==s.symbol||Date.parse(s.at_utc)<=Date.parse(b.at_utc)||
   !(s.after_costs_model_next_hour_cex_price>0))throw Error("R29_INVALID_OR_FUTURE_EXIT_PAIR");
 }
 return {buy,sell};
}
// A strict "previously closed and publicly/locally known" timestamp gate.
// An earlier entry cannot use the result of a SELL that occurs later.
export function riskDecideAtBuy({buyAt,coin,previousClosed,threshold=2,cooldownDays=7}){
 if(!validIso(buyAt)||!Number.isInteger(threshold)||threshold<1||
  !Number.isInteger(cooldownDays)||cooldownDays<1||cooldownDays>60)
  throw Error("R29_COOLDOWN_CONFIG_INVALID");
 const t=Date.parse(buyAt);
 if(!Array.isArray(previousClosed))throw Error("R29_PRIOR_CLOSED_REQUIRED");
 const eligible=previousClosed.filter(x=>{
  if(!validIso(x.at_utc)||!Number.isFinite(x.modeled_realized_pnl_test_usdc))
   throw Error("R29_BAD_CLOSED_SOURCE");
  if(Date.parse(x.at_utc)>t)throw Error("R29_FUTURE_TRADE_OUTCOME_LEAK");
  // A simultaneous SELL is not proof its result was known when this BUY
  // was evaluated. Exclude identical timestamps even if we sort SELL first.
  return Date.parse(x.at_utc)<t&&
   x.symbol===coin&&x.modeled_realized_pnl_test_usdc<0&&
   t-Date.parse(x.at_utc)<=cooldownDays*DAY;
 });
 return {permit:eligible.length<threshold,
  previous_losses_within_lookback:eligible.length,
  lock_reason:eligible.length>=threshold?"TWO_PRIOR_CONFIRMED_CLOSED_LOSSES_IN_LOOKBACK":"ALLOW",
  uses_future_trade_outcomes:false};
}
export function simulateCooldownResearch(source,{
 threshold=2,cooldownDays=7,disableCooldown=false
}={}){
 if(source?.schema!=="r29_60d_tiered_cex_modelled_order_ledger.v1"||
  !source.trade_class?.includes("CEX_PRICE_ONLY")||
  source.future_outcome_used_to_choose_stake!==false)
  throw Error("R29_RESEARCH_PROVENANCE_INVALID");
 const {buy,sell}=context(source.orders);
 const events=[...source.orders].sort((a,b)=>Date.parse(a.at_utc)-Date.parse(b.at_utc)||
  (a.action==="SELL"?-1:1)-(b.action==="SELL"?-1:1)||
  a.source_signal.localeCompare(b.source_signal));
 const actualOpen=new Map(),priorClosed=[],executed=[],rejected=[];
 let cash=5000,realized=0,nwin=0,nloss=0;
 const byDate=new Map();
 const date=x=>x.slice(0,10);
 for(const ev of events){
  const day=date(ev.at_utc);
  if(!byDate.has(day))byDate.set(day,{date:day,buy:[],sell:[],rejected:[],pnl:0});
  const row=byDate.get(day);
  if(ev.action==="BUY"){
   const prior=disableCooldown?{permit:true,previous_losses_within_lookback:0,uses_future_trade_outcomes:false}:
    riskDecideAtBuy({buyAt:ev.at_utc,coin:ev.symbol,
     previousClosed:priorClosed,threshold,cooldownDays});
   const stake=chooseRiskStake(actualOpen.size,cash);
   if(!prior.permit||stake===null){
    const out={at_utc:ev.at_utc,source_signal:ev.source_signal,symbol:ev.symbol,
     reason:!prior.permit?"PRIOR_CLOSED_LOSS_COOLDOWN":"NO_CURRENT_AVAILABLE_POSITION_SLOT",
     prior_same_symbol_losses:prior.previous_losses_within_lookback,
     posthoc_source_future_pnl_used_at_entry:false};
    row.rejected.push(out);rejected.push(out);continue;
   }
   const entry=ev.after_costs_model_next_hour_cex_price;
   if(!(entry>0)||!Number.isFinite(entry))throw Error("R29_SOURCE_PRICE_INVALID");
   actualOpen.set(ev.source_signal,{symbol:ev.symbol,stake,entry,buy_at_utc:ev.at_utc});
   cash-=stake;
   row.buy.push({symbol:ev.symbol,stake});
   executed.push({action:"BUY",at_utc:ev.at_utc,symbol:ev.symbol,stake,
    source_signal:ev.source_signal,not_actual_GPT_order:true});
  }else{
   const p=actualOpen.get(ev.source_signal);
   if(!p)continue; // Originally indexed source trade was skipped, never sold.
   if(Date.parse(ev.at_utc)<=Date.parse(p.buy_at_utc))
    throw Error("R29_FUTURE_SELL_TRADE_IN_PAST");
   const pnl=modeledNetPnl(p.entry,ev.after_costs_model_next_hour_cex_price,p.stake);
   actualOpen.delete(ev.source_signal);cash+=p.stake+pnl;realized+=pnl;
   if(pnl>0)nwin++;else if(pnl<0)nloss++;
   const closed={at_utc:ev.at_utc,symbol:p.symbol,
    modeled_realized_pnl_test_usdc:pnl,source_signal:ev.source_signal};
   priorClosed.push(closed);
   row.sell.push({symbol:p.symbol,stake:p.stake,pnl:round(pnl)});
   row.pnl+=pnl;
   executed.push({action:"SELL",...closed,stake:p.stake,not_actual_GPT_order:true});
  }
 }
 const previousOpenById=new Map(buy);
 const originalUnclosed=[...buy.entries()].filter(([id])=>!sell.has(id));
 const originalEndValues=new Map();
 // The original C-end value source is only used after all decisions to
 // MARK still-open positions; never accessed in riskDecideAtBuy().
 for(const o of originalUnclosed){
  if(!originalEndValues.has(o[1].symbol))originalEndValues.set(o[1].symbol,o[1].source_signal);
 }
 let openValue=0;
 for(const [id,p] of actualOpen){
  const sourceBuy=previousOpenById.get(id);
  if(!sourceBuy)throw Error("R29_OPEN_SOURCE_MISSING");
  const mark=source.original_open_marks?.find(x=>x.symbol===p.symbol);
  if(!mark||!Number.isFinite(mark.indicative_end_value_test_usdc)||
   !(mark.modeled_stake_test_usdc>0))
   throw Error("R29_REAL_END_MARK_SOURCE_MISSING");
  openValue+=mark.indicative_end_value_test_usdc*p.stake/mark.modeled_stake_test_usdc;
 }
 const start=Date.parse("2026-09-18T00:00:00Z"),daily=[];
 for(let i=0;i<60;i++){
  const day=new Date(start+i*DAY).toISOString().slice(0,10);
  const r=byDate.get(day)||{date:day,buy:[],sell:[],rejected:[],pnl:0};
  daily.push({day,model_buy:r.buy.length,model_sell:r.sell.length,
   model_rejected_entries:r.rejected.length,
   model_buys:r.buy.map(x=>x.symbol+":"+x.stake).join(" | "),
   model_sells:r.sell.map(x=>x.symbol+":"+(x.pnl>=0?"+":"")+x.pnl.toFixed(2)).join(" | "),
   model_realized_pnl_test_usdc:round(r.pnl),
   actual_gpt_model_calls:0,real_Dex_execution_receipts:0});
 }
 const proposedProfit=cash+openValue-5000;
 return {schema:"r29_retrospective_cex_loss_streak_diagnostic_v1",
  policy:{threshold,cooldownDays,disableCooldown,
   published_after_holdout_ends:true,
   holdout_already_used_to_derive_policy:true,
   statistically_valid_out_of_sample_profit_claim:false,
   new_dex_strategy_proven:false},
  original_asof_signal_set:"R29_EXISTING_CEX_PRESELECTED_A_SIGNALS_ONLY",
  original_signal_set_dependent_on_prior_strategy_positions:true,
  no_new_opportunities_discovered_when_prior_trades_skipped:true,
  source_later_market_quotes_used_only_for_final_marking:true,
  model_capital_initial_test_usdc:5000,
  model_realized_closed_pnl_test_usdc:round(realized),
  model_cash_test_usdc:round(cash),
  modeled_open_positions:actualOpen.size,
  modeled_open_position_value_test_usdc:round(openValue),
  modeled_end_equity_test_usdc:round(cash+openValue),
  modeled_total_profit_test_usdc:round(proposedProfit),
  research_only_no_true_GPT_or_exchange_fills:true,
  modeled_win_trades:nwin,modeled_loss_trades:nloss,
  modeled_executed_buys:executed.filter(x=>x.action==="BUY").length,
  modeled_executed_sells:executed.filter(x=>x.action==="SELL").length,
  rejected_buys_count:rejected.length,execution:executed,
  rejected,daily};
}
const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
 const sourcePath=path.join(ROOT,"results","60_TAGE_STAFFELEINSATZ_CEX_69_TRANSAKTIONSEREIGNISSE.json");
 const summaryPath=path.join(ROOT,"results","60_TAGE_STAFFELEINSATZ_CEX_ZUSAMMENFASSUNG.json");
 const source=JSON.parse(readFileSync(sourcePath,"utf8"));
 const summary=JSON.parse(readFileSync(summaryPath,"utf8"));
 source.original_open_marks=summary.modeled_open_positions;
 const baseline=simulateCooldownResearch(source,{disableCooldown:true});
 if(Math.abs(baseline.modeled_end_equity_test_usdc-4801.778921)>.002||
  baseline.modeled_executed_buys!==36||baseline.modeled_executed_sells!==33)
  throw Error("R29_DIAGNOSTIC_BASELINE_DISAGREES_WITH_ORIGINAL_C");
 const trials=[{threshold:2,cooldownDays:7},{threshold:2,cooldownDays:14}].map(cfg=>
  simulateCooldownResearch(source,cfg));
 const report={
  schema:"r29_60day_loss_cooldown_exploratory_comparison_v1",
  originally_frozen_CEX_model_baseline_unchanged:true,
  historical_heldout_60days_no_longer_untouched:true,
  not_an_independent_profit_validation:true,
  not_a_real_GPT_Memecoin_or_Dex_replay:true,
  true_historical_GPT_strategic_portfolio_profit:null,
  original_baseline:{...baseline,daily:undefined,execution:undefined,rejected:undefined},
  exploratory_trials:trials.map(x=>({...x,daily:undefined,execution:undefined,rejected:undefined})),
  choose_best_policy_from_holdout:false,
  next_prospective_independent_testing_required:true
 };
 const folder=path.join(ROOT,"generated");mkdirSync(folder,{recursive:true});
 writeFileSync(path.join(folder,"60d-retrospective-loss-controls-summary.json"),JSON.stringify(report,null,2)+"\n");
 for(let k=0;k<trials.length;k++){
  const experiment=trials[k],tag=experiment.policy.cooldownDays+"d";
  writeFileSync(path.join(folder,"60d-loss-control-"+tag+"-daily.json"),
   JSON.stringify(experiment.daily,null,2)+"\n");
  writeFileSync(path.join(folder,"60d-loss-control-"+tag+"-events.json"),
   JSON.stringify({execution:experiment.execution,rejected:experiment.rejected},null,2)+"\n");
 }
 console.log("R29_60D_LOSS_CONTROL_RESEARCH "+JSON.stringify(report));
}
