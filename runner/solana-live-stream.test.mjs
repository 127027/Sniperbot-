import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {
 decodeFreeSolanaStreamEvent,validateFreeStreamLead,loadFreeSolanaStreamJournal,
 persistFreeSolanaStreamBatch,readRecentSolanaStreamLeads
} from './solana-live-events.mjs';
import {FREE_SUBSCRIPTIONS,startFreeSolanaStream,STREAM_URL} from './solana-live-stream.mjs';

const mint='9'.repeat(44),pool='8'.repeat(44),signature='2'.repeat(88);
const now='2026-11-17T15:00:00.000Z';
const raw={txType:'create',mint,signature};
const launch=()=>decodeFreeSolanaStreamEvent(raw,{receivedAtUtc:now});
const migrate=()=>decodeFreeSolanaStreamEvent({
 txType:'migrate',mint,signature:'3'.repeat(88),poolId:pool
},{receivedAtUtc:now});
const dir=()=>mkdtemp(path.join(tmpdir(),'sniper-free-ws-'));
test('free provider events have a mint, signature, first-receive time and no fills or fake latency',()=>{
 const a=launch(),b=migrate();
 assert.equal(a.event_type,'SOLANA_STREAM_NEW_TOKEN');
 assert.equal(a.pool_address,null);
 assert.equal(a.source_event_at_utc,null);
 assert.equal(a.source_timestamp_quality,'LOCAL_RECEIVE_ONLY');
 assert.equal(b.event_type,'SOLANA_STREAM_MIGRATION');
 assert.equal(b.pool_address,pool);
 assert.equal(b.candidate_id,'solana:'+mint+':'+pool);
 assert.equal(a.actionable,false);
 assert.equal(b.paper_only,true);
 assert.equal(b.probability_pct,null);
 assert.equal(b.recommended_action,'INDEPENDENT_FIVE_ROLE_REVIEW');
 assert.equal(validateFreeStreamLead(a,{now:Date.parse(now)}),true);
});
test('unknown trades, untrusted identities, missing chain signature and bogus control payloads are ignored',()=>{
 for(const x of [
  {txType:'buy',mint,signature},
  {txType:'sell',mint,signature},
  {txType:'create',mint:'malicious',signature},
  {txType:'create',mint,signature:'missing'},
  {method:'subscribeTokenTrade',keys:[mint]},
  {message:'Successfully subscribed'}
 ])assert.equal(decodeFreeSolanaStreamEvent(x,{receivedAtUtc:now}),null);
 assert.equal(validateFreeStreamLead({...launch(),actionable:true},{now:Date.parse(now)}),false);
 assert.equal(validateFreeStreamLead({...launch(),stake_test_usdc:5000},{now:Date.parse(now)}),false);
});
test('local journal preserves public leads on restart; duplicates not counted twice; no state or wallet touched',async()=>{
 const folder=await dir(),paper=path.join(folder,'paper-state-v03.json');
 try{
  await mkdir(folder,{recursive:true});
  const {writeFile}=await import('node:fs/promises');
  await writeFile(paper,'{"cashUsdc":5000}');
  const a=launch(),b=migrate();
  const first=await persistFreeSolanaStreamBatch([a,b],{folder,now});
  assert.equal(first.written,2);
  const dup=await persistFreeSolanaStreamBatch([a],{folder,now});
  assert.equal(dup.written,0);
  const recent=await readRecentSolanaStreamLeads({folder,now:Date.parse(now)});
  assert.deepEqual(new Set(recent.map(x=>x.event_type)),
   new Set(['SOLANA_STREAM_NEW_TOKEN','SOLANA_STREAM_MIGRATION']));
  assert.equal((await loadFreeSolanaStreamJournal({folder})).records.length,2);
  assert.equal((await readFile(first.archive_file,'utf8')).trim().split('\n').length,2);
  assert.equal(await readFile(paper,'utf8'),'{"cashUsdc":5000}');
  assert.equal((await readRecentSolanaStreamLeads({folder,now:Date.parse(now)+61*60000})).length,0);
 }finally{await rm(folder,{recursive:true,force:true})}
});
test('fails closed at local archive cap rather than silently losing evidence',async()=>{
 const folder=await dir();
 try{
  const e=launch();
  await assert.rejects(persistFreeSolanaStreamBatch([e],{
   folder,now,maxDayBytes:1024
  }),/STREAM_DAILY_ARCHIVE_CAP_REACHED/);
 }finally{await rm(folder,{recursive:true,force:true})}
});
test('only two free streaming subscriptions exist, one socket and no paid token/account feeds',async()=>{
 assert.equal(STREAM_URL,'wss://pumpportal.fun/api/data');
 assert.deepEqual([...FREE_SUBSCRIPTIONS],['subscribeNewToken','subscribeMigration']);
 const folder=await dir(),sent=[],sockets=[];
 class FakeWS {
  constructor(url){assert.equal(url,STREAM_URL);this.handlers=new Map();sockets.push(this);
   queueMicrotask(()=>this.fire('open',{}))}
  addEventListener(name,fn){const arr=this.handlers.get(name)||[];arr.push(fn);this.handlers.set(name,arr)}
  send(payload){sent.push(JSON.parse(payload))}
  fire(name,evt){for(const f of this.handlers.get(name)||[])f(evt)}
  close(){this.fire('close',{})}
 }
 const stream=startFreeSolanaStream({folder,WebSocketImpl:FakeWS,reconnectBaseMs:50});
 try{
  const loop=stream.run();
  for(let i=0;i<60&&sockets.length===0;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(sockets.length,1);
  for(let i=0;i<30&&sent.length<2;i++)await new Promise(r=>setTimeout(r,10));
  assert.deepEqual(sent,[{method:'subscribeNewToken'},{method:'subscribeMigration'}]);
  sockets[0].fire('message',{data:JSON.stringify(raw)});
  await stream.stop();
  await loop;
  const s=stream.getStatus();
  assert.equal(s.live_trading_enabled,false);
  assert.equal(s.total_paid_subscriptions,0);
  assert.equal(s.recorded_launch_events,1);
  const stored=await loadFreeSolanaStreamJournal({folder});
  assert.equal(stored.records.length,1);
 }finally{await rm(folder,{recursive:true,force:true})}
});
