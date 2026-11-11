// End-to-end signed agent -> actual local HTTP server -> paper BUY -> price up
// -> paper SELL -> visible position/receipt. No real Dots, no live money:
// publisher and market quote are EPHEMERAL QA fixtures in a disposable dir.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {generateKeyPairSync,sign} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {encodeBase58} from './local-solana-vault.mjs';
import {AGENT_SIGNAL_SCHEMA,unsignedAgentSignal} from './paper-agent-pipeline.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-paper-agent-e2e-'));
let child;
const tokenMint=encodeBase58(Buffer.alloc(32,22)),pool=encodeBase58(Buffer.alloc(32,23));
const keys=generateKeyPairSync('ed25519');
const pub=keys.publicKey.export({format:'pem',type:'spki'});
let lastErr='';
const freePort=async()=>{
 const s=net.createServer();
 await new Promise(r=>s.listen(0,'127.0.0.1',r));
 const p=s.address().port;
 await new Promise(r=>s.close(r));
 return p;
};
try{
 const port=await freePort(),base='http://127.0.0.1:'+port;
 child=spawn(process.execPath,[path.join(root,'runner','server.mjs')],{
  cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],
  env:{...process.env,SNIPER_PORT:String(port),SNIPER_DATA_DIR:dir,
   SNIPER_OFFLINE:'1',SNIPER_PIPELINE_QA:'1',
   SNIPER_LOCAL_DISCOVERY:'0',SNIPER_RESEARCH_READ:'0',SNIPER_RESEARCH_FEED:'0'}
 });
 child.stderr.on('data',x=>{lastErr=(lastErr+x.toString()).slice(-3000)});
 const request=async(p,{method='GET',obj=null,headers={}}={})=>{
  const r=await fetch(base+p,{method,headers:{
   ...(obj?{'content-type':'application/json'}:{}),...headers},
   ...(obj?{body:JSON.stringify(obj)}:{})});
  return {status:r.status,data:await r.json()};
 };
 let up=false;
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw Error('LOCAL_SERVER_EXIT '+lastErr);
  try{if((await request('/api/health')).status===200){up=true;break}}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 assert(up,'local paper server unavailable '+lastErr);
 const identity=(await request('/api/device/identity')).data.device.device_id;
 const pairing=await request('/api/device/topology',{method:'POST',
  headers:{origin:base},obj:{mode:'MASTER'}});
 assert.equal(pairing.status,201);
 const auth=JSON.parse(await readFile(path.join(dir,'gateway-credentials.json'),'utf8'))
  .find(x=>x.role==='risk_controller').token;
 await writeFile(path.join(dir,'trusted-execution-publishers.json'),JSON.stringify([{
  issuer:'ephemeral-ci-dot',key_id:'ephemeral-ci-key',
  scope:'agent_execution',public_key_pem:pub
 }]),{mode:0o600});
 const signed=(action,id,usdc)=>{
  const now=Date.now();
  const payload={schema:AGENT_SIGNAL_SCHEMA,target_device_id:identity,
   signal_id:'sig_'+id.repeat(32),issuer:'ephemeral-ci-dot',key_id:'ephemeral-ci-key',
   chain:'solana',action,token_address:tokenMint,pool_address:pool,
   size_test_usdc:usdc,created_at_utc:new Date(now-500).toISOString(),
   expires_at_utc:new Date(now+55000).toISOString()};
  return {...payload,signature:sign(null,Buffer.from(unsignedAgentSignal(payload)),keys.privateKey).toString('base64')};
 };
 const quote=price=>({chain:'solana',tokenAddress:tokenMint,poolAddress:pool,
  priceUsd:price,liquidityUsd:100000,symbol:'E2E',name:'Ephemeral Test Coin',
  asOf:new Date().toISOString()});
 const submit=async(command,price)=>request('/api/paper/agent-orders',{
  method:'POST',headers:{authorization:'Bearer '+auth},
  obj:{command,qa_quote:quote(price)}});
 const unauth=await request('/api/paper/agent-orders',{
  method:'POST',obj:{command:signed('BUY','0','50.00'),qa_quote:quote(0.05)}});
 assert.equal(unauth.status,401);
 const deposit=await request('/api/command',{method:'POST',
  headers:{origin:base},obj:{type:'DEPOSIT',eur:50}});
 assert.equal(deposit.status,200);
 const on=await request('/api/command',{method:'POST',
  headers:{origin:base},obj:{type:'TOGGLE_BOT'}});
 assert.equal(on.status,200);
 const signal=signed('BUY','1','50.00');
 const buy=await submit(signal,0.05);
 assert.equal(buy.status,200,JSON.stringify(buy.data));
 assert.equal(buy.data.receipt.status,'PAPER_FILLED');
 assert.equal(buy.data.receipt.real_trade_executed,false);
 const afterBuy=(await request('/api/state')).data.state;
 assert.equal(afterBuy.positions.length,1);
 assert.equal(afterBuy.cashEur,0);
 assert.equal(afterBuy.positions[0].tokenAddress,tokenMint);
 assert.equal(afterBuy.positions[0].status,'PAPER_ONLY');
 const duplicate=await submit(signal,0.05);
 assert.equal(duplicate.data.receipt.duplicate,true);
 assert.equal((await request('/api/state')).data.state.positions.length,1);
 const sell=await submit(signed('SELL','2',null),0.1);
 assert.equal(sell.status,200,JSON.stringify(sell.data));
 assert.equal(sell.data.receipt.status,'PAPER_FILLED');
 const afterSell=(await request('/api/state')).data.state;
 assert.equal(afterSell.positions.length,0);
 assert(afterSell.closedPnl>0);
 assert(afterSell.cashUsdc>50);
 const summary=(await request('/api/paper/agent-orders')).data;
 assert.equal(summary.paper_filled,2);
 assert.equal(summary.received,2);
 assert.equal(summary.signed_publisher_configured,true);
 assert.equal(summary.research_dots_direct_publisher_connected,false);
 const gate=(await request('/api/trading/live-mode')).data.gate;
 assert.equal(gate.enabled,false);
 const forbidden=await request('/api/trading/live-mode',{method:'POST',
  headers:{origin:base},obj:{enabled:true}});
 assert.equal(forbidden.status,423);
 console.log('SIGNED_AGENT_REAL_SERVER_PAPER_ROUNDTRIP_OK',JSON.stringify({
  temporary_publisher:true,direct_real_dots_connected:false,real_money_spent:false,
  signal_count:summary.received,paper_fills:summary.paper_filled,
  buy_receipt:buy.data.receipt.status,sell_receipt:sell.data.receipt.status,
  paper_closed_pnl:afterSell.closedPnl,live_remains_locked:true}));
}catch(e){
 console.error('SIGNED_AGENT_PAPER_E2E_FAIL',e?.stack||e,lastErr);
 process.exitCode=1;
}finally{
 if(child){child.kill('SIGTERM');
  await new Promise(resolve=>{
   if(child.exitCode!==null)return resolve();
   child.once('exit',resolve);setTimeout(resolve,3000).unref()
  });if(child.exitCode===null)child.kill('SIGKILL')}
 await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
