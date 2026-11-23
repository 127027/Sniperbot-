import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {auditLiveFiveDotJournalInventory,LIVE_DOT_IDS,validRoleJournalPath,isPendingDot2ForensicPointer}
 from '../src/v19-dot-journal-inventory.mjs';

const at='2026-11-22T22:00:00.000Z';
const h=raw=>{const data=Buffer.from(raw);
 return createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex')};
const build=()=>{
 const latestByRole={},rawJournalsByPath={};
 for(let i=0;i<5;i++){
  const role=LIVE_DOT_IDS[i],path='research/journal/'+role+
    '/2026-11-22/example-'+role.replace('-','')+'.json';
  const raw=JSON.stringify({schema:1,kind:'R29_DOT_TEST',role,
   executed_at_utc:'2026-11-22T21:40:00.000Z'});
  latestByRole[role]={schema:1,dot:role,
   status:'DATA_GAP',updated_at_utc:'2026-11-22T21:40:30.000Z',
   journal_path:path,journal_blob_sha:h(raw),
   forensic_trace_path:'research/audits/dot-traces/2026-11-22/run-'+
    role+'/trace.json'};
  rawJournalsByPath[path]=raw;
 }
 return {latestByRole,rawJournalsByPath,asOfUtc:at};
};
test('five current role journals are read-only checked against SHA, path and execution time',()=>{
 const p=build(),before=JSON.stringify(p);
 const audit=auditLiveFiveDotJournalInventory(p);
 assert.equal(audit.status,'SNAPSHOT_CONSISTENT_NOT_AUTHENTICATED');
 assert.equal(audit.roles.length,5);
 assert.equal(audit.issue_count,0);
 assert.ok(audit.roles.every(x=>x.immutable_bytes_match));
 assert.equal(audit.verified_live_gpt_runs,0);
 assert.equal(audit.verified_client_fills,0);
 assert.equal(audit.no_backtest_or_api_writes,true);
 assert.equal(JSON.stringify(p),before);
});
test('mismatched Git blob, bogus timestamp and missing journal file all fail closed',()=>{
 const p=build();const role=LIVE_DOT_IDS[2];
 p.latestByRole[role].journal_blob_sha='0'.repeat(40);
 let a=auditLiveFiveDotJournalInventory(p);
 assert.ok(a.issues.some(x=>x.role===role&&x.code==='JOURNAL_GIT_BLOB_MISMATCH'));
 p.latestByRole[role].journal_blob_sha=h(p.rawJournalsByPath[p.latestByRole[role].journal_path]);
 p.latestByRole[role].updated_at_utc='2026-11-22T21:10:00.000Z';
 a=auditLiveFiveDotJournalInventory(p);
 assert.ok(a.issues.some(x=>x.code==='JOURNAL_TIME_CONTRADICTION'));
 p.latestByRole[role].updated_at_utc='2026-11-22T21:40:30.000Z';
 delete p.rawJournalsByPath[p.latestByRole[role].journal_path];
 a=auditLiveFiveDotJournalInventory(p);
 assert.ok(a.issues.some(x=>x.code==='POINTER_JOURNAL_BYTES_NOT_IN_INVENTORY'));
});
test('Dot2 pending pointer older than newly completed feed is visible but never promoted to fill',()=>{
 const p=build(),item=p.latestByRole['dot-2'];
 item.captured_at_utc='2026-11-22T20:24:40.627Z';
 item.evidence_path='research/feeds/2026-11-22/old/evidence.json';
 const audit=auditLiveFiveDotJournalInventory({...p,feedPointer:{
  kind:'LATEST_DOT2_PUBLIC_CAPTURE_POINTER',
  captured_at_utc:'2026-11-22T21:11:22.118Z',
  evidence_path:'research/feeds/2026-11-22/new/evidence.json'}});
 assert.ok(audit.issues.some(x=>x.role==='dot-2'&&x.code==='DOT2_LATEST_BEHIND_FEED'));
 assert.equal(audit.verified_historical_gpt_runs,0);
 assert.equal(audit.verified_trades,0);
});
test('Dot5 pointer still referring to older journal and missing forensic link are explicit',()=>{
 const p=build();
 const x=p.latestByRole['dot-5'];
 x.updated_at_utc='2026-11-22T21:59:00.000Z';
 delete x.forensic_trace_path;
 const a=auditLiveFiveDotJournalInventory(p);
 assert.ok(a.issues.some(x=>x.role==='dot-5'&&x.code==='LATEST_POINTS_TO_PRIOR_JOURNAL'));
 assert.ok(a.issues.some(x=>x.role==='dot-5'&&x.code==='FORENSIC_TRACE_NOT_LINKED'));
});
test('role mismatches, traversal paths and missing pointers are never silently ignored',()=>{
 const p=build(),role='dot-4';
 p.latestByRole[role].journal_path='research/journal/dot-5/2026-11-22/fake.json';
 let a=auditLiveFiveDotJournalInventory(p);
 assert.ok(a.issues.some(x=>x.role===role&&x.code==='MISSING_OR_UNTRUSTED_LATEST_POINTER'));
 const q=build();q.latestByRole['dot-1'].journal_path='research/journal/dot-1/../escape.json';
 a=auditLiveFiveDotJournalInventory(q);
 assert.ok(a.issues.some(x=>x.code==='MISSING_OR_UNTRUSTED_LATEST_POINTER'));
 delete q.latestByRole['dot-3'];
 a=auditLiveFiveDotJournalInventory(q);
 assert.ok(a.issues.some(x=>x.role==='dot-3'&&x.code==='MISSING_OR_UNTRUSTED_LATEST_POINTER'));
});
test('existing real five dot pointers can be audited without claiming historical execution',async()=>{
 const latestByRole={},rawJournalsByPath={};
 for(const id of LIVE_DOT_IDS){
  const x=JSON.parse(await readFile('research/latest/'+id+'.json','utf8'));
  latestByRole[id]=x;
  if(typeof x.journal_path==='string'&&
    /^research\/journal\/dot-[1-5]\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\.json$/
    .test(x.journal_path)){
   try{rawJournalsByPath[x.journal_path]=await readFile(x.journal_path,'utf8')}
   catch{/* absent file must become a diagnostic issue */}
  }
 }
 const feedPointer=JSON.parse(await readFile('research/feeds/latest.json','utf8'));
 const a=auditLiveFiveDotJournalInventory({latestByRole,rawJournalsByPath,
  feedPointer,asOfUtc:at});
 assert.equal(a.role_count,5);
 assert.equal(a.verified_live_gpt_runs,0);
 assert.equal(a.verified_client_fills,0);
 assert.equal(a.not_a_historical_run,true);
});

test('read-only live inventory CLI generates an honest five-role diagnostic on this checkout',()=>{
 const run=spawnSync(process.execPath,['scripts/v19-audit-current-dot-journals-readonly.mjs'],
  {encoding:'utf8',timeout:15000});
 assert.equal(run.status,0,run.stderr);
 assert.ok(run.stdout.includes('R29_LIVE_FIVE_DOT_SUMMARY '));
 const line=run.stdout.split('\n').find(x=>x.startsWith('R29_LIVE_FIVE_DOT_SUMMARY '));
 const summary=JSON.parse(line.slice('R29_LIVE_FIVE_DOT_SUMMARY '.length));
 assert.equal(summary.roles,5);
 assert.equal(summary.real_gpt_invocations_authenticated,0);
 assert.equal(summary.real_client_fills_verified,0);
 assert.equal(summary.backtest_executed,false);
 assert.equal(summary.orders_written,0);
});

test('Dot5 can use its actual immutable forensic journal as canonical latest path',()=>{
 const p=build();
 const trace='research/audits/dot-traces/2026-11-22/dot5-20261122T214110789Z-wake11/dot-5-control.json';
 const old=p.latestByRole['dot-5'].journal_path;
 const raw=JSON.stringify({schema:1,kind:'R29_V19_DOT5_FORENSIC_CONTROL_RESEARCH_ONLY',
  role:'dot-5-control',executed_at_utc:'2026-11-22T21:41:10.789Z'});
 p.latestByRole['dot-5']={...p.latestByRole['dot-5'],
  updated_at_utc:'2026-11-22T21:41:10.789Z',
  journal_path:trace,journal_blob_sha:h(raw),forensic_trace_path:trace};
 delete p.rawJournalsByPath[old];
 p.rawJournalsByPath[trace]=raw;
 assert.equal(validRoleJournalPath('dot-5',trace),true);
 assert.equal(validRoleJournalPath('dot-1',trace),false);
 const report=auditLiveFiveDotJournalInventory(p);
 assert.equal(report.issue_count,0);
 assert.equal(report.roles[4].immutable_bytes_match,true);
 assert.equal(report.roles[4].genuine_gpt_review_independently_authenticated,false);
});
test('current read-only inventory exposes merged Dot2 data without silently declaring a GPT review',()=>{
 const p=build();
 const d=p.latestByRole['dot-2'];
 d.captured_at_utc='2026-11-22T20:24:40.627Z';
 d.evidence_path='research/feeds/2026-11-22/45066246697/evidence.json';
 d.capture_request_path='research/requests/2026-11-22/request-001.json';
 const feedPointer={schema:1,kind:'LATEST_DOT2_PUBLIC_CAPTURE_POINTER',
  mode:'PAPER_RESEARCH_ONLY',
  captured_at_utc:'2026-11-22T21:11:22.118Z',
  evidence_path:'research/feeds/2026-11-22/45070668194/evidence.json',
  request_path:d.capture_request_path};
 const out=auditLiveFiveDotJournalInventory({...p,feedPointer});
 const row=out.roles.find(x=>x.role==='dot-2');
 assert.equal(row.reconciled_current_capture.effective_research_evidence_path,
  feedPointer.evidence_path);
 assert.equal(row.reconciled_current_capture.last_gpt_review_source_at_utc,
  d.captured_at_utc);
 assert.equal(row.reconciled_current_capture.new_capture_requires_separate_gpt_review,true);
 assert.equal(row.reconciled_current_capture.latest_gpt_review_authenticated_independently,false);
 assert.equal(out.verified_live_gpt_runs,0);
});
test('five current role pointers pin original journal OR explicitly pending Dot2 forensic Git bytes',async()=>{
 for(const role of LIVE_DOT_IDS){
  const pointer=JSON.parse(await readFile('research/latest/'+role+'.json','utf8'));
  if(role==='dot-2'&&isPendingDot2ForensicPointer(pointer)){
   assert.match(pointer.forensic_audit_path,
     /^research\/audits\/dot-traces\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]{8,120}\/dot-2-discovery\.json$/);
   const raw=await readFile(pointer.forensic_audit_path,'utf8');
   assert.equal(h(raw),pointer.forensic_audit_blob_sha);
   assert.equal(h(raw),pointer.journal_blob_sha);
   const doc=JSON.parse(raw);
   assert.equal(doc.role,'dot-2-discovery');
   assert.equal(doc.gpt_run_identity??doc.gpt_execution_identity,'UNVERIFIED');
   assert.ok(['CAPTURE_PENDING_DATA_GAP','CAPTURE_PENDING_GPT_RECEIPT_UNVERIFIED_DATA_GAP',
    'RESEARCH_WAKE_CAPTURE_DEFERRED_CONCURRENT_PROVIDER_DATA_GAP'].includes(pointer.status));
   if(pointer.status==='RESEARCH_WAKE_CAPTURE_DEFERRED_CONCURRENT_PROVIDER_DATA_GAP'){
     assert.equal(pointer.capture_request_path,null);
     assert.equal(pointer.orders_created,0);
     assert.equal(pointer.paper_fills_claimed,0);
     assert.equal(pointer.backtest_executed,false);
   }
   continue;
  }
  assert.equal(validRoleJournalPath(role,pointer.journal_path),true);
  const raw=await readFile(pointer.journal_path,'utf8');
  assert.equal(h(raw),pointer.journal_blob_sha);
 }
});

