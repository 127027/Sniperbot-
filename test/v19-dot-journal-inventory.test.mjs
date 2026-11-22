import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {auditLiveFiveDotJournalInventory,LIVE_DOT_IDS}
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
