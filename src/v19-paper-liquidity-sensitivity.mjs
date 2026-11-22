// R29 D3-06: counterfactual 50 TEST-USDC liquidity/spread/impact study.
// Never relaxes the live risk gates or creates an executable quote/order.
import {DEFAULT_POLICY} from './core.mjs';
import {canonicalChain,poolValid} from './market-evidence.mjs';
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>0?x:null;
const at=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const round=x=>x===null?null:Math.round(x*1e6)/1e6;
const hasOracle=x=>x&&(Object.hasOwn(x,'reported_gain_pct')
 ||Object.hasOwn(x,'future_winner_label')||x.source_class==='POST_EVENT_ORACLE');
export function estimatePaperRoundtripFriction({liquidityUsd,amountTestUsdc=50,
 spreadBps=DEFAULT_POLICY.simulatedSpreadBps,feeBps=DEFAULT_POLICY.feeBps,
 impactMultiplier=DEFAULT_POLICY.simulatedImpactMultiplier,
 minLiquidityUsd=DEFAULT_POLICY.minLiquidityUsd,
 maxLiquidityUtilizationPct=DEFAULT_POLICY.maxLiquidityUtilizationPct}={}){
 const liquidity=num(liquidityUsd);
 if(!num(amountTestUsdc)||!num(minLiquidityUsd)
 ||![spreadBps,feeBps,impactMultiplier,maxLiquidityUtilizationPct]
   .every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0)
 ||maxLiquidityUtilizationPct===0)throw Error('INVALID_PAPER_LIQUIDITY_POLICY');
 if(!liquidity)return {status:'UNKNOWN_POOL_LIQUIDITY',
  model_roundtrip_pnl_test_usdc:null,policy_eligible:false,
  failure:'LIQUIDITY_UNKNOWN',trade_authorized:false};
 const utilizationPct=amountTestUsdc/liquidity*100;
 const satisfiesLiquidity=liquidity>=minLiquidityUsd;
 const satisfiesUtilization=utilizationPct<=maxLiquidityUtilizationPct;
 const spread=spreadBps/10000,fee=feeBps/10000;
 const buyImpact=Math.min(.03,(amountTestUsdc/liquidity)*impactMultiplier);
 const buyPriceMultiplier=1+spread+buyImpact;
 const acquired=(amountTestUsdc*(1-fee))/buyPriceMultiplier;
 const sellImpact=Math.min(.03,(acquired/liquidity)*impactMultiplier);
 const sellPriceMultiplier=Math.max(.01,1-spread-sellImpact);
 const sold=acquired*sellPriceMultiplier*(1-fee);
 return {status:satisfiesLiquidity&&satisfiesUtilization?
   'CORE_LIQUIDITY_ONLY_CRITERIA_MET':'CORE_LIQUIDITY_POLICY_BLOCK',
  pool_liquidity_usd:liquidity,
  entry_amount_test_usdc:amountTestUsdc,
  utilization_pct:round(utilizationPct),
  satisfies_core_min_liquidity:satisfiesLiquidity,
  satisfies_core_max_utilization:satisfiesUtilization,
  estimated_buy_impact_pct:round(buyImpact*100),
  estimated_sell_impact_pct:round(sellImpact*100),
  model_flat_mid_roundtrip_proceeds_test_usdc:round(sold),
  model_roundtrip_pnl_test_usdc:round(sold-amountTestUsdc),
  fee_bps_per_side:feeBps,spread_bps_per_side:spreadBps,
  model_does_not_prove_actual_slippage:true,
  full_buy_eligibility_unverified:true,trade_authorized:false};
}
export function buildLiquiditySensitivityStudy({
 candidates=[],asOfUtc,entryAmountTestUsdc=50,
 liquidityMultipliers=[.25,.5,1,2]
}={}){
 const now=at(asOfUtc);
 if(now===null||!Array.isArray(candidates)||candidates.length>10000
 ||!num(entryAmountTestUsdc)||!Array.isArray(liquidityMultipliers)
 ||liquidityMultipliers.length<2||liquidityMultipliers.length>8
 ||liquidityMultipliers.some(x=>!num(x)||x>10))
 throw Error('INVALID_PAPER_LIQUIDITY_STUDY');
 const rows=[],excluded=[];
 for(const [index,c] of candidates.entries()){
  const ch=canonicalChain(c?.chain),observed=at(c?.observed_at_utc);
  if(hasOracle(c)||!ch||!poolValid(ch,c?.pool,c?.pool_kind)
    ||observed===null||observed>now){
   excluded.push({index,reason:'INVALID_OR_FUTURE_OR_WINNER_INPUT'});continue;
  }
  const liquidity=num(c?.liquidity_usd);
  const scenarios=liquidityMultipliers.map(m=>({
   liquidity_multiple:m,
   ...estimatePaperRoundtripFriction({liquidityUsd:liquidity?liquidity*m:null,
     amountTestUsdc:entryAmountTestUsdc})
  }));
  rows.push({chain:ch,pool:c.pool,contract:c.contract??null,
   captured_asof_utc:c.observed_at_utc,observed_liquidity_usd:liquidity,
   baseline:scenarios.find(x=>x.liquidity_multiple===1)??null,
   scenarios,
   independently_verified_market_quote:false,
   trade_authorized:false});
 }
 return {schema:1,kind:'R29_V19_PAPER_LIQUIDITY_SHADOW_STUDY',
  as_of_utc:new Date(now).toISOString(),
  entry_amount_test_usdc:entryAmountTestUsdc,
  same_cash_amount_as_core_default:entryAmountTestUsdc===DEFAULT_POLICY.entryAmount,
  core_liquidity_floor_usd:DEFAULT_POLICY.minLiquidityUsd,
  core_max_utilization_pct:DEFAULT_POLICY.maxLiquidityUtilizationPct,
  total_raw_candidate_rows:candidates.length,
  included_pool_rows:rows.length,excluded_rows:excluded.length,
  scenarios:rows,excluded,
  observed_false_buy_count:null,observed_missed_opportunity_count:null,
  policy_changes_applied:false,
  independent_sellability_or_fresh_quote_proof:false,
  counterfactual_only:true,orders_authorized:0};
}
