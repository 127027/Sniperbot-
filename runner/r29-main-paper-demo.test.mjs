import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {freshState,action,applyExits,paperSignal} from './core.mjs';
import {R29_MAIN_INTENT_SCHEMA,R29_MAIN_INTENT_PATH,R29_MAIN_STATUS_PATH,
 processR29MainIntent,loadR29MainCycle,saveR29MainCycle,publicR29MainStatus,
 validateR29MainIntent} from './r29-main-paper-demo.mjs';
import {syncR29MainChannel} from './r29-windows-courier.mjs';
const now=()=>Date.now();
const make=(action,id)=>({schema:R29_MAIN_INTENT_SCHEMA,target:'MAIN_PAPER_DEMO',
 mode:'PAPER_ONLY',asset:'R29_FIXED_TEST_COIN',
 intent_id:'r29main_'+id.repeat(32),action,
 amount_test_usdc:action==='BUY'?'50.00':null,
 created_at_utc:new Date(now()-3000).toISOString(),
 expires_at_utc:new Date(now()+300000).toISOString(),
 reason:'User authorized one visible demo Paper trade in main ledger'});
function fakePaper({entriesEnabled=true,cash=5000}={}){
 let state={...freshState(),entriesEnabled,cashUsdc:cash};
 const actions=[];
 const fetcher=async(url,request)=>{
  const method=request?.method||'GET';
  assert(url.startsWith('http://127.0.0.1:3030/'));
  if(method==='GET'&&url.endsWith('/api/state'))
   return {ok:true,status:200,json:async()=>({ok:true,mode:'PAPER_ONLY',state})};
  if(method!=='POST'||!url.endsWith('/api/command'))throw Error('unexpected fetch');
  assert.equal(request.headers.origin,'http://127.0.0.1:3030');
  let cmd=JSON.parse(request.body);
  actions.push(cmd);
  if(cmd.type==='DEMO_SIGNAL'){
   const coin=paperSignal();
   state={...state,candidates:[coin,...state.candidates.filter(x=>x.id!==coin.id)]};
  }else if(cmd.type==='DEMO_MOVE'){
   state=applyExits({...state,positions:state.positions.map(p=>p.id===cmd.id?
    {...p,priceUsd:p.priceUsd*(1+cmd.percent/100),markAt:new Date().toISOString()}:p)});
  }else{
   const next=action(state,cmd);
   if(next===state)return {ok:false,status:422,json:async()=>({ok:false})};
   state=next;
  }
  return {ok:true,status:200,json:async()=>({ok:true,state})};
 };
 return {fetcher,state:()=>state,actions};
}
test('R29 main paper visible BUY and SELL updates real ordinary ledger, not sandbox, once only',async()=>{
 const paper=fakePaper();
 let cycle=loadR29MainCycle(path.join(os.tmpdir(),'r29-test-missing-'+process.pid,'missing.json'));
 const b=make('BUY','a'),s=make('SELL','b');
 const buy=await processR29MainIntent(cycle,b,{fetcher:paper.fetcher});
 cycle=buy.cycle;
 assert.equal(buy.receipt.status,'PAPER_FILLED');
 assert.equal(cycle.buy_intent_id,b.intent_id);
 assert.equal(paper.state().cashUsdc,4950);
 assert.equal(paper.state().positions.length,1);
 assert.equal(paper.state().positions[0].symbol,'TEST');
 assert.equal(paper.state().positions[0].isDemo,true);
 assert.equal(paper.actions[0].type,'DEMO_SIGNAL');
 assert.equal(paper.actions[1].type,'BUY');
 assert.equal(paper.actions[1].amount,50);
 const again=await processR29MainIntent(cycle,b,{fetcher:paper.fetcher});
 assert.equal(again.duplicate,true);
 assert.equal(paper.actions.length,2);
 const sell=await processR29MainIntent(cycle,s,{fetcher:paper.fetcher});
 cycle=sell.cycle;
 assert.equal(sell.receipt.status,'PAPER_FILLED');
 assert.equal(cycle.completed,true);
 assert.equal(paper.state().positions.length,0);
 assert.equal(paper.state().cashUsdc,4999.005);
 assert.equal(sell.receipt.modelled_trade_pnl_test_usdc,-0.995);
 assert.deepEqual(paper.actions.map(x=>x.type),['DEMO_SIGNAL','BUY','DEMO_MOVE','SELL']);
 const publicStatus=publicR29MainStatus(cycle,sell.receipt);
 assert.equal(publicStatus.dashboard_positions_updated_by_local_http,true);
 assert.equal(publicStatus.real_trade_executed,false);
 assert(!JSON.stringify(publicStatus).includes('cashUsdc'));
 assert(!JSON.stringify(publicStatus).includes('tokenAddress'));
 await assert.rejects(()=>processR29MainIntent(cycle,make('BUY','c'),{
  fetcher:paper.fetcher}),/R29_MAIN_ONE_BUY_ONLY_LOCKED/);
});
test('invalid/expired targets or attempts at second/unauthorized amount are rejected before localhost request',async()=>{
 const paper=fakePaper();
 for(const x of [make('BUY','c'),{...make('BUY','c'),amount_test_usdc:'5000.00'},
  {...make('BUY','c'),asset:'PEPE'},
  {...make('BUY','c'),target:'LIVE'},
  {...make('BUY','c'),mode:'LIVE'},
  {...make('BUY','c'),expires_at_utc:new Date(now()-1000).toISOString()},
  {...make('BUY','c'),private_key:'no'}].slice(1)){
  await assert.rejects(()=>processR29MainIntent(loadR29MainCycle(path.join(os.tmpdir(),
    'r29-test-empty-'+process.pid,'empty.json')),x,{fetcher:paper.fetcher}));
 }
 assert.equal(paper.actions.length,0);
});
test('BOT AUS, no funds and pre-existing demo position all safely block without side-effects',async()=>{
 for(const conf of [{entriesEnabled:false},{cash:10}]){
  const paper=fakePaper(conf);
  await assert.rejects(()=>processR29MainIntent(
   loadR29MainCycle(path.join(os.tmpdir(),'r29-test-missing2-'+process.pid,'empty.json')),
   make('BUY','4'),{fetcher:paper.fetcher}),
   /R29_MAIN_BOT_NOT_ENABLED|R29_MAIN_INSUFFICIENT_TEST_FUNDS/);
  assert.equal(paper.actions.length,0);
 }
 const paper=fakePaper();
 await paper.fetcher('http://127.0.0.1:3030/api/command',{method:'POST',
  headers:{origin:'http://127.0.0.1:3030'},body:JSON.stringify({type:'DEMO_SIGNAL'})});
 await paper.fetcher('http://127.0.0.1:3030/api/command',{method:'POST',
  headers:{origin:'http://127.0.0.1:3030'},body:JSON.stringify({type:'BUY',id:'demo:signal-1',amount:50})});
 await assert.rejects(()=>processR29MainIntent(
  loadR29MainCycle(path.join(os.tmpdir(),'r29-test-missing3-'+process.pid,'empty.json')),
  make('BUY','5'),{fetcher:paper.fetcher}),/R29_MAIN_EXISTING_DEMO_POSITION_BLOCKED/);
 assert.equal(paper.state().positions.length,1);
});
test('SELL requires original local BUY receipt and cannot accidentally sell any existing position',async()=>{
 const paper=fakePaper();
 await assert.rejects(()=>processR29MainIntent(
  loadR29MainCycle(path.join(os.tmpdir(),'r29-test-missing4-'+process.pid,'empty.json')),
  make('SELL','9'),{fetcher:paper.fetcher}),/R29_MAIN_SELL_NOT_AUTHORIZED_BY_MATCHING_BUY/);
 assert.equal(paper.actions.length,0);
});
test('main paper GitHub courier is strictly opt-in and writes sanitized per-order status',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'r29-main-'));
 const pat='github_pat_TEST_ONLY_FAKE_NEVER_USE_1234567890';
 let cmd=make('BUY','a'),publicStatus=null,writes=0;
 const gitFetch=async(url,options)=>{
  assert(url.startsWith('https://api.github.com/repos/127027/Sniperbot-/contents/'));
  assert.equal(options.headers.authorization,'Bearer '+pat);
  if(options.method==='GET'){
   if(url.includes(R29_MAIN_INTENT_PATH))return {ok:true,status:200,json:async()=>({
    type:'file',encoding:'base64',sha:'old',
    content:Buffer.from(JSON.stringify(cmd)).toString('base64')})};
   if(url.includes(R29_MAIN_STATUS_PATH)){
    if(!publicStatus)return {ok:false,status:404};
    return {ok:true,status:200,json:async()=>({type:'file',encoding:'base64',sha:'old',
     content:Buffer.from(JSON.stringify(publicStatus)).toString('base64')})};
   }
  }
  if(options.method==='PUT'&&url.endsWith(R29_MAIN_STATUS_PATH)){
   const request=JSON.parse(options.body);
   publicStatus=JSON.parse(Buffer.from(request.content,'base64').toString('utf8'));
   writes++;
   return {ok:true,status:201,json:async()=>({commit:{sha:'sha'+writes}})};
  }
  throw Error('unexpected GitHub command');
 };
 const local=fakePaper();
 try{
  await assert.rejects(()=>syncR29MainChannel({enabled:false,folder:dir,
   token:pat,fetcher:gitFetch,healthFetcher:local.fetcher}),/R29_MAIN_NOT_OPTED_IN/);
  const result=await syncR29MainChannel({enabled:true,folder:dir,token:pat,
   fetcher:gitFetch,healthFetcher:local.fetcher});
  assert.equal(result.status.last_result,'PAPER_FILLED');
  assert.equal(publicStatus.wallet_accessed,false);
  assert.equal(publicStatus.real_trade_executed,false);
  assert.equal(publicStatus.dashboard_positions_updated_by_local_http,true);
  assert.equal(local.state().positions.length,1);
  assert.equal(writes,1);
  await syncR29MainChannel({enabled:true,folder:dir,token:pat,
   fetcher:gitFetch,healthFetcher:local.fetcher});
  assert.equal(writes,1,'repeat poll cannot cause second trade or public status spam');
  cmd=make('SELL','b');
  const sold=await syncR29MainChannel({enabled:true,folder:dir,token:pat,
   fetcher:gitFetch,healthFetcher:local.fetcher});
  assert.equal(sold.status.last_result,'PAPER_FILLED');
  assert.equal(sold.status.completed,true);
  assert.equal(writes,2);
  assert.equal(local.state().positions.length,0);
  assert.equal(local.state().cashUsdc,4999.005);
  assert(!JSON.stringify(publicStatus).includes(pat));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
