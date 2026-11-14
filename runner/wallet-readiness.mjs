// V0.9 – private, local wallet READINESS manifest. No keys are generated,
// stored, uploaded, imported, signed or broadcast. Not an actual wallet.
// Paper and live order logic must never mistake a public address for signing authority.
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {validTokenAddress} from './market.mjs';

const CHAIN=new Set(['solana','base','bsc','eth']);
const forbidden=/private.?key|seed|mnemonic|passphrase|password|api.?key|secret|token|paypal|email/i;
const exact=(obj,fields)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).length===fields.length&&fields.every(k=>Object.hasOwn(obj,k));
export const emptyWalletReadiness=()=>({
 schema:'wallet_readiness.v1',paper_only:true,signing_enabled:false,
 live_enabled:false,accounts:[]
});
export function validateWalletReadiness(v){
 if(!exact(v,['schema','paper_only','signing_enabled','live_enabled','accounts'])||
  v.schema!=='wallet_readiness.v1'||v.paper_only!==true||
  v.signing_enabled!==false||v.live_enabled!==false||
  !Array.isArray(v.accounts)||v.accounts.length>8)
  throw Error('WALLET_READINESS_INVALID');
 const seen=new Set();
 for(const a of v.accounts){
  if(!exact(a,['chain','public_address','label','enabled','observed_at_utc'])||
   !CHAIN.has(a.chain)||typeof a.public_address!=='string'||
   !validTokenAddress(a.chain,a.public_address)||
   typeof a.label!=='string'||a.label.length>64||
   typeof a.enabled!=='boolean'||a.enabled!==false||
   !Number.isFinite(Date.parse(a.observed_at_utc)))
    throw Error('WALLET_ACCOUNT_INVALID');
  const id=a.chain+':'+a.public_address.toLowerCase();
  if(seen.has(id))throw Error('DUPLICATE_PUBLIC_ACCOUNT');
  seen.add(id);
 }
 return v;
}
export function rejectPrivateMaterial(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('INVALID_WALLET_PAYLOAD');
 const json=JSON.stringify(payload);
 // Refuse even nested secret-like property names. Never return input values in errors.
 const walk=v=>{
  if(!v||typeof v!=='object')return;
  for(const [k,val] of Object.entries(v)){
   if(forbidden.test(k))throw Error('PRIVATE_WALLET_MATERIAL_PROHIBITED');
   if(typeof val==='object')walk(val);
  }
 };
 walk(payload);
 if(json.length>8192)throw Error('WALLET_PAYLOAD_TOO_LARGE');
 return payload;
}
export async function saveWalletReadiness({filename,value}={}){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!filename.endsWith('.json'))
  throw Error('INVALID_WALLET_FILE');
 rejectPrivateMaterial(value);
 validateWalletReadiness(value);
 await mkdir(path.dirname(filename),{recursive:true});
 // Existing manifest must be valid or no update is allowed. Fail closed on corruption.
 try{validateWalletReadiness(JSON.parse(await readFile(filename,'utf8')))}
 catch(e){if(e?.code!=='ENOENT')throw e}
 const json=JSON.stringify(value)+'\n';
 const tmp=filename+'.tmp-'+randomUUID();
 try{
  await writeFile(tmp,json,{encoding:'utf8',flag:'wx',mode:0o600,flush:true});
  await rename(tmp,filename);
 }catch(e){try{await (await import('node:fs/promises')).unlink(tmp)}catch{}throw e}
 return {saved:true,sha256:createHash('sha256').update(json).digest('hex'),
  account_count:value.accounts.length,signing_enabled:false,live_enabled:false};
}
export async function loadWalletReadiness(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('INVALID_WALLET_FILE');
 try{return validateWalletReadiness(JSON.parse(await readFile(filename,'utf8')))}
 catch(e){if(e?.code==='ENOENT')return emptyWalletReadiness();throw e}
}
