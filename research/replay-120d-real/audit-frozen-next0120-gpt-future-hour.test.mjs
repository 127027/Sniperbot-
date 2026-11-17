import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAfterScan} from './audit-frozen-next0120-gpt-future-hour.mjs';
const mint='N3KETcYwAHZtTVb7gdoVwMW4uNksU99NXgK55zRpump',pool='3hUrvQZGtRcFn969bHLjkgDVTmsYxeVPdGozamguAqxU';
const review={virtual_asof_utc:'2026-09-18T01:20:00Z',decisions:[{action:'WATCH',chain:'solana',token_address:mint,pool_address:pool}]};
const frame={ranked_neutral_cohort_not_all_market:[{token_address:mint,pool_address:pool,quote_currency:'SOL',most_recent_trade_price_original_quote:0.001,observed_buys:100,observed_sells:1}]};
const hit=price=>({price_original_sol:price,at_utc:'2026-09-18T01:22:00Z'});
test('observed future swap marks do not become imagined paper USD fills',()=>{
 const r=summarizeAfterScan(review,frame,[{mint,pool,events:3,buys:2,sells:1,first:hit(0.0011),firstSell:hit(0.0013),peak:hit(0.002),last:hit(0.0018)}]);
 assert.equal(r[0].hypothetical_absolute_max_change_percent,100);
 assert.equal(r[0].realized_test_usdc_pnl,null);
 assert.equal(r[0].original_asof_action_revised,false);
 assert.equal(r[0].own_50_to_5000_usdc_executable_buy_sell_fills_proven,false);
});
test('no trade evidence never converted into zero gain',()=>{
 const r=summarizeAfterScan(review,frame,[]);
 assert.equal(r[0].hypothetical_last_change_percent,null);
 assert.equal(r[0].realized_test_usdc_pnl,null);
});
test('decision address must match original asof pool, not some other token',()=>{
 assert.throws(()=>summarizeAfterScan(review,{ranked_neutral_cohort_not_all_market:[]},[]),/FROZEN_DECISION_NOT_IN_NEUTRAL_ASOF_SOURCE/);
});
