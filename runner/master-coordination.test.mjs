import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {createMasterCoordinationKey,unlockMasterCoordinationKey,
 getMasterCoordinationPublicKey} from './master-coordination-key.mjs';
import {publishMasterPresence,GITHUB_MASTER_FILE_URL,
 GITHUB_COORDINATION_BRANCH} from './github-master-publisher.mjs';
import {verifyMasterPresence} from './device-topology.mjs';
const device='device_'+'c'.repeat(32);
const followerCfg=pem=>({mode:'FOLLOWER',master_device_id:device,master_public_key_pem:pem});
const at=Date.parse('2026-11-10T20:00:00Z'),pass='TEST_ONLY_MASTER_SIGNING_PASSWORD_123!';
test('encrypted local laptop coordination key can be unlocked; never wallet seed',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-master-key-'));
 try{
  const key=await createMasterCoordinationKey({folder:dir,passphrase:pass});
  assert.equal(key.private_key_encrypted,true);
  assert.equal(key.wallet_keys_separate,true);
  const raw=await readFile(path.join(dir,'master-signing-private.encrypted.pem'),'utf8');
  assert.match(raw,/ENCRYPTED PRIVATE KEY/);
  assert(!raw.includes(pass));
  assert(!raw.includes('BEGIN PRIVATE KEY-----'));
  assert.equal(await getMasterCoordinationPublicKey(dir),key.master_public_key_pem);
  await assert.rejects(unlockMasterCoordinationKey({folder:dir,passphrase:pass+'WRONG'}),
   /PASSPHRASE_OR_KEY/);
  const verified=await unlockMasterCoordinationKey({folder:dir,passphrase:pass});
  assert.equal(verified.asymmetricKeyType,'ed25519');
  await assert.rejects(createMasterCoordinationKey({folder:dir,passphrase:pass}),
   e=>e.code==='EEXIST');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('master signs and publishes through pinned GitHub path, never tokens or wallet private keys',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-gh-master-'));
 try{
  const key=await createMasterCoordinationKey({folder:dir,passphrase:pass});
  const privateKey=await unlockMasterCoordinationKey({folder:dir,passphrase:pass});
  const token='github_fake_token_MASTER_TEST_ONLY_1234567890';
  const calls=[];
  const fetcher=async(url,options)=>{
   calls.push({url,options});
   if(options.method==='GET'){
    assert.equal(new URL(url).searchParams.get('ref'),GITHUB_COORDINATION_BRANCH);
    return new Response('{}',{status:404});
   }
   assert.equal(url,GITHUB_MASTER_FILE_URL);
   assert.equal(options.method,'PUT');
   const body=JSON.parse(options.body);
   assert.equal(body.branch,GITHUB_COORDINATION_BRANCH);
   const env=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
   const valid=verifyMasterPresence(env,followerCfg(key.master_public_key_pem),{now:at+1000});
   assert.equal(valid.verified,true);
   assert(!options.body.includes(token));
   assert(!options.body.includes(pass));
   assert(!options.body.includes('BEGIN PRIVATE KEY'));
   return new Response('{}',{status:201});
  };
  const r=await publishMasterPresence({
   masterDeviceId:device,privateKey,githubToken:token,fetcher,now:at});
  assert.equal(r.published,true);
  assert.equal(r.wallet_private_keys_sent,false);
  assert.equal(calls.length,2);
  assert.equal(calls[1].options.method,'PUT');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('GitHub publisher checks SHA for updates, rejects incorrect branches and credentials',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-master-pub-'));
 try{
  await createMasterCoordinationKey({folder:dir,passphrase:pass});
  const key=await unlockMasterCoordinationKey({folder:dir,passphrase:pass});
  const sha='a'.repeat(40);
  let put=0;
  const fetcher=async(url,options)=>{
   if(options.method==='GET')return new Response(JSON.stringify({
    type:'file',path:'coordination/master-presence.v1.json',sha}));
   put++;
   assert.equal(JSON.parse(options.body).sha,sha);
   return new Response('{}',{status:200});
  };
  await publishMasterPresence({masterDeviceId:device,privateKey:key,
   githubToken:'github_fake_token_LONG_ENOUGH_1234567890',fetcher,now:at});
  assert.equal(put,1);
  await assert.rejects(publishMasterPresence({masterDeviceId:device,privateKey:key,
   githubToken:'too-short',fetcher,now:at}),/TOKEN_MISSING/);
  await assert.rejects(publishMasterPresence({masterDeviceId:device,privateKey:key,
   githubToken:'github_fake_token_LONG_ENOUGH_1234567890',fetcher,
   branch:'main',now:at}),/INVALID_GITHUB_COORDINATION_BRANCH/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
