import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {riskDecideAtBuy,simulateCooldownResearch} from "./cex-loss-control-diagnostic.mjs";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"results");
function source(){
 const data=JSON.parse(readFileSync(path.join(root,
  "60_TAGE_STAFFELEINSATZ_CEX_69_TRANSAKTIONSEREIGNISSE.json"),"utf8"));
 const marks=JSON.parse(readFileSync(path.join(root,
  "60_TAGE_STAFFELEINSATZ_CEX_ZUSAMMENFASSUNG.json"),"utf8"));
 data.original_open_marks=marks.modeled_open_positions;
 return data;
}
test("only actual PRIOR closed and known losses can throttle new BUY",()=>{
 const old=[{at_utc:"2026-09-19T00:00:00Z",symbol:"BOMEUSDT",
  modeled_realized_pnl_test_usdc:-8},
 {at_utc:"2026-09-20T00:00:00Z",symbol:"BOMEUSDT",
  modeled_realized_pnl_test_usdc:-4}];
 const x=riskDecideAtBuy({buyAt:"2026-09-21T00:00:00Z",
  coin:"BOMEUSDT",previousClosed:old});
 assert.equal(x.permit,false);
 assert.equal(x.previous_losses_within_lookback,2);
 assert.equal(x.uses_future_trade_outcomes,false);
 assert.equal(riskDecideAtBuy({buyAt:"2026-10-21T00:00:00Z",
  coin:"BOMEUSDT",previousClosed:old}).permit,true);
 assert.equal(riskDecideAtBuy({buyAt:"2026-09-21T00:00:00Z",
  coin:"PEPEUSDT",previousClosed:old}).permit,true);
});
test("leak guard prohibits consuming even one later negative trade as if already known",()=>{
 const later=[{at_utc:"2026-09-22T00:00:00Z",symbol:"BOMEUSDT",
  modeled_realized_pnl_test_usdc:-100}];
 assert.throws(()=>riskDecideAtBuy({buyAt:"2026-09-21T00:00:00Z",
  coin:"BOMEUSDT",previousClosed:later}),/FUTURE/);
});
test("disabled filter exactly reproduces original unmodified 60d 36/33 model",()=>{
 const r=simulateCooldownResearch(source(),{disableCooldown:true});
 assert.equal(r.modeled_executed_buys,36);
 assert.equal(r.modeled_executed_sells,33);
 assert.equal(r.modeled_win_trades,3);
 assert.equal(r.modeled_loss_trades,30);
 assert.equal(r.modeled_open_positions,3);
 assert(Math.abs(r.modeled_end_equity_test_usdc-4801.778921)<.001);
 assert(Math.abs(r.model_realized_closed_pnl_test_usdc+186.932554)<.001);
 assert.equal(r.daily.length,60);
 assert.equal(r.research_only_no_true_GPT_or_exchange_fills,true);
 assert.equal(r.policy.statistically_valid_out_of_sample_profit_claim,false);
});
test("exploratory cool down has 60 day records and NO claim to positive GPT model",()=>{
 const r=simulateCooldownResearch(source(),{threshold:2,cooldownDays:7});
 assert.equal(r.daily.length,60);
 assert(r.modeled_executed_buys+r.rejected_buys_count===36);
 assert.equal(r.policy.holdout_already_used_to_derive_policy,true);
 assert.equal(r.policy.new_dex_strategy_proven,false);
 assert.equal(r.research_only_no_true_GPT_or_exchange_fills,true);
 assert(r.execution.filter(x=>x.action==="SELL").every(x=>
  x.not_actual_GPT_order===true));
});
