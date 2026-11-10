import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import path from 'node:path';import os from 'node:os';
import {loadLocalDeviceTopology,installLocalDeviceTopology,
 createSignedMasterPresence,verifyMasterPresence,followerStatus,
 operationAllowedWhenMasterOffline} from './device-topology.mjs';
const A='device_'+'a'.repeat(32),B='device_'+'b'.repeat(32);
const now=Date.parse('2026-11-10T18:00:00Z');
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const pem=publicKey.export({format:'pem',type:'spki'});
const files=()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'sniper-master-topology-'));
 return {root,master:path.join(root,'master'),follower:path.join(root,'follower')};
};
test('master laptop and follower install separated per-device topology',()=>{
 const p=files();
 try{
  const unpaired=loadLocalDeviceTopology(p.follower,B);
  assert.equal(unpaired.mode,'UNPAIRED');
  const one=installLocalDeviceTopology({dir:p.master,deviceId:A,mode:'MASTER',masterDeviceId:A});
  const two=installLocalDeviceTopology({dir:p.follower,deviceId:B,mode:'FOLLOWER',
   masterDeviceId:A,masterPublicKeyPem:pem});
  assert.equal(one.mode,'MASTER');assert.equal(two.mode,'FOLLOWER');
  assert.equal(loadLocalDeviceTopology(p.master,A).mode,'MASTER');
  assert.equal(loadLocalDeviceTopology(p.follower,B).master_device_id,A);
  assert.throws(()=>installLocalDeviceTopology({dir:p.follower,deviceId:B,mode:'FOLLOWER',
   masterDeviceId:A,masterPublicKeyPem:pem}),e=>e.code==='EEXIST');
 }finally{rmSync(p.root,{recursive:true,force:true})}
});
test('fresh master signed status is informational, never a trading authorization',()=>{
 const cfg={mode:'FOLLOWER',master_device_id:A,master_public_key_pem:pem};
 const hb=createSignedMasterPresence({masterDeviceId:A,sequence:7,
  privateKey,now,lifetimeMs:90000});
 const proof=verifyMasterPresence(hb,cfg,{now:now+1000});
 assert.equal(proof.verified,true);
 const state=followerStatus({topology:cfg,presence:proof,now:now+1000});
 assert.equal(state.coordination_online,true);
 assert.equal(state.trade_authorized,false);
 assert.equal(followerStatus({topology:cfg,presence:proof,now:now+91000}).message,
  'Keine Verbindung – ruf Andreas an');
});
test('private master PEM can never be pasted into a follower as public key',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'sniper-private-key-reject-'));
 try{
  const secret=privateKey.export({format:'pem',type:'pkcs8'});
  assert.throws(()=>installLocalDeviceTopology({
   dir,deviceId:B,mode:'FOLLOWER',masterDeviceId:A,
   masterPublicKeyPem:secret}),/INVALID_MASTER_PUBLIC_KEY/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('stale, tampered, forged and wrong-device master heartbeats reject',()=>{
 const cfg={mode:'FOLLOWER',master_device_id:A,master_public_key_pem:pem};
 const hb=createSignedMasterPresence({masterDeviceId:A,sequence:3,
  privateKey,now,lifetimeMs:20000});
 assert.throws(()=>verifyMasterPresence(hb,cfg,{now:now+20001}),/EXPIRED/);
 assert.throws(()=>verifyMasterPresence({...hb,sequence:99},cfg,{now:now+1000}),/MISMATCH/);
 assert.throws(()=>verifyMasterPresence({...hb,master_device_id:B},cfg,{now:now+1000}),/PRESENCE/);
 const other=generateKeyPairSync('ed25519').privateKey;
 const forged=createSignedMasterPresence({masterDeviceId:A,sequence:3,
  privateKey:other,now,lifetimeMs:20000});
 assert.throws(()=>verifyMasterPresence(forged,cfg,{now:now+1000}),/MISMATCH/);
 assert.equal(followerStatus({topology:cfg,presence:null,now}).coordination_online,false);
});
test('offline follower can only access explicit funding actions and readback endpoints',()=>{
 for(const allowed of ['DEPOSIT','WITHDRAW','PREVIEW_PAPER_FUNDING'])
  assert.equal(operationAllowedWhenMasterOffline(allowed,false),true);
 for(const denied of ['BUY','SELL','SCAN','SET_AUTO','EXCHANGE',
  'EXCHANGE_BACK','TOGGLE_BOT','SIMULATE_AGENTS','DEMO_SIGNAL','RESET'])
  assert.equal(operationAllowedWhenMasterOffline(denied,false),false,denied);
});
test('corrupt topology never reverts silently to a new master',()=>{
 const p=files();
 try{
  installLocalDeviceTopology({dir:p.follower,deviceId:B,mode:'FOLLOWER',
   masterDeviceId:A,masterPublicKeyPem:pem});
  writeFileSync(path.join(p.follower,'device-topology.v1.json'),'not-json');
  assert.throws(()=>loadLocalDeviceTopology(p.follower,B),SyntaxError);
 }finally{rmSync(p.root,{recursive:true,force:true})}
});
