// Paper-only allocation. The 0..100 research score is NOT a probability and NEVER
// determines an amount. Allocation is an explicit, auditable decision independent
// of (eventually calibrated) breakout probability.
//
// EXPLORATORY: one minimum-sized observation.
// TARGET: a separate explicit research-approved amount.
// HIGH_CONVICTION: remaining free capital, limited by local per-order maximum
// and independently established executable sell capacity. This is NOT derived
// from a score >= 95 and is allowed only after the caller's quorum/risk gates.
export const ALLOCATION_INTENTS=Object.freeze(['EXPLORATORY','TARGET','HIGH_CONVICTION']);

export function allocatePaper({min,max,free,capacity=Infinity,intent='EXPLORATORY',targetUsdc=null}={}){
 if(![min,max,free].every(Number.isFinite)||min<=0||max<min||free<0||
    !(capacity>0)||!ALLOCATION_INTENTS.includes(intent))return 0;
 let target;
 if(intent==='EXPLORATORY')target=min;
 else if(intent==='HIGH_CONVICTION')target=max;
 else {
  if(!Number.isFinite(targetUsdc)||targetUsdc<=0)return 0;
  target=targetUsdc;
 }
 // Do not exceed the local hard limits, available funds or independent
 // capacity, even if the signed research decision requests more.
 const allowed=Math.min(target,max,free,capacity);
 const amount=Math.floor((allowed+1e-9)*100)/100;
 return amount>=min?amount:0;
}
