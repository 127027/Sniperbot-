// R29 hypothetical 10x/41x microcap MEME scenario only, never an order.
// Quoted price != average executable entry/exit for a large DEX position.
// Constant-product AMM estimates are controlled stress tests, not source-backed
// historical reserves, signed quotes, guaranteed exits, or GPT trades.
const safe=(x)=>typeof x==="number"&&Number.isFinite(x)&&x>0;
const amount=x=>Math.round(x*1000000)/1000000;
export function moonshotPriceOnly({
 entryPrice=1e-7,exitPrice=4.1e-6,
 hypotheticalStakeTestUSDC=5000,holdingDays=28
}={}){
 if(!safe(entryPrice)||!safe(exitPrice)||!safe(hypotheticalStakeTestUSDC)||
  !safe(holdingDays)||holdingDays>49||holdingDays<1||
  hypotheticalStakeTestUSDC<50||hypotheticalStakeTestUSDC>5000)
  throw Error("R29_MOONSHOT_INVALID_PAPER_SCENARIO");
 const ratio=exitPrice/entryPrice;
 return {
  schema:"sniper_r29_hypothetical_41x_microcap_memecoin_v1",
  entry_spot_price_test_usdc_per_token:entryPrice,
  exit_spot_price_test_usdc_per_token:exitPrice,
  stake_test_usdc:hypotheticalStakeTestUSDC,
  holding_days:holdingDays,
  theoretical_tokens_before_fees_and_price_impact:
   hypotheticalStakeTestUSDC/entryPrice,
  spot_price_multiple:ratio,
  spot_gain_percent:(ratio-1)*100,
  theoretical_proceeds_test_usdc:amount(hypotheticalStakeTestUSDC*ratio),
  theoretical_profit_test_usdc:amount(hypotheticalStakeTestUSDC*(ratio-1)),
  requires_real_asof_buy_and_sell_pool_reserve_evidence:true,
  actual_historical_trade_proven:false,
  actual_historical_gpt_decision_proven:false,
  profitable_execution_proven:false,
  real_money_enabled:false,
  existing_paper_ledger_changed:false
 };
}
export function quoteConstantProductAmm({
 entryPrice,exitPrice,stakeTestUSDC,
 buyQuoteReserveTestUSDC,sellQuoteReserveTestUSDC,
 swapFeeFraction=.003,maxAllowedTotalRoundTripImpactFraction=.10
}={}){
 if(![entryPrice,exitPrice,stakeTestUSDC,buyQuoteReserveTestUSDC,
  sellQuoteReserveTestUSDC].every(safe)||
  stakeTestUSDC<50||stakeTestUSDC>5000||
  !Number.isFinite(swapFeeFraction)||swapFeeFraction<0||swapFeeFraction>=1||
  !Number.isFinite(maxAllowedTotalRoundTripImpactFraction)||
  maxAllowedTotalRoundTripImpactFraction<=0||
  maxAllowedTotalRoundTripImpactFraction>=1)
  throw Error("R29_INVALID_HYPOTHETICAL_AMM_STRESS_INPUT");
 // Balanced AMM pool at independently supplied theoretical spot prices.
 // Reserve quantities are normalized by token decimals, NOT quote raw units.
 const entryTokenReserve=buyQuoteReserveTestUSDC/entryPrice;
 const exitTokenReserve=sellQuoteReserveTestUSDC/exitPrice;
 const afterBuyFee=stakeTestUSDC*(1-swapFeeFraction);
 const acquired=entryTokenReserve*afterBuyFee/
  (buyQuoteReserveTestUSDC+afterBuyFee);
 const buyCostPerToken=stakeTestUSDC/acquired;
 const quoteBeforeExitFees=sellQuoteReserveTestUSDC*acquired/
  (exitTokenReserve+acquired);
 const proceeds=quoteBeforeExitFees*(1-swapFeeFraction);
 const theoretical=stakeTestUSDC*(exitPrice/entryPrice);
 const relativeRoundTripLeakage=1-proceeds/theoretical;
 const exitImpact=1-proceeds/(acquired*exitPrice);
 const buyImpact=buyCostPerToken/entryPrice-1;
 const isUnderImpactCap=relativeRoundTripLeakage<=
  maxAllowedTotalRoundTripImpactFraction;
 return {
  schema:"sniper_r29_hypothetical_AMM_depth_stress_v1",
  model:"IDEALIZED_UNISWAP_V2_LIKE_CONSTANT_PRODUCT_NOT_ACTUAL_PUMPFUN_SWAP",
  spot_multiple:exitPrice/entryPrice,
  start_quote_reserve_test_usdc:buyQuoteReserveTestUSDC,
  later_quote_reserve_test_usdc:sellQuoteReserveTestUSDC,
  token_qty_theoretical_before_fees:stakeTestUSDC/entryPrice,
  token_qty_model_purchase:amount(acquired),
  buy_average_price_approx_test_usdc_per_token:buyCostPerToken,
  modeled_exit_proceeds_test_usdc:amount(proceeds),
  modeled_pnl_test_usdc:amount(proceeds-stakeTestUSDC),
  gross_price_only_theoretical_proceeds_test_usdc:amount(theoretical),
  estimated_total_roundtrip_market_impact_fraction:relativeRoundTripLeakage,
  estimated_buy_impact_fraction:buyImpact,
  estimated_sell_impact_fraction:exitImpact,
  under_requested_impact_cap:isUnderImpactCap,
  capacity_to_exit_same_token_size_requires_verified_future_liquidity:true,
  no_reusable_next_week_profit_prediction:true,
  historical_buy_and_sell_reserves_independently_verified:false,
  actual_historical_execution_proven:false,
  actual_paper_fill_proven:false,
  existing_paper_ledger_changed:false,
  live_wallet_not_enabled:true
 };
}
