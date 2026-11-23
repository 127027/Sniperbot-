import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFiveDotNextBacktestForensicFreshness}
 from '../src/v19-next-backtest-five-dot-freshness.mjs';
const when='2026-11-23T11:20:00.000Z';
const roles=['dot-1','dot-2','dot-3','dot-4','dot-5'];
const labels=['dot-1-tempo','dot-2-discovery','dot-3-risk',
 'dot-4-strategy','dot-5-control'];
const data=()=>{
 const latestByRole={},rawForensicByPath={};
 for(let i=0;i<5;i++){
  latestByRole[roles[i]]={
   schema:1,dot:roles[i],status:'DATA_GAP',
   updated_at_utc:'2026-11-23T11:12:00.000Z',
   capture_request_path:null};
  const path='research/audits/dot-traces/2026-11-23/'+
   'test-source-role-'+i+'/'+labels[i]+'.json';
  rawForensicByPath[path]=JSON.stringify({
   schema:1,role:labels[i],executed_at_utc:'2026-11-23T11:13:00.000Z',
   gpt_execution_identity:'UNVERIFIED',orders_written:0,
   paper_fills_claimed:0,backtest_triggered:false});
 }
 return {latestByRole,rawForensicByPath,asOfUtc:when};
};
test('five correctly timed Git forensic traces are research-only not authenticated GPT orders',()=>{
 const a=data(),before=JSON.stringify(a);
 const x=auditFiveDotNextBacktestForensicFreshness(a);
 assert.equal(x.role_count,5);
 assert.equal(x.roles_with_valid_trace,5);
 assert.equal(x.roles_with_recent_trace,5);
 assert.equal(x.role_latest_pointers_behind_newer_traces.length,0);
 assert.equal(x.actual_five_gpt_october_journals_independently_authenticated,0);
 assert.equal(x.next_historical_qa04_release_authorized,false);
 assert.equal(x.no_quotes_or_orders_created,true);
 assert.ok(x.roles.every(r=>r.freshest_forensic_trace.git_blob_sha.length===40));
 assert.equal(JSON.stringify(a),before);
});
test('a stale Dot3 and Dot4 official latest pointer is exposed, not overwritten',()=>{
 const a=data();
 a.latestByRole['dot-3'].updated_at_utc='2026-11-22T21:21:22.000Z';
 a.latestByRole['dot-4'].updated_at_utc='2026-11-22T21:33:43.000Z';
 const x=auditFiveDotNextBacktestForensicFreshness(a);
 assert.deepEqual(x.role_latest_pointers_behind_newer_traces,
  ['dot-3','dot-4']);
 assert.equal(x.roles[2].status,'REQUIRES_RECONCILIATION');
 assert.equal(x.roles[3].original_october_five_dot_gpt_review_proven,false);
 assert.equal(a.latestByRole['dot-3'].updated_at_utc,
  '2026-11-22T21:21:22.000Z');
});
test('latest completed HTTP feed reconciles pending Dot2 request without GPT completion claim',()=>{
 const a=data();
 a.latestByRole['dot-2'].updated_at_utc='2026-11-23T11:14:36.000Z';
 a.latestByRole['dot-2'].status='CAPTURE_PENDING_DATA_GAP';
 a.latestByRole['dot-2'].capture_request_path=
  'research/requests/2026-11-23/20261123T111436000Z-dot2-research.json';
 a.feedPointer={schema:1,kind:'LATEST_DOT2_PUBLIC_CAPTURE_POINTER',
  mode:'PAPER_RESEARCH_ONLY',
  request_path:a.latestByRole['dot-2'].capture_request_path,
  evidence_path:'research/feeds/2026-11-23/45163438714/evidence.json',
  captured_at_utc:'2026-11-23T11:15:03.093Z'};
 const x=auditFiveDotNextBacktestForensicFreshness(a);
 assert.ok(x.roles[1].issues.includes(
  'SAME_REQUEST_SOURCE_CAPTURE_COMPLETE_BUT_GPT_REVIEW_STILL_PENDING'));
 assert.equal(x.roles[1].source_capture_separate_from_gpt_review
  .latest_feed_run_id,'45163438714');
 assert.equal(x.roles[1].source_capture_separate_from_gpt_review
  .latest_gpt_review_authenticated_independently,false);
 assert.equal(x.no_automatic_role_pointer_or_source_rewriting,true);
});
test('wrong-role, future, malformed, traversed and order-claiming traces cannot make a Dot green',()=>{
 const a=data();
 const oldPath=Object.keys(a.rawForensicByPath).find(x=>x.endsWith('dot-3-risk.json'));
 const raw=JSON.parse(a.rawForensicByPath[oldPath]);
 raw.executed_at_utc='2026-11-24T11:00:00.000Z';
 a.rawForensicByPath[oldPath]=JSON.stringify(raw);
 a.rawForensicByPath[
  'research/audits/dot-traces/2026-11-23/../evil/dot-3-risk.json']=
    JSON.stringify({...raw,executed_at_utc:'2026-11-23T11:10:00.000Z'});
 const x=auditFiveDotNextBacktestForensicFreshness(a);
 assert.equal(x.roles_with_valid_trace,4);
 assert.ok(x.rejected_untrusted_or_future_trace_files>=2);
 assert.ok(x.roles[2].issues.includes('MISSING_VALID_CURRENT_ROLE_FORENSIC_TRACE'));
 const b=data();
 const p=Object.keys(b.rawForensicByPath)[4];
 b.rawForensicByPath[p]=JSON.stringify({schema:1,role:'dot-2-discovery',
  executed_at_utc:'2026-11-23T11:13:00.000Z',orders_written:1});
 const y=auditFiveDotNextBacktestForensicFreshness(b);
 assert.equal(y.roles_with_valid_trace,4);
 assert.equal(y.next_historical_qa04_release_authorized,false);
});
test('self-declared independent GPT proof flags do not authorize original QA04',()=>{
 const a=data(),p=Object.keys(a.rawForensicByPath)[0];
 const raw=JSON.parse(a.rawForensicByPath[p]);
 raw.review_is_independently_authenticated=true;
 raw.execution_authentication='VERIFIED_INDEPENDENTLY';
 a.rawForensicByPath[p]=JSON.stringify(raw);
 const result=auditFiveDotNextBacktestForensicFreshness(a);
 assert.ok(result.roles[0].issues.includes(
  'SELF_REPORTED_AUTHENTICATION_NOT_INDEPENDENT_PROOF'));
 assert.equal(result.actual_five_gpt_october_journals_independently_authenticated,0);
 assert.equal(result.no_quotes_or_orders_created,true);
});
