// V0.21 research-to-paper planning, strictly advisory: no wallet, no signing, no order submission.
// Execution decisions and risk caps are shared concepts; fill prices cannot be identical
// between simulated and live venues. Live remains disabled elsewhere.
import {portfolioBudget,MIN_PAPER_ENTRY_USDC} from './portfolio-budget.mjs';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const cents=n=>Math.floor((n+1e-8)*100)/100;
export const STAGNATION_MIN_HOLD_MS=48*60*60*1000;
export const STAGNATION_EVIDENCE_WINDOW_MS=24*60*60*1000;
export const STAGNATION_MIN_SAMPLE_GAP_MS=6*60*60*1000;
export const INACTIVITY_REVIEW_MS=45*24*60*60*1000;

// A reminder to reassess the investment thesis, never a timed sell order.
export function inactivityReview({position,now=Date.now()}={}){
 const opened=Date.parse(position?.openedAt);
 if(!finite(now)||!Number.isFinite(opened)||opened>now)
  return {status:'DATA_GAP',actionable:false};
 return {status:now-opened>=INACTIVITY_REVIEW_MS?'REVIEW_DUE':'HOLD',
  actionable:false,review_at_utc:new Date(opened+INACTIVITY_REVIEW_MS).toISOString()};
}

/**
 * Return a NON-EXECUTABLE suggested order amount. pct is allocation of AVAILABLE
 * capital, not a probability of success and never an authorization to go all-in.
 * capFractionOfPool is a conservative research ceiling, not a guaranteed sell quote.
 */
export function suggestPaperAllocation({state,percent,liquidityUsd,riskApproved=false,
  sellRouteVerified=false,capFractionOfPool=.005}={}){
 const b=portfolioBudget(state);
 if(!b.valid||!riskApproved||!sellRouteVerified)
  return {status:'BLOCKED',reason:'UNVERIFIED_RISK_OR_SELL_ROUTE',amount_test_usdc:0};
 if(!finite(percent)||percent<0||percent>100)
  return {status:'BLOCKED',reason:'INVALID_PERCENT',amount_test_usdc:0};
 if(!finite(liquidityUsd)||liquidityUsd<=0||!finite(capFractionOfPool)||
    capFractionOfPool<=0||capFractionOfPool>0.01)
  return {status:'BLOCKED',reason:'UNKNOWN_LIQUIDITY_CAP',amount_test_usdc:0};
 const liquidCap=cents(liquidityUsd*capFractionOfPool);
 const raw=cents(b.free_to_allocate_test_usdc*percent/100);
 const amount=cents(Math.min(raw,liquidCap));
 if(amount<MIN_PAPER_ENTRY_USDC)
  return {status:'BLOCKED',reason:'BELOW_MINIMUM_OR_CAPACITY',amount_test_usdc:0};
 return {status:'ADVISORY_ONLY',reason:'INDEPENDENT_EXECUTOR_VALIDATION_REQUIRED',
  amount_test_usdc:amount,free_before_test_usdc:b.free_to_allocate_test_usdc,
  proposed_pct:percent,liquidity_ceiling_test_usdc:liquidCap};
}

/**
 * There is no provable "this coin will never pump". A time-based exit may only
 * be ADVISED if a full observation window shows a flat/negative trend, no rising
 * independent buyers, and a currently independently verified SELL route.
 * Missing evidence blocks the suggestion; no position or balance is changed.
 */
export function assessStagnation({position,observations,now=Date.now(),
  minHoldMs=STAGNATION_MIN_HOLD_MS,maxPriceGainPct=5}={}){
 const wait=(reason)=>({status:'HOLD_REVIEW',reason,actionable:false});
 if(!position||!finite(now)||!Number.isFinite(Date.parse(position.openedAt))||
    now-Date.parse(position.openedAt)<minHoldMs)return wait('MIN_HOLD_NOT_REACHED');
 if(!Array.isArray(observations))return wait('OBSERVATIONS_MISSING');
 const points=observations.filter(o=>
   Number.isFinite(Date.parse(o?.at))&&Date.parse(o.at)<=now&&
   finite(o.priceUsd)&&o.priceUsd>0&&
   Number.isInteger(o.uniqueBuyers)&&o.uniqueBuyers>=0&&
   o.independentBuyersVerified===true&&
   o.sellRouteVerified===true).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 if(points.length<3)return wait('INSUFFICIENT_INDEPENDENT_OBSERVATIONS');
 const recent=points.at(-1);
 if(now-Date.parse(recent.at)>90000)return wait('LATEST_PRICE_OR_ROUTE_STALE');
 const windowStart=Date.parse(recent.at)-STAGNATION_EVIDENCE_WINDOW_MS;
 const start=points.find(p=>Date.parse(p.at)<=windowStart);
 if(!start)return wait('INSUFFICIENT_TIME_WINDOW');
 const middle=points.find(p=>Date.parse(p.at)>=Date.parse(start.at)+
   STAGNATION_MIN_SAMPLE_GAP_MS&&Date.parse(p.at)<=Date.parse(recent.at)-
   STAGNATION_MIN_SAMPLE_GAP_MS);
 if(!middle)return wait('SAMPLES_NOT_INDEPENDENT_IN_TIME');
 const gain=(recent.priceUsd/start.priceUsd-1)*100;
 if(gain>maxPriceGainPct)return wait('PRICE_ACCELERATION_NOT_STAGNANT');
 if(middle.uniqueBuyers>start.uniqueBuyers||
    recent.uniqueBuyers>middle.uniqueBuyers)return wait('BUYER_ACCELERATION_PRESENT');
 if(!finite(position.entryPriceUsd)||position.entryPriceUsd<=0)
  return wait('ENTRY_UNKNOWN');
 return {status:'EXIT_REVIEW',reason:'NO_CONFIRMED_ACCELERATION_WITH_FRESH_SELL_ROUTE',
  actionable:false,unrealized_price_change_pct:gain,
  oldest_evidence_at:start.at,latest_evidence_at:recent.at,
  warning:'Not a prediction of future price; requires signed SELL decision'};
}
