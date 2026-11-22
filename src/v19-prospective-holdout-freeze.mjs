// R29 QA-05: immutable PRE-OUTCOME temporal holdout. The Oct-2026 winner
// spreadsheet cannot enter training, validation or discovery through this API.
import {createHash} from 'node:crypto';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const iso=t=>new Date(t).toISOString();
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const oracle=x=>x&&('reported_gain_pct' in x||'future_winner_label' in x
 ||'post_event_rank' in x||x.source_class==='POST_EVENT_ORACLE'
 ||x.source_class==='POSTHOC_ORACLE');
export const FROZEN_EXPERIMENT_RULES=Object.freeze({
 baseline:'UNIFIED_V18_SIGNAL_V1',
 experimental_exit:['BASELINE_TP20_SL10','TRAIL_TP20_DD12_SL10',
 'PARTIAL_TP20_TRAIL12_SL10','TIME_STOP_60M_TP20_SL10'],
 paper_entry_amount_test_usdc:50,
 no_preliminary_oracle_winner_selection:true,
 buyer_and_sell_risk_gates_unchanged:true,
 no_automatic_trade_or_dot_activation:true
});
function exactSpec({frozenAtUtc,purgeHours,validationStartUtc,validationEndUtc,
 holdoutStartUtc,holdoutEndUtc,rules}){
 return {kind:'R29_V19_PRECOMMITTED_TEMPORAL_HOLDOUT',schema:1,
  frozen_at_utc:frozenAtUtc,purge_hours:purgeHours,
  training_outcomes_must_be_available_before_utc:frozenAtUtc,
  validation_start_utc:validationStartUtc,
  validation_end_utc:validationEndUtc,
  holdout_start_utc:holdoutStartUtc,
  holdout_end_utc:holdoutEndUtc,rules};
}
export function freezeProspectiveHoldout({
 frozenAtUtc,purgeHours=6,validationHours=24,holdoutHours=24,
 rules=FROZEN_EXPERIMENT_RULES
}={}){
 const at=ms(frozenAtUtc);
 if(at===null||!Number.isInteger(purgeHours)||purgeHours<6||purgeHours>72
 ||!Number.isInteger(validationHours)||validationHours<6||validationHours>720
 ||!Number.isInteger(holdoutHours)||holdoutHours<6||holdoutHours>720
 ||JSON.stringify(rules)!==JSON.stringify(FROZEN_EXPERIMENT_RULES))
 throw Error('INVALID_PRE_OUTCOME_HOLDOUT_FREEZE');
 const validStart=at+purgeHours*3600000,
  validEnd=validStart+validationHours*3600000,
  holdoutStart=validEnd+purgeHours*3600000,
  holdoutEnd=holdoutStart+holdoutHours*3600000;
 const spec=exactSpec({frozenAtUtc:iso(at),purgeHours,
  validationStartUtc:iso(validStart),validationEndUtc:iso(validEnd),
  holdoutStartUtc:iso(holdoutStart),holdoutEndUtc:iso(holdoutEnd),
  rules:FROZEN_EXPERIMENT_RULES});
 return {...spec,freeze_sha256:digest(spec),
  evaluation_not_yet_complete:true,
  authorized_trading:false,orders_created:0};
}
export function validateFrozenHoldout(freeze){
 if(freeze?.kind!=='R29_V19_PRECOMMITTED_TEMPORAL_HOLDOUT'
  ||freeze.schema!==1||ms(freeze.frozen_at_utc)===null
  ||JSON.stringify(freeze.rules)!==JSON.stringify(FROZEN_EXPERIMENT_RULES)
  ||typeof freeze.freeze_sha256!=='string')throw Error('INVALID_FROZEN_HOLDOUT');
 const plan=freezeProspectiveHoldout({
  frozenAtUtc:freeze.frozen_at_utc,purgeHours:freeze.purge_hours,
  validationHours:(ms(freeze.validation_end_utc)-ms(freeze.validation_start_utc))/3600000,
  holdoutHours:(ms(freeze.holdout_end_utc)-ms(freeze.holdout_start_utc))/3600000,
  rules:freeze.rules
 });
 if(JSON.stringify(plan)!==JSON.stringify(freeze))
  throw Error('FROZEN_HOLDOUT_HASH_OR_RULES_MISMATCH');
 return true;
}
export function assignProspectiveHoldout({
 freeze,observations=[],asOfUtc
}={}){
 validateFrozenHoldout(freeze);
 const now=ms(asOfUtc),start=ms(freeze.frozen_at_utc);
 if(now===null||now<start||!Array.isArray(observations)||observations.length>100000)
 throw Error('INVALID_PROSPECTIVE_HOLDOUT_ASSIGNMENT');
 const buckets={TRAIN_AVAILABLE_AT_FREEZE:[],VALIDATION:[],HOLDOUT:[]},
 excluded=[];
 for(const [index,x] of observations.entries()){
  const at=ms(x?.decision_at_utc),available=ms(x?.available_at_utc),
  evidence=typeof x?.source_path==='string'&&x.source_path.startsWith('research/');
  if(oracle(x)||!at||!available||available<at||available>now
   ||!evidence||typeof x.pool_key!=='string'||!x.pool_key.includes(':')){
   excluded.push({index,reason:'ORACLE_FUTURE_UNAVAILABLE_OR_UNPROVEN_SOURCE'});continue;
  }
  let bucket=null;
  if(at<=start&&available<=start)bucket='TRAIN_AVAILABLE_AT_FREEZE';
  else if(at>=ms(freeze.validation_start_utc)&&at<ms(freeze.validation_end_utc))
   bucket='VALIDATION';
  else if(at>=ms(freeze.holdout_start_utc)&&at<ms(freeze.holdout_end_utc))
   bucket='HOLDOUT';
  if(!bucket){excluded.push({index,reason:'PURGED_GAP_OR_OUT_OF_WINDOW'});continue;}
  buckets[bucket].push({pool_key:x.pool_key,decision_at_utc:x.decision_at_utc,
   available_at_utc:x.available_at_utc,source_path:x.source_path,
   outcome_label:null,actual_gpt_review_verified:false});
 }
 return {schema:1,kind:'R29_V19_FROZEN_HOLDOUT_ASSIGNMENT',
  freeze_sha256:freeze.freeze_sha256,as_of_utc:iso(now),
  source_sample_count:observations.length,
  train_count:buckets.TRAIN_AVAILABLE_AT_FREEZE.length,
  validation_count:buckets.VALIDATION.length,
  holdout_count:buckets.HOLDOUT.length,buckets,excluded,
  holdout_evaluation_authorized:now>=ms(freeze.holdout_end_utc),
  holdout_outcome_coverage_verified:false,
  recall:null,precision:null,false_positive_rate:null,
  rules_reselected_after_holdout:false,
  future_winners_used_for_discovery:false,
  actual_paper_fills_verified:0,orders_authorized:0};
}
