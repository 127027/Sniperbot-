// Durable, device+wallet-bound SIGNED V2 command receipts.
// After authentication: look up a read-only chain-specific swap quote only.
// No browser/Laptop/agent path in this module can debit, unlock or trade.
import {randomBytes,createHash} from 'node:crypto';
import {readFile,mkdir,rename,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {verifySignedTradeIntent,unsignedTradeIntent} from './chain-trade-intent-v2.mjs';
import {previewDynamicAssetRoute} from './dynamic-asset-router.mjs';
import {readLocalSolanaVault} from './local-solana-vault.mjs';

const SCHEMA='sniper_dynamic_device_trade_inbox.v1';
const DEVICE=/^device_[a-f0-9]{32}$/;
const CMD=/^cmd_[a-f0-9]{32}$/;
const MAX=512,MAX_FILE=512*1024;
const blocked=(reason)=>({status:'BLOCKED',reason,
 trade_executed:false,signing_enabled:false});
export async function createDynamicTradeInbox({
 filename,trustFile,deviceId,solanaWalletFile,
 preview=previewDynamicAssetRoute
}={}){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!filename.endsWith('.json')||
  typeof trustFile!=='string'||!path.isAbsolute(trustFile)||!trustFile.endsWith('.json')||
  typeof solanaWalletFile!=='string'||!path.isAbsolute(solanaWalletFile)||
  !DEVICE.test(deviceId||''))throw Error('INVALID_DYNAMIC_INBOX_CONFIG');
 const readStore=async()=>{
  let obj;
  try{
   const raw=await readFile(filename);
   if(raw.length>MAX_FILE)throw Error('DYNAMIC_INBOX_TOO_LARGE');
   obj=JSON.parse(raw.toString('utf8'));
  }catch(e){if(e.code==='ENOENT')return {schema:SCHEMA,device_id:deviceId,records:[]};throw e}
  if(!obj||obj.schema!==SCHEMA||obj.device_id!==deviceId||
   !Array.isArray(obj.records)||obj.records.length>MAX)throw Error('DYNAMIC_INBOX_CORRUPT');
  const uniq=new Set();
  for(const record of obj.records){
   if(!record||!CMD.test(record.command_id)||
    record.device_id!==deviceId||typeof record.payload_sha256!=='string'||
    !/^[a-f0-9]{64}$/.test(record.payload_sha256)||
    record.transaction_signed!==false||record.transaction_sent!==false||
    record.wallet_debited!==false||record.live_trading_enabled!==false||
    record.execution_status!=='BLOCKED_LIVE_EXECUTION_NOT_ENABLED'||
    !['BUY','SELL'].includes(record.action)||
    !['solana','eth','base','bsc'].includes(record.chain)||
    uniq.has(record.command_id))throw Error('DYNAMIC_INBOX_CORRUPT_RECEIPT');
   uniq.add(record.command_id);
  }
  return obj;
 };
 const readKeys=async()=>{
  let raw;
  try{raw=await readFile(trustFile)}
  catch(e){if(e.code==='ENOENT')return [];throw e}
  if(raw.length>32768)throw Error('TRUSTED_KEYS_TOO_LARGE');
  return JSON.parse(raw.toString('utf8'));
 };
 let queue=Promise.resolve();
 const submit=(command,{now=Date.now()}={})=>{
  const job=async()=>{
   // Authentication and wallet/device scoping BEFORE any provider request.
   const verified=verifySignedTradeIntent(command,await readKeys(),{deviceId,now});
   const state=await readStore();
   const digest=createHash('sha256').update(unsignedTradeIntent(command)).digest('hex');
   const previous=state.records.find(x=>x.command_id===command.command_id);
   if(previous){
    if(previous.payload_sha256!==digest)throw Error('DYNAMIC_COMMAND_REPLAY_CONFLICT');
    return {...previous,duplicate:true};
   }
   if(state.records.length>=MAX)throw Error('DYNAMIC_INBOX_CAP_REACHED');
   let route=blocked('CHAIN_WALLET_ADAPTER_NOT_READY');
   if(verified.chain==='solana'){
    const wallet=await readLocalSolanaVault(solanaWalletFile);
    if(wallet.exists&&wallet.address===verified.target_wallet){
     route=await preview({chain:'solana',
      owner:wallet.address,inputAsset:verified.input_asset,
      outputAsset:verified.output_asset,amountAtoms:verified.amount_atoms,
      minReceiveAtoms:verified.min_receive_atoms});
    }else{
     route=blocked('TARGET_SOLANA_WALLET_NOT_FOUND_ON_THIS_DEVICE');
    }
   }else{
    route=blocked('CHAIN_WALLET_AND_DEX_ADAPTER_NOT_READY');
   }
   const receipt={
    schema:SCHEMA,command_id:verified.command_id,
    device_id:deviceId,chain:verified.chain,action:verified.action,
    wallet_address:verified.target_wallet,token_address:verified.token_address,
    input_asset:verified.input_asset,output_asset:verified.output_asset,
    input_amount_atoms:verified.amount_atoms,
    min_receive_atoms:verified.min_receive_atoms,
    payload_sha256:digest,received_at_utc:new Date(now).toISOString(),
    route_status:route.status,route_blocker:route.reason||null,
    indicative_output_atoms:route.indicative_output_atoms||null,
    execution_status:'BLOCKED_LIVE_EXECUTION_NOT_ENABLED',
    transaction_signed:false,transaction_sent:false,wallet_debited:false,
    live_trading_enabled:false,duplicate:false,
    note:'Verified agent request and public quote only. No wallet trade or PayPal payment.'
   };
   const next={schema:SCHEMA,device_id:deviceId,records:[...state.records,receipt]};
   const buf=Buffer.from(JSON.stringify(next)+'\n');
   if(buf.length>MAX_FILE)throw Error('DYNAMIC_INBOX_TOO_LARGE');
   await mkdir(path.dirname(filename),{recursive:true});
   const temp=filename+'.tmp-'+randomBytes(8).toString('hex');
   try{
    await writeFile(temp,buf,{flag:'wx',mode:0o600});
    await rename(temp,filename);
   }finally{await unlink(temp).catch(()=>{})}
   return receipt;
  };
  const result=queue.then(job);
  queue=result.catch(()=>{});
  return result;
 };
 return {submit,summary:async()=>{
  const state=await readStore();
  return {schema:SCHEMA,device_id:deviceId,
   live_execution_enabled:false,stored:state.records.length,
   recent_receipts:state.records.slice(-15).reverse()};
 }};
}
