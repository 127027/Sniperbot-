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
async function startServer(dir,port){
 const child=spawn(process.execPath,[path.join(root,'runner/server.mjs')],{
  cwd:root,env:{...process.env,SNIPER_DATA_DIR:dir,SNIPER_PORT:String(port),SNIPER_OFFLINE:'1'},
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
