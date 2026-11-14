import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {forkSealedPrefix} from './r22-checkpoint.mjs';
import {load,runPath} from './controller.mjs';
import {digest} from './engine.mjs';
import {runContinuousReplay} from './continuous-runner.mjs';
const source='watch-20261114-diagnostic';
test('day eight restarts all five roles after verified seven-day prefix, source stays unchanged',async()=>{
 const original=load(source),name='r22-test-'+randomUUID(),root=fs.mkdtempSync(path.join(os.tmpdir(),'r22-checkpoint-'));
 try {
  const checkpoint=forkSealedPrefix(source,name,original.dataset,7);
  assert.equal(checkpoint.next_frame_index,7);assert.equal(checkpoint.inherited_votes_are_new_model_responses,false);
  assert.equal(load(name).index,7);assert.ok(!fs.existsSync(path.join(runPath(name),'frames')));
  const called=[];
  const r=await runContinuousReplay({sessionName:name,dataset:original.dataset,publicRoot:root,maxFrames:1,
   providerLabel:'MOCK_CHECKPOINT_ORCHESTRATION_ONLY',invokeRole:async(role,task,context)=>{
    called.push(role);assert.equal(task.frame.index,7);
    if(role==='qa')assert.equal(context.current_peer_votes.length,4);
    return {role,run_id:'MOCK-'+role,index:7,at:task.frame.at,input_hash:task.frame.input_hash,reviews:[],orders:[]};
   }});
  assert.equal(r.completed_frames,8);assert.equal(r.role_calls,5);assert.equal(called.length,5);
  assert.equal(digest(load(source)),digest(original));
 }finally{fs.rmSync(runPath(name),{recursive:true,force:true});fs.rmSync(root,{recursive:true,force:true});}
});
test('checkpoint rejects changed corpus, unsealed history and overwriting existing runs',()=>{
 const d=load(source).dataset,name='r22-test-'+randomUUID();
 try{
  assert.throws(()=>forkSealedPrefix(source,name,{...d,extra:'changed'},7),/DATASET_MISMATCH/);
  assert.throws(()=>forkSealedPrefix(source,name,d,61),/NOT_SEALED/);
  forkSealedPrefix(source,name,d,7);
  assert.throws(()=>forkSealedPrefix(source,name,d,7),/TARGET_EXISTS/);
  const file=path.join(runPath(name),'commits','00000.json');
  const commit=JSON.parse(fs.readFileSync(file,'utf8'));commit.hash='tampered';fs.writeFileSync(file,JSON.stringify(commit));
  assert.throws(()=>load(name),/COMMIT_CHAIN_CORRUPT/);
 }finally{fs.rmSync(runPath(name),{recursive:true,force:true});}
});
