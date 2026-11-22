// D5-05: time-purged, fully separate TRAIN / VALIDATION / HOLDOUT
// research ledger. Missing or immature outcomes are NEVER negatives.
// No 65-winner hindsight input, no rule-tuning from holdout and no orders.
import {validateFrozenHoldout} from './v19-prospective-holdout-freeze.mjs';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const number=x=>typeof x==='number'&&Number.isFinite(x);
const round=x=>Math.round(x*1e6)/1e6;
const oracle=x=>x&&('reported_gain_pct' in x||'future_winner_label' in x
 ||'post_event_rank' in x||x.source_class==='POST_EVENT_ORACLE');
export function scoreFrozenTemporalOutcomes({
 freeze,samples=[],asOfUtc,neutralDenominatorProven=false,
 thresholdReturnPct=20,minimumMatureLabeled=20
}={}){
 validateFrozenHoldout(freeze);
 const at=ms(asOfUtc);
 if(at===null||at<ms(freeze.frozen_at_utc)
  ||!Array.isArray(samples)||samples.length>100000
  ||typeof neutralDenominatorProven!=='boolean'
  ||!number(thresholdReturnPct)||thresholdReturnPct<=0
  ||!Number.isInteger(minimumMatureLabeled)||minimumMatureLabeled<1)
  throw Error('INVALID_FROZEN_TEMPORAL_SCORECARD');
 const start=ms(freeze.frozen_at_utc);
 const vals=[
  ['TRAIN',-Infinity,start],
  ['VALIDATION',ms(freeze.validation_start_utc),ms(freeze.validation_end_utc)],
  ['HOLDOUT',ms(freeze.holdout_start_utc),ms(freeze.holdout_end_utc)]
 ];
 const buckets={TRAIN:[],VALIDATION:[],HOLDOUT:[]},excluded=[];
 for(const [index,s] of samples.entries()){
  const t=ms(s?.decision_at_utc),available=ms(s?.outcome_available_at_utc);
  if(oracle(s)||!['ORIGINAL_CAPTURE','SYNTHETIC_TEST'].includes(s?.source_class)
   ||t===null||available===null||available<t
   ||!['1','3','6'].includes(String(s?.horizon_hours))
   ||!number(s.predicted_probability)||s.predicted_probability<0
   ||s.predicted_probability>1||typeof s.source_path!=='string'
   ||!s.source_path.startsWith('research/')
   ||typeof s.pool_key!=='string'||!s.pool_key.includes(':')){
   excluded.push({index,reason:'INVALID_UNVERIFIED_OR_ORACLE_SOURCE'});continue;
  }
  const window=vals.find(([name,l,r])=>t>=l&&t<r);
  if(!window){excluded.push({index,reason:'EXCLUDED_PURGED_OR_OUTSIDE_WINDOW'});continue;}
  const name=window[0],mature=available>=t+s.horizon_hours*3600000&&available<=at
   &&(name!=='TRAIN'||available<=start);
  buckets[name].push({decision_at_utc:s.decision_at_utc,
   outcome_available_at_utc:s.outcome_available_at_utc,
   horizon_hours:s.horizon_hours,predicted_probability:s.predicted_probability,
   observed_end_return_pct:mature&&number(s.observed_end_return_pct)
    ?s.observed_end_return_pct:null,
   source_class:s.source_class,source_path:s.source_path,pool_key:s.pool_key,
   mature_label:mature&&number(s.observed_end_return_pct)});
 }
 const reports={};
 for(const [name,rows] of Object.entries(buckets)){
  const mature=rows.filter(r=>r.mature_label);
  const fullWindow=name==='TRAIN'||at>=ms(freeze[name.toLowerCase()+'_end_utc']);
  const isSynthetic=mature.length>0&&mature.every(r=>r.source_class==='SYNTHETIC_TEST');
  // Even 100% of *reported* rows is not complete market coverage. Only
  // synthetic regression data may be explicitly declared complete by caller.
  const enough=mature.length>=minimumMatureLabeled&&fullWindow&&
   neutralDenominatorProven&&isSynthetic;
  const perHorizon={};
  for(const h of [1,3,6]){
   const subset=mature.filter(r=>r.horizon_hours===h);
   const ok=enough&&subset.length>=Math.max(1,Math.ceil(minimumMatureLabeled/3));
   let brier=null,mae=null,precision=null,recall=null;
   if(ok){
    let sumB=0,sumA=0,tp=0,fp=0,fn=0;
    for(const r of subset){
     const label=r.observed_end_return_pct>=thresholdReturnPct?1:0;
     const pred=r.predicted_probability>=.5?1:0;
     sumB+=(r.predicted_probability-label)**2;
     sumA+=Math.abs(r.predicted_probability-label);
     if(pred&&label)tp++;
     if(pred&&!label)fp++;
     if(!pred&&label)fn++;
    }
    brier=round(sumB/subset.length);mae=round(sumA/subset.length);
    precision=tp+fp?round(tp/(tp+fp)):null;
    recall=tp+fn?round(tp/(tp+fn)):null;
   }
   perHorizon[h]={horizon_hours:h,mature_labeled_count:subset.length,
    brier,mae,precision,recall,metrics_from_synthetic_cohort_only:ok};
  }
  reports[name]={sample_count:rows.length,mature_labeled_count:mature.length,
   immature_or_unknown_count:rows.length-mature.length,
   full_window_elapsed:fullWindow,
   all_real_neutral_market_outcomes_verified:false,
   metric_status:enough?'SYNTHETIC_COHORT_SCORE_ONLY':'INSUFFICIENT_PROVEN_LABELS',
   horizons:perHorizon};
 }
 return {schema:1,kind:'R29_V19_TEMPORAL_PURGED_OFFLINE_SCORECARD',
  freeze_sha256:freeze.freeze_sha256,as_of_utc:asOfUtc,
  validation_started_at_utc:freeze.validation_start_utc,
  holdout_end_utc:freeze.holdout_end_utc,
  excluded,cohorts:reports,
  genuine_market_holdout_performance_verified:false,
  trained_rules_modified:false,oracle_winner_inputs_used:false,
  client_paper_fills:0,orders_authorized:0};
}
