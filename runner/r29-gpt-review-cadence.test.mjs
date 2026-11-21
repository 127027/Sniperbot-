import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planGptReviewCadence} from './r29-gpt-review-cadence.mjs';
import {canonicalIndexPath} from './r29-review-index-integrity.mjs';
const fixture=()=>JSON.parse(readFileSync(canonicalIndexPath,'utf8'));
const ms=x=>Date.parse(x);
test('4→24 immediately after >= 60 min; no WATCH scan incorrectly counts as GPT',()=>{
 const x=fixture();
 const last=x.reviews.at(-1).completed_at_utc;
 const when=ms(last)+H;
 const fast=planGptReviewCadence({...x,target_per_day:4},{
  now:when,selectedFrequencyPerDay:24});
 assert.equal(fast.review_due_now,true);
 assert.equal(fast.selected_frequency_per_day,24);
 assert.equal(fast.target_review_interval_minutes,60);
 assert.equal(fast.real_reviews_observed_today,x.reviews.length);
 assert.equal(fast.paper_trade_authorized,false);
 assert.equal(fast.full_coin_universe_observed,false);
 assert.equal(fast.index_next_due_matches_selected_frequency,true,
  'current index claims an hourly next_due even though target_per_day is 12');
 const slow=planGptReviewCadence(x,{now:when,selectedFrequencyPerDay:4});
 assert.equal(slow.review_due_now,false);
 assert.equal(slow.target_review_interval_minutes,360);
});
const H=3600000;
test('effective 4/8/12/24 intervals, no scan before due',()=>{
 const x=fixture(),last=ms(x.reviews.at(-1).completed_at_utc);
 for(const [rate,hours] of [[4,6],[8,3],[12,2],[24,1]]){
  const early=planGptReviewCadence(x,{now:last+hours*H-1000,selectedFrequencyPerDay:rate});
  assert.equal(early.review_due_now,false,rate);
  const due=planGptReviewCadence(x,{now:last+hours*H,selectedFrequencyPerDay:rate});
  assert.equal(due.review_due_now,true,rate);
 }
});
test('review count cap of 24 cannot be bypassed by setting frequency to 24',()=>{
 const x=fixture();
 const time=ms('2026-11-21T00:00:00Z');
 x.utc_day='2026-11-21';x.target_per_day=24;
 x.reviews=Array.from({length:24},(_,i)=>({
  review_id:'gptreview_'+i.toString(16).padStart(32,'0'),
  completed_at_utc:new Date(time+i*H).toISOString(),
  market_observed_at_utc:new Date(time+i*H-120000).toISOString(),
  market_source_blob_sha:'f'.repeat(40),
  artifact_path:'research/r29/gpt-strategy/experiences/2026-11-21/test-'+i+'.md',
  candidates_seen:1,candidates_reviewed:1,action:'NO_ACTION',model_review_completed:true
 }));
 x.updated_at_utc='2026-11-21T23:00:00.000Z';
 x.next_due_at_utc='2026-11-21T23:59:00.000Z';
 const p=planGptReviewCadence(x,{now:ms('2026-11-21T23:30:00Z')});
 assert.equal(p.real_reviews_observed_today,24);
 assert.equal(p.review_due_now,false);
 assert.equal(p.max_review_count_per_utc_day,24);
});
test('future, malformed rate, and fake stale status are rejected',()=>{
 const x=fixture(),now=ms(x.updated_at_utc)+H;
 for(const rate of [1,6,25,2])assert.throws(()=>planGptReviewCadence(x,{now,selectedFrequencyPerDay:rate}),/FREQUENCY_INVALID/);
 assert.throws(()=>planGptReviewCadence(x,{now:NaN}),/CLOCK/);
 assert.throws(()=>planGptReviewCadence(x,{now,previousDayLastReviewAtUtc:new Date(now+100000).toISOString()}),/PRIOR_REVIEW_INVALID/);
});
