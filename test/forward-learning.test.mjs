import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCaptureObservationBatch,scoreAsOf,labelAfterHorizon,evaluateBlindRankings} from '../src/forward-learning.mjs';
const base='2026-11-21T00:00:00Z',pool='0x'+'b'.repeat(40),pool2='0x'+'c'.repeat(40),contract='0x'+'a'.repeat(40);
const at=h=>new Date(Date.parse(base)+h*3600000).toISOString();
const c=(p,price,h)=>({chain:'base',pool:p,contract,observed_at_utc:at(h),
  observed_price_usd:price,liquidity_usd:25000,volume_24h_usd:12000});
const batch=(h,rs)=>makeCaptureObservationBatch({capturedAtUtc:at(h),sourcePath:'research/feeds/2026-11-21/'+h+'/gecko.raw.json',geckoCandidates:rs});
test('first capture records unfiltered all-pool population, never labels a winner',()=>{
 const b=batch(0,[c(pool,1,0),c(pool2,1,0)]);
 assert.equal(b.counts.valid,2);
 assert.ok(b.observations.every(x=>x.outcome_status==='NOT_YET_MEASURED'&&!x.buy_eligible));
 assert.equal(scoreAsOf({batches:[b],asOfUtc:at(0)}).counts.research_rankable,0);
});
test('as-of ranking cannot see future doubling, labels only after 24h with observed negatives',()=>{
 const t0=batch(0,[c(pool,1,0),c(pool2,1,0)]),t1=batch(1,[c(pool,1.1,1),c(pool2,.9,1)]);
 const future=batch(25,[c(pool,3,25),c(pool2,.4,25)]);
 const rank=scoreAsOf({batches:[t0,t1,future],asOfUtc:at(1)});
 assert.equal(rank.counts.observed_unique_pools,2);
 assert.equal(rank.counts.research_rankable,2);
 assert.equal(rank.candidates[0].key,'base:'+pool);
 assert.equal(rank.candidates[0].observed_price_change_pct<20,true);
 const labels=labelAfterHorizon({batches:[t0,t1,future],decisionAtUtc:at(1)});
 assert.equal(labels.counts.labeled,2);assert.equal(labels.counts.doubled,1);
 assert.equal(labels.counts.non_doubled,1);
 const v=evaluateBlindRankings({ranking:rank,labels,topK:2});
 assert.equal(v.known_positive_100,1);assert.equal(v.precision_at_k_known,0.5);
});
test('without real 24h observations never award win or negative label',()=>{
 const t0=batch(0,[c(pool,1,0)]),t1=batch(1,[c(pool,1.1,1)]);
 const labels=labelAfterHorizon({batches:[t0,t1],decisionAtUtc:at(1)});
 assert.equal(labels.counts.labeled,0);assert.equal(labels.counts.unknown,1);
 assert.equal(labels.can_claim_learning_quality,false);
});
test('future or invalid capture is dropped and cannot leak into features',()=>{
 const b=batch(0,[c(pool,2,2),c(pool2,1,0)]);
 assert.equal(b.counts.valid,1);
 const rank=scoreAsOf({batches:[b],asOfUtc:at(0)});
 assert.equal(rank.counts.observed_unique_pools,1);
});
