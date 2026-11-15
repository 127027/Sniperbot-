// R29 GPT-only localhost HTTP acceptance against an ACTUAL disposable bot.
// Never connects to external exchanges, GitHub, wallet or paid AI services.
// Does not touch user profiles or normal paper-state-v03.json.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {contentSha256,archivePath,GPT_PAPER_DECISION_PATH,GPT_PAPER_RECEIPT_PATH} from './gpt-paper-protocol.mjs';
import {relayGptPaperDecision} from './gpt-paper-github-relay.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folder=await mkdtemp(path.join(os.tmpdir(),'r29-gpt-actual-http-'));
const key='f'.repeat(64);
const iso=x=>new Date(x).toISOString();
let proc=null,lastErr='',base='';
async function freePort(){
 const s=createServer();
 await new Promise((resolve,reject)=>s.once('error',reject).listen(0,'127.0.0.1',resolve));
 const port=s.address().port;
 await new Promise(resolve=>s.close(resolve));
 return port;
}
async function stop(){
 if(!proc)return;
 const p=proc;proc=null;
 if(p.exitCode===null){
  p.kill();
  await new Promise(resolve=>{
   if(p.exitCode!==null)return resolve();
   p.once('exit',resolve);
   setTimeout(resolve,4000).unref?.();
  });
 }
}
async function boot(port){
 proc=spawn(process.execPath,[path.join(root,'runner/server.mjs')],{
  cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],
  env:{...process.env,SNIPER_PORT:String(port),SNIPER_DATA_DIR:folder,
   SNIPER_OFFLINE:'1',SNIPER_PIPELINE_QA:'0',
   SNIPER_CENTRAL_AI_ENABLED:'0',SNIPER_OPENAI_API_KEY:'',
   SNIPER_LOCAL_DISCOVERY:'0',SNIPER_RESEARCH_READ:'0',
   SNIPER_AGENT_PAPER_FEED:'0',SNIPER_RESEARCH_FEED:'0',
   SNIPER_R29_MAIN_PAPER_DEMO:'0',SNIPER_PAPER_AUTOPILOT:'0',
   SNIPER_GPT_PAPER_BRIDGE:'1',SNIPER_GPT_BRIDGE_SECRET:key}
 });
 proc.stderr.on('data',v=>lastErr=(lastErr+v.toString()).slice(-1800));
 const start=Date.now();
 while(Date.now()-start<18000){
  if(proc.exitCode!==null)throw Error('GPT_HTTP_TEST_BOT_EXIT '+lastErr);
  try{const r=await fetch(base+'/api/health');if(r.ok)return}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('GPT_HTTP_TEST_BOT_NOT_READY '+lastErr);
}
async function get(url){
 const response=await fetch(base+url,{redirect:'error'});
 const data=await response.json();
 return {code:response.status,data};
}
async function post(url,body,{cap=key,origin=null}={}){
 const headers={'content-type':'application/json'};
 if(cap!==null)headers['x-sniper-gpt-bridge']=cap;
 if(origin!==null)headers.origin=origin;
 const response=await fetch(base+url,{
  method:'POST',redirect:'error',headers,body:JSON.stringify(body)});
 return {code:response.status,data:await response.json()};
}
function decision(action='NO_TRADE',id='a'.repeat(32)){
 const now=Date.now();
 return {schema:'sniper_r29_gpt_paper_decision.v1',
  mode:'PAPER_ONLY',strategy:'GPT_ONLY',decision_id:'gpt_'+id,
  action,chain:action==='NO_TRADE'?null:'base',
  token_address:action==='NO_TRADE'?null:'0x'+'a'.repeat(40),
  pool_address:action==='NO_TRADE'?null:'0x'+'b'.repeat(40),
  amount_test_usdc:action==='BUY'?50:null,
  created_at_utc:iso(now-4000),expires_at_utc:iso(now+(action==='BUY'?90000:3600000)),
  source_review_sha256:'f'.repeat(64),
  source_observed_at_utc:iso(now-8000),
  evidence_ids:['research/r29/channel/dynamic-research-review.json',
   'research/r29/channel/gpt-paper-security.json'],
  security_assessment:action==='BUY'?'VERIFIED':'UNKNOWN',
  score_0_100:action==='BUY'?85:null,
  reason_de:'Unabhaengiger isolierter Test, kein echter Markt- oder Handelsauftrag: Sicherheits- und Empfangsregeln pruefen.',
  risk_level:'UNKNOWN',trade_type:'VIRTUAL_ONLY',real_trading_enabled:false
 };
}
function envelope(d){
 return {schema:'sniper_r29_local_gpt_relay.v1',decision:d,
  archive_sha256:contentSha256(JSON.stringify(d,null,2)+'\n'),
  pointer_commit_sha:'a'.repeat(40),
  archive_commit_sha:'b'.repeat(40),
  github_owner_verified:true,real_trading_enabled:false};
}
try{
 const port=await freePort();base='http://127.0.0.1:'+port;
 await boot(port);
 const before=(await get('/api/dashboard/paper')).data.view;
 assert.equal(before.account,'REGULAR_PAPER_ACCOUNT');
 assert.equal(before.free_cash_test_usdc,0);
 assert.equal(before.open_position_count,0);
 const flags=(await get('/api/gpt/paper/status')).data;
 assert.equal(flags.mode,'PAPER_ONLY');
 assert.equal(flags.local_gpt_bridge_ready,true);
 assert.equal(flags.gpt_follow_enabled,false);
 assert.equal(flags.old_local_autopilot_enabled,false);
 const d=decision(),body=envelope(d);
 for(const opt of [{cap:null},{cap:'0'.repeat(64)},{origin:'http://attacker.invalid'}]){
  const denied=await post('/api/gpt/paper-decision',body,opt);
  assert.equal(denied.code,403);
 }
 const malformed=await post('/api/gpt/paper-decision',{
  ...body,archive_sha256:'0'.repeat(64)});
 assert.equal(malformed.code,422);
 const accepted=await post('/api/gpt/paper-decision',body);
 assert.equal(accepted.code,200);
 assert.equal(accepted.data.receipt.status,'NO_TRADE');
 assert.equal(accepted.data.receipt.wallet_touched,false);
 assert.equal(accepted.data.receipt.real_trading_enabled,false);
 let status=(await get('/api/gpt/paper/status')).data;
 assert.equal(status.received_decision_count,1);
 assert.equal(status.last_decision_id,d.decision_id);
 const duplicate=await post('/api/gpt/paper-decision',body);
 assert.equal(duplicate.code,200);
 assert.equal(duplicate.data.receipt.status,'NO_TRADE');
 assert.equal(duplicate.data.receipt.duplicate,true);
 assert.equal((await get('/api/gpt/paper/status')).data.received_decision_count,1);
 const zero=(await get('/api/dashboard/paper')).data.view;
 assert.equal(zero.free_cash_test_usdc,0);
 assert.equal(zero.open_position_count,0);
 assert.equal(zero.realized_pnl_test_usdc,0);
 // Even a forged self-declared BUY must fail while strategy opt-in is OFF.
 // End-to-end with mocked read-only GitHub REST, ACTUAL localhost bot
 // and GitHub receipt PUT. No external service and no synthetic wallet.
 const fromGitHub=decision('NO_TRADE','c'.repeat(32));
 const archiveText=JSON.stringify(fromGitHub,null,2)+'\n';
 const archivedPath=archivePath(fromGitHub.decision_id,fromGitHub.created_at_utc);
 const pointer={schema:'sniper_r29_gpt_paper_pointer.v1',mode:'PAPER_ONLY',
  decision_id:fromGitHub.decision_id,archive_path:archivedPath,
  archive_sha256:contentSha256(archiveText),
  published_at_utc:fromGitHub.created_at_utc,real_trading_enabled:false};
 const remote=new Map([
  [GPT_PAPER_DECISION_PATH,{
   blob:'1'.repeat(40),commit:'a'.repeat(40),
   text:JSON.stringify(pointer,null,2)+'\n'}],
  [archivedPath,{blob:'2'.repeat(40),commit:'b'.repeat(40),
   text:archiveText}]
 ]);
 let publishedReceipt=null,repositoryRequests=0;
 const fetchFakeGithub=async(uri,opts)=>{
  repositoryRequests++;
  const url=new URL(uri);
  const getPrefix='/repos/127027/Sniperbot-/contents/';
  const shaPrefix='/repos/127027/Sniperbot-/commits/';
  if(url.pathname.startsWith(getPrefix)){
   const p=decodeURIComponent(url.pathname.slice(getPrefix.length));
   if(opts.method==='GET'){
    const file=remote.get(p);
    if(!file)return {ok:false,status:404};
    return {ok:true,status:200,json:async()=>({
     type:'file',sha:file.blob,encoding:'base64',
     content:Buffer.from(file.text).toString('base64')})};
   }
   if(opts.method==='PUT'&&p===GPT_PAPER_RECEIPT_PATH){
    const pushed=JSON.parse(opts.body);
    publishedReceipt=JSON.parse(Buffer.from(pushed.content,'base64').toString('utf8'));
    return {ok:true,status:200,json:async()=>({
     commit:{sha:'d'.repeat(40)}})};
   }
  }
  if(url.pathname==='/repos/127027/Sniperbot-/commits'){
   const p=url.searchParams.get('path'),f=remote.get(p);
   if(!f)return {ok:false,status:404};
   return {ok:true,status:200,json:async()=>[{sha:f.commit}]};
  }
  if(url.pathname.startsWith(shaPrefix)){
   const commit=url.pathname.slice(shaPrefix.length);
   const found=[...remote.entries()].find(([,f])=>f.commit===commit);
   if(!found)return {ok:false,status:404};
   return {ok:true,status:200,json:async()=>({
    sha:commit,author:{login:'127027'},committer:{login:'127027'},
    parents:[{sha:'e'.repeat(40)}],
    files:[{filename:found[0],sha:found[1].blob,status:'added'}],
    commit:{verification:{verified:false}}})};
  }
  throw Error('UNEXPECTED_MOCK_GITHUB_REQUEST '+uri);
 };
 const viaGithub=await relayGptPaperDecision({
  token:'github_pat_MOCK_TOKEN_123456789012345',
  localCapability:key,now:Date.now(),
  fetcher:fetchFakeGithub,
  localFetcher:(url,opts)=>fetch(url.replace(
   'http://127.0.0.1:3030',base),opts)
 });
 assert.equal(viaGithub.status,'NO_TRADE');
 assert.equal(viaGithub.forwarded_to_local,true);
 assert.equal(viaGithub.owner_commit_verified,true);
 assert.equal(viaGithub.model_signature_verified,false);
 assert(publishedReceipt);
 assert.equal(publishedReceipt.status,'NO_TRADE');
 assert.equal(publishedReceipt.account_balance_or_wallet_published,false);
 assert.equal(publishedReceipt.real_trading_enabled,false);
 assert(!JSON.stringify(publishedReceipt).includes('cashUsdc'));
 assert(repositoryRequests>=6);
 assert.equal((await get('/api/gpt/paper/status')).data.received_decision_count,2);
  const buy=await post('/api/gpt/paper-decision',envelope(decision('BUY','b'.repeat(32))));
 assert.equal(buy.code,200);
 assert.equal(buy.data.receipt.status,'BLOCKED');
 assert.equal(buy.data.receipt.reason,'GPT_FOLLOW_OR_PAPER_BOT_DISABLED');
 assert.equal((await get('/api/dashboard/paper')).data.view.open_position_count,0);
 await stop();
 await boot(port);
 status=(await get('/api/gpt/paper/status')).data;
 assert.equal(status.received_decision_count,3);
 assert.equal(status.local_gpt_bridge_ready,true);
 const afterRestart=await post('/api/gpt/paper-decision',body);
 assert.equal(afterRestart.code,200);
 assert.equal(afterRestart.data.receipt.duplicate,true);
 assert.equal(afterRestart.data.receipt.status,'NO_TRADE');
 const final=(await get('/api/dashboard/paper')).data.view;
 assert.equal(final.free_cash_test_usdc,0);
 assert.equal(final.open_position_count,0);
 assert.equal(final.realized_pnl_test_usdc,0);
 assert.equal((await get('/api/gpt/paper/status')).data.real_trading_enabled,false);
 console.log('R29_GPT_ACTUAL_LOCAL_HTTP_DECISION_REPLAY_AUTH_PAPER_ONLY_PASSED');
}catch(e){
 console.error('R29_GPT_ACTUAL_LOCAL_HTTP_INTEGRATION_FAILED',
  String(e?.stack||e).slice(0,2300),lastErr);
 process.exitCode=1;
}finally{await stop();await rm(folder,{recursive:true,force:true})}
