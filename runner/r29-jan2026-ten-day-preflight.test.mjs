// Research-only: January 2026 ten-day market audit must never masquerade as model trades.
// Never import postfreeze winners into any strategy/forward candidate selector.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=p=>JSON.parse(readFileSync(path.join(root,p),'utf8'));
const post='research/r29/operations/postfreeze-jan2026-ten-day/market-pumpfun-daily-summary.json';
const blind='research/r29/operations/blind-preflight-jan2026-ten-day/40-review-slots-not-executed.json';

test('source says this is retrospective Solana-Pump.fun subset, not the complete market',()=>{
 const m=load(post);
 assert.equal(m.postfreeze_only,true);
 assert.equal(m.never_include_in_blind_model_inputs,true);
 assert.equal(m.complete_memecoin_market_coverage,false);
 assert.equal(m.includes_other_chains,false);
 assert.equal(m.includes_all_coins,false);
 assert.equal(m.daily.length,10);
 assert.equal(m.selected_posthoc_hindsight_top3_per_day.length,30);
 assert.equal(new Set(m.selected_posthoc_hindsight_top3_per_day.map(x=>x.contract_address)).size,30);
 for(const r of m.selected_posthoc_hindsight_top3_per_day){
  assert.equal(r.asof_model_input_forbidden,true);
  assert.equal(r.actual_gpt_decision,null);
  assert.equal(r.actual_paper_trade_receipt,null);
  assert.equal(r.trade_entry_executability_verified,false);
  assert.equal(r.trade_exit_executability_verified,false);
  assert(Math.abs(r.reported_posthoc_percent-(r.reported_close_vs_graduation_multiple-1)*100)<0.01);
 }
});
test('reconcile two provider headline vs graduation outcome counts and 99% Jan 9',()=>{
 const m=load(post);
 assert.equal(m.totals.launches_headline,246870);
 assert.equal(m.totals.graduations_headline,1634);
 assert.equal(m.totals.graduations_outcomes,1632);
 assert.equal(m.totals.end_below_graduation,1439);
 assert.equal(m.totals.end_at_or_above_graduation,193);
 assert.equal(m.metadata.day_2026_01_09_blocks_captured_fraction,0.99);
 assert.deepEqual(m.daily.filter(x=>x.graduated_headline!==x.graduated_from_day_end_outcome_table).map(x=>x.date_utc),
  ['2026-01-05','2026-01-06']);
});
test('all 40 historical GPT slots are NOT executed decisions or fake NO_TRADE',()=>{
 const m=load(blind);
 assert.equal(m.paper_only,true);
 assert.equal(m.real_trading_enabled,false);
 assert.equal(m.user_paper_ledger_mutated,false);
 assert.equal(m.session_state,'PREFLIGHT_INCOMPLETE_NOT_A_TRADING_BACKTEST');
 assert.equal(m.slots.length,40);
 assert.equal(m.model_reviews_executed,0);
 assert.equal(m.model_no_trade_decisions_proven,0);
 assert.equal(m.order_buy_fills_proven,0);
 assert.equal(m.order_sell_fills_proven,0);
 assert.equal(m.realized_pnl_test_usdc,null);
 assert.equal(m.unrealized_pnl_test_usdc,null);
 for(let i=0;i<m.slots.length;i++){
  const r=m.slots[i];
  const day=String(Math.floor(i/4)+1).padStart(2,'0');
  const hour=['00','06','12','18'][i%4];
  assert.equal(r.scheduled_asof_utc,`2026-01-${day}T${hour}:00:00Z`);
  assert.equal(r.model_review_attested,false);
  assert.equal(r.model_decision,null);
  assert.equal(r.order_receipt,null);
 }
});
