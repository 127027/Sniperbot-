import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const source='research/audits/2026-11-22/r29-original-48-not-accepted-worklist.json';
test('exact original 48 not-PASS task IDs partition into 47 non-backtest items plus QA-04 last',async()=>{
 const [work,reg,original]=await Promise.all([
  read(source),read('research/audits/2026-11-22/r29-v19-offline-61-task-reconciliation.json'),
  readFile('docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md','utf8')
 ]);
 const listed=[...original.matchAll(/^\| ((?:SYS|QA|D[1-5])-\d{2})\s*\|/gm)].map(x=>x[1]);
 const incomplete=reg.tasks.filter(t=>t.status!=='PASS');
 assert.equal(listed.length,61);
 assert.equal(work.not_yet_accepted_count,48);
 assert.equal(incomplete.length,48);
 assert.deepEqual(work.original_status_counts,{PASS:13,PARTIAL:46,OPEN:2});
 assert.deepEqual(work.tasks.map(t=>t.id).sort(),incomplete.map(t=>t.id).sort());
 assert.ok(work.tasks.every(t=>listed.includes(t.id)
  &&t.original_acceptance&&t.next_evidence_to_verify
  &&t.fully_accepted_now===false));
 assert.equal(work.tasks.filter(t=>t.only_final_backtest).length,1);
 assert.equal(work.tasks.find(t=>t.only_final_backtest).id,'QA-04');
 assert.equal(work.non_backtest_outstanding_count,47);
 assert.equal(work.strict_non_backtest_pass_count,13);
 assert.equal(work.required_non_backtest_pass_count,60);
 assert.deepEqual(work.tasks.filter(t=>t.status==='OPEN').map(t=>t.id).sort(),
  ['D3-04','D3-05']);
 assert.equal(work.release_authorized,false);
});
test('no fabricated PASS accepted from appendix, source list preserves every original acceptance row',async()=>{
 const work=await read(source);
 const cat=await readFile('docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md','utf8');
 for(const t of work.tasks){
  assert.match(t.id,/^(SYS|QA|D[1-5])-\d{2}$/);
  const original=cat.split('\n').find(x=>x.startsWith('| '+t.id+' |'));
  assert.ok(original,t.id);
  assert.ok(original.includes(t.original_acceptance),t.id);
  assert.notEqual(t.status,'PASS');
 }
});
