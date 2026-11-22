import test from 'node:test';
import assert from 'node:assert/strict';
import {trainTemporalProbabilities,predictResearchProbabilities} from '../src/forecast-calibration-v18.mjs';
const before='2026-11-19T00:00:00Z',label='2026-11-20T00:00:00Z',validation='2026-11-22T00:00:00Z';
const sample=(h,score,gain,decision=before,available=label)=>({
 decision_at_utc:decision,outcome_available_at_utc:available,horizon_hours:h,
 score,observed_end_return_pct:gain});
test('all 1/3/6h event probabilities stay null when prospective labels are insufficient',()=>{
 const r=trainTemporalProbabilities({samples:[sample(1,10,150)],validationStartUtc:validation});
 const f=predictResearchProbabilities({calibration:r,score:10});
 for(const h of [1,3,6]){
  assert.equal(f.forecasts[h].probability_up20,null);
  assert.equal(f.forecasts[h].probability_up50,null);
  assert.equal(f.forecasts[h].probability_up100,null);
 }
 assert.equal(f.trade_authorized,false);
});
test('matured mixed cohorts get nested empirical estimates without granting BUY',()=>{
 const samples=[];
 for(const h of [1,3,6])for(let i=0;i<30;i++)samples.push(sample(h,15,i<10?120:i<20?60:0));
 const r=trainTemporalProbabilities({samples,validationStartUtc:validation});
 assert.equal(r.used_samples,90);
 const f=predictResearchProbabilities({calibration:r,score:15});
 for(const h of [1,3,6]){
  const v=f.forecasts[h];
  assert.ok(v.probability_up20>=v.probability_up50);
  assert.ok(v.probability_up50>=v.probability_up100);
  assert.equal(v.sample_count,30);
 }
 assert.equal(f.trade_authorized,false);
});
test('unmatured, post-validation and missing outcome samples cannot contaminate training',()=>{
 const samples=[sample(1,5,120),sample(1,5,200,'2026-11-22T01:00:00Z','2026-11-22T03:00:00Z'),
  sample(1,5,null),sample(1,5,100,before,'2026-11-21T22:00:00Z')];
 const r=trainTemporalProbabilities({samples,validationStartUtc:validation});
 assert.equal(r.used_samples,1);
 assert.equal(r.rejected.future,2);
 assert.equal(r.rejected.unknown,1);
 assert.equal(r.trade_authorized,false);
});