test('Dot5 journal and forensic path cannot point at different sources unnoticed',()=>{
 const p=build(),id='dot-5';
 const trace='research/audits/dot-traces/2026-11-22/dot5-20261122T214110789Z-wake11/dot-5-control.json';
 const original=p.latestByRole[id].journal_path;
 const raw=JSON.stringify({schema:1,kind:'R29_V19_DOT5_FORENSIC_CONTROL_RESEARCH_ONLY',
  role:'dot-5-control',executed_at_utc:'2026-11-22T21:41:10.789Z'});
 p.latestByRole[id]={...p.latestByRole[id],
  journal_path:trace,journal_blob_sha:h(raw),
  updated_at_utc:'2026-11-22T21:41:10.789Z',
  forensic_trace_path:'research/audits/dot-traces/2026-11-22/different-0000001/dot-5-control.json'};
 delete p.rawJournalsByPath[original];p.rawJournalsByPath[trace]=raw;
 const audit=auditLiveFiveDotJournalInventory(p);
 assert.ok(audit.issues.some(x=>x.role===id
  &&x.code==='DOT5_FORENSIC_JOURNAL_POINTER_DIVERGENCE'));
 assert.equal(audit.verified_live_gpt_runs,0);
});

test('same-capture Dot2 stale totals, checkpoint and handoff count are independently diagnosed',()=>{
 const p=build(),row=p.latestByRole['dot-2'];
 row.captured_at_utc='2026-11-22T21:11:22.118Z';
 row.evidence_path='research/feeds/2026-11-22/98765432101/evidence.json';
 row.capture_request_path='research/requests/2026-11-22/valid-dot2-request.json';
 row.market_memory_stats={total_discovered:626,first_dot2_detected_count:217};
 row.checkpoint_path='research/state/checkpoints/previous.json';
 row.full_contract_candidates=2;
 const feedPointer={kind:'LATEST_DOT2_PUBLIC_CAPTURE_POINTER',
  captured_at_utc:row.captured_at_utc,
  evidence_path:row.evidence_path,
  request_path:row.capture_request_path,
  memory_stats:{total_discovered:644,first_dot2_detected_count:235},
  memory_checkpoint_path:'research/state/checkpoints/98765432101.json',
  handoff_counts:{full_contracts:18}};
 const a=auditLiveFiveDotJournalInventory({...p,feedPointer});
 for(const code of ['DOT2_LATEST_SOURCE_STATS_STALE',
  'DOT2_LATEST_SOURCE_CHECKPOINT_STALE','DOT2_LATEST_HANDOFF_COUNT_STALE'])
  assert.ok(a.issues.some(x=>x.role==='dot-2'&&x.code===code),code);
 row.market_memory_stats=feedPointer.memory_stats;
 row.checkpoint_path=feedPointer.memory_checkpoint_path;
 row.full_contract_candidates=18;
 const fixed=auditLiveFiveDotJournalInventory({...p,feedPointer});
 assert.ok(!fixed.issues.some(x=>x.role==='dot-2'
  &&x.code.startsWith('DOT2_LATEST_SOURCE_')));
 assert.ok(!fixed.issues.some(x=>x.role==='dot-2'
  &&x.code==='DOT2_LATEST_HANDOFF_COUNT_STALE'));
 assert.equal(fixed.verified_live_gpt_runs,0);
});
test('real newly repaired Dot2 latest pointer agrees with completed capture feed',async()=>{
 const d=JSON.parse(await readFile('research/latest/dot-2.json','utf8'));
 const f=JSON.parse(await readFile('research/feeds/latest.json','utf8'));
 if(d.status==='RESEARCH_WAKE_CAPTURE_DEFERRED_CONCURRENT_PROVIDER_DATA_GAP'){
  // Dot2 deliberately made no NEW source request because provider budget
  // was potentially shared with the V2.5 research-only job. Reusing the
  // earlier feed is correct and not a new GPT review.
  assert.equal(isPendingDot2ForensicPointer(d),true);
  assert.equal(d.capture_request_path,null);
  assert.equal(d.evidence_path,f.evidence_path);
  assert.equal(d.checkpoint_path,f.memory_checkpoint_path);
  assert.equal(d.market_memory_stats.total_discovered,f.memory_stats.total_discovered);
  assert.equal(d.full_contract_candidates,f.handoff_counts.full_contracts);
  assert.equal(d.authentic_gpt_review_receipt,false);
  assert.equal(d.orders_created,0);
  return;
 }
 if(d.capture_request_path!==f.request_path
   ||d.status==='CAPTURE_PENDING_DATA_GAP'
   ||d.feed_is_current_request===false){
  // GitHub Actions can commit a completed source feed AFTER Dot2's GPT
  // wake: request paths can match while the earlier GPT journal truthfully
  // still says CAPTURE_PENDING. The feed is NOT another GPT review.
  assert.notEqual(d.evidence_path,f.evidence_path);
  assert.equal(d.orders_created,0);
  return;
 }
 assert.equal(d.evidence_path,f.evidence_path);
 assert.equal(d.market_memory_stats.total_discovered,f.memory_stats.total_discovered);
 assert.equal(d.market_memory_stats.first_dot2_detected_count,
  f.memory_stats.first_dot2_detected_count);
 assert.equal(d.checkpoint_path,f.memory_checkpoint_path);
 assert.equal(d.full_contract_candidates,f.handoff_counts.full_contracts);
 assert.equal(d.orders_created,0);
});

