import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const path='research/audits/2026-11-22/r29-v19-offline-61-task-reconciliation.json';
test('R29 original 61: source matrix exactly matches catalog, status 13 PASS /46 PARTIAL /2 OPEN',async()=>{
 const doc=await readFile('docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md','utf8');
 const original=[...doc.matchAll(/^\| ((?:SYS|QA|D[1-5])-\d{2})\s*\|/gm)].map(m=>m[1]).sort();
 const registry=JSON.parse(await readFile(path,'utf8'));
 assert.equal(registry.kind,'R29_V19_STRICT_OFFLINE_RECONCILED_61_TASK_REGISTER');
 assert.equal(original.length,61);
 assert.equal(new Set(original).size,61);
 assert.deepEqual(registry.tasks.map(t=>t.id).sort(),original);
 assert.deepEqual(registry.status_counts,{PASS:13,PARTIAL:46,OPEN:2});
 assert.equal(registry.fully_accepted_pct,21.31);
 assert.equal(registry.technically_touched_count,59);
 assert.equal(registry.technically_touched_pct,96.72);
 assert.deepEqual(registry.tasks.filter(t=>t.status==='OPEN').map(t=>t.id).sort(),
  ['D3-04','D3-05']);
 assert.equal(registry.tasks.find(t=>t.id==='QA-04').status,'PARTIAL');
 assert.equal(registry.tasks.filter(t=>t.new_offline_partial).length,10);
 assert.ok(registry.tasks.every(x=>['PASS','PARTIAL','OPEN'].includes(x.status)));
});
test('10 new partials have real source files, no invented new PASS, original unknown external checks stay open',async()=>{
 const registry=JSON.parse(await readFile(path,'utf8'));
 assert.deepEqual(registry.baseline_80pct_original_counts,{PASS:13,PARTIAL:36,OPEN:12});
 assert.deepEqual(registry.status_counts,{PASS:13,PARTIAL:46,OPEN:2});
 for(const t of registry.tasks.filter(x=>x.new_offline_partial)){
  assert.equal(t.status,'PARTIAL',t.id);
  assert.equal(t.original_full_acceptance_pending,true,t.id);
  assert.ok(t.offline_tested_artifacts.length>=2,t.id);
  for(const filepath of t.offline_tested_artifacts)await access(filepath);
 }
 assert.equal(registry.research_only_no_order_publishing,true);
});
