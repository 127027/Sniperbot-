import test from 'node:test';
import assert from 'node:assert/strict';
import {sign,generateKeyPairSync} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {createLocalSolanaVault,encodeBase58} from './local-solana-vault.mjs';
import {TRADE_V2_SCHEMA,unsignedTradeIntent} from './chain-trade-intent-v2.mjs';
import {createDynamicTradeInbox} from './dynamic-trade-inbox.mjs';
const device='device_'+'c'.repeat(32);
const other='device_'+'d'.repeat(32);
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const keys=[{issuer:'central-controller',key_id:'agent-key-2026',
 scope:'agent_execution',public_key_pem:publicKey.export({type:'spki',format:'pem'})}];
const at=Date.parse('2026-11-10T20:00:00Z');
const usdc='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const target=encodeBase58(Buffer.alloc(32,11));
const make=(wallet,overrides={})=>{
 const base={schema:TRADE_V2_SCHEMA,target_device_id:device,
  command_id:'cmd_'+'1'.repeat(32),issuer:'central-controller',key_id:'agent-key-2026',
  chain:'solana',action:'BUY',token_address:target,pool_address:null,
  target_wallet:wallet,input_asset:usdc,output_asset:target,
  input_amount_atoms:'50000000',min_receive_atoms:'111',max_slippage_bps:300,
  created_at_utc:new Date(at-1000).toISOString(),
  expires_at_utc:new Date(at+35000).toISOString(),...overrides};
 return {...base,signature:sign(null,Buffer.from(unsignedTradeIntent(base)),privateKey).toString('base64')};
};
async function setup(){
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-v2-dynamic-inbox-'));
 const walletFile=path.join(dir,'wallet.json');
 const wallet=await createLocalSolanaVault({
  filename:walletFile,password:'CI_WALLET_ONLY_LONG_PASSWORD_2026'});
 const trustFile=path.join(dir,'trusted-execution-publishers.json');
 const filename=path.join(dir,'dynamic','inbox.json');
 await writeFile(trustFile,JSON.stringify(keys));
 return {dir,wallet,walletFile,solanaWalletFile:walletFile,trustFile,filename};
}
test('signed 50 USDC BUY for any new token produces durable NON-executing receipt',async()=>{
 const f=await setup();
 try{
  let count=0;
  const preview=async params=>{
   count++;
   assert.equal(params.chain,'solana');assert.equal(params.owner,f.wallet.address);
   assert.equal(params.inputAsset,usdc);assert.equal(params.outputAsset,target);
   assert.equal(params.amountAtoms,'50000000');
   return {status:'QUOTE_OBSERVED_NO_TRADE',indicative_output_atoms:'99876543',
    trade_executed:false};
  };
  const inbox=await createDynamicTradeInbox({...f,deviceId:device,preview});
  const order=make(f.wallet.address);
  const first=await inbox.submit(order,{now:at});
  assert.equal(first.route_status,'QUOTE_OBSERVED_NO_TRADE');
  assert.equal(first.indicative_output_atoms,'99876543');
  assert.equal(first.transaction_signed,false);
  assert.equal(first.transaction_sent,false);
  assert.equal(first.wallet_debited,false);
  assert.equal(first.live_trading_enabled,false);
  assert.equal(count,1);
  const again=await createDynamicTradeInbox({...f,deviceId:device,preview});
  const same=await again.submit(order,{now:at});
  assert.equal(same.duplicate,true);
  assert.equal(count,1,'do not repeat a quote or transaction for already-processed command');
  assert.equal((await again.summary()).stored,1);
  const raw=await readFile(f.filename,'utf8');
  assert(!raw.includes(order.signature));
  assert(!raw.includes('BEGIN PRIVATE KEY'));
 }finally{await rm(f.dir,{recursive:true,force:true})}
});
test('changed amount with reused command ID rejects before new quote',async()=>{
 const f=await setup();
 try{
  const inbox=await createDynamicTradeInbox({...f,deviceId:device,
   preview:async()=>({status:'BLOCKED',reason:'ROUTE_DOWN'})});
  await inbox.submit(make(f.wallet.address),{now:at});
  await assert.rejects(inbox.submit(make(f.wallet.address,{input_amount_atoms:'40000000'}),{now:at}),
   /REPLAY_CONFLICT/);
 }finally{await rm(f.dir,{recursive:true,force:true})}
});
test('foreign wallet, foreign device and expired command NEVER fetch quote',async()=>{
 const f=await setup();
 try{
  let count=0;
  const inbox=await createDynamicTradeInbox({...f,deviceId:device,preview:async()=>{count++}});
  const foreign=make(encodeBase58(Buffer.alloc(32,12)));
  const r=await inbox.submit(foreign,{now:at});
  assert.equal(r.route_blocker,'TARGET_SOLANA_WALLET_NOT_FOUND_ON_THIS_DEVICE');
  assert.equal(count,0);
  await assert.rejects(inbox.submit(make(f.wallet.address,{target_device_id:other,
   command_id:'cmd_'+'2'.repeat(32)}),{now:at}),/DIFFERENT_DEVICE/);
  await assert.rejects(inbox.submit(make(f.wallet.address,{command_id:'cmd_'+'3'.repeat(32),
   expires_at_utc:new Date(at-1).toISOString()}),{now:at}),/EXPIRED/);
  assert.equal(count,0);
 }finally{await rm(f.dir,{recursive:true,force:true})}
});
test('EVM command has no silent fallback Solana wallet or auto-trade',async()=>{
 const f=await setup();
 try{
  const cmd=make('0x'+'e'.repeat(40),{
   chain:'base',token_address:'0x'+'a'.repeat(40),
   input_asset:'0x'+'b'.repeat(40),output_asset:'0x'+'a'.repeat(40),
   command_id:'cmd_'+'4'.repeat(32)});
  const inbox=await createDynamicTradeInbox({...f,deviceId:device,
   preview:async()=>{throw Error('EVM preview must not be invoked as Solana route')}});
  const r=await inbox.submit(cmd,{now:at});
  assert.equal(r.route_blocker,'CHAIN_WALLET_AND_DEX_ADAPTER_NOT_READY');
  assert.equal(r.live_trading_enabled,false);
 }finally{await rm(f.dir,{recursive:true,force:true})}
});
test('tampered receipt pretending a sent transaction is refused on restart',async()=>{
 const f=await setup();
 try{
  const inbox=await createDynamicTradeInbox({...f,deviceId:device,
   preview:async()=>({status:'BLOCKED',reason:'QUOTE_DOWN'})});
  await inbox.submit(make(f.wallet.address),{now:at});
  const doc=JSON.parse(await readFile(f.filename,'utf8'));
  doc.records[0].transaction_sent=true;
  await writeFile(f.filename,JSON.stringify(doc));
  await assert.rejects(inbox.summary(),/CORRUPT_RECEIPT/);
  await assert.rejects(inbox.submit(make(f.wallet.address,{command_id:'cmd_'+'5'.repeat(32)}),{now:at}),
   /CORRUPT_RECEIPT/);
 }finally{await rm(f.dir,{recursive:true,force:true})}
});
