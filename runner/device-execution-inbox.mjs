// Device-targeted, signed BUY/SELL instruction INBOX for future GPT agents.
// The sole purpose is authentication + durable non-executing acknowledgements.
// NO quote, wallet unlock, signing, order, paper balance or live spending here.
import {createHash,createPublicKey,verify,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {decodeBase58} from './local-solana-vault.mjs';
import {SOL_MINT} from './solana-swap-quote.mjs';

export const EXECUTION_SCHEMA='sniper_device_execution_instruction.v1';
export const EXECUTION_DOMAIN='MemeSniper/device_execution_instruction.v1\n';
export const INBOX_SCHEMA='sniper_device_execution_inbox.v1';
const UINT=/^[1-9][0-9]{0,19}$/;
const UUID=/^cmd_[0-9a-f]{32}$/;
const DEVICE=/^device_[0-9a-f]{32}$/;
const MAX_RECORDS=512,MAX_BYTES=512*1024;
const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const fields=['schema','target_device_id','command_id','issuer','key_id','chain','action',
 'input_mint','output_mint','amount_atoms','min_receive_atoms','max_slippage_bps',
 'created_at_utc','expires_at_utc','signature'];
export function canonicalInstruction(x){
 if(x===null||typeof x!=='object')return JSON.stringify(x);
 if(Array.isArray(x))return '['+x.map(canonicalInstruction).join(',')+']';
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonicalInstruction(x[k])).join(',')+'}';
}
export function instructionSignedPayload(command){
 const {signature,...unsigned}=command;
 return EXECUTION_DOMAIN+canonicalInstruction(unsigned);
}
export function verifyExecutionInstruction(cmd,registry,{deviceId,now=Date.now()}={}){
 if(!DEVICE.test(deviceId||''))throw Error('INVALID_LOCAL_DEVICE_ID');
 if(!cmd||typeof cmd!=='object'||Array.isArray(cmd)||
  Object.keys(cmd).length!==fields.length||
  fields.some(k=>!Object.hasOwn(cmd,k)))throw Error('INVALID_INSTRUCTION_FIELDS');
 if(cmd.schema!==EXECUTION_SCHEMA||cmd.target_device_id!==deviceId)
  throw Error('INSTRUCTION_FOR_DIFFERENT_DEVICE');
 if(!UUID.test(cmd.command_id)||typeof cmd.issuer!=='string'||
  !/^[a-zA-Z0-9_.-]{3,80}$/.test(cmd.issuer)||
  typeof cmd.key_id!=='string'||!/^[a-zA-Z0-9_.-]{3,80}$/.test(cmd.key_id)||
  cmd.chain!=='solana'||!['BUY','SELL'].includes(cmd.action))
  throw Error('INVALID_INSTRUCTION_IDENTIFIERS');
 decodeBase58(cmd.input_mint);decodeBase58(cmd.output_mint);
 if(cmd.input_mint===cmd.output_mint)throw Error('IDENTICAL_SWAP_MINTS');
 if(cmd.action==='BUY'&&![SOL_MINT,USDC].includes(cmd.input_mint))
  throw Error('BUY_INPUT_ASSET_NOT_ALLOWED');
 if(cmd.action==='SELL'&&![SOL_MINT,USDC].includes(cmd.output_mint))
  throw Error('SELL_OUTPUT_ASSET_NOT_ALLOWED');
 if(typeof cmd.amount_atoms!=='string'||!UINT.test(cmd.amount_atoms)||
  typeof cmd.min_receive_atoms!=='string'||!UINT.test(cmd.min_receive_atoms)||
  BigInt(cmd.amount_atoms)>18446744073709551615n||
  BigInt(cmd.min_receive_atoms)>18446744073709551615n||
  !Number.isSafeInteger(cmd.max_slippage_bps)||
  cmd.max_slippage_bps<0||cmd.max_slippage_bps>1000)
  throw Error('INVALID_INSTRUCTION_AMOUNTS');
 const created=Date.parse(cmd.created_at_utc),expires=Date.parse(cmd.expires_at_utc);
 if(!Number.isFinite(now)||!Number.isFinite(created)||!Number.isFinite(expires)||
  created>now+5000||expires<=now||expires<=created||expires-created>120000)
  throw Error('INSTRUCTION_STALE_OR_INVALID');
 if(!Array.isArray(registry)||registry.length>30)throw Error('TRUSTED_SIGNERS_NOT_CONFIGURED');
 const trusted=registry.find(k=>k.issuer===cmd.issuer&&k.key_id===cmd.key_id&&
  k.scope==='agent_execution'&&k.revoked!==true);
 if(!trusted||typeof trusted.public_key_pem!=='string')
  throw Error('NO_TRUSTED_EXECUTION_PUBLISHER');
 if(typeof cmd.signature!=='string'||!/^[-A-Za-z0-9+/=]{80,100}$/.test(cmd.signature))
  throw Error('INVALID_INSTRUCTION_SIGNATURE');
 const sig=Buffer.from(cmd.signature,'base64');
 if(sig.length!==64||sig.toString('base64')!==cmd.signature)
  throw Error('INVALID_INSTRUCTION_SIGNATURE');
 let key;
 try{key=createPublicKey(trusted.public_key_pem)}
 catch{throw Error('INVALID_TRUSTED_SIGNER_KEY')}
 if(key.asymmetricKeyType!=='ed25519'||
  !verify(null,Buffer.from(instructionSignedPayload(cmd),'utf8'),key,sig))
  throw Error('INSTRUCTION_SIGNATURE_NOT_VERIFIED');
 return {device_id:deviceId,issuer:cmd.issuer,key_id:cmd.key_id};
}
const blank=deviceId=>({schema:INBOX_SCHEMA,target_device_id:deviceId,
 paper_only:false,live_execution_enabled:false,records:[]});
