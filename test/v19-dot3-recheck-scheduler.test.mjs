import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyDot3RecheckState,planDot3EvidenceRechecks,
 recordDot3RecheckAttempt} from '../src/v19-dot3-recheck-scheduler.mjs';

const asOf='2026-11-22T08:20:50.724Z';
const realHandoff='research/feeds/2026-11-22/45002280249/dot2-to-dot3-handoff.json';
const load=()=>readFile(realHandoff,'utf8').then(JSON.parse);

test('real source handoff preserves both underverified candidates as WATCH and creates concrete work',async()=>{
 const handoff=await load();
 const result=planDot3EvidenceRechecks({handoff,asOfUtc:asOf,maxRequests:4});
 assert.equal(result.candidate_count,2);
 assert.equal(result.confirmed_proven_risk_rejects,0);
 assert.equal(result.selected_count,2);
 assert.equal(result.selected.every(x=>x.status==='WATCH'),true);
 assert.equal(result.watch_candidates,2);
 assert.equal(result.missing_evidence_count,0);
 assert.equal(result.selected.every(x=>x.risk_status_source==='R29_V19_DOT3_RISK_STATE'),true);
 assert.equal(result.selected.every(x=>x.trade_authorized===false),true);
 assert.equal(result.selected.every(x=>x.missing_fields.includes('SELLABILITY_ATTESTATION')),true);
 assert.equal(result.selected.every(x=>x.next_action==='RECHECK_CONFLICTING_PROVIDER_QUOTES'),true);
 assert.equal(result.selected.every(x=>x.low_liquidity_observed===true),true);
 assert.equal(result.actual_gpt_reviews,0);
});
test('future and winner-labeled candidate cannot become previous market knowledge',async()=>{
 const handoff=await load();
 const hidden={...handoff.candidates[0],captured_at_utc:'2026-11-22T10:01:00.000Z'};
 const oracle={...handoff.candidates[0],future_winner_label:true};
 const result=planDot3EvidenceRechecks({handoff:{...handoff,candidates:[hidden,oracle]},
   asOfUtc:asOf,maxRequests:3});
 assert.equal(result.candidate_count,0);
 assert.equal(result.skipped.length,2);
});
test('rate-limited rechecks remain queued with a precise next retry, no fake provider calls',async()=>{
 const handoff=await load();
 const first=planDot3EvidenceRechecks({handoff,asOfUtc:asOf,maxRequests:1});
 const key=first.selected[0].key;
 const state=recordDot3RecheckAttempt(emptyDot3RecheckState(),{
  key,attemptAtUtc:asOf,status:'HTTP_429'});
 const later=planDot3EvidenceRechecks({handoff,state,maxRequests:2,
  asOfUtc:'2026-11-22T08:30:50.724Z'});
 const held=later.watchlist.find(x=>x.key===key);
 assert.equal(held.retriable,false);
 assert.equal(held.next_recheck_at_utc,'2026-11-22T09:20:50.724Z');
 assert.equal(later.actual_provider_rechecks,0);
 assert.equal(state.executed_provider_requests,0);
 const ready=planDot3EvidenceRechecks({handoff,state,maxRequests:2,
  asOfUtc:'2026-11-22T09:20:50.724Z'});
 assert.equal(ready.watchlist.find(x=>x.key===key).retriable,true);
});
test('successful new evidence does not itself claim verified sellability or an executed order',async()=>{
 const handoff=await load(),first=planDot3EvidenceRechecks({handoff,asOfUtc:asOf});
 const state=recordDot3RecheckAttempt(emptyDot3RecheckState(),{
  key:first.selected[0].key,attemptAtUtc:asOf,status:'CAPTURED_NEW_EVIDENCE',
  sourceEvidencePath:'research/feeds/recheck-01.raw.json'});
 assert.equal(state.by_pool[first.selected[0].key].last_recheck_completed_with_new_bytes,true);
 assert.equal(state.by_pool[first.selected[0].key].eligible_for_buy,false);
 assert.equal(state.orders_authorized,0);
 assert.throws(()=>recordDot3RecheckAttempt(state,{key:first.selected[0].key,
   attemptAtUtc:asOf,status:'CAPTURED_NEW_EVIDENCE'}),/DUPLICATE_OR_REVERSED/);
});
