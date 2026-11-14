// Start the ACTUAL bot in an isolated FOLLOWER installation with no network.
// Without the laptop master connection, only deposit/withdraw PAPER actions may
// be accepted; all buy/sell, signed agents and auto-trading must fail closed.
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {generateKeyPairSync} from 'node:crypto';
import os from 'node:os';import path from 'node:path';import net from 'node:net';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadOrCreateDeviceIdentity} from './device-identity.mjs';
import {installLocalDeviceTopology} from './device-topology.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tmp=await mkdtemp(path.join(os.tmpdir(),'sniper-follower-offline-'));
const id=loadOrCreateDeviceIdentity(tmp).device_id;
const master='device_'+'a'.repeat(32);
const {publicKey}=generateKeyPairSync('ed25519');
installLocalDeviceTopology({dir:tmp,deviceId:id,mode:'FOLLOWER',
 masterDeviceId:master,masterPublicKeyPem:publicKey.export({format:'pem',type:'spki'})});
async function portFree(){
 const server=net.createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const p=server.address().port;
 await new Promise(resolve=>server.close(resolve));return p;
}
let child;
try{
 const port=await portFree();
 child=spawn(process.execPath,[path.join(root,'runner','server.mjs')],{
  cwd:root,env:{...process.env,SNIPER_DATA_DIR:tmp,SNIPER_PORT:String(port),
   SNIPER_OFFLINE:'1',SNIPER_LOCAL_DISCOVERY:'0',SNIPER_RESEARCH_FEED:'0',
   SNIPER_RESEARCH_READ:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true
 });
 let logs='';child.stderr.on('data',x=>logs+=x.toString().slice(0,1000));
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<80;i++){
  if(child.exitCode!==null)throw Error('FOLLOWER_SERVER_EXIT '+logs);
  try{const x=await fetch(base+'/api/health');if(x.ok)break}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 const stat=await (await fetch(base+'/api/coordination/status')).json();
 assert.equal(stat.topology_role,'FOLLOWER');
 assert.equal(stat.local_device_id,id);
 assert.equal(stat.master.coordination_online,false);
 assert.equal(stat.master.message,'Keine Verbindung – ruf Andreas an');
 assert.equal(stat.live_trading_enabled,false);
 const stateBefore=await (await fetch(base+'/api/state')).json();
 const command=async p=>fetch(base+'/api/command',{
  method:'POST',headers:{origin:base,'content-type':'application/json'},
  body:JSON.stringify(p)});
 for(const forbidden of [
  {type:'BUY',id:'demo-test',amount:50},{type:'SELL',id:'test'},
  {type:'SET_AUTO',enabled:true},{type:'EXCHANGE',eur:5},
  {type:'EXCHANGE_BACK',usdc:5},{type:'SCAN'},{type:'RESET'}]){
  const r=await command(forbidden);
  assert.equal(r.status,409,forbidden.type);
 }
 const followerV2=await fetch(base+'/api/execution/route-v2',{method:'POST',
  headers:{'authorization':'Bearer '+
   JSON.parse(await readFile(path.join(tmp,'gateway-credentials.json'),'utf8'))
    .find(k=>k.role==='risk_controller').token,
   'content-type':'application/json'},body:'{}'});
 assert.equal(followerV2.status,409,'follower cannot accept live-scope trade v2');
 const oldAgent=await fetch(base+'/api/decisions/events',{method:'POST',
  headers:{'content-type':'application/json'},body:'{}'});
 assert.equal(oldAgent.status,409);
 const registry=JSON.parse(await readFile(path.join(tmp,'gateway-credentials.json'),'utf8'));
 const risk=registry.find(x=>x.role==='risk_controller');
 const agent=await fetch(base+'/api/execution/instructions',{method:'POST',
  headers:{authorization:'Bearer '+risk.token,'content-type':'application/json'},
  body:'{}'});
 assert.equal(agent.status,409);
 const funding=await command({type:'DEPOSIT',eur:50});
 assert.equal(funding.status,200,'offline follower may deposit virtual EUR for now');
 const payout=await command({type:'WITHDRAW',eur:20});
 assert.equal(payout.status,200,'offline follower may withdraw virtual EUR for now');
 const after=(await (await fetch(base+'/api/state')).json()).state;
 assert.equal(after.cashEur,30);
 assert.equal(after.cashUsdc,stateBefore.state.cashUsdc);
 assert.equal(after.positions.length,stateBefore.state.positions.length);
 console.log('FOLLOWER_OFFLINE_SERVER_OK: cash only, zero buys/sells/agents/paper position change');
}finally{
 if(child){
  child.kill('SIGTERM');
  await new Promise(resolve=>{if(child.exitCode!==null)return resolve();
   child.once('exit',resolve);setTimeout(resolve,4500).unref()});
  if(child.exitCode===null)child.kill('SIGKILL');
 }
 await rm(tmp,{recursive:true,force:true,maxRetries:6,retryDelay:150});
}
