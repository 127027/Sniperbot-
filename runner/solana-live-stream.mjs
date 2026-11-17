// One cost-free PumpPortal WebSocket, no metered subscriptions and NO TRADING.
// Node 22+ built-in WebSocket. One supervised process for the existing .bat starter.
// All messages are UNTRUSTED; only vetted public events reach local research.
import {writeFile,rename,mkdir,open,readFile,unlink} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {attachSupervisedStop} from './supervised-stop.mjs';
import {decodeFreeSolanaStreamEvent,persistFreeSolanaStreamBatch} from './solana-live-events.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const STREAM_URL='wss://pumpportal.fun/api/data';
export const FREE_SUBSCRIPTIONS=Object.freeze(['subscribeNewToken','subscribeMigration']);
const DATA=path.join(ROOT,'.local','solana-live-stream');
const MAX_PENDING=256,RECONNECT_MAX_MS=60000;
const utc=()=>new Date().toISOString();
async function atomic(file,obj){
 await mkdir(path.dirname(file),{recursive:true});
 const tmp=file+'.tmp-'+process.pid;
 await writeFile(tmp,JSON.stringify(obj,null,2)+'\n',{encoding:'utf8',mode:0o600});
 await rename(tmp,file);
}
export function startFreeSolanaStream({folder=DATA,WebSocketImpl=globalThis.WebSocket,
 now=utc,reconnectBaseMs=1000}={}){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||
  typeof WebSocketImpl!=='function'||typeof now!=='function'||
  !Number.isInteger(reconnectBaseMs)||reconnectBaseMs<50||reconnectBaseMs>RECONNECT_MAX_MS)
  throw Error('SOLANA_STREAM_INVALID_CONFIG');
 let stopped=false,socket=null,attempt=0,flushTimer=null,heartbeat=null,pending=[];
 const controller=new AbortController();
 const state={
  schema:'sniper_r29_solana_live_stream_status.v1',
  paper_only:true,actionable:false,
  live_trading_enabled:false,metered_streams_enabled:false,
  source:'PUMPPORTAL_FREE_LAUNCH_MIGRATION',
  status:'STARTING',connected:false,last_connected_at_utc:null,
  last_event_received_at_utc:null,last_persisted_at_utc:null,
  recorded_launch_events:0,recorded_migrations:0,
  rejected_or_control_messages:0,queue_overflow_events:0,
  reconnects:0,unverified_provider_events:true,
  source_complete:false,profitable_trades_proven:false,
  total_paid_subscriptions:0,receipt_count:0,last_error:null
 };
 let writeChain=Promise.resolve();
 let currentBatch=Promise.resolve();
 const persistStatus=()=>{writeChain=writeChain.then(()=>atomic(path.join(folder,'status.json'),
   {...state,status_written_at_utc:now()})).catch(e=>{
    console.error('[SOLANA_WS] status persistence failed',e.message);
   });return writeChain};
 const flush=async()=>{
  if(!pending.length)return currentBatch;
  const items=pending.splice(0,MAX_PENDING);
  currentBatch=currentBatch.then(async()=>{
   const at=now();
   const result=await persistFreeSolanaStreamBatch(items,{folder,now:at});
   if(result.written){
    state.last_persisted_at_utc=at;
    for(const e of items){
     if(e.event_type==='SOLANA_STREAM_NEW_TOKEN')state.recorded_launch_events++;
     else state.recorded_migrations++;
    }
   }
   await persistStatus();
  }).catch(async err=>{
   state.status='BLOCKED_PERSISTENCE';
   state.last_error=String(err.message||'UNKNOWN').slice(0,160);
   stopped=true;
   controller.abort();
   try{socket?.close()}catch{}
   await persistStatus();
  });
  return currentBatch;
 };
 const onMessage=(evt)=>{
  if(stopped)return;
  const raw=evt?.data;
  if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>64000){
   state.rejected_or_control_messages++;return;
  }
  let parsed;
  try{parsed=JSON.parse(raw)}catch{
   state.rejected_or_control_messages++;return;
  }
  if(parsed?.error){
   state.status='PROVIDER_REJECTED';
   state.last_error='REMOTE_PROVIDER_ERROR_OR_AUTHORIZATION_REQUIRED';
   stopped=true;controller.abort();
   try{socket?.close()}catch{}
   void persistStatus();return;
  }
  const lead=decodeFreeSolanaStreamEvent(parsed,{receivedAtUtc:now()});
  if(!lead){state.rejected_or_control_messages++;return}
  state.last_event_received_at_utc=lead.observed_at_utc;
  if(pending.length>=MAX_PENDING){
   state.queue_overflow_events++;state.source_complete=false;
   return;
  }
  pending.push(lead);
 };
 const shutdown=async()=>{
  stopped=true;controller.abort();
  if(flushTimer)clearInterval(flushTimer);
  if(heartbeat)clearInterval(heartbeat);
  try{socket?.close()}catch{}
  await flush();await currentBatch;
  if(state.status!=='BLOCKED_PERSISTENCE'&&state.status!=='PROVIDER_REJECTED')
   state.status='STOPPED';
  state.connected=false;await persistStatus();
 };
 const run=async()=>{
  await mkdir(folder,{recursive:true});await persistStatus();
  flushTimer=setInterval(()=>{void flush()},1000);
  // Inactive stream/half-open TCP is not proof that the market is quiet.
  heartbeat=setInterval(()=>{
   if(stopped||!state.connected)return;
   const last=Date.parse(state.last_event_received_at_utc||state.last_connected_at_utc||'');
   if(Number.isFinite(last)&&Date.now()-last>5*60_000){
    state.status='STALE_FEED_RECONNECTING';
    try{socket?.close()}catch{}
   }
  },30000);
  while(!stopped){
   state.status='CONNECTING';state.connected=false;await persistStatus();
   await new Promise(resolve=>{
    let done=false;
    const finish=()=>{if(done)return;done=true;state.connected=false;resolve()};
    let ws;
    try{ws=new WebSocketImpl(STREAM_URL)}catch(e){
     state.last_error='SOCKET_OPEN_FAILED';finish();return;
    }
    socket=ws;
    ws.addEventListener('open',()=>{
     if(stopped){try{ws.close()}catch{};finish();return}
     attempt=0;
     state.connected=true;state.last_connected_at_utc=now();
     state.status='CONNECTED_FREE_ONLY';state.last_error=null;
     // Never send subscribeTokenTrade or subscribeAccountTrade: both are metered.
     try{
      for(const method of FREE_SUBSCRIPTIONS)ws.send(JSON.stringify({method}));
     }catch(e){state.last_error='SUBSCRIBE_SEND_FAILED';try{ws.close()}catch{}}
     void persistStatus();
    });
    ws.addEventListener('message',onMessage);
    ws.addEventListener('error',()=>{state.last_error='SOCKET_ERROR';finish();
      try{ws.close()}catch{}});
    ws.addEventListener('close',finish);
    controller.signal.addEventListener('abort',()=>{
     try{ws.close()}catch{};finish();
    },{once:true});
   });
   await flush();
   if(stopped)break;
   state.reconnects++;state.status='RECONNECTING';
   await persistStatus();
   const delay=Math.min(RECONNECT_MAX_MS,reconnectBaseMs*2**Math.min(attempt++,6));
   try{await sleep(delay,null,{signal:controller.signal})}catch{break}
  }
  await shutdown();
 };
 return {run,stop:shutdown,getStatus:()=>({...state,pending_events:pending.length})};
}
async function claimSingleStreamInstance(folder){
 const lock=path.join(folder,'stream.pid');
 await mkdir(folder,{recursive:true});
 try{
  const handle=await open(lock,'wx',{mode:0o600});
  await handle.writeFile(String(process.pid));await handle.close();
 }catch(e){
  if(e.code!=='EEXIST')throw e;
  const old=Number((await readFile(lock,'utf8')).trim());
  if(Number.isSafeInteger(old)&&old>0){
   try{process.kill(old,0);throw Error('SOLANA_STREAM_ALREADY_RUNNING')}
   catch(err){if(err.code!=='ESRCH')throw err}
  }
  await unlink(lock);
  const handle=await open(lock,'wx',{mode:0o600});
  await handle.writeFile(String(process.pid));await handle.close();
 }
 return async()=>{
  try{const owner=(await readFile(lock,'utf8')).trim();
   if(owner===String(process.pid))await unlink(lock);
  }catch{}
 };
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const safe=process.env.SNIPER_OFFLINE!=='1'&&
  process.env.SNIPER_SOLANA_STREAM!=='0'&&
  process.env.SNIPER_REAL_TRADING!=='1';
 if(!safe){
  console.log('[SOLANA_WS] disabled by offline/stream/real-mode guard');
 }else{
  let unlock=null;
  try{
   unlock=await claimSingleStreamInstance(DATA);
   const stream=startFreeSolanaStream({folder:DATA});
   attachSupervisedStop(()=>{void stream.stop()});
   process.on('SIGINT',()=>{void stream.stop()});
   process.on('SIGTERM',()=>{void stream.stop()});
   console.log('[SOLANA_WS] only free launches + migrations; no orders, no fees, no key');
   await stream.run();
  }catch(e){console.error('[SOLANA_WS] fatal',e?.message||'UNKNOWN');process.exitCode=1}
  finally{if(unlock)await unlock()}
 }
}
