import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAfterScan} from './audit-frozen-first5-gpt-future-hour.mjs';
const mint='2BRy7MsEYwp7DiZysHDNXF8L6Z7PksCeMEXCovz5pump';
const pool='An3wNgJrn1SAsbqfDUAj19W3KexgdvDjFd54oD6xj1da';
const r={virtual_asof_utc:'2026-09-18T00:05:00Z',decisions:[{
 action:'WATCH',chain:'solana',token_address:mint,pool_address:pool}]};
const f={ranked_neutral_cohort_not_all_market:[{
 token_address:mint,pool_address:pool,quote_currency:'SOL',
 most_recent_trade_price_original_quote:0.001,observed_buys:10,observed_sells:5
}]};
const snap=price=>({price_original_sol:price,at_utc:'2026-09-18T00:10:00Z'});
test('audit observes a later real market mark but not actual own profitable trade',()=>{
 const v=summarizeAfterScan(r,f,[{mint,pool,events:4,buys:3,sells:1,
  peak:snap(0.002),last:snap(0.0015),first:snap(0.0011),firstSell:snap(0.0012)}]);
 assert.equal(v.length,1);
 assert.equal(v[0].frozen_research_action,'WATCH');
 assert.equal(v[0].hypothetical_absolute_max_change_percent,100);
 assert.equal(v[0].hypothetical_last_change_percent,50);
 assert.equal(v[0].own_50_to_5000_usdc_executable_buy_sell_fills_proven,false);
 assert.equal(v[0].realized_test_usdc_pnl,null);
});
test('if no later same pool swap, later price stays unknown rather than 0',()=>{
 const v=summarizeAfterScan(r,f,[]);
 assert.equal(v[0].later_source_event_count,0);
 assert.equal(v[0].hypothetical_absolute_max_change_percent,null);
 assert.equal(v[0].realized_test_usdc_pnl,null);
});
test('future audit cannot silently swap the coin from original GPT recommendation',()=>{
 const f2={ranked_neutral_cohort_not_all_market:[{...f.ranked_neutral_cohort_not_all_market[0],token_address:'different'}]};
 assert.throws(()=>summarizeAfterScan(r,f2,[]),/FROZEN_DECISION_NOT_IN_NEUTRAL_ASOF_SOURCE/);
});
