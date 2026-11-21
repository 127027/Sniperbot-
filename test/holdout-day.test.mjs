import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replaySignalDecisions} from '../src/point-in-time-strategy.mjs';
const lock=JSON.parse(readFileSync(new URL('../research/holdouts/2026-11-15/LOCK.json',import.meta.url)));
const report=JSON.parse(readFileSync(new URL('../research/holdouts/2026-11-15/REPORT.json',import.meta.url)));
test('the random holdout is frozen and not the training day',()=>{
 assert.equal(lock.holdout_date_utc,'2026-11-15');
 assert.notEqual(lock.holdout_date_utc,lock.training_day_excluded);
 assert.equal(lock.reference_winner_list_visible_to_strategy,false);
 assert.equal(lock.selection_index,32);
 assert.equal(report.test_strategy_commit_sha,lock.policy_code_revision);
});
test('24h replay of held-out day without original quotes is honestly inconclusive',()=>{
 const r=replaySignalDecisions({date:lock.holdout_date_utc,snapshots:[],targetPer24h:4});
 assert.equal(r.events.length,24);
 assert.equal(r.summary.fullReviews,4);
 assert.deepEqual(r.events.filter(x=>x.full_review).map(x=>x.at_utc),[
 '2026-11-15T00:35:00.000Z','2026-11-15T06:35:00.000Z',
 '2026-11-15T12:35:00.000Z','2026-11-15T18:35:00.000Z']);
 assert.equal(r.summary.dataGap,24);
 assert.equal(r.summary.buys,0);assert.equal(r.summary.sells,0);
 assert.equal(r.ending_cash_test_usdc,5000);
 assert.equal(report.evidence_outcome.profit_and_loss,'NOT_COMPUTABLE_NO_VALID_CANDIDATE_UNIVERSE_OR_INTRADAY_QUOTES');
});
