// Local shared research scratchpad for future Dots. Not a trade channel.
// Distinct from wallet, payment details and paper portfolio.
// Authenticated local agent roles only; each record is bounded and expires.
// Shared notes are deliberately UNSIGNED and NON-ACTIONABLE.
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';

const ALLOWED_ROLES=new Set(['news_discovery','social_acceleration','onchain_liquidity',
 'contract_security','opportunity_qa','risk_controller']);
const KEY=/^[a-z0-9][a-z0-9_.-]{0,63}$/;
const FORBIDDEN=/(private.?key|seed|mnemonic|passphrase|password|api.?key|secret|bearer|paypal|payment.?method|card.?number|cvv|auth.?token|bank.?account|iban)/i;
const VALID_TTL=24*60*60*1000;
const MAX_BYTES=4096;
function validateRecord(a){
 if(!a||typeof a!=='object'||Array.isArray(a))throw Error('INVALID_SCRATCHPAD_ENTRY');
 const fields=['key','value','visibility','ttl_minutes'];
 if(Object.keys(a).length!==fields.length||fields.some(k=>!Object.hasOwn(a,k))||
  typeof a.key!=='string'||!KEY.test(a.key)||
  !['shared','role_only'].includes(a.visibility)||
  !Number.isInteger(a.ttl_minutes)||a.ttl_minutes<1||a.ttl_minutes>1440||
  !a.value||typeof a.value!=='object'||Array.isArray(a.value))
  throw Error('INVALID_SCRATCHPAD_ENTRY');
 const serialized=JSON.stringify(a.value);
 if(Buffer.byteLength(serialized,'utf8')>MAX_BYTES)throw Error('SCRATCHPAD_ENTRY_TOO_LARGE');
 const inspect=x=>{
  if(!x||typeof x!=='object')return;
  for(const [key,value] of Object.entries(x)){
   if(FORBIDDEN.test(key))throw Error('PRIVATE_MATERIAL_NOT_PERMITTED');
   if(typeof value==='object')inspect(value);
  }
 };
 inspect(a.value);
 // A research note never changes bot execution status regardless of its own content.
 return a;
}
const validRole=r=>ALLOWED_ROLES.has(r);
const empty=()=>({schema:'local_agent_scratchpad.v1',paper_only:true,actionable:false,records:[]});
export function visibleScratchpad(database,role,{now=Date.now()}={}){
 if(!validRole(role))throw Error('UNAUTHORIZED_AGENT_ROLE');
 const items=database?.records;
 if(database?.schema!=='local_agent_scratchpad.v1'||database?.paper_only!==true||
  database?.actionable!==false||!Array.isArray(items)||items.length>128)
  throw Error('CORRUPT_AGENT_SCRATCHPAD');
 return items.filter(x=>Date.parse(x.expires_at_utc)>now&&
  (x.visibility==='shared'||x.owner_role===role)).map(x=>({
   owner_role:x.owner_role,key:x.key,value:x.value,visibility:x.visibility,
   updated_at_utc:x.updated_at_utc,expires_at_utc:x.expires_at_utc,
   paper_only:true,actionable:false
  }));
}
export async function createAgentScratchpad(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!filename.endsWith('.json'))
  throw Error('INVALID_SCRATCHPAD_FILE');
 const load=async()=>{
  try{const raw=await readFile(filename);
   if(raw.length>600*1024)throw Error('SCRATCHPAD_FILE_TOO_LARGE');
   const db=JSON.parse(raw.toString('utf8'));
   visibleScratchpad(db,'news_discovery');return db;
  }catch(e){if(e?.code==='ENOENT')return empty();throw e}
 };
 let writer=Promise.resolve();
 const put=({role,entry,now=Date.now()}={})=>{
  const work=async()=>{
   if(!validRole(role))throw Error('UNAUTHORIZED_AGENT_ROLE');
   const v=validateRecord(entry);
   if(!Number.isFinite(now))throw Error('INVALID_SCRATCHPAD_TIME');
   const db=await load();
   const kept=db.records.filter(x=>Date.parse(x.expires_at_utc)>now&&
      !(x.owner_role===role&&x.key===v.key));
   if(kept.length>=128)throw Error('SCRATCHPAD_FULL');
   const record={owner_role:role,key:v.key,visibility:v.visibility,
    value:v.value,updated_at_utc:new Date(now).toISOString(),
    expires_at_utc:new Date(now+v.ttl_minutes*60000).toISOString()};
   const next={...empty(),records:[...kept,record]};
   await mkdir(path.dirname(filename),{recursive:true});
   const temp=filename+'.tmp-'+randomUUID();
   try{
    await writeFile(temp,JSON.stringify(next)+'\n',{flag:'wx',mode:0o600});
    await rename(temp,filename);
   }finally{await unlink(temp).catch(()=>{})}
   return {ok:true,owner_role:role,key:v.key,visibility:v.visibility,
    expires_at_utc:record.expires_at_utc,paper_only:true,actionable:false};
  };
  const result=writer.then(work);writer=result.catch(()=>{});return result;
 };
 return {put,get:async({role,now=Date.now()}={})=>
  ({schema:'local_agent_scratchpad_view.v1',paper_only:true,actionable:false,
   records:visibleScratchpad(await load(),role,{now})})};
}
