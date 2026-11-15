// Real server localhost integration; fully disposable offline data directory.
// Runs actual POST /api/command DEMO_SIGNAL/BUY/SELL, not a fake fetcher.
// Never uses the user's laptop/account, exchange, GitHub token, or OpenAI API.
import {mkdtemp,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {freshR29MainCycle,processR29MainIntent,R29_MAIN_INTENT_SCHEMA} from './r29-main-paper-demo.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folder=await mkdtemp(path.join(os.tmpdir(),'sniper-r29-main-paper-e2e-'));
const origin='http://127.0.0.1:3030';
let bot=null,err='';
async function cmd(command){
 const res=await fetch(origin+'/api/command',{
  method:'POST',redirect:'error',
  headers:{'origin':origin,'content-type':'application/json'},
  body:JSON.stringify(command)});
 const d=await res.json();
 assert(res.ok&&d.ok===true,'R29_E2E_LOCAL_COMMAND_NOT_ACCEPTED '+JSON.stringify(d).slice(0,200));
 return d.state;
}
async function readState(){
 const r=await fetch(origin+'/api/state');
 const d=await r.json();
 assert(r.ok&&d.ok===true&&d.mode==='PAPER_ONLY');
 return d.state;
}
const intent=(action,hex)=>({
 schema:R29_MAIN_INTENT_SCHEMA,target:'MAIN_PAPER_DEMO',
 mode:'PAPER_ONLY',asset:'R29_FIXED_TEST_COIN',
 intent_id:'r29main_'+hex.repeat(32),action,
 amount_test_usdc:action==='BUY'?'50.00':null,
 created_at_utc:new Date(Date.now()-3000).toISOString(),
 expires_at_utc:new Date(Date.now()+10*60*1000).toISOString(),
 reason:'R29 actual isolated offline localhost demonstration validation'
});
try{
 bot=spawn(process.execPath,[path.join(root,'runner','server.mjs')],{
  cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],
  env:{...process.env,
   SNIPER_PORT:'3030',SNIPER_DATA_DIR:folder,SNIPER_OFFLINE:'1',
   SNIPER_RESEARCH_READ:'0',SNIPER_RESEARCH_FEED:'0',
   SNIPER_LOCAL_DISCOVERY:'0',SNIPER_AGENT_PAPER_FEED:'0',
   SNIPER_CENTRAL_AI_ENABLED:'0',SNIPER_OPENAI_API_KEY:'',
   SNIPER_R29_MAIN_PAPER_DEMO:'0'}
 });
 bot.stderr.on('data',data=>err=(err+String(data)).slice(-1300));
 let up=false;
 for(let i=0;i<100;i++){
  if(bot.exitCode!==null)throw Error('R29_DEMO_TEST_SERVER_EXIT '+err);
  try{
   const r=await fetch(origin+'/api/health');
   if(r.ok){up=true;break}
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,120));
 }
 assert(up,'R29_DEMO_TEST_SERVER_NOT_READY '+err);
 assert.equal((await readState()).positions.length,0);
 await cmd({type:'SET_PAPER_BALANCE',amount:5000});
 await cmd({type:'TOGGLE_BOT'});
 let cycle=freshR29MainCycle();
 const buy=await processR29MainIntent(cycle,intent('BUY','a'));
 cycle=buy.cycle;
 assert.equal(buy.receipt.status,'PAPER_FILLED');
 const opened=await readState();
 assert.equal(opened.positions.length,1);
 assert.equal(opened.positions[0].symbol,'TEST');
 assert.equal(opened.positions[0].isDemo,true);
 assert.equal(opened.cashUsdc,4950);
 assert(opened.history.some(e=>e.title==='TEST-KAUF'),'actual main display history should log the BUY');
 const sell=await processR29MainIntent(cycle,intent('SELL','b'));
 assert.equal(sell.receipt.status,'PAPER_FILLED');
 const closed=await readState();
 assert.equal(closed.positions.length,0);
 assert.equal(closed.cashUsdc,4999.005);
 assert.equal(closed.closedPnl,-0.995);
 assert(closed.history.some(e=>e.title==='TEST-VERKAUF'),'actual main display history should log the SELL');
 assert.equal(sell.cycle.completed,true);
 console.log('R29_MAIN_PAPER_REAL_LOCAL_HTTP_BUY_SELL_PASSED_WITH_DISPOSABLE_LEDGER');
}catch(e){
 console.error('R29_MAIN_PAPER_REAL_LOCAL_HTTP_TEST_FAILED',String(e.message).slice(0,800),err);
 process.exitCode=1;
}finally{
 if(bot&&bot.exitCode===null){
  bot.kill();
  await new Promise(resolve=>{
   if(bot.exitCode!==null)return resolve();
   bot.once('exit',resolve);
   setTimeout(resolve,4000).unref?.();
  });
 }
 await rm(folder,{recursive:true,force:true});
}
