import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chooseRiskStake,modeledNetPnl,modelTieredShadow,csvView}
 from "./tiered-stake-cex-shadow.mjs";
const here=path.dirname(fileURLToPath(import.meta.url));
const fromCsv=s=>{
 const [hdr,...lines]=s.trim().split(/\r?\n/),keys=hdr.split(",");
 return lines.map(line=>{
  const x=line.split(",");
  assert.equal(x.length,keys.length,"Fixed historical source CSV fields");
  return Object.fromEntries(keys.map((k,i)=>[k,x[i]]));
 });
};
const actual=()=>{
 const base=path.join(here,"results");
 return {
  dailySource:fromCsv(readFileSync(path.join(base,"holdout60-real-price-daily.csv"),"utf8")),
  tradeSource:fromCsv(readFileSync(path.join(base,"cex-shadow-complete-trade-ledger.csv"),"utf8")),
  sourceSummary:JSON.parse(readFileSync(path.join(base,"summary.json"),"utf8"))
 };
};
test("exact 250/100/50 ordered slot ladder never depends on winning or losing future results",()=>{
 assert.equal(chooseRiskStake(0,5000),250);
 assert.equal(chooseRiskStake(1,5000),100);
 assert.equal(chooseRiskStake(2,5000),50);
 assert.equal(chooseRiskStake(3,5000),null);
 assert.equal(chooseRiskStake(0,249.99),null);
 assert.equal(chooseRiskStake(2,49.99),null);
 assert.throws(()=>chooseRiskStake(-1,5000),/INVALID/);
});
test("modeled profit uses real CEX prices and bilateral 1% costs, not arbitrary future labels",()=>{
 const actualPNUT=modeledNetPnl(.0486,.0579,50);
 assert(Math.abs(actualPNUT-8.3825)<.00001);
 assert(modeledNetPnl(.0579,.0533,250)<0);
 assert.throws(()=>modeledNetPnl(0,10,50),/INVALID/);
});
test("real 60-day 36 actual candle model signals reproduce 60 dates and 33 outcomes without GPT or wallet claims",()=>{
 const out=modelTieredShadow(actual());
 assert.equal(out.source_rows,60);
 assert.equal(out.daily[0].day,"2026-09-18");
 assert.equal(out.daily.at(-1).day,"2026-11-16");
 assert.equal(out.daily.reduce((s,x)=>s+x.source_price_only_virtual_scans,0),800);
 assert.equal(out.daily.reduce((s,x)=>s+x.actual_historical_GPT_scans,0),0);
 assert.equal(out.daily.reduce((s,x)=>s+x.buys,0),36);
 assert.equal(out.daily.reduce((s,x)=>s+x.sells,0),33);
 assert.equal(out.modeled_winning_closed_positions+
  out.modeled_losing_closed_positions,33);
 assert.equal(out.modeled_open_positions.length,3);
 assert.equal(out.daily.at(-1).open_positions,3);
 assert.equal(out.no_historic_model_GPT_decisions,true);
 assert.equal(out.no_independent_contract_or_pool_sellability_verification,true);
 assert.equal(out.historical_current_GPT_PNL,null);
 assert.equal(out.daily[0].buys_coin_and_stake,
  "PNUTUSDT:250 | NEIROUSDT:100 | TRUMPUSDT:50");
 assert(out.orders.filter(x=>x.action==="BUY").every(
  x=>[50,100,250].includes(x.modeled_stake_test_usdc)&&
  x.historical_future_price_used_in_stake_decision===false));
 assert(out.orders.filter(x=>x.action==="SELL").every(
  x=>x.historically_executable_order_verified===false));
 assert.equal(csvView(out).trim().split("\n").length,61);
});
test("the source must remain a genuine 60d CEX price baseline, not fictional coin list",()=>{
 const input=actual();
 input.tradeSource[0].modeled_buy_price_usdc="0";
 assert.throws(()=>modelTieredShadow(input),/UNVERIFIED_REFERENCE/);
 const missing=actual();
 missing.dailySource.pop();
 assert.throws(()=>modelTieredShadow(missing),/NOT_ANCHORED/);
});
