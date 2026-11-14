import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {runPath,load} from './controller.mjs';
import {runContinuousReplay,syntheticFixtureRoleProvider} from './continuous-runner.mjs';
import {ROLES} from './engine.mjs';
const roles=ROLES.filter(r=>r!=='qa');
function fixture(days=62,withEvents=false){
 const ticks=Array.from({length:days},(_,i)=>
  new Date(Date.UTC(2023,2,14+i,23,59,59)).toISOString().replace('.000Z','Z'));
 const events=withEvents?[
  {id:'poolA',kind:'POOL',candidate_id:'syntheticA',event_at:ticks[0],
   available_at:ticks[0],chain:'testnet',token:'test-A',pool:'testpool-A',
   evidence:{type:'FIXTURE',ref:'offline synthetic test only',verified:true}},
  {id:'poolB',kind:'POOL',candidate_id:'syntheticB',event_at:ticks[1],
   available_at:ticks[1],chain:'testnet',token:'test-B',pool:'testpool-B',
   evidence:{type:'FIXTURE',ref:'offline synthetic test only',verified:true}}
 ]:[];
 return {
  schema:'isolated_replay.v1',data_class:'SYNTHETIC',
  window:{start:'2023-03-14T00:00:00Z',end:ticks.at(-1)},
  ticks,events,
  universe:{selection:'ASOF_COHORT',complete:false,provenance:'SYNTHETIC BENCHMARK ONLY'},
  contexts:Object.fromEntries(ROLES.map(r=>[r,{fresh:false,target_exposed:false,attestation:null}]))
 };
}
function env(days=62,withEvents=false){
 const name='r20-fixture-'+process.pid+'-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const publicRoot=fs.mkdtempSync(path.join(os.tmpdir(),'r20-visible-'));
 const cleanup=()=>{
  fs.rmSync(publicRoot,{recursive:true,force:true});
  fs.rmSync(runPath(name),{recursive:true,force:true});
 };
 return {name,publicRoot,dataset:fixture(days,withEvents),cleanup};
}
async function run(t,provider=syntheticFixtureRoleProvider,extra={}){
 return runContinuousReplay({
  sessionName:t.name,dataset:t.dataset,publicRoot:t.publicRoot,
  invokeRole:provider,providerLabel:'SYNTHETIC_FIXTURE',
  ...extra
 });
}
test('62 simulated days advance without hourly sleeps, while every day seals five role votes',async()=>{
 const t=env();
 try{
  const start=performance.now(),r=await run(t);
  assert.equal(r.status,'COMPLETE');
  assert.equal(r.completed_frames,62);
  assert.equal(r.total_frames,62);
  assert.equal(r.role_calls,62*5);
  assert.equal(r.simulated_trades,0);
  assert.equal(r.real_bot_orders,0);
  assert.equal(r.blind_success,false);
  assert.equal(load(t.name).index,62);
  assert.equal(fs.readdirSync(path.join(runPath(t.name),'commits')).filter(f=>f.endsWith('.json')).length,62);
  assert.ok(r.duration_ms>=0);
  assert.ok(performance.now()-start<300000,'synthetic baseline should not need five minutes');
 }finally{t.cleanup();}
});
test('four independent roles run concurrently before QA reviews the same-frame peer decisions',async()=>{
 const t=env(2,true);
 const timeline={started:new Set(),finished:new Set(),qaPeers:0,seenTimes:[]};
 const provider=async(role,task,context)=>{
  timeline.started.add(role);
  if(role==='qa'){
   assert.deepEqual([...timeline.finished].sort(),roles.slice().sort());
   assert.equal(context.current_peer_votes.length,4);
   timeline.qaPeers++;
   assert.equal(task.frame.events.length,task.frame.index===0?1:2);
  }else{
   await new Promise(resolve=>setTimeout(resolve,8));
   assert.equal(timeline.started.size>=4,true);
   timeline.finished.add(role);
  }
  const answer=await syntheticFixtureRoleProvider(role,task);
  if(role!=='qa'&&task.frame.events.length)answer.reviews=[
   {candidate_id:'syntheticA',verdict:'UNKNOWN',evidence_ids:['poolA']}
  ];
  return answer;
 };
 try{
  const r=await run(t,provider,{maxFrames:1});
  assert.equal(r.completed_frames,1);
  assert.equal(timeline.qaPeers,1);
  assert.equal(r.frames[0].event_count,1);
  assert.equal(r.status,'FRAME_LIMIT_REACHED');
  assert.equal(r.role_calls,5);
 }finally{t.cleanup();}
});
test('one role failure blocks QA and the next day; retry uses already persisted valid peer votes',async()=>{
 const t=env(3,true);
 let called=0;
 try{
  const failed=await run(t,async(role,task)=>{
   if(role==='onchain'&&task.frame.index===1)throw Error('ONCHAIN_ARCHIVE_TEMPORARILY_DOWN');
   called++;
   return syntheticFixtureRoleProvider(role,task);
  });
  assert.equal(failed.status,'BLOCKED');
  assert.equal(failed.completed_frames,1);
  assert.match(failed.blocker.error,/PEER_ROLE_FAILURE/);
  const frame1=path.join(t.publicRoot,'frames','00001');
  assert.equal(fs.existsSync(path.join(frame1,'decisions','qa.json')),false);
  assert.equal(fs.existsSync(path.join(t.publicRoot,'frames','00002')),false);
  assert.ok(fs.existsSync(path.join(frame1,'decisions','scout.json')));
  const resumed=await run(t);
  assert.equal(resumed.status,'COMPLETE');
  assert.equal(resumed.completed_frames,3);
  assert.ok(resumed.frames[0].roles.scout.cached);
  assert.ok(resumed.frames[0].roles.security.cached);
 }finally{t.cleanup();}
});
test('fabricated future-frame response is rejected and no next frame is published',async()=>{
 const t=env(2);
 try{
  const r=await run(t,async(role,task)=>{
   const answer=await syntheticFixtureRoleProvider(role,task);
   if(role==='social')answer.index++;
   return answer;
  });
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.completed_frames,0);
  assert.match(r.blocker.error,/ROLE_RESPONSE_STALE_OR_WRONG/);
  assert.equal(fs.existsSync(path.join(t.publicRoot,'frames','00001')),false);
  assert.equal(load(t.name).index,0);
 }finally{t.cleanup();}
});
test('a QA failure never becomes a fake five-role pass; resume can reuse the verified four peers',async()=>{
 const t=env(2);
 try{
  const first=await run(t,async(role,task)=>{
   if(role==='qa')throw Error('QA_NOT_AVAILABLE');
   return syntheticFixtureRoleProvider(role,task);
  });
  assert.equal(first.status,'BLOCKED');
  assert.equal(first.completed_frames,0);
  assert.equal(fs.existsSync(path.join(t.publicRoot,'frames','00000','decisions','qa.json')),false);
  const second=await run(t);
  assert.equal(second.status,'COMPLETE');
  assert.equal(second.frames[0].roles.scout.cached,true);
  assert.equal(second.frames[0].roles.qa.cached,false);
 }finally{t.cleanup();}
});
test('historical input refuses synthetic role generator even in DIAGNOSTIC mode',async()=>{
 const t=env(1);
 try{
  const d=structuredClone(t.dataset);
  d.data_class='HISTORICAL';
  d.events.forEach(e=>e.evidence.type='LEDGER');
  await assert.rejects(()=>runContinuousReplay({
   sessionName:t.name,dataset:d,publicRoot:t.publicRoot,
   invokeRole:syntheticFixtureRoleProvider,
   providerLabel:'SYNTHETIC_FIXTURE'
  }),/FIXTURE_ROLE_PROVIDER_FORBIDDEN/);
  assert.equal(fs.existsSync(runPath(t.name)),false);
 }finally{t.cleanup();}
});
test('frame stop limits are respected, no future frames exposed until next explicit cycle',async()=>{
 const t=env(4);
 try{
  const a=await run(t,syntheticFixtureRoleProvider,{maxFrames:1});
  assert.equal(a.completed_frames,1);
  assert.equal(fs.existsSync(path.join(t.publicRoot,'frames','00001')),false);
  const b=await run(t,syntheticFixtureRoleProvider,{maxFrames:1});
  assert.equal(b.completed_frames,2);
  assert.equal(fs.existsSync(path.join(t.publicRoot,'frames','00002')),false);
 }finally{t.cleanup();}
});
test('active positions and actual historical trading are never claimed by empty simulated votes',async()=>{
 const t=env(3,true);
 try{
  const out=await run(t);
  assert.equal(out.status,'COMPLETE');
  assert.equal(out.simulated_trades,0);
  assert.equal(out.real_paper_account_changes,0);
  assert.equal(out.independent_role_authorship_verified,false);
  assert.ok(out.frames.every(f=>f.completed&&f.actions===0));
 }finally{t.cleanup();}
});
