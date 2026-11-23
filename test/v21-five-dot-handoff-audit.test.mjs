import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectV21FiveDotHandoff} from '../src/v21-five-dot-handoff-audit.mjs';

const root='research/feeds/2026-11-23/45246727202/';
const load=async()=>{
 const [evidence,handoff,riskPreview,recheckPlan]=await Promise.all([
  'evidence.json','dot2-to-dot3-handoff.json',
  'dot3-research-risk-status-preview.json','dot3-next-evidence-rechecks.json'
 ].map(x=>readFile(root+x,'utf8').then(JSON.parse)));
 const feedPointer={schema:1,kind:'LATEST_DOT2_PUBLIC_CAPTURE_POINTER',
  mode:'PAPER_RESEARCH_ONLY',request_path:evidence.request_path,
  evidence_path:root+'evidence.json',handoff_path:root+'dot2-to-dot3-handoff.json',
  dot3_status_preview_path:root+'dot3-research-risk-status-preview.json',
  dot3_recheck_plan_path:root+'dot3-next-evidence-rechecks.json',
  captured_at_utc:evidence.captured_completed_at_utc,
  handoff_counts:handoff.counts,trading_ready:false,orders_created:0};
 return {feedPointer,evidence,handoff,riskPreview,recheckPlan,
  asOfUtc:'2026-11-23T19:14:00.000Z'};
};
test('real committed 19-candidate Robinhood capture reconverges Dot2→Dot3 risk+worklist without orders',async()=>{
 const input=await load(),before=JSON.stringify(input);
 const a=inspectV21FiveDotHandoff(input);
 assert.equal(a.candidate_count,19);
 assert.equal(a.risk_counts.PAPER_ELIGIBLE,0);
 assert.equal(a.selected_rechecks,6);
 assert.equal(a.deferred_rechecks,13);
 assert.equal(a.dot4_buy_orders_authorized,0);
 assert.equal(a.dot4_sell_orders_authorized,0);
 assert.equal(a.actual_gpt_invocations_confirmed,0);
 assert.equal(a.dot5_verified_client_fills,0);
 assert.equal(a.orders_written,0);
 assert.equal(a.client_account_mutated,false);
 assert.equal(a.qa04_original_historical_backtest_authorized,false);
 assert.equal(a.handoff_reconciled_as_archived,true,
  JSON.stringify(a.nonblocking_reconciliation_warnings));
 assert.equal(JSON.stringify(input),before);
});
test('source gap is never a current quote after ten minutes',async()=>{
 const input=await load();
 input.asOfUtc='2026-11-23T20:00:00.000Z';
 const a=inspectV21FiveDotHandoff(input);
 assert.equal(a.recorded_source_status,'STALE_FOR_CURRENT_TRADE');
 assert.equal(a.proposed_research_action,'RECAPTURE_THEN_REASSESS');
 assert.equal(a.dot4_buy_orders_authorized,0);
});
test('cross-feed artifacts and post-event oracle are rejected before any downstream promotion',async()=>{
 const a=await load();
 a.feedPointer.dot3_status_preview_path=
   'research/feeds/2026-11-23/98765432109/dot3-research-risk-status-preview.json';
 assert.throws(()=>inspectV21FiveDotHandoff(a),/CROSS_RUN_ARTIFACT_MIX/);
 const b=await load();
 b.handoff.candidates[0].reported_gain_pct=500;
 assert.throws(()=>inspectV21FiveDotHandoff(b),/HINDSIGHT_CANDIDATE/);
});
test('forged PAPER_ELIGIBLE, authorized trade or missing recheck candidate cannot pass',async()=>{
 const a=await load();
 a.riskPreview.candidates[0].status='PAPER_ELIGIBLE';
 assert.throws(()=>inspectV21FiveDotHandoff(a),/RISK_STATUS_PROMOTION_OR_DUPLICATE/);
 const b=await load();
 b.recheckPlan.watchlist.pop();
 assert.throws(()=>inspectV21FiveDotHandoff(b),/DROPPED_CANDIDATES_OR_ACTION_CLAIM/);
 const c=await load();
 c.handoff.candidates[0].BUY_AUTHORIZED=true;
 assert.throws(()=>inspectV21FiveDotHandoff(c),/UNAUTHENTICATED_CANDIDATE_PROMOTION/);
});
test('unmatched source request and future capture are rejected',async()=>{
 const a=await load();
 a.evidence.request_path='research/requests/2026-11-23/forged.json';
 assert.throws(()=>inspectV21FiveDotHandoff(a),/SOURCE_CAPTURE_OR_ORDERS/);
 const b=await load();
 b.asOfUtc='2026-11-23T19:12:00.000Z';
 assert.throws(()=>inspectV21FiveDotHandoff(b),/FUTURE_SOURCE/);
});