test('Dot2 pending forensic audit is Git-hashed but NEVER counted as a completed GPT review',()=>{
 const p=build(),ptr=p.latestByRole['dot-2'];
 const path='research/audits/dot-traces/2026-11-22/pending-dot2-20261122/dot-2-discovery.json';
 const raw=JSON.stringify({schema:1,role:'dot-2-discovery',
  actual_execution_utc:'2026-11-22T21:40:00.000Z',
  gpt_run_identity:'UNVERIFIED',orders_written:0,backtest_executed:false});
 ptr.status='CAPTURE_PENDING_DATA_GAP';
 delete ptr.journal_path;
 ptr.forensic_audit_path=path;
 ptr.forensic_audit_blob_sha=h(raw);
 ptr.journal_blob_sha=h(raw);
 delete ptr.forensic_trace_path;
 p.rawJournalsByPath[path]=raw;
 const good=auditLiveFiveDotJournalInventory(p);
 const row=good.roles.find(x=>x.role==='dot-2');
 assert.equal(row.immutable_bytes_match,true);
 assert.equal(row.pending_gpt_research_trace_not_a_completed_journal,true);
 assert.equal(row.journal_path,null);
 assert.equal(row.genuine_gpt_review_independently_authenticated,false);
 assert.ok(!row.problems.some(x=>x.code==='MISSING_OR_UNTRUSTED_LATEST_POINTER'));
 assert.equal(good.verified_live_gpt_runs,0);
 assert.equal(good.verified_historical_gpt_runs,0);
 const tamper=structuredClone(p);
 tamper.rawJournalsByPath[path]='{}';
 const bad=auditLiveFiveDotJournalInventory(tamper);
 assert.ok(bad.issues.some(x=>x.role==='dot-2'
   &&x.code==='DOT2_PENDING_FORENSIC_GIT_BLOB_MISMATCH'));
 assert.equal(bad.verified_live_gpt_runs,0);
});

