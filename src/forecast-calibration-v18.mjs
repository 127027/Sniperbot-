// V1.8 RESEARCH-ONLY empirical calibration from matured, pre-holdout outcomes.
// No external APIs, hindsight winner list, trading decisions or paper orders.
const horizons=[1,3,6],targets=[20,50,100];
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const bin=x=>x>=0?'NONNEGATIVE_SIGNAL':'NEGATIVE_SIGNAL';

export function trainTemporalProbabilities({samples=[],validationStartUtc,
 minimumBucketSize=30,minimumEventCount=5,purgeHours=6}={}){
 const cutoff=stamp(validationStartUtc);
 if(cutoff===null||!Array.isArray(samples)||!Number.isInteger(minimumBucketSize)||minimumBucketSize<5
   ||!Number.isInteger(minimumEventCount)||minimumEventCount<1
   ||!Number.isFinite(purgeHours)||purgeHours<0)throw Error('INVALID_V18_TEMPORAL_TRAINING');
 const lastAllowed=cutoff-purgeHours*3600000;
 const used=[],rejected={invalid:0,future:0,unknown:0};
 for(const s of samples){
   const at=stamp(s?.decision_at_utc),available=stamp(s?.outcome_available_at_utc);
   if(at===null||available===null||!horizons.includes(s?.horizon_hours)||num(s?.score)===null){
     rejected.invalid++;continue;
   }
   if(s?.observed_end_return_pct===null||num(s?.observed_end_return_pct)===null){
     rejected.unknown++;continue;
   }
   // End-of-horizon outcomes must exist and have matured *before* validation.
   if(available<at+s.horizon_hours*3600000||available>lastAllowed||at>=lastAllowed){
     rejected.future++;continue;
   }
   used.push({horizon:s.horizon_hours,bucket:bin(s.score),gain:s.observed_end_return_pct});
 }
 const models={};
 for(const horizon of horizons){
   models[horizon]={};
   for(const bucket of ['NONNEGATIVE_SIGNAL','NEGATIVE_SIGNAL']){
     const rows=used.filter(x=>x.horizon===horizon&&x.bucket===bucket),n=rows.length;
     const probabilities={},status={};
     for(const target of targets){
       const wins=rows.filter(x=>x.gain>=target).length;
       if(n<minimumBucketSize||wins<minimumEventCount||n-wins<minimumEventCount){
         probabilities[target]=null;status[target]='INSUFFICIENT_MIXED_LABELS';
       }else{
         probabilities[target]=(wins+1)/(n+2);status[target]='EMPIRICAL_SMOOTHED_RESEARCH_ONLY';
       }
     }
     models[horizon][bucket]={total:n,probabilities,status};
   }
 }
 return {schema:1,kind:'V18_TEMPORAL_PROBABILITY_CALIBRATION',mode:'RESEARCH_ONLY',
  validation_start_utc:validationStartUtc,last_usable_outcome_at_utc:new Date(lastAllowed).toISOString(),
  used_samples:used.length,rejected,models,trade_authorized:false,
  caveat:'Coarse empirical calibration, not validated predictive edge; holdout evaluation required.'};
}
export function predictResearchProbabilities({calibration,score}={}){
 if(calibration?.kind!=='V18_TEMPORAL_PROBABILITY_CALIBRATION'||num(score)===null)
   throw Error('INVALID_V18_CALIBRATION_INPUT');
 const bucket=bin(score),forecasts={};
 for(const h of horizons){
   forecasts[h]={
     probability_up20:calibration.models[h][bucket].probabilities[20],
     probability_up50:calibration.models[h][bucket].probabilities[50],
     probability_up100:calibration.models[h][bucket].probabilities[100],
     sample_count:calibration.models[h][bucket].total
   };
 }
 return {schema:1,kind:'V18_RESEARCH_PROBABILITIES',bucket,forecasts,
  trade_authorized:false,calibration_is_independent_holdout_tested:false};
}
