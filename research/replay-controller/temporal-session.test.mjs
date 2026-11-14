import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {prepareCorpus,createSession,publishCurrentFrame,temporalStatus,advanceCurrentFrame} from './temporal-session.mjs';
import {runPath,load} from './controller.mjs';
import {ROLES} from './engine.mjs';
function fixture(){
 const corpus={
  schema:'asof_corpus.v1',
  window:{start:'2023-03-14T00:00:00Z',end:'2023-03-16T23:59:59Z'},
  universe:{selection:'ASOF_COHORT',selection_policy:'time-filtered every pool',provenance:'synthetic tests only'},
  sources:[]
 };
 const dataset=prepareCorpus(corpus).private_dataset;
 const name='temporal-test-'+process.pid+'-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const publicRoot=fs.mkdtempSync(path.join(os.tmpdir(),'neutral-replay-public-'));
 const privateDir=runPath(name);
 createSession(name,dataset);
 const cleanup=()=>{fs.rmSync(privateDir,{recursive:true,force:true});fs.rmSync(publicRoot,{recursive:true,force:true});};
 return {name,publicRoot,dataset,cleanup};
}
function voteAll(t,missing=[]){
 const info=publishCurrentFrame(t.name,t.publicRoot),f=JSON.parse(fs.readFileSync(info.input_path,'utf8'));
 const dir=path.join(t.publicRoot,'frames',String(info.index).padStart(5,'0'),'decisions');
 fs.mkdirSync(dir,{recursive:true});
 for(const role of ROLES){
  if(missing.includes(role))continue;
  fs.writeFileSync(path.join(dir,role+'.json'),JSON.stringify({
   role,run_id:'test-'+role+'-'+info.index,index:info.index,at:info.at,
   input_hash:info.input_hash,reviews:[],orders:[]
  }));
 }
 return f;
}
test('candidate-neutral compilation prepares a 3-day time-locked private dataset',()=>{
 const t=fixture();
 try{
  assert.equal(t.dataset.events.length,0);
  assert.equal(t.dataset.ticks.length,3);
  assert.equal(t.dataset.window.end,'2023-03-16T23:59:59Z');
  assert.equal(t.dataset.contexts.qa.fresh,false);
 }finally{t.cleanup();}
});
test('role views contain only first day until all five decisions are sealed',()=>{
 const t=fixture();
 try{
  const f=voteAll(t,['social','security','qa']);
  assert.equal(f.index,0);
  const status=temporalStatus(t.name,t.publicRoot);
  assert.equal(status.committed_frames,0);
  assert.deepEqual(status.missing_roles,['social','security','qa']);
  assert.equal(status.can_advance,false);
  assert.equal(advanceCurrentFrame(t.name,t.publicRoot).status,'WAITING_FOR_FIVE_GENUINE_ROLE_VOTES');
  assert.equal(fs.existsSync(path.join(t.publicRoot,'frames','00001')),false);
  assert.equal(load(t.name).index,0);
 }finally{t.cleanup();}
});
test('five independent files seal exactly one day, then publish the next separately',()=>{
 const t=fixture();
 try{
  voteAll(t);
  const first=advanceCurrentFrame(t.name,t.publicRoot);
  assert.equal(first.status,'DECISIONS_SEALED');
  assert.equal(first.completed_frame,0);
  assert.equal(first.next_published,false);
  assert.equal(load(t.name).index,1);
  assert.equal(fs.existsSync(path.join(t.publicRoot,'frames','00001')),false);
  assert.throws(()=>advanceCurrentFrame(t.name,t.publicRoot),/FRAME_NOT_PUBLISHED/);
  const second=publishCurrentFrame(t.name,t.publicRoot);
  assert.equal(second.index,1);
  assert.equal(second.at,'2023-03-15T23:59:59Z');
  assert.equal(load(t.name).portfolio.trades.length,0);
 }finally{t.cleanup();}
});
test('stale role decision and mismatched frame hash block advancing',()=>{
 const t=fixture();
 try{
  voteAll(t);
  const social=path.join(t.publicRoot,'frames','00000','decisions','social.json');
  const v=JSON.parse(fs.readFileSync(social));
  v.input_hash='old-day-hash';fs.writeFileSync(social,JSON.stringify(v));
  assert.throws(()=>advanceCurrentFrame(t.name,t.publicRoot),/STALE_OR_FUTURE_DECISION/);
  assert.equal(load(t.name).index,0);
  assert.equal(load(t.name).portfolio.trades.length,0);
 }finally{t.cleanup();}
});
test('tampered public input cannot be accepted as day zero',()=>{
 const t=fixture();
 try{
  voteAll(t);
  const file=path.join(t.publicRoot,'frames','00000','input.json');
  const v=JSON.parse(fs.readFileSync(file));v.at='2023-03-15T23:59:59Z';
  fs.writeFileSync(file,JSON.stringify(v));
  assert.throws(()=>advanceCurrentFrame(t.name,t.publicRoot),/PUBLISHED_FRAME_TAMPERED/);
  assert.equal(load(t.name).index,0);
 }finally{t.cleanup();}
});
test('evaluation files cannot be passed into a published frame',()=>{
 const t=fixture();
 try{
  const original=publishCurrentFrame(t.name,t.publicRoot);
  assert.ok(!JSON.stringify(JSON.parse(fs.readFileSync(original.input_path))).includes('known_winner'));
  const f=JSON.parse(fs.readFileSync(original.input_path));
  f.evaluator={known_winner:'PEPE'};
  fs.writeFileSync(original.input_path,JSON.stringify(f));
  assert.throws(()=>publishCurrentFrame(t.name,t.publicRoot),/IMMUTABLE_PUBLIC_FRAME_MISMATCH/);
 }finally{t.cleanup();}
});
test('controller rejects winning-coin-labelled corpus as neutral input',()=>{
 const t=fixture();
 try{
  const d=structuredClone(t.dataset);
  d.universe.selection='KNOWN_WINNER';
  assert.throws(()=>createSession('rejected-'+Date.now(),d),/NEUTRAL_WINDOW_LOCK_REQUIRED/);
 }finally{t.cleanup();}
});