test('explicit Dot2 capture pending without authenticated GPT receipt is not a completed journal',()=>{
 const p=build(),d=p.latestByRole['dot-2'];
 d.status='CAPTURE_PENDING_GPT_RECEIPT_UNVERIFIED_DATA_GAP';
 d.journal_path=null;
 d.authentic_gpt_review_receipt=false;
 d.forensic_audit_path='research/audits/dot-traces/2026-11-23/20261123T181136Z-dot2-research/dot-2-discovery.json';
 assert.equal(isPendingDot2ForensicPointer(d),true);
 d.authentic_gpt_review_receipt=true;
 assert.equal(isPendingDot2ForensicPointer(d),false);
 d.authentic_gpt_review_receipt=false;
 d.status='COMPLETED';
 assert.equal(isPendingDot2ForensicPointer(d),false);
});

test('real new Dot1 and Dot5 role-native self-reported journals are valid schemas but NOT independently authenticated',async()=>{
 const p=build();
 p.asOfUtc='2026-11-23T19:30:00.000Z';
 const fixed={
  'dot-1':{path:'research/journal/dot-1/2026-11-23/dot1-automation11-20261123T190444Z.json',
    pointer_at:'2026-11-23T18:12:07.870Z'},
  'dot-5':{path:'research/audits/dot-traces/2026-11-23/dot5-20261123T1843Z-research/dot-5-control.json',
    pointer_at:'2026-11-23T18:43:00.000Z'}
 };
 for(const role of ['dot-1','dot-5']){
  const input=fixed[role],raw=await readFile(input.path,'utf8');
  p.latestByRole[role]={...p.latestByRole[role],
   updated_at_utc:input.pointer_at,
   journal_path:input.path,journal_blob_sha:h(raw),
   forensic_trace_path:role==='dot-5'?input.path:
      p.latestByRole[role].forensic_trace_path};
  p.rawJournalsByPath[input.path]=raw;
 }
 const out=auditLiveFiveDotJournalInventory(p);
 for(const role of ['dot-1','dot-5']){
  const row=out.roles.find(r=>r.role===role);
  assert.equal(row.immutable_bytes_match,true);
  assert.equal(row.genuine_gpt_review_independently_authenticated,false);
  assert.ok(!row.problems.some(x=>x.code==='JOURNAL_SCHEMA_MISSING'),role);
 }
 assert.ok(out.roles[0].problems.some(x=>x.code==='JOURNAL_TIME_CONTRADICTION'),
  'real Dot1 pointer still predates actual self-reported GPT execution and is not auto-repaired');
 assert.equal(out.verified_live_gpt_runs,0);
});
test('Dot1/5 native schema requires zero paper fills and no backtest; cannot self-promote',()=>{
 const p=build();
 const role='dot-5';
 const path='research/audits/dot-traces/2026-11-22/test-native-control/dot-5-control.json';
 const raw=JSON.stringify({
   schema:1,role:'dot-5-control',gpt_execution_identity:'UNVERIFIED',
   execution_origin:'GPT_SELF_REPORTED',actual_execution_utc:'2026-11-22T21:40:00.000Z',
   orders_written:0,paper_fills_verified:1,backtest_executed:false
 });
 p.latestByRole[role].journal_path=path;
 p.latestByRole[role].journal_blob_sha=h(raw);
 p.latestByRole[role].forensic_trace_path=path;
 p.rawJournalsByPath[path]=raw;
 const result=auditLiveFiveDotJournalInventory(p);
 assert.ok(result.roles[4].problems.some(x=>x.code==='JOURNAL_SCHEMA_MISSING'));
 assert.equal(result.verified_live_gpt_runs,0);
});

