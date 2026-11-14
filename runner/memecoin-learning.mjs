// Read-only retrospective research metrics; not a trained model, a probability,
// a trade signal or a comparison of realized SELL proceeds.
import {MULTIPLIERS} from './memecoin-outcomes.mjs';
const GROUPS=['EARLY_MOMENTUM','DETERMINISTIC_CONTROL'];
export function summarizeCohorts(records){
 if(!Array.isArray(records))throw Error('INVALID_COHORT_INPUT');
 const summary=Object.fromEntries(GROUPS.map(group=>[group,{
  observed:0,completed:0,coverage_complete:0,negative_outcomes_verified:0,
  indicative_hits:Object.fromEntries(MULTIPLIERS.map(k=>[k,0])),
  unknown_without_complete_coverage:0
 }]));
 for(const r of records){
  const s=summary[r?.selection];if(!s||typeof r?.candidate_id!=='string')continue;
  s.observed++;
  if(!r.completed_at_utc)continue;
  s.completed++;
  if(r.outcomes?.coverage_complete===true)s.coverage_complete++;
  if(r.outcomes?.negative_outcomes_verified===true)s.negative_outcomes_verified++;
  else s.unknown_without_complete_coverage++;
  for(const multiple of MULTIPLIERS){
   if(r.outcomes?.outcomes?.[multiple]?.hit===true)s.indicative_hits[multiple]++;
  }
 }
 return {schema:'memecoin_learning_summary.v1',paper_only:true,actionable:false,
  horizon_days:14,threshold_multipliers:MULTIPLIERS,
  summary,calibration_status:'NOT_CALIBRATED',
  trade_execution_verified:false,sellability_verified:false,
  note:'Selected cohorts, sparse indicative quotes. Unless independent complete OHLCV interval highs are verified, unobserved 2x-200x spikes are UNKNOWN, not false. Counts are NOT profit probabilities, proof of skill, realized proceeds or comprehensive market coverage.'};
}
