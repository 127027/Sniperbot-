// Full localhost PAPER-only HTTP test; no external market requests or user data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){
 const sock=net.createServer();
 await new Promise((resolve,reject)=>sock.once('error',reject).listen(0,'127.0.0.1',resolve));
 const port=sock.address().port;
 await new Promise(resolve=>sock.close(resolve));
 return port;
}
async function startServer(dir,port,extraEnv={}){
 const child=spawn(process.execPath,[path.join(root,'runner/server.mjs')],{
  cwd:root,env:{...process.env,SNIPER_DATA_DIR:dir,SNIPER_PORT:String(port),SNIPER_OFFLINE:'1',...extraEnv},
  stdio:['ignore','pipe','pipe']
 });
 let output='';child.stdout.on('data',buf=>output+=buf.toString());child.stderr.on('data',buf=>output+=buf.toString());
 for(let n=0;n<60;n++){
  if(child.exitCode!==null)throw Error('Runner beendet: '+output);
  try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return child;}catch{}
  await wait(75);
 }
 child.kill();throw Error('Runner nicht erreichbar: '+output);
}
async function stopServer(child){
 if(child.exitCode!==null)return;
 const closed=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');
 await Promise.race([closed,wait(3000).then(()=>{if(child.exitCode===null)child.kill('SIGKILL')})]);
}

test('Windows-paper-runner: EUR credit, paused entries, hold, auto-exit while OFF and restart',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'sniper-paper-e2e-'));
 const port=await freePort();
 let child;
 const base=`http://127.0.0.1:${port}`;
 const get=async()=>{const r=await fetch(`${base}/api/state`);assert.equal(r.status,200);return (await r.json()).state};
 const cmd=async(input,expected=200)=>{
  const r=await fetch(`${base}/api/command`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
  assert.equal(r.status,expected,`${input.type}: unexpected HTTP ${r.status}`);
  return r.json();
 };
 try{
  child=await startServer(temp,port);
  assert.equal((await get()).cashEur,0);
  await cmd({type:'DEPOSIT',eur:50});
  await cmd({type:'DEMO_SIGNAL'});
  await cmd({type:'BUY',id:'demo:signal-1',amount:50},422);
  await cmd({type:'TOGGLE_BOT'});
  await cmd({type:'BUY',id:'demo:signal-1',amount:50});
  let state=await get();
  assert.equal(state.cashEur,0);
  assert.equal(state.positions.length,1);
  assert.equal(state.positions[0].exitMode,'HOLD');
  const positionId=state.positions[0].id;
  await cmd({type:'TOGGLE_BOT'});
  await cmd({type:'SET_EXITS',mode:'AUTO',profit:10,loss:10});
  await cmd({type:'DEMO_MOVE',id:positionId,percent:20});
  state=await get();
  assert.equal(state.entriesEnabled,false);
  assert.equal(state.positions.length,0,'Exit continues while entries disabled');
  assert(state.cashUsdc>50,'Simulated gain should remain in TEST-USDC');
  assert(state.history.some(h=>h.title==='AUTO-EXIT trotz Bot AUS'));
  const cash=state.cashUsdc;
  await stopServer(child);child=null;
  child=await startServer(temp,port);
  state=await get();
  assert.equal(state.cashUsdc,cash,'Paper state should persist across restart');
  const raw=JSON.parse(await readFile(path.join(temp,'paper-state-v03.json'),'utf8'));
  assert.equal(raw.cashUsdc,cash);
  await cmd({type:'NOT_SUPPORTED'},400);
 }finally{if(child)await stopServer(child);await rm(temp,{recursive:true,force:true})}
});


test('R29 V4.7 explicit Paper entry OFF is idempotent, persists, and GPT follow stays independent',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'sniper-v47-off-'));
 const port=await freePort();
 const base=`http://127.0.0.1:${port}`;
 let child;
 const command=async(input,expected=200)=>{
  const response=await fetch(base+'/api/command',{
   method:'POST',headers:{origin:base,'content-type':'application/json'},
   body:JSON.stringify(input)});
  assert.equal(response.status,expected,'HTTP '+input.type);
  return response.json();
 };
 const status=async()=>{
  const response=await fetch(base+'/api/gpt/paper/status');
  assert.equal(response.status,200);
  return response.json();
 };
 try{
  child=await startServer(temp,port);
  assert.equal((await status()).paper_bot_enabled,false);
  const disabled=await command({type:'SET_BOT_ENTRIES',enabled:false});
  assert.equal(disabled.entries_enabled,false);
  assert.equal(disabled.already_set,true);
  assert.equal((await command({type:'SET_BOT_ENTRIES',enabled:true})).entries_enabled,true);
  assert.equal((await command({type:'SET_BOT_ENTRIES',enabled:true})).already_set,true);
  await command({type:'SET_GPT_FOLLOW',enabled:true});
  const paused=await command({type:'SET_BOT_ENTRIES',enabled:false});
  assert.equal(paused.entries_enabled,false);
  assert.equal((await command({type:'SET_BOT_ENTRIES',enabled:false})).already_set,true);
  const summary=await status();
  assert.equal(summary.paper_bot_enabled,false);
  assert.equal(summary.gpt_follow_enabled,true);
  assert.equal(summary.gpt_exit_monitor_heartbeat_recent,false,
   'Offline CI cannot claim a continuously ticking market-connected monitor');
  assert.equal(summary.gpt_exit_monitor_last_outcome,'NOT_YET_CHECKED');
  assert.equal(summary.real_trading_enabled,false);
  await command({type:'SET_BOT_ENTRIES',enabled:'false'},422);
  await command({type:'GPT_SIGNED_BUY',id:'anything',amount:5},400);
  // Internal signer-only action may NEVER be exposed as a public HTTP command.
  await command({type:'SET_BOT_ENTRIES',enabled:false,unexpected:true},422);
  assert.equal((await status()).paper_bot_enabled,false);
  await stopServer(child);child=null;
  child=await startServer(temp,port);
  assert.equal((await status()).paper_bot_enabled,false,
   'explicit pause must survive process restart');
  assert.equal((await status()).gpt_follow_enabled,true,
   'existing GPT strategic feed must stay on');
 }finally{if(child)await stopServer(child);await rm(temp,{recursive:true,force:true})}
});

