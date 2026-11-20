import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {syncR29WindowsSandbox,requestGithubFile,syncGptForwardReviewStatus,writeGptForwardSyncDiagnostic} from './r29-windows-courier.mjs';
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

test('V6.8 sync real canonical GPT review index to the same local file read by dashboard',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'r29-forward-sync-'));
 const raw=readFileSync(new URL('../research/r29/channel/gpt-forward-review-status.json',import.meta.url),'utf8');
 const published=JSON.parse(raw);
 const now=Date.parse(published.updated_at_utc)+10000;
 const fetcher=async(url,options)=>{
   assert(url.includes('/research/r29/channel/gpt-forward-review-status.json'));
   assert.equal(options.headers.authorization,'Bearer '+PAT);
   return {ok:true,status:200,json:async()=>({
     type:'file',encoding:'base64',sha:'e'.repeat(40),
     content:Buffer.from(raw).toString('base64')
   })};
 };
 try{
   const read=await syncGptForwardReviewStatus({token:PAT,folder:dir,now,fetcher});
   assert.equal(read.status.available,true);
   assert.equal(read.status.completed_reviews_today,published.reviews.length);
   const cached=JSON.parse(readFileSync(path.join(dir,'gpt-forward-status.json'),'utf8'));
   const sync=JSON.parse(readFileSync(path.join(dir,'gpt-forward-sync-diagnostic.json'),'utf8'));
   assert.equal(cached.completed_reviews_today,published.reviews.length);
   assert.equal(sync.status,'SYNCED');
   assert.equal(sync.completed_reviews_today,published.reviews.length);
   assert.equal(sync.trade_authorized,false);
   assert.equal(sync.real_trading_enabled,false);
   assert(!JSON.stringify(sync).includes(PAT));
 }finally{rmSync(dir,{force:true,recursive:true})}
});

test('V6.8 failed GPT review index sync is recorded locally, not misreported as fresh',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'r29-forward-fail-'));
 try{
   const t=Date.parse('2026-11-20T20:00:00Z');
   writeGptForwardSyncDiagnostic({folder:dir,now:t,status:'ERROR',
     reason:'GPT_FORWARD_REVIEW_STATUS_INVALID'});
   let x=JSON.parse(readFileSync(path.join(dir,'gpt-forward-sync-diagnostic.json'),'utf8'));
   assert.equal(x.status,'ERROR');
   assert.equal(x.reason,'GPT_FORWARD_REVIEW_STATUS_INVALID');
   assert.equal(x.completed_reviews_today,null);
   writeGptForwardSyncDiagnostic({folder:dir,now:t,status:'ERROR',
     reason:'SECRET_WALLET_INFO_123'});
   x=JSON.parse(readFileSync(path.join(dir,'gpt-forward-sync-diagnostic.json'),'utf8'));
   assert.equal(x.reason,'GITHUB_OR_LOCAL_SYNC_FAILED');
   assert(!JSON.stringify(x).includes('SECRET_WALLET'));
   assert.throws(()=>writeGptForwardSyncDiagnostic({folder:dir,status:'SYNCED',reviewCount:99}));
 }finally{rmSync(dir,{force:true,recursive:true})}
});
