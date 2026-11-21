// Train only on labels whose 24h horizon has closed BEFORE validation starts.
// Does NOT use a retrospective winner-only sample for negative examples.
const ms=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
const thresholds=[5,10,15,20,25,30,40];
export function trainForwardThreshold({samples=[],validationStartUtc,minLabeled=30,minPositives=5,minNegatives=5,holdoutHours=24}={}){
 const validStart=ms(validationStartUtc);
 if(validStart===null||!Array.isArray(samples)||!Number.isInteger(minLabeled)||!Number.isInteger(minPositives)||!Number.isInteger(minNegatives))throw Error('INVALID_TEMPORAL_TRAINING');
 const latestStart=validStart-holdoutHours*3600000;
 const historical=[],futureRejected=[],invalid=[];
 for(const s of samples){
  const at=ms(s?.decision_at_utc),labeled=ms(s?.outcome_available_at_utc);
  if(at===null||labeled===null||labeled<at||typeof s?.score!=='number'||!Number.isFinite(s.score)
   ||!['OBSERVED_24H_DOUBLE','OBSERVED_POSITIVE_UNDER_100','OBSERVED_NONPOSITIVE'].includes(s.label)){invalid.push(s);continue;}
  if(labeled>latestStart){futureRejected.push({decision_at_utc:s.decision_at_utc,reason:'OUTCOME_NOT_MATURED_BEFORE_HOLDOUT'});continue;}
  historical.push({score:s.score,positive:s.label==='OBSERVED_24H_DOUBLE'});
 }
 const pos=historical.filter(x=>x.positive).length,neg=historical.length-pos;
 if(historical.length<minLabeled||pos<minPositives||neg<minNegatives){
  return {schema:1,kind:'R29_TEMPORAL_TRAINING_RESULT',status:'INSUFFICIENT_PRIOR_LABELED_COHORT',
   labeled:historical.length,positive:pos,negative:neg,
   required:{labeled:minLabeled,positive:minPositives,negative:minNegatives},
   threshold:null,parameters_applied:false,
   future_rejected:futureRejected.length,invalid_rows:invalid.length,
   note:'No learnable edge confirmed. Continue collecting neutral positives and negatives.'};
 }
 const results=thresholds.map(threshold=>{
  const tp=historical.filter(x=>x.positive&&x.score>=threshold).length;
  const fp=historical.filter(x=>!x.positive&&x.score>=threshold).length;
  const fn=pos-tp;
  const precision=tp+fp?tp/(tp+fp):0,recall=pos?tp/pos:0;
  const f1=precision+recall?2*precision*recall/(precision+recall):0;
  return {threshold,tp,fp,fn,precision,recall,f1};
 });
 // Deterministic tie breaker: higher precision, then higher threshold.
 results.sort((a,b)=>b.f1-a.f1||b.precision-a.precision||b.threshold-a.threshold);
 return {schema:1,kind:'R29_TEMPORAL_TRAINING_RESULT',status:'TRAINED_HISTORICAL_THRESHOLD_RESEARCH_ONLY',
  labeled:historical.length,positive:pos,negative:neg,validation_start_utc:validationStartUtc,
  latest_usable_label_at_utc:new Date(latestStart).toISOString(),threshold:results[0].threshold,
  metrics_in_sample:results[0],future_rejected:futureRejected.length,invalid_rows:invalid.length,
  parameters_applied:false,
  note:'For next unseen forward batch only after explicit out-of-sample evaluation, never automatic GitHub BUY.'};
}
