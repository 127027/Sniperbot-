import test from "node:test";
import assert from "node:assert/strict";
import {moonshotPriceOnly,quoteConstantProductAmm}
 from "./memecoin-moonshot-execution-check.mjs";
test("user's four-week 0.0000001 -> 0.0000041 microcap example is 41x, 4000 percent and 200k theoretical profit",()=>{
 const x=moonshotPriceOnly();
 assert.equal(x.theoretical_tokens_before_fees_and_price_impact,50_000_000_000);
 assert.equal(x.spot_price_multiple,41);
 assert.equal(x.spot_gain_percent,4000);
 assert.equal(x.theoretical_proceeds_test_usdc,205000);
 assert.equal(x.theoretical_profit_test_usdc,200000);
 assert.equal(x.holding_days,28);
 assert.equal(x.profitable_execution_proven,false);
 assert.equal(x.actual_historical_trade_proven,false);
});
test("extremely thin microcap liquidity makes 41x spot price nowhere near 41x executable profit",()=>{
 const r=quoteConstantProductAmm({
  entryPrice:1e-7,exitPrice:4.1e-6,stakeTestUSDC:5000,
  buyQuoteReserveTestUSDC:10000,sellQuoteReserveTestUSDC:10000
 });
 assert.equal(r.spot_multiple,41);
 assert(r.modeled_exit_proceeds_test_usdc<10000);
 assert(r.estimated_total_roundtrip_market_impact_fraction>.95);
 assert.equal(r.under_requested_impact_cap,false);
 assert.equal(r.historical_buy_and_sell_reserves_independently_verified,false);
 assert.equal(r.actual_paper_fill_proven,false);
});
test("even 100k and 200k quote reserves don't make 205k spot-value immediately executable",()=>{
 const r=quoteConstantProductAmm({
  entryPrice:1e-7,exitPrice:4.1e-6,stakeTestUSDC:5000,
  buyQuoteReserveTestUSDC:100000,sellQuoteReserveTestUSDC:200000
 });
 assert(r.modeled_exit_proceeds_test_usdc>90000);
 assert(r.modeled_exit_proceeds_test_usdc<100000);
 assert(r.estimated_total_roundtrip_market_impact_fraction>.5);
 assert.equal(r.under_requested_impact_cap,false);
 assert.equal(r.real_wallet_not_enabled,true);
});
test("without actual pool reserves cannot assert trade capacity or payout",()=>{
 const price=moonshotPriceOnly({hypotheticalStakeTestUSDC:50});
 assert.equal(price.theoretical_proceeds_test_usdc,2050);
 assert.throws(()=>quoteConstantProductAmm({
  entryPrice:1e-7,exitPrice:4.1e-6,stakeTestUSDC:5000
 }),/INVALID_HYPOTHETICAL_AMM_STRESS_INPUT/);
 assert.throws(()=>moonshotPriceOnly({hypotheticalStakeTestUSDC:10000}),
  /INVALID_PAPER_SCENARIO/);
});
