// R29 D4-03: precommitted shadow-only exits. Never publishes trading signals,
// touches portfolio, or labels theoretical high/low as achievable fills.
import {DEFAULT_POLICY} from './core.mjs';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const n=x=>typeof x==='number'&&Number.isFinite(x)&&x>0?x:null;
const rnd=x=>Math.round(x*1e6)/1e6;
export const EXIT_EXPERIMENT_POLICIES=Object.freeze([
 'BASELINE_TP20_SL10','TRAIL_TP20_DD12_SL10',
 'PARTIAL_TP20_TRAIL12_SL10','TIME_STOP_60M_TP20_SL10'
]);
const oracle=x=>x&&('reported_gain_pct' in x||'future_winner_label' in x
 ||x.source_class==='POST_EVENT_ORACLE');
const fee=DEFAULT_POLICY.feeBps/10000;
const spread=DEFAULT_POLICY.simulatedSpreadBps/10000;
const impact=(usd,L)=>Math.min(.03,usd/L*DEFAULT_POLICY.simulatedImpactMultiplier);
function modeledSell({quantity,price,liquidity}){
 const usd=quantity*price;
 if(!(n(liquidity)>=DEFAULT_POLICY.minLiquidityUsd)
  ||usd/liquidity*100>DEFAULT_POLICY.maxLiquidityUtilizationPct)
  return null;
 return quantity*price*Math.max(.01,1-spread-impact(usd,liquidity))*(1-fee);
}
export function compareFrozenExitScenarios({
 entry,observations=[],asOfUtc,policyFrozenAtUtc,
 horizonMinutes=120
}={}){
 const start=ms(entry?.at_utc),now=ms(asOfUtc),frozen=ms(policyFrozenAtUtc);
 if(!start||!now||!frozen||frozen>start||start>now
  ||!Number.isInteger(horizonMinutes)||horizonMinutes<60||horizonMinutes>1440
  ||!Array.isArray(observations)||observations.length>10000
  ||oracle(entry)||!n(entry?.price_usd)||!n(entry?.liquidity_usd)
  ||entry.liquidity_usd<DEFAULT_POLICY.minLiquidityUsd
  ||typeof entry.source_path!=='string'||!entry.source_path.startsWith('research/')
  ||entry.source_class!=='ORIGINAL_CAPTURE')
  throw Error('INVALID_FROZEN_EXIT_ENTRY');
 const end=start+horizonMinutes*60000,accepted=[],rejected=[];
 for(const [index,x] of observations.entries()){
  const at=ms(x?.observed_at_utc);
  if(oracle(x)||!at||at<start||at>now||at>end
   ||!n(x.price_usd)||!n(x.liquidity_usd)
   ||typeof x.source_path!=='string'||!x.source_path.startsWith('research/')
   ||x.source_class!=='ORIGINAL_CAPTURE'){
   rejected.push({index,reason:'INVALID_FUTURE_OR_UNVERIFIED_OBSERVATION'});continue;
  }
  accepted.push(x);
 }
 accepted.sort((a,b)=>ms(a.observed_at_utc)-ms(b.observed_at_utc));
 // A shadow BUY at the frozen entry only. No actual portfolio state is used.
 const cost=DEFAULT_POLICY.entryAmount;
 const buyImpact=impact(cost,entry.liquidity_usd);
 const hypotheticalQuantity=cost*(1-fee)/(entry.price_usd*(1+spread+buyImpact));
 const policies=[];
 for(const variant of EXIT_EXPERIMENT_POLICIES){
  let remaining=hypotheticalQuantity,proceeds=0,peak=entry.price_usd;
  const exits=[],blocked=[];
  let activated=false,done=false;
  for(const x of accepted){
   if(done)break;
   const time=ms(x.observed_at_utc);
   const move=(x.price_usd/entry.price_usd-1)*100;
   peak=Math.max(peak,x.price_usd);
   const stop=move<=-10,take=move>=20;
   activated=activated||take;
   const trail=activated&&x.price_usd<=peak*.88;
   const timeLimit=time-start>=60*60000;
   let portion=0,reason=null;
   if(stop){portion=1;reason='STOP_LOSS_10';}
   else if(variant==='BASELINE_TP20_SL10'&&take){portion=1;reason='FIXED_TAKE_PROFIT_20';}
   else if(variant==='TRAIL_TP20_DD12_SL10'&&trail){portion=1;reason='TRAIL_12_PERCENT_FROM_OBSERVED_PEAK';}
   else if(variant==='PARTIAL_TP20_TRAIL12_SL10'){
    if(take&&exits.length===0){portion=.5;reason='PARTIAL_AT_20';}
    else if(trail){portion=1;reason='TRAIL_REMAINDER';}
   }else if(variant==='TIME_STOP_60M_TP20_SL10'){
    if(take){portion=1;reason='TAKE_PROFIT_20';}
    else if(timeLimit){portion=1;reason='TIME_STOP_60M';}
   }
   if(!portion)continue;
   const qty=remaining*portion;
   const net=modeledSell({quantity:qty,price:x.price_usd,liquidity:x.liquidity_usd});
   if(net===null){blocked.push({at_utc:x.observed_at_utc,reason:'EXIT_LIQUIDITY_NOT_VERIFIED'});continue;}
   proceeds+=net;remaining-=qty;
   exits.push({at_utc:x.observed_at_utc,reason,
    observed_price_usd:x.price_usd,
    modeled_net_proceeds_test_usdc:rnd(net),portion_of_remaining:portion});
   if(remaining<1e-10){remaining=0;done=true;}
  }
  if(remaining>0&&accepted.length){
   const last=accepted.at(-1);
   // Closing at horizon for *comparison* only when a valid observation
   // exists exactly at the horizon. Never manufacture unseen prices.
   if(ms(last.observed_at_utc)===end){
    const net=modeledSell({quantity:remaining,price:last.price_usd,liquidity:last.liquidity_usd});
    if(net!==null){proceeds+=net;remaining=0;exits.push({
      at_utc:last.observed_at_utc,reason:'HORIZON_MARK_TO_MARKET_SHADOW_ONLY',
      observed_price_usd:last.price_usd,
      modeled_net_proceeds_test_usdc:rnd(net),portion_of_remaining:1});}
    else blocked.push({at_utc:last.observed_at_utc,reason:'NO_HORIZON_LIQUIDITY'});
   }
  }
  policies.push({policy:variant,policy_frozen_at_utc:policyFrozenAtUtc,
   modeled_entry_quantity:rnd(hypotheticalQuantity),
   observed_exit_count:exits.length,exits,blocked,
   closed_in_shadow:remaining===0,
   unclosed_quantity:remaining===0?0:rnd(remaining),
   modeled_realized_pnl_test_usdc:remaining===0?rnd(proceeds-cost):null,
   incomplete_pnl_if_position_still_open:remaining>0,
   actual_receipt:null,actual_paper_fill:false,orders_authorized:0});
 }
 return {schema:1,kind:'R29_V19_PRECOMMITTED_EXIT_COUNTERFACTUAL',
  as_of_utc:asOfUtc,policy_frozen_at_utc:policyFrozenAtUtc,
  horizon_end_utc:new Date(end).toISOString(),
  entry_sample_source_path:entry.source_path,
  observed_price_ticks:accepted.length,rejected_ticks:rejected.length,
  variants:policies,negative_and_positive_paths_required_for_empirical_claim:true,
  price_observations_not_executable_order_quotes:true,
  future_horizon_without_evidence_is_not_settled:true,
  model_spread_bps:DEFAULT_POLICY.simulatedSpreadBps,
  model_fee_bps:DEFAULT_POLICY.feeBps,
  no_oracle_or_client_receipt:true,trade_authorized:false};
}
