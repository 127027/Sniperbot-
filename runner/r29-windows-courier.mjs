// R29 Windows machine: FREE GitHub REST two-way sandbox transport.
// Only a locally isolated synthetic QA ledger is mutated, NEVER the real
// Sniperbot paper account, wallet, private keys, PayPal, or paid OpenAI API.
import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import path from 'node:path';
import {initialR29Ledger,applyR29SandboxIntent,projectR29SandboxState,
 R29_BRANCH,R29_INTENT_PATH,R29_WINDOWS_STATUS_PATH} from '../research/r29/r29-paper-protocol.mjs';

const REPO='127027/Sniperbot-';
const base='https://api.github.com/repos/'+REPO+'/contents/';
const REQ_TIMEOUT_MS=12000;
const MAX_B64_BYTES=250000;
const POLL_INTERVAL_MS=45000;
const statusSchema='sniper_r29_windows_sandbox_status.v1';
function check(token){
 if(typeof token!=='string'||!^(?:github_pat_|ghp_)[A-Za-z0-9_]{15,}$/.test(token))
  throw Error('R29_GITHUB_TOKEN_REQUIRED');
}
export async function requestGithubFile(relative,{token,fetcher=fetch}={}){
 check(token);
 if(![R29_INTENT_PATH,R29_WINDOWS_STATUS_PATH].includes(relative))
  throw Error('R29_UNEXPECTED_PATH');
 const url=base+relative+'?ref='+encodeURIComponent(R29_BRANCH)+'&v='+Date.now();
 const response=await fetcher(url,{method:'GET',redirect:'error',
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28','cache-control':'no-cache',
   'user-agent':'Sniper-R29-Windows-OptIn-Sandbox/1'},
  signal:AbortSignal.timeout(REQ_TIMEOUT_MS)});
 if(response.status===404)return {sha:null,data:null};
 if(!response.ok)throw Error('R29_GITHUB_READ_HTTP_'+response.status);
 const file=await response.json();
 if(file?.type!=='file'||file.encoding!=='base64'||typeof file.sha!=='string'||
  typeof file.content!=='string'||file.content.length>MAX_B64_BYTES)
  throw Error('R29_GITHUB_CONTENTS_INVALID');
 const txt=Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8');
 if(Buffer.byteLength(txt)>MAX_B64_BYTES)throw Error('R29_GITHUB_CONTENTS_TOO_LARGE');
 return {sha:file.sha,data:JSON.parse(txt)};
}
export async function publishR29Status(status,{token,fetcher=fetch}={}){
 check(token);
 if(status?.schema!==statusSchema||status.real_trading_enabled!==false||
  status.user_paper_modified!==false||status.mode!=='WINDOWS_SANDBOX')
  throw Error('R29_UNSAFE_PUBLIC_STATUS');
 const data=JSON.stringify(status,null,2)+'\n';
 if(Buffer.byteLength(data)>14000)throw Error('R29_STATUS_TOO_LARGE');
 const remote=await requestGithubFile(R29_WINDOWS_STATUS_PATH,{token,fetcher});
 const request={message:'test(r29): Windows ISOLATED paper courier heartbeat/receipt only',
  content:Buffer.from(data,'utf8').toString('base64'),branch:R29_BRANCH};
 if(remote.sha)request.sha=remote.sha;
 const response=await fetcher(base+R29_WINDOWS_STATUS_PATH,{
  method:'PUT',redirect:'error',
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'content-type':'application/json','X-GitHub-Api-Version':'2022-11-28',
   'user-agent':'Sniper-R29-Windows-OptIn-Sandbox/1'},
  body:JSON.stringify(request),signal:AbortSignal.timeout(REQ_TIMEOUT_MS)});
 if(!response.ok)throw Error('R29_GITHUB_WRITE_HTTP_'+response.status);
 const result=await response.json();
 if(typeof result?.commit?.sha!=='string')throw Error('R29_GITHUB_RECEIPT_COMMIT_MISSING');
 return {commit_sha:result.commit.sha,ref:R29_BRANCH,path:R29_WINDOWS_STATUS_PATH};
}
export function processR29WindowsMailbox(ledger,payload,{now=Date.now()}={}){
 if(payload?.target!=='WINDOWS_SANDBOX')
  return {ledger,action:'SKIPPED_FOREIGN_TARGET',receipt:null};
 const applied=applyR29SandboxIntent(ledger,payload,{now,target:'WINDOWS_SANDBOX'});
 return {ledger:applied.ledger,action:applied.receipt.status,receipt:applied.receipt};
}
export function sanitizeR29WindowsStatus({ledger,lastReceipt=null,
 botHealthy=false,now=Date.now(),lastError=null}={}){
 const projected=projectR29SandboxState(ledger);
 return {schema:statusSchema,
  target:'WINDOWS_SANDBOX',
  mode:'WINDOWS_SANDBOX',connection:'GITHUB_REST_PUSH_AND_PULL',
  checked_at_utc:new Date(now).toISOString(),
  laptop_bot_http_healthy:botHealthy===true,
  github_paper_courier_enabled:true,
  real_trading_enabled:false,user_paper_modified:false,
  wallet_or_real_balance_published:false,
  sandbox_status:projected,
  last_intent_id:typeof lastReceipt?.intent_id==='string'?lastReceipt.intent_id:null,
  last_intent_action:typeof lastReceipt?.action==='string'?lastReceipt.action:null,
  last_intent_result:typeof lastReceipt?.status==='string'?lastReceipt.status:null,
  last_intent_at_utc:typeof lastReceipt?.observed_at_utc==='string'?lastReceipt.observed_at_utc:null,
  last_paper_receipt:lastReceipt?.paper_receipt?{
   action:lastReceipt.paper_receipt.action,
   status:lastReceipt.paper_receipt.status,
   closed_pnl_test_usdc:lastReceipt.paper_receipt.closed_pnl_test_usdc,
   real_trade_executed:false,wallet_debited:false}:null,
  last_error:typeof lastError==='string'?lastError.slice(0,110):null,
  disclaimer:'Proof of separate Windows isolated QA sandbox ONLY, not a user paper account trade.'};
}
export async function syncR29WindowsSandbox({token,folder,fetcher=fetch,
 healthFetcher=fetch,now=Date.now()}={}){
 check(token);
 if(typeof folder!=='string'||!path.isAbsolute(folder))
  throw Error('R29_LOCAL_FOLDER_INVALID');
 const filename=path.join(folder,'r29-local-sandbox-ledger.json');
 let ledger=initialR29Ledger({target:'WINDOWS_SANDBOX'});
 if(existsSync(filename)){
  const raw=readFileSync(filename,'utf8');
  if(Buffer.byteLength(raw)>3_000_000)throw Error('R29_LOCAL_LEDGER_TOO_LARGE');
  ledger=JSON.parse(raw);
 }
 let mailbox=null,receipt=null,lastError=null;
 try{
  mailbox=(await requestGithubFile(R29_INTENT_PATH,{token,fetcher})).data;
  if(mailbox?.target==='WINDOWS_SANDBOX'){
   const result=processR29WindowsMailbox(ledger,mailbox,{now});
   ledger=result.ledger;
   receipt=result.receipt;
   if(result.action!=='DUPLICATE_ALREADY_APPLIED'){
    mkdirSync(folder,{recursive:true});
    const tmp=filename+'.new-'+process.pid;
    writeFileSync(tmp,JSON.stringify(ledger,null,2)+'\n',{mode:0o600});
    renameSync(tmp,filename);
   }
  }
 }catch(e){lastError=String(e?.message||e).slice(0,110)}
 let botHealthy=false;
 try{
  const response=await healthFetcher('http://127.0.0.1:3030/api/health',{
   method:'GET',signal:AbortSignal.timeout(4000)});
  const result=await response.json();
  botHealthy=response.ok&&result?.ok===true&&result.mode==='PAPER_ONLY';
 }catch{}
 const status=sanitizeR29WindowsStatus({ledger,lastReceipt:receipt,botHealthy,now,lastError});
 // The status file contains NO device ID, key, portfolio, username,
 // computer hostname or wallet address. GitHub branch may be public.
 const published=await publishR29Status(status,{token,fetcher});
 return {status,published};
}
if(import.meta.url===new URL('file://'+path.resolve(process.argv[1]||'/')).href){
 const token=process.env.SNIPER_R29_GITHUB_TOKEN;
 const folder=process.env.LOCALAPPDATA?
  path.join(process.env.LOCALAPPDATA,'MemeSniperPaper','r29-isolated-sandbox'):
  null;
 let stopped=false,timer;
 process.stdin.setEncoding('utf8');
 process.stdin.on('data',x=>{if(x.includes('SNIPER_STOP_V1')){
  stopped=true;if(timer)clearTimeout(timer);process.exitCode=0;
 }});
 const tick=async()=>{
  if(stopped)return;
  try{
   const r=await syncR29WindowsSandbox({token,folder});
   console.log('[R29] GitHub-Windows-Sandbox-Kanal OK. Original-Paperkonto unveraendert. Bot erreichbar:',
    r.status.laptop_bot_http_healthy,'Testauftrag:',r.status.last_intent_result||'kein neuer');
  }catch(e){
   console.error('[R29] GitHub-PAPER-Sandbox-Verbindung fehlgeschlagen:',
    String(e?.message||e).slice(0,110));
  }
  if(!stopped)timer=setTimeout(tick,POLL_INTERVAL_MS);
 };
 await tick();
}
