import test from 'node:test';
import assert from 'node:assert/strict';
import {labelBreakout14d,calibrateBreakout14d,breakoutProbabilityFromRating} from './breakout-forecast.mjs';
const now='2026-01-01T00:00:00Z';
const plusDays=d=>new Date(Date.parse(now)+d*86400000).toISOString();
test('requires independent quote quality and 14 days before negative label',()=>{
 const base={anchor_at_utc:now,anchor_price_usd:1,
   observations:[{at_utc:plusDays(7),price_usd:0.3}],quote_quality_verified:true};
 assert.equal(labelBreakout14d({...base,observed_until_at_utc:plusDays(8)}).outcome,null);
 assert.equal(labelBreakout14d({...base,observed_until_at_utc:plusDays(14)}).outcome,false);
 assert.equal(labelBreakout14d({...base,observed_until_at_utc:plusDays(14),quote_quality_verified:false}).outcome,null);
 assert.equal(labelBreakout14d({...base,observed_until_at_utc:plusDays(2),
  observations:[{at_utc:plusDays(2),price_usd:2}]}).outcome,true);
 assert.equal(labelBreakout14d({...base,observed_until_at_utc:plusDays(14),
  observations:[{at_utc:plusDays(15),price_usd:20}]}).outcome,null,'After day 14 cannot count');
});
test('uncalibrated rating 95 never masquerades as 95% breakout probability',()=>{
 const c=calibrateBreakout14d([]);
 assert.equal(breakoutProbabilityFromRating(95,c).probability_pct,null);
 const c99=calibrateBreakout14d(Array.from({length:99},(_,i)=>({
  candidate_id:'c'+i,split:'HOLDOUT',complete_launch_cohort:true,
  independent_quote_verification:true,prediction_precommitted:true,
  rating_0_100:95,outcome_breakout_14d:i<95})));
 assert.equal(breakoutProbabilityFromRating(95,c99).status,'NOT_CALIBRATED');
});
test('held-out complete cohort yields empirical rate and uncertainty, not rating-to-probability',()=>{
 const sample=Array.from({length:200},(_,i)=>({
  candidate_id:'c'+i,split:'HOLDOUT',complete_launch_cohort:true,
  independent_quote_verification:true,prediction_precommitted:true,
  rating_0_100:95,outcome_breakout_14d:i<80}));
 const c=calibrateBreakout14d(sample);
 const p=breakoutProbabilityFromRating(95,c);
 assert.equal(p.probability_pct,40,'95 rating maps to 40% if outcomes support 40%');
 assert.equal(p.historical_samples,200);
 assert(p.interval95_pct[0]<40&&p.interval95_pct[1]>40);
});
test('rejects cherry-picked flags, duplicate candidates and training examples',()=>{
 const r={candidate_id:'A',split:'HOLDOUT',complete_launch_cohort:true,
  independent_quote_verification:true,prediction_precommitted:true,
  rating_0_100:91,outcome_breakout_14d:true};
 assert.equal(calibrateBreakout14d([r,{...r,candidate_id:'B',split:'TRAIN'},
  {...r,candidate_id:'C',complete_launch_cohort:false},
  {...r,candidate_id:'D',independent_quote_verification:false},
  {...r,candidate_id:'E',prediction_precommitted:false},
  {...r,outcome_breakout_14d:false}]).records_accepted,1);
});