test('R29 V4.9 authenticated local-only dual account report re-reads changed Paper settings and keeps real account locked',async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'sniper-v49-private-dual-'));
 const port=await freePort(),base=`http://127.0.0.1:${port}`;
 const secret='f'.repeat(64);
 let child;
 const query=async(headers={})=>fetch(base+'/api/gpt/private/bot-state',{headers});
 const cmd=async(action)=>{
  const res=await fetch(base+'/api/command',{method:'POST',
   headers:{'content-type':'application/json'},body:JSON.stringify(action)});
  assert.equal(res.status,200);return res.json();
 };
 try{
  child=await startServer(temp,port,{
   SNIPER_GPT_PAPER_BRIDGE:'1',SNIPER_GPT_BRIDGE_SECRET:secret
  });
  assert.equal((await query()).status,403);
  assert.equal((await query({'x-sniper-gpt-bridge':'e'.repeat(64)})).status,403);
  assert.equal((await query({'x-sniper-gpt-bridge':secret,origin:base})).status,403);
  const ok=await query({'x-sniper-gpt-bridge':secret});
  assert.equal(ok.status,200);
  const first=await ok.json();
  assert.equal(first.private_delivery_only,true);
  assert.equal(first.remote_gpt_delivery_verified,false);
  assert.equal(first.snapshot.paper.preferred_entry_test_usdc,50);
  assert.equal(first.snapshot.real.preferred_entry_usdc,null);
  assert.equal(first.snapshot.real.available_for_new_buy_usdc,null);
  assert.equal(first.snapshot.real.live_gate_locked,true);
  assert.equal(first.snapshot.real.execution_enabled,false);
  assert.equal(first.transaction_sent,false);
  await cmd({type:'SET_RANGE',min:75,max:3400});
  const loaded=await (await query({'x-sniper-gpt-bridge':secret})).json();
  assert.equal(loaded.snapshot.paper.preferred_entry_test_usdc,75);
  assert.equal(loaded.snapshot.paper.user_total_open_exposure_limit_test_usdc,3400);
  await cmd({type:'SET_RANGE',min:35,max:20});
  const unchanged=await (await query({'x-sniper-gpt-bridge':secret})).json();
  assert.equal(unchanged.snapshot.paper.local_state_revision,
   loaded.snapshot.paper.local_state_revision,'invalid settings must fail, not overwrite');
  await cmd({type:'SET_RANGE',min:35,max:3400});
  const changed=await (await query({'x-sniper-gpt-bridge':secret})).json();
  assert.equal(changed.snapshot.paper.preferred_entry_test_usdc,35);
  assert.notEqual(changed.snapshot.paper.local_state_revision,loaded.snapshot.paper.local_state_revision);
  assert.equal(changed.snapshot.real.local_state_revision,loaded.snapshot.real.local_state_revision);
  const publicContext=await (await fetch(base+'/api/gpt/paper/context')).text();
  assert(!publicContext.includes('local_state_revision'));
  assert(!publicContext.includes('preferred_entry'));
  assert(!publicContext.includes('available_virtual_balance'));
  const live=await (await fetch(base+'/api/trading/live-mode')).json();
  assert.equal(live.gate.enabled,false);
  assert.equal(live.gate.can_enable,false);
  assert.equal((await fetch(base+'/api/trading/live-mode',{
   method:'POST',headers:{origin:base,'content-type':'application/json'},
   body:JSON.stringify({enabled:true})})).status,423);
  assert.equal((await (await query({'x-sniper-gpt-bridge':secret})).json())
   .snapshot.real.execution_enabled,false);
 }finally{if(child)await stopServer(child);await rm(temp,{recursive:true,force:true})}
});
