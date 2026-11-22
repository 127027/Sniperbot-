// R29 V1.8: ONE deterministic signal decision for live-paper research and past-as-of replay.
// Callers MUST supply evidence that passed the same Dot2/Dot3/source gates separately.
// No files, network, GitHub orders, wallet, account mutations, or hindsight labels.
export const UNIFIED_V18_RULES=Object.freeze({
  entryMomentumPct:5,stopLossPct:10,takeProfitPct:20,
  maxMomentumAgeHours:2,maxObservationAgeMs:600000,
  // Only an actual realized loss triggers the brief re-entry pause.
  lossReentryCooldownMinutes:60
});
const time=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(x)
  &&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const result=(action,reason,extra={})=>({schema:1,kind:'R29_UNIFIED_V18_DECISION',
 action,reason,...extra,paper_order_authorized:false});

export function decideUnifiedMarket({
 asOfUtc,observedAtUtc,observedPriceUsd,priorAtUtc=null,priorPriceUsd=null,
 position=null,lastLossAtUtc=null,fullReviewDue=false,params={}
}={}){
 const now=time(asOfUtc),observed=time(observedAtUtc),p={...UNIFIED_V18_RULES,...params};
 if(now===null||!Number.isFinite(p.entryMomentumPct)||p.entryMomentumPct<=0
  ||!Number.isFinite(p.stopLossPct)||p.stopLossPct<=0
  ||!Number.isFinite(p.takeProfitPct)||p.takeProfitPct<=0
  ||!Number.isFinite(p.maxMomentumAgeHours)||p.maxMomentumAgeHours<=0
  ||!Number.isFinite(p.maxObservationAgeMs)||p.maxObservationAgeMs<=0
  ||!Number.isFinite(p.lossReentryCooldownMinutes)||p.lossReentryCooldownMinutes<0
  ||typeof fullReviewDue!=='boolean')throw Error('INVALID_UNIFIED_DECISION_ARGUMENTS');
 if(observed===null||observed>now||now-observed>p.maxObservationAgeMs||!positive(observedPriceUsd))
   return result('DATA_GAP','CURRENT_OBSERVATION_MISSING_STALE_OR_FUTURE');
 const context={as_of_utc:asOfUtc,source_observed_at_utc:observedAtUtc,
   observed_price_usdc:observedPriceUsd};
 // Risk exits are considered at every observed market tick, not only full GPT reviews.
 if(position!==null){
   if(!positive(position.entryPrice))return result('DATA_GAP','POSITION_ENTRY_PRICE_UNKNOWN',context);
   const move=(observedPriceUsd/position.entryPrice-1)*100;
   const payload={...context,observed_move_pct:move};
   if(move<=-p.stopLossPct)return result('SELL','STOP_LOSS',payload);
   if(move>=p.takeProfitPct)return result('SELL','TAKE_PROFIT',payload);
   return result('HOLD','POSITION_WITHIN_BOUNDS',payload);
 }
 if(!fullReviewDue)return result('WATCH','NEXT_FULL_REVIEW_NOT_DUE',context);
 const prev=time(priorAtUtc);
 if(prev===null||!positive(priorPriceUsd))
   return result('WATCH','MOMENTUM_BASELINE_MISSING',context);
 if(prev>=observed||observed-prev>p.maxMomentumAgeHours*3600000)
   return result('WATCH','MOMENTUM_BASELINE_FUTURE_OR_STALE',context);
 const momentumPct=(observedPriceUsd/priorPriceUsd-1)*100;
 const withMomentum={...context,observed_momentum_pct:momentumPct,
   prior_observed_at_utc:priorAtUtc};
 if(momentumPct<p.entryMomentumPct)
   return result('WATCH','MOMENTUM_BELOW_ENTRY_THRESHOLD',withMomentum);
 if(lastLossAtUtc!==null){
   const last=time(lastLossAtUtc);
   if(last===null||last>now)return result('DATA_GAP','INVALID_LOSS_HISTORY_TIMESTAMP',withMomentum);
   if(now-last<p.lossReentryCooldownMinutes*60000)
     return result('WATCH','LOSS_REENTRY_COOLDOWN',withMomentum);
 }
 return result('BUY','POSITIVE_OBSERVED_MOMENTUM',withMomentum);
}
