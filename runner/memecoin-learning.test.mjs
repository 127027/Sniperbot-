import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeCohorts} from './memecoin-learning.mjs';
test('counter-cohort summary distinguishes indicative 10x from verified negative coverage',()=>{
 const rows=[
  {candidate_id:'A',selection:'EARLY_MOMENTUM',completed_at_utc:'2026-01-15T00:00Z',
   outcomes:{coverage_complete:false,outcomes:{10:{hit:true},50:{hit:null}}}},
  {candidate_id:'B',selection:'EARLY_MOMENTUM',completed_at_utc:'2026-01-15T00:00Z',
   outcomes:{coverage_complete:true,outcomes:{10:{hit:false}}}},
  {candidate_id:'C',selection:'DETERMINISTIC_CONTROL',completed_at_utc:'2026-01-15T00:00Z',
   outcomes:{coverage_complete:false,outcomes:{2:{hit:null}}}},
  {candidate_id:'D',selection:'EARLY_MOMENTUM',completed_at_utc:null,outcomes:null}
 ];
 const s=summarizeCohorts(rows);
 assert.equal(s.summary.EARLY_MOMENTUM.observed,3);
 assert.equal(s.summary.EARLY_MOMENTUM.completed,2);
 assert.equal(s.summary.EARLY_MOMENTUM.coverage_complete,1);
 assert.equal(s.summary.EARLY_MOMENTUM.indicative_hits[10],1);
 assert.equal(s.summary.EARLY_MOMENTUM.indicative_hits[50],0);
 assert.equal(s.summary.DETERMINISTIC_CONTROL.unknown_without_complete_coverage,1);
 assert.equal(s.calibration_status,'NOT_CALIBRATED');
 assert.equal(s.trade_execution_verified,false);
});
test('empty cohorts cannot be misreported as confident research',()=>{
 const s=summarizeCohorts([]);
 assert.equal(s.summary.EARLY_MOMENTUM.completed,0);
 assert.equal(s.summary.DETERMINISTIC_CONTROL.completed,0);
 assert.equal(s.calibration_status,'NOT_CALIBRATED');
});
