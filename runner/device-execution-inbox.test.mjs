import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createExecutionInbox,verifyExecutionInstruction,
 instructionSignedPayload,EXECUTION_SCHEMA} from './device-execution-inbox.mjs';
const deviceA='device_'+'a'.repeat(32);
const deviceB='device_'+'b'.repeat(32);
const sol='So11111111111111111111111111111111111111112';
const usdc='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const now=Date.parse('2026-11-10T18:00:00Z');
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const keys=[{issuer:'central-controller',key_id:'central-2026',scope:'agent_execution',
 public_key_pem:publicKey.export({format:'pem',type:'spki'})}];
const signed=partial=>{
 const d={schema:EXECUTION_SCHEMA,target_device_id:deviceA,
  command_id:'cmd_'+'1'.repeat(32),issuer:'central-controller',key_id:'central-2026',
  chain:'solana',action:'BUY',input_mint:sol,output_mint:usdc,
  amount_atoms:'100000000',min_receive_atoms:'50000',max_slippage_bps:500,
  created_at_utc:new Date(now-1000).toISOString(),
  expires_at_utc:new Date(now+30000).toISOString(),...partial};
 return {...d,signature:sign(null,Buffer.from(instructionSignedPayload(d)),privateKey).toString('base64')};
};
test('signed BUY is addressed to exactly one device, not other laptop',()=>{
 const cmd=signed();
 assert.equal(verifyExecutionInstruction(cmd,keys,{deviceId:deviceA,now}).device_id,deviceA);
 assert.throws(()=>verifyExecutionInstruction(cmd,keys,{deviceId:deviceB,now}),/DIFFERENT_DEVICE/);
});
test('valid SELL can reference newly issued token without agent order execution',()=>{
 const novel='11111111111111111111111111111111';
 const cmd=signed({action:'SELL',input_mint:novel,output_mint:sol,
  command_id:'cmd_'+'2'.repeat(32)});
 assert.equal(verifyExecutionInstruction(cmd,keys,{deviceId:deviceA,now}).issuer,'central-controller');
});
test('tampering, expired order, unknown issuer, unknown chain and invalid limits rejected',()=>{
 const cmd=signed();
 for(const change of [
  {amount_atoms:'99999999'},{target_device_id:deviceB},{max_slippage_bps:1001},
  {output_mint:'https://invalid'},{action:'TRANSFER'},{chain:'base'},
  {expires_at_utc:new Date(now-1).toISOString()},{input_mint:usdc,output_mint:usdc}
 ]){
  assert.throws(()=>verifyExecutionInstruction({...cmd,...change},keys,{deviceId:deviceA,now}));
 }
 assert.throws(()=>verifyExecutionInstruction(cmd,[],{deviceId:deviceA,now}),/NO_TRUSTED/);
 assert.throws(()=>verifyExecutionInstruction(cmd,[{...keys[0],revoked:true}],{deviceId:deviceA,now}),/NO_TRUSTED/);
 assert.throws(()=>verifyExecutionInstruction({...cmd,private_key:'NOPE'},keys,{deviceId:deviceA,now}),/FIELDS/);
});
test('durable inbox survives restart, exact replay idempotent, different payload conflicts',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-executor-inbox-'));
 const filename=path.join(dir,'inbox.json'),trustFile=path.join(dir,'trusted-execution-publishers.json');
 try{
  await writeFile(trustFile,JSON.stringify(keys));
  const a=await createExecutionInbox({filename,trustFile,deviceId:deviceA});
  const cmd=signed();
  const first=await a.submit(cmd,{now});
  assert.equal(first.execution_status,'BLOCKED_LIVE_EXECUTION_NOT_ENABLED');
  assert.equal(first.transaction_signed,false);
  assert.equal(first.transaction_sent,false);
  assert.equal(first.wallet_debited,false);
  const another=await createExecutionInbox({filename,trustFile,deviceId:deviceA});
  assert.equal((await another.summary()).stored,1);
  const repeated=await another.submit(cmd,{now});
  assert.equal(repeated.duplicate,true);
  assert.equal((await another.summary()).stored,1);
  const changed=signed({amount_atoms:'50000000'});
  await assert.rejects(another.submit(changed,{now}),/COMMAND_ID_REPLAY_CONFLICT/);
  const raw=await readFile(filename,'utf8');
  assert(!raw.includes(cmd.signature));
  assert(!raw.includes(privateKey.export({type:'pkcs8',format:'pem'})));
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('separate devices cannot read or use each others local inbox',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-inbox-devices-'));
 try{
  const a=path.join(dir,'a','inbox.json'),b=path.join(dir,'b','inbox.json');
  const keyFile=path.join(dir,'public.json');await writeFile(keyFile,JSON.stringify(keys));
  const one=await createExecutionInbox({filename:a,trustFile:keyFile,deviceId:deviceA});
  const two=await createExecutionInbox({filename:b,trustFile:keyFile,deviceId:deviceB});
  await one.submit(signed(),{now});
  assert.equal((await one.summary()).stored,1);
  assert.equal((await two.summary()).stored,0);
  await assert.rejects(two.submit(signed(),{now}),/DIFFERENT_DEVICE/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('tampered local receipt cannot pretend a real signed/settled trade occurred',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-inbox-tamper-'));
 const filename=path.join(dir,'inbox.json'),trustFile=path.join(dir,'keys.json');
 try{
  await writeFile(trustFile,JSON.stringify(keys));
  const instance=await createExecutionInbox({filename,trustFile,deviceId:deviceA});
  await instance.submit(signed(),{now});
  const original=JSON.parse(await readFile(filename,'utf8'));
  original.records[0].transaction_signed=true;
  await writeFile(filename,JSON.stringify(original));
  await assert.rejects(instance.summary(),/CORRUPT_EXECUTION_INBOX_RECORD/);
  await assert.rejects(instance.submit(signed({command_id:'cmd_'+'2'.repeat(32)}),{now}),
   /CORRUPT_EXECUTION_INBOX_RECORD/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('missing registry and corrupted inbox cannot be silently reset',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-inbox-corrupt-'));
 const filename=path.join(dir,'inbox.json'),trustFile=path.join(dir,'keys.json');
 try{
  const one=await createExecutionInbox({filename,trustFile,deviceId:deviceA});
  await assert.rejects(one.submit(signed(),{now}),/NO_TRUSTED_EXECUTION_PUBLISHER/);
  await writeFile(trustFile,JSON.stringify(keys));
  await writeFile(filename,'not-json');
  await assert.rejects(one.submit(signed(),{now}),SyntaxError);
  assert.equal(await readFile(filename,'utf8'),'not-json');
 }finally{await rm(dir,{recursive:true,force:true})}
});
