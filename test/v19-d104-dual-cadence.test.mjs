import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planIndependentObservations} from '../src/v19-independent-observation-schedule.mjs';
const now='2026-11-22T17:00:00Z';
test('D1-04: four target GPT reviews do not block 96 separate 15-minute market observation windows',()=>{
 const results=[];
 for(let n=0;n<96;n++){
  const t=new Date(Date.parse('2026-11-22T00:00:00Z')+n*15*60000).toISOString();
  const before=n?new Date(Date.parse(t)-15*60000).toISOString():null;
  const p=planIndependentObservations({asOfUtc:t,priorCaptureAtUtc:before,
   reviewTarget:4,hotPoolCount:10,capturedPagesThisRun:2});
  results.push(p);
 }
 assert.equal(results.filter(r=>r.lightweight_capture.due_for_new_capture).length,96);
 assert.equal(results.reduce((n,r)=>n+r.lightweight_capture.captured_http_pages_in_this_run,0),192);
 assert.ok(results.every(r=>r.full_gpt_review.target_per_24h===4));
 assert.ok(results.every(r=>r.actual_gpt_reviews_claimed===0&&r.orders_authorized===0));
});
test('D1-04: open PAPER position priority suggests 5-minute checks but never fabricates client state',()=>{
 const unknown=planIndependentObservations({asOfUtc:now,reviewTarget:4});
 assert.equal(unknown.positions.count_unknown,true);
 assert.equal(unknown.positions.confirmed_open_positions_in_capture_process,null);
 assert.equal(unknown.lightweight_capture.suggested_interval_minutes,60);
 const watch=planIndependentObservations({asOfUtc:now,reviewTarget:24,
  openPaperPositions:2,priorCaptureAtUtc:'2026-11-22T16:55:00Z'});
 assert.equal(watch.lightweight_capture.suggested_interval_minutes,5);
 assert.equal(watch.lightweight_capture.due_for_new_capture,true);
 assert.equal(watch.positions.independent_exit_observer_required,true);
 assert.equal(watch.full_gpt_review.target_per_24h,24);
});
test('D1-04: backlog prioritization cannot override API limits or imply an executable quote',()=>{
 const p=planIndependentObservations({asOfUtc:now,reviewTarget:8,
  unresolvedPageCount:17,priorCaptureAtUtc:'2026-11-22T16:45:00Z'});
 assert.equal(p.lightweight_capture.suggested_interval_minutes,30);
 assert.equal(p.lightweight_capture.due_for_new_capture,false);
 assert.equal(p.lightweight_capture.API_budget_and_provider_cooldown_override,false);
 assert.equal(p.market_quote_age_is_not_tradeable_price_proof,true);
 assert.throws(()=>planIndependentObservations({asOfUtc:now,
  priorCaptureAtUtc:'2026-11-23T00:00:00Z'}),/INVALID_INDEPENDENT/);
});
test('D1-04: actual captured provider HTTP pages are not GPT reviews',async()=>{
 const original=JSON.parse(await readFile('research/feeds/2026-11-22/45044300013/evidence.json','utf8'));
 const successes=original.api_evidence.filter(x=>x.provider==='GECKOTERMINAL'&&x.http_status===200);
 const r=planIndependentObservations({asOfUtc:original.captured_completed_at_utc,
  reviewTarget:12,capturedPagesThisRun:successes.length,
  hotPoolCount:original.metrics?.v19_hot_fair_recheck_plan?.all_new_pool_count||0});
 assert.equal(r.lightweight_capture.captured_http_pages_in_this_run,5);
 assert.equal(r.full_gpt_review.target_per_24h,12);
 assert.equal(r.actual_gpt_reviews_claimed,0);
 const runner=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(runner,/metrics\.v19_independent_observation_cadence=planIndependentObservations/);
 assert.match(runner,/openPaperPositions:null/);
});