function verifyInbox(doc,deviceId){
 if(!doc||typeof doc!=='object'||doc.schema!==INBOX_SCHEMA||
  doc.target_device_id!==deviceId||doc.live_execution_enabled!==false||
  doc.paper_only!==false||!Array.isArray(doc.records)||doc.records.length>MAX_RECORDS)
  throw Error('INVALID_EXECUTION_INBOX_STORE');
 const receiptFields=['action','chain','command_id','duplicate','execution_status',
  'input_mint','output_mint','payload_sha256','received_at_utc',
  'target_device_id','transaction_sent','transaction_signed','wallet_debited'].sort().join(',');
 for(const x of doc.records){
  if(!x||typeof x!=='object'||Array.isArray(x)||
   Object.keys(x).sort().join(',')!==receiptFields||
   !UUID.test(x.command_id)||typeof x.payload_sha256!=='string'||
   !/^[a-f0-9]{64}$/.test(x.payload_sha256)||
   !['BUY','SELL'].includes(x.action)||x.chain!=='solana'||
   typeof x.received_at_utc!=='string'||!Number.isFinite(Date.parse(x.received_at_utc))||
   x.execution_status!=='BLOCKED_LIVE_EXECUTION_NOT_ENABLED'||
   x.target_device_id!==deviceId||
   x.transaction_sent!==false||x.transaction_signed!==false||
   x.wallet_debited!==false||x.duplicate!==false)
   throw Error('CORRUPT_EXECUTION_INBOX_RECORD');
 }
 if(new Set(doc.records.map(x=>x.command_id)).size!==doc.records.length)
  throw Error('DUPLICATE_EXECUTION_INBOX_ID');
 return doc;
}
export async function createExecutionInbox({filename,trustFile,deviceId}={}){
 if(!DEVICE.test(deviceId||'')||typeof filename!=='string'||!path.isAbsolute(filename)||
  typeof trustFile!=='string'||!path.isAbsolute(trustFile)||
  !filename.endsWith('.json')||!trustFile.endsWith('.json'))
  throw Error('INVALID_EXECUTION_INBOX_CONFIG');
 const readStore=async()=>{
  try{
   const raw=await readFile(filename);
   if(raw.length>MAX_BYTES)throw Error('EXECUTION_INBOX_TOO_LARGE');
   return verifyInbox(JSON.parse(raw.toString('utf8')),deviceId);
  }catch(e){if(e.code==='ENOENT')return blank(deviceId);throw e}
 };
 const readRegistry=async()=>{
  try{
   const raw=await readFile(trustFile);
   if(raw.length>32768)throw Error('TRUSTED_SIGNERS_TOO_LARGE');
   return JSON.parse(raw.toString('utf8'));
  }catch(e){if(e.code==='ENOENT')return [];throw e}
 };
 let queue=Promise.resolve();
 const submit=(command,{now=Date.now()}={})=>{
  const job=async()=>{
   const keys=await readRegistry();
   verifyExecutionInstruction(command,keys,{deviceId,now});
   const state=await readStore();
   const hash=createHash('sha256').update(instructionSignedPayload(command)).digest('hex');
   const existing=state.records.find(x=>x.command_id===command.command_id);
   if(existing){
    if(existing.payload_sha256!==hash)throw Error('COMMAND_ID_REPLAY_CONFLICT');
    return {...existing,duplicate:true};
   }
   if(state.records.length>=MAX_RECORDS)throw Error('EXECUTION_INBOX_FULL');
   const receipt={
    command_id:command.command_id,target_device_id:deviceId,
    received_at_utc:new Date(now).toISOString(),
    action:command.action,chain:command.chain,
    input_mint:command.input_mint,output_mint:command.output_mint,
    payload_sha256:hash,
    execution_status:'BLOCKED_LIVE_EXECUTION_NOT_ENABLED',
    transaction_signed:false,transaction_sent:false,
    wallet_debited:false,duplicate:false
   };
   const next={...state,records:[...state.records,receipt]};
   const bytes=Buffer.from(JSON.stringify(next)+'\n','utf8');
   if(bytes.length>MAX_BYTES)throw Error('EXECUTION_INBOX_TOO_LARGE');
   await mkdir(path.dirname(filename),{recursive:true});
   const temp=filename+'.tmp-'+randomBytes(8).toString('hex');
   try{
    await writeFile(temp,bytes,{flag:'wx',mode:0o600});
    await rename(temp,filename);
   }finally{await unlink(temp).catch(()=>{})}
   return receipt;
  };
  const result=queue.then(job);
  queue=result.catch(()=>{});
  return result;
 };
 return {submit,summary:async()=>{
  const doc=await readStore();
  return {schema:INBOX_SCHEMA,target_device_id:deviceId,
   live_execution_enabled:false,stored:doc.records.length,
   recent_receipts:doc.records.slice(-10).reverse(),
   message:'Only verified device-targeted instructions are archived; never signs or trades.'};
 }};
}
