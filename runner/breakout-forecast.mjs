// Pure, off-line research analysis: no network, no wallet and no trades.
// A 0..100 research rating is NOT a percentage probability.
// A true calibrated percentage requires a complete, prospective, independent
// historical launch cohort with fully observed 14-day outcomes.
export const BREAKOUT_DAYS=14;
export const BREAKOUT_MULTIPLIER=2;
const WINDOW_MS=14*24*60*60*1000;
const timestamp=value=>Date.parse(value);
const validPositive=value=>Number.isFinite(value)&&value>0;
const percent=x=>Math.round(x*1000)/10; // one decimal

export function labelBreakout14d({anchor_at_utc,anchor_price_usd,observations,
 observed_until_at_utc,quote_quality_verified=false}={}){
 const start=timestamp(anchor_at_utc),end=start+WINDOW_MS,observedUntil=timestamp(observed_until_at_utc);
 if(!Number.isFinite(start)||!validPositive(anchor_price_usd)||
    !Array.isArray(observations)||!quote_quality_verified||
    !Number.isFinite(observedUntil)||observedUntil<start)return {outcome:null,status:'INVALID_OR_UNVERIFIED'};
 const samples=observations.filter(o=>Number.isFinite(timestamp(o?.at_utc))&&
  timestamp(o.at_utc)>=start&&timestamp(o.at_utc)<=end&&
  timestamp(o.at_utc)<=observedUntil&&validPositive(o.price_usd));
 const hit=samples.some(o=>o.price_usd>=anchor_price_usd*BREAKOUT_MULTIPLIER);
 if(hit)return {outcome:true,status:'OBSERVED_HIT'};
 if(observedUntil<end)return {outcome:null,status:'CENSORED_UNDER_14_DAYS'};
 if(!samples.length)return {outcome:null,status:'NO_VALID_PRICES'};
 return {outcome:false,status:'OBSERVED_NO_HIT',warning:'Quote coverage and missing launches require independent audit'};
}
function wilson95(successes,n){
 const z=1.96,p=successes/n,denom=1+z*z/n;
 const center=(p+z*z/(2*n))/denom;
 const half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/denom;
 return [percent(Math.max(0,center-half)),percent(Math.min(1,center+half))];
}
export function calibrateBreakout14d(records,{minimumBin=100}={}){
 if(!Array.isArray(records)||!Number.isInteger(minimumBin)||minimumBin<100)throw Error('Ungültige Kalibrierungsmindestmenge');
 const buckets=Array.from({length:10},(_,bucket)=>({bucket,successes:0,n:0,eligible:false,probability_pct:null,interval95_pct:null}));
 const ids=new Set();
 for(const r of records){
  // Fail closed: no cherry-picked winners or same-sample training claims.
  // Audit flags must be verified by an independent ingestion pipeline, not
  // directly trusted as evidence of calibration in this module.
  if(r?.split!=='HOLDOUT'||r.complete_launch_cohort!==true||
     r.independent_quote_verification!==true||r.prediction_precommitted!==true||
     !Number.isInteger(r.rating_0_100)||r.rating_0_100<0||r.rating_0_100>100||
     typeof r.candidate_id!=='string'||!r.candidate_id||
     ![true,false].includes(r.outcome_breakout_14d))continue;
  if(ids.has(r.candidate_id))continue;
  ids.add(r.candidate_id);
  const bin=Math.min(9,Math.floor(r.rating_0_100/10));
  buckets[bin].n++;
  if(r.outcome_breakout_14d)buckets[bin].successes++;
 }
 for(const b of buckets){
  if(b.n<minimumBin)continue;
  b.eligible=true;
  b.probability_pct=percent(b.successes/b.n);
  b.interval95_pct=wilson95(b.successes,b.n);
 }
 return {
  definition:{window_days:14,breakout_price_multiple:2},
  label:'HOLDOUT_EMPIRICAL_FREQUENCY_NOT_PERSONAL_GUARANTEE',
  minimum_per_rating_bin:minimumBin,
  records_accepted:ids.size,
  buckets,
  warning:'Completeness, independence, quote-quality, survivorship and temporal split MUST be audited externally; this module does not establish them.'
 };
}
export function breakoutProbabilityFromRating(rating,calibration){
 if(!Number.isInteger(rating)||rating<0||rating>100)
  return {status:'UNAVAILABLE',probability_pct:null};
 const bucket=Math.min(9,Math.floor(rating/10));
 const b=calibration?.buckets?.[bucket];
 if(!b?.eligible||!Number.isFinite(b.probability_pct)||!Array.isArray(b.interval95_pct))
  return {status:'NOT_CALIBRATED',rating_0_100:rating,probability_pct:null,
    message:'Rating ist keine 14-Tage-Wahrscheinlichkeit. Nicht genügend unabhängig geprüfte historische Fälle.'};
 return {status:'HOLDOUT_EMPIRICAL_ESTIMATE',rating_0_100:rating,
  probability_pct:b.probability_pct,interval95_pct:b.interval95_pct,
  historical_samples:b.n,definition:calibration.definition,
  message:'Uncertain empirical group frequency; do not treat as a guarantee or safety validation.'};
}
