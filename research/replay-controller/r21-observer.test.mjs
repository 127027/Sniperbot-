import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {observeR21} from './r21-observer.mjs';

test('missing historical neutral corpus and no run are correctly reported, without writing files',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r21-observe-'));
 try{
  const dir=path.join(root,'research','replay-controller','temporal-public');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'status.json'),JSON.stringify({
   mode:'NOT_STARTED',public_frame_count:0,
   blockers:['NO_INDEPENDENT_ASOF_MULTI_COIN_COHORT']
  }));
  const before=fs.readdirSync(root,{recursive:true}).sort();
  const r=observeR21(root,{at:'2026-11-14T11:00:00.000Z'});
  assert.equal(r.schema,'r21_progress_observation.v1');
  assert.equal(r.mode,'READ_ONLY_MONITOR');
  assert.equal(r.diagnostic.completed_frames,0);
  assert.equal(r.neutral.mode,'NOT_STARTED');
  assert.ok(r.bottlenecks.some(x=>x.code==='DIAGNOSTIC_RUN_MISSING'));
  assert.ok(r.bottlenecks.some(x=>x.code==='NEUTRAL_CORPUS_NOT_READY'));
  assert.equal(r.real_bot_orders,0);
  const after=fs.readdirSync(root,{recursive:true}).sort();
  assert.deepEqual(after,before,'watchdog must not mutate any repo files');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('unconfirmed controller age over 30 min is diagnosed from a persisted report',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r21-stale-'));
 try{
  const dir=path.join(root,'research','replay-controller','monitor');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'r20-progress.json'),JSON.stringify({
   checked_at:'2026-11-14T11:00:00Z',
   completed_frames:3,total_frames:62
  }));
  const r=observeR21(root,{at:'2026-11-14T11:45:00Z'});
  assert.ok(r.bottlenecks.some(x=>x.code==='DIAGNOSTIC_PROGRESS_OLDER_THAN_30_MIN'&&x.elapsed_minutes===45));
  assert.ok(!r.independent_agent_authorship_verified);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('read-only monitoring of the real GitHub fixture never claims a blind success',()=>{
 const root=path.resolve('.');
 const r=observeR21(root);
 assert.equal(r.mode,'READ_ONLY_MONITOR');
 assert.equal(r.real_bot_orders,0);
 assert.equal(r.real_paper_account_changes,0);
 assert.equal(r.independent_agent_authorship_verified,false);
 assert.equal(r.neutral.mode,'NOT_STARTED');
 assert.ok(r.diagnostic.completed_frames>=0);
 assert.ok(r.diagnostic.completed_frames<=62);
});
