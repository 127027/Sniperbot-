import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {auditLiveFiveDotJournalInventory,LIVE_DOT_IDS,validRoleJournalPath}
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
test('all five checked-in role journal pointers have actual matching Git blob bytes',async()=>{
 for(const role of LIVE_DOT_IDS){
  const pointer=JSON.parse(await readFile('research/latest/'+role+'.json','utf8'));
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
 if(d.capture_request_path!==f.request_path){
  // Live jobs may commit a newer feed while an older legitimate GPT review
  // is still pending; that must be handled by the separate view instead.
  assert.notEqual(d.evidence_path,f.evidence_path);
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
