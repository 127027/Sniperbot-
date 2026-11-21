import test from 'node:test';
import assert from 'node:assert/strict';
import {trainForwardThreshold} from '../src/temporal-learning.mjs';
const earlier='2026-11-01T00:00:00Z',later='2026-11-21T00:00:00Z';
const sample=(label,score,at=earlier,available='2026-11-02T01:00:00Z')=>({label,score,decision_at_utc:at,outcome_available_at_utc:available});
test('refuses winner-only cohort (no negatives)',()=>{
 const x=trainForwardThreshold({samples:Array.from({length:60},()=>sample('OBSERVED_24H_DOUBLE',25)),validationStartUtc:later});
 assert.equal(x.status,'INSUFFICIENT_PRIOR_LABELED_COHORT');
 assert.equal(x.threshold,null);
});
test('past balanced cohort can fit a research threshold without applying it',()=>{
 const rows=[...Array.from({length:20},()=>sample('OBSERVED_24H_DOUBLE',28)),
 ...Array.from({length:20},()=>sample('OBSERVED_NONPOSITIVE',2))];
 const x=trainForwardThreshold({samples:rows,validationStartUtc:later});
 assert.equal(x.status,'TRAINED_HISTORICAL_THRESHOLD_RESEARCH_ONLY');
 assert.equal(x.metrics_in_sample.fp,0);
 assert.equal(x.parameters_applied,false);
});
test('future labels and adjacent 24h holdout labels are excluded',()=>{
 const rows=[...Array.from({length:40},()=>sample('OBSERVED_NONPOSITIVE',2)),
 sample('OBSERVED_24H_DOUBLE',80,'2026-11-20T23:00:00Z','2026-11-21T23:59:00Z')];
 const x=trainForwardThreshold({samples:rows,validationStartUtc:later});
 assert.equal(x.future_rejected,1);
 assert.equal(x.threshold,null);
});
