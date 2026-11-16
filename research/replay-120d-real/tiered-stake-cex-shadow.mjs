// R29 third 60-day sensitivity shadow: independent stake sizing 250/100/50.
// Model source: preexisting historically CLOSED Binance 1h CEX candle model
// A's frozen as-of entry/exit signals, not full GPT/DEX/Solana research.
// Neither outcome PnL nor subsequent prices may influence an earlier stake.
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {createHash} from "node:crypto";

const sha=s=>createHash("sha256").update(s).digest("hex");
const here=path.dirname(fileURLToPath(import.meta.url));
const round=n=>Math.round(n*1000000)/1000000;
const fixed=n=>Number(n).toFixed(2);
export const STAKES=[250,100,50];
export const BUY_COST=.01,SELL_COST=.01;
export const STARTING_TEST_USDC=5000;
const parseCsv=s=>{
 const lines=s.trim().split(/\r?\n/),header=lines.shift().split(",");
 return lines.map(line=>{
  const cells=line.split(",");
  if(cells.length!==header.length)throw Error("TIERED_HISTORIC_SOURCE_CSV_SHAPE_CHANGED");
  return Object.fromEntries(header.map((h,i)=>[h,cells[i]]));
 });
};
export function chooseRiskStake(openPositions,cash){
 if(!Number.isInteger(openPositions)||openPositions<0||!Number.isFinite(cash))
  throw Error("TIERED_INVALID_PRIOR_CONTEXT");
 const value=STAKES[openPositions];
 return value!==undefined&&cash>=value?value:null;
}
export function modeledNetPnl(entry,exit,stake){
 if(![entry,exit,stake].every(x=>Number.isFinite(x)&&x>0))
  throw Error("TIERED_INVALID_HISTORICAL_MODEL_PRICE");
 return stake*((1-BUY_COST)*(1-SELL_COST)*exit/entry-1);
}
const normalNumber=s=>s===""?null:Number(s);
const dateOf=t=>String(t).slice(0,10);
export function modelTieredShadow({dailySource,tradeSource,sourceSummary}){
 if(!Array.isArray(dailySource)||dailySource.length!==60||
  !Array.isArray(tradeSource)||!sourceSummary||
  sourceSummary.prices_only_shadow_modeled_from_actual_public_cex_data?.A?.modeled_buy_count!==36)
   throw Error("TIERED_SOURCE_NOT_ANCHORED_TO_REAL_CEX_SHADOW");
 const initialOrders=tradeSource.filter(x=>x.variant==="A");
 if(initialOrders.length!==36)throw Error("TIERED_EXPECTED_36_ASOF_SIGNAL_SERIES");
 const first="2026-09-18",last="2026-11-16";
 if(dailySource[0].date!==first||dailySource.at(-1).date!==last)
  throw Error("TIERED_EXACT_60_DAY_HOLDOUT_WINDOW_REQUIRED");
 const events=[];
 for(let i=0;i<initialOrders.length;i++){
  const r=initialOrders[i],entry=Number(r.modeled_buy_price_usdc),
   stake=Number(r.modeled_stake_test_usdc),closed=r.position_status==="CLOSED";
  if(!r.symbol||!r.symbol.endsWith("USDT")||!r.entry_at_utc||
   !Number.isFinite(entry)||entry<=0||stake!==50||
   !["CLOSED","OPEN_AS_OF_CUTOFF"].includes(r.position_status))
   throw Error("TIERED_UNVERIFIED_REFERENCE_ASOF_SIGNAL");
  const id="A_SOURCE_SIGNAL_"+String(i+1).padStart(3,"0");
  events.push({kind:"BUY",at:r.entry_at_utc,symbol:r.symbol,entry,id,source:r});
  if(closed){
   const exit=Number(r.modeled_sell_price_usdc),
    pnl=Number(r.realized_model_pnl_test_usdc);
   if(!r.exit_at_utc||!(Date.parse(r.exit_at_utc)>Date.parse(r.entry_at_utc))||
    !Number.isFinite(exit)||exit<=0||!Number.isFinite(pnl)||
    Math.abs(modeledNetPnl(entry,exit,50)-pnl)>.00008)
    throw Error("TIERED_CEX_EXIT_PRICE_OR_COST_PNL_MISMATCH");
   events.push({kind:"SELL",at:r.exit_at_utc,symbol:r.symbol,exit,id,source:r});
  }
 }
 events.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||
  (a.kind==="SELL"?-1:1)-(b.kind==="SELL"?-1:1)||a.id.localeCompare(b.id));
 const positions=new Map(),orders=[],daily=[];
 let cash=STARTING_TEST_USDC,realized=0,winning=0,losing=0,processed=0;
 for(const d of dailySource){
  const todayEvents=events.filter(ev=>dateOf(ev.at)===d.date);
  let earned=0;const buys=[],sells=[];
  for(const ev of todayEvents){
   processed++;
   if(ev.kind==="SELL"){
    const p=positions.get(ev.id);
    if(!p)throw Error("TIERED_SELL_WITHOUT_MODEL_POSITION");
    const pnl=modeledNetPnl(p.entry,ev.exit,p.stake),
     proceeds=p.stake+pnl;
    cash+=proceeds;realized+=pnl;earned+=pnl;
    if(pnl>0)winning++;if(pnl<0)losing++;
    positions.delete(ev.id);
    const sell={source_signal:ev.id,action:"SELL",symbol:p.symbol,
      at_utc:ev.at,modeled_stake_test_usdc:p.stake,
      modeled_realized_pnl_test_usdc:round(pnl),
      after_costs_model_next_hour_cex_price:ev.exit,
      outcome:pnl>0?"WIN":pnl<0?"LOSS":"EVEN",
      historically_executable_order_verified:false};
    sells.push(sell);orders.push(sell);
   }else{
    const stake=chooseRiskStake(positions.size,cash);
    if(stake===null)throw Error("TIERED_NO_BUDGET_OR_SLOT_FOR_PRIOR_ASOF_SIGNAL");
    if(positions.has(ev.id))throw Error("TIERED_DUPLICATE_SIGNAL");
    cash-=stake;
    const p={id:ev.id,symbol:ev.symbol,stake,entry:ev.entry,at:ev.at,
     source:ev.source};
    positions.set(ev.id,p);
    const buy={source_signal:ev.id,action:"BUY",symbol:ev.symbol,
      at_utc:ev.at,modeled_stake_test_usdc:stake,
      after_costs_model_next_hour_cex_price:ev.entry,
      stake_rule:"250_IF_ZERO_POSITIONS_100_IF_ONE_50_IF_TWO",
      historical_future_price_used_in_stake_decision:false,
      actually_executed_or_paper_filled:false};
    buys.push(buy);orders.push(buy);
   }
  }
  // Original daily A counters group local-stop sales into the later
  // RESEARCH SCAN DAY; those executions can carry a different actual UTC
  // timestamp. This table intentionally uses actual modeled execution dates.
  // We reconcile TOTAL events and PnL, not the two incompatible day clocks.
  const original_scan_grouped_buys=Number(d.shadow_A_BUY);
  const original_scan_grouped_sells=Number(d.shadow_A_SELL);
  const open=[...positions.values()].map(p=>p.symbol+":"+p.stake);
  daily.push({
   day:d.date,source_price_only_virtual_scans:Number(d.price_only_scans),
   original_A_scan_grouped_buys:original_scan_grouped_buys,
   original_A_scan_grouped_sells:original_scan_grouped_sells,
   event_counts_use_UTC_execution_day_not_original_scan_group_day:true,
   actual_historical_GPT_scans:0,
   scan_cadence_dynamic_intraday_proven:false,
   buys:buys.length,buys_coin_and_stake:buys.map(x=>x.symbol+":"+x.modeled_stake_test_usdc).join(" | "),
   sells:sells.length,
   sells_coin_and_realized_pnl:sells.map(x=>x.symbol+":"+(x.modeled_realized_pnl_test_usdc>=0?"+":"")+fixed(x.modeled_realized_pnl_test_usdc)).join(" | "),
   realized_profit_loss_today_test_usdc:round(earned),
   realized_profit_loss_cumulative_test_usdc:round(realized),
   simulated_cash_test_usdc:round(cash),
   open_positions:positions.size,
   open_positions_coin_stake:open.join(" | "),
   verified_real_gpt_dex_trades:0,
   genuine_model_strategy_pnl_unknown:true,
   source_class:"ACTUAL_BINANCE_CEX_CANDLE_PRICE_SHADOW_NOT_GPT_NOT_DEX"
  });
 }
 if(processed!==events.length||positions.size!==3||orders.filter(x=>x.action==="BUY").length!==36||
  orders.filter(x=>x.action==="SELL").length!==33||
  daily.reduce((n,d)=>n+d.source_price_only_virtual_scans,0)!==
   sourceSummary.measured_120d_research_clock.test_scans)
   throw Error("TIERED_EVENT_COUNTS_OR_RESEARCH_CLOCK_NOT_RECONCILED");
 const opens=[...positions.values()].map(p=>{
  const lastValue=Number(p.source.indicative_end_value_test_usdc),
   originalStake=Number(p.source.modeled_stake_test_usdc);
  if(!Number.isFinite(lastValue)||lastValue<=0)throw Error("TIERED_MISSING_END_PRICE_MARK");
  return {symbol:p.symbol,modeled_stake_test_usdc:p.stake,
   indicative_end_value_test_usdc:round(lastValue*p.stake/originalStake),
   actually_liquidated:false};
 });
 const endEquity=cash+opens.reduce((sum,p)=>sum+p.indicative_end_value_test_usdc,0);
 return {schema:"r29_60_day_asof_source_price_only_tiered_risk_sensitivity_v1",
  modeled_start_cash_test_usdc:STARTING_TEST_USDC,
  model_risk_sizes_test_usdc:STAKES,
  risk_allocation_rule:"250/100/50 by actual prior open slot, NOT future outcome",
  historical_symbol_universe_retrospectively_selected:true,
  source_signal_policy:"ORIGINAL_A_CONSERVATIVE_REAL_CEX_CLOSED_BAR_MOMENTUM_ASOF_ONLY",
  modelled_entry_and_exit:"NEXT_HOUR_REAL_BINANCE_OPEN_1PCT_COST_EACH_SIDE",
  no_historic_model_GPT_decisions:true,
  no_historic_new_coin_Dex_discovery:true,
  no_historical_wallet_paper_fills:true,
  no_independent_contract_or_pool_sellability_verification:true,
  original_A_signals_reused_not_new_strategy_wins_claimed:true,
  daily_full_gpt_scan_frequency_not_executed:true,
  historical_current_GPT_PNL:null,
  historical_CEX_modeled_buy_count:36,
  historical_CEX_modeled_sell_count:33,
  modeled_winning_closed_positions:winning,
  modeled_losing_closed_positions:losing,
  modeled_realized_closed_pnl_test_usdc:round(realized),
  modeled_cash_at_cutoff_test_usdc:round(cash),
  modeled_indicative_equity_at_cutoff_test_usdc:round(endEquity),
  modeled_total_change_from_5000_test_usdc:round(endEquity-STARTING_TEST_USDC),
  modeled_open_positions:opens,
  source_rows:daily.length,
  daily,orders};
}
export function csvView(report){
 const fields=["day","source_price_only_virtual_scans","actual_historical_GPT_scans",
  "buys","buys_coin_and_stake","sells","sells_coin_and_realized_pnl",
  "realized_profit_loss_today_test_usdc","realized_profit_loss_cumulative_test_usdc",
  "simulated_cash_test_usdc","open_positions","open_positions_coin_stake",
  "verified_real_gpt_dex_trades","source_class"];
 const q=x=>'"'+String(x??"").replaceAll('"','""')+'"';
 return [fields.join(","),...report.daily.map(x=>fields.map(k=>q(x[k])).join(","))].join("\n")+"\n";
}
const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
 const root=path.join(here,"results");
 const raw=[readFileSync(path.join(root,"holdout60-real-price-daily.csv"),"utf8"),
  readFileSync(path.join(root,"cex-shadow-complete-trade-ledger.csv"),"utf8"),
  readFileSync(path.join(root,"summary.json"),"utf8")];
 const report=modelTieredShadow({dailySource:parseCsv(raw[0]),
  tradeSource:parseCsv(raw[1]),sourceSummary:JSON.parse(raw[2])});
 const audit={...report,daily:undefined,orders:undefined,
  source_sha256:{daily_source:sha(raw[0]),source_trade_ledger:sha(raw[1]),
   cex_shadow_original_summary:sha(raw[2])}};
 mkdirSync(path.join(here,"generated"),{recursive:true});
 writeFileSync(path.join(here,"generated","60day-tiered-C-summary.json"),JSON.stringify(audit,null,2)+"\n");
 writeFileSync(path.join(here,"generated","60day-tiered-C-daily.csv"),csvView(report));
 writeFileSync(path.join(here,"generated","60day-tiered-C-orders.json"),JSON.stringify(report.orders,null,2)+"\n");
 console.log("R29_REAL_CEX_TIERED_SHADOW_REPORT "+JSON.stringify(audit));
 console.log("R29_TIERED_SHADOW_DAILY_ROWS "+report.daily.length);
}
