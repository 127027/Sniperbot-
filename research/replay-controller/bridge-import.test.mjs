import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ROLES} from './engine.mjs';
import {initialize,runPath,nextFrame,advance,load} from './controller.mjs';
import {importBridgeVotes} from './bridge-import.mjs';

function scenario(){
 const name='r15-import-test-'+process.pid+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
 const root=runPath(name);
 const bridge=fs.mkdtempSync(path.join(os.tmpdir(),'isolated-dot-bridge-'));
 const d={schema:'isolated_replay.v1',data_class:'SYNTHETIC',
  ticks:['2023-03-14T23:59:59Z'],events:[]};
 initialize(name,d,{},'SYNTHETIC');
 const f=JSON.parse(fs.readFileSync(nextFrame(name).input_path,'utf8'));
 fs.writeFileSync(path.join(bridge,'input.json'),JSON.stringify(f));
 fs.mkdirSync(path.join(bridge,'decisions'));
 for(const role of ROLES){
  fs.writeFileSync(path.join(bridge,'decisions',role+'.json'),JSON.stringify({
   role,run_id:'synthetic-test-'+role,index:f.index,at:f.at,
   input_hash:f.input_hash,reviews:[],orders:[]
  }));
 }
 return {name,root,bridge,f,cleanup(){fs.rmSync(root,{recursive:true,force:true});fs.rmSync(bridge,{recursive:true,force:true});}};
}
test('five actual matching votes can be staged once and committed separately',()=>{
 const s=scenario();
 try{
  const r=importBridgeVotes(s.name,s.bridge);
  assert.equal(r.status,'FIVE_VOTES_STAGED_DIAGNOSTIC_ONLY');
  assert.equal(r.independently_authenticated,false);
  assert.equal(r.trade_executed,false);
  assert.equal(load(s.name).index,0,'import does not simulate orders');
  assert.ok(fs.existsSync(path.join(r.decision_directory,'_import_receipt.json')));
  assert.throws(()=>importBridgeVotes(s.name,s.bridge),/DECISION_DIRECTORY_ALREADY_EXISTS/);
  advance(s.name);assert.equal(load(s.name).index,1);
 }finally{s.cleanup();}
});
test('missing peer vote blocks staging entirely; never auto-create roles',()=>{
 const s=scenario();
 try{
  fs.rmSync(path.join(s.bridge,'decisions','onchain.json'));
  assert.throws(()=>importBridgeVotes(s.name,s.bridge),/MISSING_REAL_BRIDGE_VOTE:onchain/);
  assert.equal(fs.existsSync(nextFrame(s.name).decision_directory),false);
  assert.equal(load(s.name).index,0);
 }finally{s.cleanup();}
});
test('stale frame hash blocks import without modifying the run',()=>{
 const s=scenario();
 try{
  const p=path.join(s.bridge,'decisions','social.json'),v=JSON.parse(fs.readFileSync(p));
  v.input_hash='fabricated-old-hash';fs.writeFileSync(p,JSON.stringify(v));
  assert.throws(()=>importBridgeVotes(s.name,s.bridge),/STALE_OR_FUTURE_DECISION/);
  assert.equal(fs.existsSync(nextFrame(s.name).decision_directory),false);
 }finally{s.cleanup();}
});
test('future/unseen trade candidate cannot be smuggled in via QA role',()=>{
 const s=scenario();
 try{
  const p=path.join(s.bridge,'decisions','qa.json'),v=JSON.parse(fs.readFileSync(p));
  v.orders=[{action:'BUY',candidate_id:'future-coin',amount_quote:100}];
  fs.writeFileSync(p,JSON.stringify(v));
  assert.throws(()=>importBridgeVotes(s.name,s.bridge),/UNSEEN_CANDIDATE/);
  assert.equal(load(s.name).portfolio.trades.length,0);
 }finally{s.cleanup();}
});
