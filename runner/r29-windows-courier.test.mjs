import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {syncR29WindowsSandbox,requestGithubFile} from './r29-windows-courier.mjs';
import {R29_SCHEMA,R29_TEST_ASSET,R29_INTENT_PATH,R29_WINDOWS_STATUS_PATH} from '../research/r29/r29-paper-protocol.mjs';

const PAT='github_pat_R29_FAKE_ONLY_DO_NOT_USE_1234567890';
const make=action=>({schema:R29_SCHEMA,
 intent_id:action==='BUY'?'r29_'+'c'.repeat(32):'r29_'+'d'.repeat(32),
 target:'WINDOWS_SANDBOX',mode:'ISOLATED_PAPER_TEST',
 asset:R29_TEST_ASSET,action,
 amount_test_usdc:action==='BUY'?'50.00':null,
 created_at_utc:new Date(Date.now()-2000).toISOString(),
 expires_at_utc:new Date(Date.now()+700000).toISOString(),
 reason:'User-approved isolated GitHub transport verification'});
function response(data,sha='abc'){
 return {status:200,ok:true,json:async()=>({type:'file',encoding:'base64',sha,
  content:Buffer.from(JSON.stringify(data)).toString('base64')})};
}
function fakeRemote(initialIntent){
 let intent=initialIntent,remoteStatus=null,writes=0;
 const fetcher=async(url,options)=>{
  assert(options.headers?.authorization==='Bearer '+PAT,
   'GitHub token only sent to GitHub REST client');
  assert(url.startsWith('https://api.github.com/repos/127027/Sniperbot-/contents/'));
  if(options.method==='GET'){
   if(url.includes(R29_INTENT_PATH))return response(intent);
   if(url.includes(R29_WINDOWS_STATUS_PATH))
    return remoteStatus?response(remoteStatus):{status:404,ok:false};
   throw Error('UNEXPECTED_GITHUB_PATH');
  }
  if(options.method==='PUT'){
   assert(url.endsWith(R29_WINDOWS_STATUS_PATH));
   const json=JSON.parse(options.body);
   assert(json.branch==='codex/r29-chatgpt-github-paper-cycle-20261115');
   remoteStatus=JSON.parse(Buffer.from(json.content,'base64').toString('utf8'));
   writes++;
   return {ok:true,status:201,json:async()=>({commit:{sha:'fake-'+writes}})};
  }
  throw Error('UNEXPECTED_GITHUB_METHOD');
 };
 return {fetcher,status:()=>remoteStatus,
  writes:()=>writes,replace:i=>{intent=i}};
}
test('R29 Windows sandbox BUY and SELL are GitHub read/write roundtrips, never the real bot ledger',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'r29-win-tests-'));
 const remote=fakeRemote(make('BUY'));
 const healthy=async()=>({ok:true,json:async()=>({ok:true,mode:'PAPER_ONLY'})});
 try{
  const bought=await syncR29WindowsSandbox({folder:dir,token:PAT,
   fetcher:remote.fetcher,healthFetcher:healthy});
  assert.equal(bought.status.last_intent_result,'PAPER_FILLED');
  assert.equal(bought.status.laptop_bot_http_healthy,true);
  assert.equal(bought.status.sandbox_status.open_positions.length,1);
  assert.equal(bought.status.sandbox_status.cash_balance_test_usdc,4950);
  assert.equal(remote.writes(),1);
  assert.equal(bought.status.user_paper_modified,false);
  const again=await syncR29WindowsSandbox({folder:dir,token:PAT,
   fetcher:remote.fetcher,healthFetcher:healthy});
  assert.equal(again.skipped_unchanged,true);
  assert.equal(remote.writes(),1,'unchanged heartbeat must not spam GitHub');
  assert.equal(again.status.last_intent_result,'PAPER_FILLED',
   'ack must preserve original result, not downgrade to DUPLICATE');
  remote.replace(make('SELL'));
  const sold=await syncR29WindowsSandbox({folder:dir,token:PAT,
   fetcher:remote.fetcher,healthFetcher:healthy});
  assert.equal(sold.status.last_intent_result,'PAPER_FILLED');
  assert.equal(sold.status.sandbox_status.open_positions.length,0);
  assert(sold.status.sandbox_status.closed_pnl_test_usdc>0);
  assert.equal(remote.writes(),2);
  const publicPayload=JSON.stringify(remote.status());
  assert(!publicPayload.includes(PAT));
  assert(!publicPayload.includes('wallet_address'));
  assert(!publicPayload.includes('private_key'));
  assert.equal(remote.status().real_trading_enabled,false);
 }finally{rmSync(dir,{force:true,recursive:true})}
});
test('R29 Windows worker ignores CI-targeted commands without paper mutations',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'r29-win-foreign-'));
 const remote=fakeRemote({...make('BUY'),target:'CI_SANDBOX'});
 try{
  const x=await syncR29WindowsSandbox({folder:dir,token:PAT,
   fetcher:remote.fetcher,healthFetcher:async()=>{throw Error('offline')}});
  assert.equal(x.status.sandbox_status.open_positions.length,0);
  assert.equal(x.status.last_intent_id,null);
  assert.equal(x.status.laptop_bot_http_healthy,false);
  assert.equal(x.status.sandbox_status.cash_balance_test_usdc,5000);
 }finally{rmSync(dir,{force:true,recursive:true})}
});
test('GitHub REST pin cannot fetch arbitrary path and never accepts malformed base64 document',async()=>{
 await assert.rejects(()=>requestGithubFile('wallets.json',{token:PAT,fetcher:async()=>{}}),
  /R29_UNEXPECTED_PATH/);
 await assert.rejects(()=>requestGithubFile(R29_INTENT_PATH,{token:'',fetcher:async()=>{}}),
  /R29_GITHUB_TOKEN_REQUIRED/);
});
