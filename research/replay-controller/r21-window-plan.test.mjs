import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {planNeutralWindows} from './r21-window-plan.mjs';
import {validateCaseCatalog,runCaseCatalog} from './r21-catalog.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));

test('81 actual calendar windows, each 62 days, are planned without selecting winners',()=>{
 const c=planNeutralWindows();
 assert.equal(c.cases.length,81);
 assert.equal(c.cases[0].window.start,'2013-01-01T00:00:00Z');
 assert.equal(c.cases.at(-1).window.end,'2026-10-01T23:59:59Z');
 assert.equal(c.selection,'DATE_ONLY_DETERMINISTIC_NOT_KNOWN_WINNERS');
 assert.equal(c.cases.filter(x=>x.split==='DEVELOPMENT').length,48);
 assert.equal(c.cases.filter(x=>x.split==='VALIDATION').length,16);
 assert.equal(c.cases.filter(x=>x.split==='HOLDOUT').length,17);
 for(let i=0;i<c.cases.length;i++){
  const w=c.cases[i].window;
  assert.equal(Date.parse(w.end)-Date.parse(w.start)+1000,62*86400000);
  assert.equal(c.cases[i].enabled,false);
  assert.ok(/^case_[0-9]{4}$/.test(c.cases[i].case_id));
  if(i)assert.ok(Date.parse(w.start)>Date.parse(c.cases[i-1].window.end));
 }
 assert.equal(validateCaseCatalog(c).remaining_to_register,0);
 assert.equal(validateCaseCatalog(c).enabled_cases,0);
});
test('checked-in 81-case schedule matches deterministic neutral window planner',()=>{
 const actual=JSON.parse(fs.readFileSync(path.join(root,'r21-case-catalog.json'),'utf8'));
 const planned=planNeutralWindows();
 assert.equal(actual.declared_window_count,planned.declared_window_count);
 assert.deepEqual(actual.cases,planned.cases);
 assert.equal(actual.actual_prepared_cases,0);
 assert.equal(actual.actual_completed_cases,0);
});
test('the planner never fetches or executes 81 unprepared historical cases',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'r21-case-catalog.json'),'utf8'));
 let called=0;
 const r=await runCaseCatalog(manifest,{
  loadDataset:async()=>{called++;throw Error('NO_SOURCES');},
  invokeRole:async()=>{called++;throw Error('NO_AGENT');}
 });
 assert.equal(r.case_count_ran,0);
 assert.equal(r.completed_cases,0);
 assert.equal(r.total_completed_frames,0);
 assert.equal(r.total_simulated_trades,0);
 assert.equal(called,0);
});
test('wrong loaded historical window is rejected before a Dot can see any data',async()=>{
 const c=planNeutralWindows();
 const first=c.cases[0];first.enabled=true;first.mode='DIAGNOSTIC';
 const r=await runCaseCatalog(c,{
  loadDataset:async()=>({schema:'isolated_replay.v1',data_class:'HISTORICAL',
   window:{start:'2023-04-01T00:00:00Z',end:'2023-06-01T23:59:59Z'},
   ticks:['2023-04-01T23:59:59Z'],events:[],
   universe:{selection:'ASOF_COHORT',complete:false,provenance:'not independent'}
  }),
  invokeRole:async()=>{throw Error('THIS_MUST_NOT_BE_CALLED');}
 });
 assert.equal(r.blocked_cases,1);
 assert.match(r.cases[0].error,/R21_LOADED_DATASET_WINDOW_MISMATCH/);
});
