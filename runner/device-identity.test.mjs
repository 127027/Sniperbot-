import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadOrCreateDeviceIdentity} from './device-identity.mjs';
test('two device installations get distinct IDs and keep them across restarts',()=>{
 const home=mkdtempSync(path.join(os.tmpdir(),'sniper-identities-'));
 try{
  const a=path.join(home,'laptop'),b=path.join(home,'pc');
  const laptop=loadOrCreateDeviceIdentity(a);
  const desktop=loadOrCreateDeviceIdentity(b);
  assert.notEqual(laptop.device_id,desktop.device_id);
  assert.equal(laptop.device_id,loadOrCreateDeviceIdentity(a).device_id);
  assert.equal(desktop.device_id,loadOrCreateDeviceIdentity(b).device_id);
  assert(!JSON.stringify(laptop).match(/private|seed|passphrase|wallet_address/i));
  assert.equal(laptop.device_id.length,39);
 }finally{rmSync(home,{recursive:true,force:true})}
});
test('corrupted device identity must NEVER be silently reset',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'sniper-device-corrupt-'));
 try{
  const first=loadOrCreateDeviceIdentity(dir);
  const file=path.join(dir,'device-identity.v1.json');
  writeFileSync(file,'{"schema":"sniper_local_device_identity.v1","device_id":"oops"}');
  assert.throws(()=>loadOrCreateDeviceIdentity(dir),/INVALID_LOCAL_DEVICE_IDENTITY/);
  assert.equal(readFileSync(file,'utf8').includes(first.device_id),false);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
