// R29 free Solana event feed: immutable, public, read-only RESEARCH leads.
// Explicitly NOT prices, order intents, executions, or historical GPT decisions.
// PumpPortal free subscriptions: subscribeNewToken + subscribeMigration ONLY.
import {createHash} from 'node:crypto';
import {appendFile,mkdir,readFile,rename,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';

export const SOLANA_STREAM_SCHEMA='sniper_r29_solana_free_ws_leads.v1';
export const SOLANA_STREAM_PROVIDER='PUMPPORTAL_FREE_LAUNCH_MIGRATION';
export const SOLANA_STREAM_MAX_RECENT=512;
const B58=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SIG=/^[1-9A-HJ-NP-Za-km-z]{64,100}$/;
const T30=30*60*1000,MAX_READ=850_000,MAX_ARCHIVE_DAY=25*1024*1024;
const isISO=x=>typeof x==='string'&&x.endsWith('Z')&&Number.isFinite(Date.parse(x));
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');
export const STREAM_SOURCE_URL='https://pumpportal.fun/data-api/real-time/';

export function decodeFreeSolanaStreamEvent(raw,{receivedAtUtc=new Date().toISOString()}={}){
 if(!isISO(receivedAtUtc)||!raw||typeof raw!=='object'||Array.isArray(raw))
  return null;
 // No trust in undocumented event types, never subscribe to metered trades.
 const kind=raw.txType==='create'?'SOLANA_STREAM_NEW_TOKEN':
  ['migrate','migration'].includes(raw.txType)?'SOLANA_STREAM_MIGRATION':null;
 if(!kind||typeof raw.mint!=='string'||!B58.test(raw.mint)||
  typeof raw.signature!=='string'||!SIG.test(raw.signature))return null;
 const poolCandidate=raw.poolId??raw.poolAddress??raw.pool;
 const poolAddress=typeof poolCandidate==='string'&&B58.test(poolCandidate)?
  poolCandidate:null;
 const id=digest([kind,raw.mint,raw.signature].join('|')).slice(0,32);
 // A public provider's websocket is not a finalized Solana transaction receipt.
 // No onchain timestamp = no latency/22-second performance claim.
 return {
  event_id:'research-alert-'+id,event_type:kind,
  candidate_id:poolAddress?'solana:'+raw.mint+':'+poolAddress:null,
  chain:'solana',token_address:raw.mint,pool_address:poolAddress,
  observed_at_utc:receivedAtUtc,source_event_at_utc:null,
  source_timestamp_quality:'LOCAL_RECEIVE_ONLY',
  source_urls:[STREAM_SOURCE_URL],
  transaction_signature:raw.signature,
  provider:SOLANA_STREAM_PROVIDER,
  chain_finality:'UNVERIFIED_PROVIDER_EVENT',
  probability_pct:null,recommended_action:'INDEPENDENT_FIVE_ROLE_REVIEW',
  unknown_checks:['CHAIN_FINALITY','POOL_IDENTITY_IF_UNKNOWN',
   'UNIQUE_WALLET_ANALYSIS','CONTRACT_SECURITY','LP_CONTROL',
   'EXECUTABLE_BUY_AND_SELL_QUOTES','FEES_AND_SLIPPAGE'],
  paper_only:true,actionable:false,
  warning:'First observed websocket event only. Neither executable order nor proof of positive returns.'
 };
}

export function validateFreeStreamLead(e,{now=Date.now(),maxAgeMs=T30}={}){
 if(!e||!/^research-alert-[a-f0-9]{32}$/.test(e.event_id||'')||
  !['SOLANA_STREAM_NEW_TOKEN','SOLANA_STREAM_MIGRATION'].includes(e.event_type)||
  !B58.test(e.token_address||'')||e.chain!=='solana'||
  (e.pool_address!==null&&!B58.test(e.pool_address||''))||
  e.candidate_id!==(e.pool_address?'solana:'+e.token_address+':'+e.pool_address:null)||
  !SIG.test(e.transaction_signature||'')||
  !isISO(e.observed_at_utc)||Date.parse(e.observed_at_utc)>now||
  now-Date.parse(e.observed_at_utc)>maxAgeMs||
  e.provider!==SOLANA_STREAM_PROVIDER||
  e.chain_finality!=='UNVERIFIED_PROVIDER_EVENT'||
  e.source_timestamp_quality!=='LOCAL_RECEIVE_ONLY'||e.source_event_at_utc!==null||
  e.paper_only!==true||e.actionable!==false||e.probability_pct!==null||
  e.recommended_action!=='INDEPENDENT_FIVE_ROLE_REVIEW'||
  !Array.isArray(e.source_urls)||e.source_urls.length!==1||
  e.source_urls[0]!==STREAM_SOURCE_URL)return false;
 const allowed=new Set(['event_id','event_type','candidate_id','chain','token_address',
  'pool_address','observed_at_utc','source_event_at_utc','source_timestamp_quality',
  'source_urls','transaction_signature','provider','chain_finality','probability_pct',
  'recommended_action','unknown_checks','paper_only','actionable','warning']);
 if(Object.keys(e).some(k=>!allowed.has(k)))return false;
 return Array.isArray(e.unknown_checks)&&e.unknown_checks.length===7&&
  e.unknown_checks.every(x=>typeof x==='string'&&x.length<100)&&
  typeof e.warning==='string'&&e.warning.length<250;
}

async function atomicJSON(file,data){
 await mkdir(path.dirname(file),{recursive:true});
 const tmp=file+'.tmp-'+process.pid;
 await writeFile(tmp,JSON.stringify(data,null,2)+'\n',{encoding:'utf8',mode:0o600});
 await rename(tmp,file);
}
export function emptyFreeSolanaStreamJournal(){
 return {schema:SOLANA_STREAM_SCHEMA,paper_only:true,actionable:false,
  records:[],last_persisted_at_utc:null,
  source_complete:false,execution_supported:false};
}
export async function loadFreeSolanaStreamJournal({folder}={}){
 if(typeof folder!=='string'||!path.isAbsolute(folder))throw Error('STREAM_FOLDER_ABSOLUTE_REQUIRED');
 let bytes;
 try{bytes=await readFile(path.join(folder,'recent.json'))}
 catch(e){if(e.code==='ENOENT')return emptyFreeSolanaStreamJournal();throw e}
 if(bytes.length>MAX_READ)throw Error('STREAM_RECENT_FILE_TOO_LARGE');
 const item=JSON.parse(bytes.toString('utf8'));
 if(item.schema!==SOLANA_STREAM_SCHEMA||item.paper_only!==true||
  item.actionable!==false||!Array.isArray(item.records)||
  item.records.length>SOLANA_STREAM_MAX_RECENT)throw Error('STREAM_UNTRUSTED_RECENT');
 const now=Date.now();
 if(item.records.some(e=>!validateFreeStreamLead(e,{now,maxAgeMs:30*86400_000})))
  throw Error('STREAM_UNTRUSTED_RECENT');
 return item;
}
export async function persistFreeSolanaStreamBatch(events,{folder,
 now=new Date().toISOString(),maxDayBytes=MAX_ARCHIVE_DAY}={}){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||!isISO(now)||
  !Array.isArray(events)||events.length>256||!Number.isInteger(maxDayBytes)||
  maxDayBytes<1024||maxDayBytes>MAX_ARCHIVE_DAY)throw Error('STREAM_INVALID_BATCH');
 if(!events.length)return {written:0,duplicates:0,archive_file:null};
 const t=Date.parse(now);
 if(events.some(e=>!validateFreeStreamLead(e,{now:t,maxAgeMs:30*86400_000})))
  throw Error('STREAM_INVALID_EVENT');
 const before=await loadFreeSolanaStreamJournal({folder});
 const seen=new Set(before.records.map(e=>e.event_id));
 const additions=[];
 for(const e of events){if(seen.has(e.event_id))continue;seen.add(e.event_id);additions.push(e)}
 if(!additions.length)return {written:0,duplicates:events.length,archive_file:null};
 const day=now.slice(0,10);
 const archive=path.join(folder,'archive',day+'.jsonl');
 await mkdir(path.dirname(archive),{recursive:true});
 const lines=additions.map(e=>JSON.stringify(e)).join('\n')+'\n';
 const oldSize=(await stat(archive).catch(e=>{if(e.code==='ENOENT')return {size:0};throw e})).size;
 if(oldSize+Buffer.byteLength(lines)>maxDayBytes)
  throw Error('STREAM_DAILY_ARCHIVE_CAP_REACHED_FAIL_CLOSED');
 // Write archive first: a crash cannot produce an unarchived published lead.
 await appendFile(archive,lines,{encoding:'utf8',mode:0o600});
 const journal={...before,records:[...before.records,...additions].slice(-SOLANA_STREAM_MAX_RECENT),
  last_persisted_at_utc:now};
 await atomicJSON(path.join(folder,'recent.json'),journal);
 return {written:additions.length,duplicates:events.length-additions.length,
  archive_file:archive};
}
export async function readRecentSolanaStreamLeads({folder,now=Date.now(),
 windowMs=60*60_000,limit=24}={}){
 if(!Number.isFinite(now)||!Number.isInteger(windowMs)||windowMs<60_000||
  windowMs>60*60_000||!Number.isInteger(limit)||limit<1||limit>24)
  throw Error('STREAM_READ_BOUND_INVALID');
 const journal=await loadFreeSolanaStreamJournal({folder});
 // On reboot the stream may be stale; never present old observations as current.
 return journal.records.filter(e=>validateFreeStreamLead(e,{now,maxAgeMs:windowMs}))
  .sort((a,b)=>Date.parse(b.observed_at_utc)-Date.parse(a.observed_at_utc))
  .slice(0,limit);
}