test('deferred shared-provider Dot2 wake pins forensic SHA without inventing a capture or fill',()=>{
 const p=build(),d=p.latestByRole['dot-2'];
 const raw=JSON.stringify({schema:1,role:'dot-2-discovery',
  at_utc:'2026-11-22T21:40:00.000Z',
  gpt_run_identity:'UNVERIFIED',
  status:'DATA_GAP_CAPTURE_DEFERRED_CONCURRENT_PROVIDER_RESEARCH',
  orders_written:0,backtest_executed:false});
 const trace='research/audits/dot-traces/2026-11-22/20261122T2140Z-dot2-deferral/dot-2-discovery.json';
 const old=d.journal_path;
 delete d.journal_path;
 d.status='RESEARCH_WAKE_CAPTURE_DEFERRED_CONCURRENT_PROVIDER_DATA_GAP';
 d.capture_request_path=null;
 d.orders_created=0;d.paper_fills_claimed=0;d.backtest_executed=false;
 d.concurrent_provider_workflow_run_id='45266204458';
 d.forensic_audit_path=trace;
 d.journal_blob_sha=h(raw);d.forensic_audit_blob_sha=h(raw);
 p.rawJournalsByPath[trace]=raw;delete p.rawJournalsByPath[old];
 assert.equal(isPendingDot2ForensicPointer(d),true);
 const report=auditLiveFiveDotJournalInventory(p);
 const row=report.roles.find(x=>x.role==='dot-2');
 assert.equal(row.immutable_bytes_match,true);
 assert.equal(row.pending_gpt_research_trace_not_a_completed_journal,true);
 assert.equal(row.genuine_gpt_review_independently_authenticated,false);
 assert.equal(report.verified_live_gpt_runs,0);
 assert.equal(report.verified_client_fills,0);
 const corrupted={...d,orders_created:1};
 assert.equal(isPendingDot2ForensicPointer(corrupted),false);
});
