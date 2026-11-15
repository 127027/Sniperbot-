// R29 outbound GitHub -> LOCALHOST GPT paper bridge. No paid LLM service.
// File content does not authenticate its own author. Require the owner-linked
// GitHub *commits for BOTH pointer and immutable archived decision*, then
// use a supervisor-generated one-process local capability to relay.
// WARNING: owner-account GitHub attribution is NOT cryptographic GPT identity.
import {contentSha256,validateGptPaperPointer,validateGptPaperDecision,
 GPT_PAPER_BRANCH,GPT_PAPER_REPO,GPT_PAPER_DECISION_PATH,
 GPT_PAPER_RECEIPT_PATH} from './gpt-paper-protocol.mjs';

const ROOT='https://api.github.com/repos/'+GPT_PAPER_REPO;
const BRANCH=GPT_PAPER_BRANCH;
const ACTOR='127027';
const MAX_BYTES=20000;
const timeout=()=>AbortSignal.timeout(12000);
const tokenValid=t=>typeof t==='string'&&/^(?:github_pat_|ghp_)[A-Za-z0-9_]{15,}$/.test(t);
const capValid=t=>typeof t==='string'&&/^[0-9a-f]{64}$/.test(t);
const SH=/^[0-9a-f]{40}$/;
function githubHeaders(token){return {
 authorization:'Bearer '+token,accept:'application/vnd.github+json',
 'X-GitHub-Api-Version':'2022-11-28','user-agent':'R29-Owner-Attributed-GPT-PaperCourier/1'};
}
async function requestJson(url,{fetcher,headers,method='GET',body=null}={}){
 const res=await fetcher(url,{
  method,redirect:'error',headers:{...headers,...(body?{'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),signal:timeout()});
 if(!res||!res.ok)throw Error('GPT_GITHUB_'+method+'_HTTP_'+res?.status);
 return res.json();
}
export async function readGptGithubFile(path,{token,fetcher=fetch}={}){
 if(!tokenValid(token)||![
  GPT_PAPER_DECISION_PATH,GPT_PAPER_RECEIPT_PATH].includes(path)&&
  !/^research\/r29\/gpt-decisions\/\d{4}-\d\d-\d\d\/gpt_[0-9a-f]{32}\.json$/.test(path))
  throw Error('GPT_GITHUB_SOURCE_PATH_DENIED');
 const url=ROOT+'/contents/'+path+'?ref='+encodeURIComponent(BRANCH);
 const x=await requestJson(url,{fetcher,headers:githubHeaders(token)});
 if(x?.type!=='file'||!SH.test(x.sha||'')||x.encoding!=='base64'||
  typeof x.content!=='string'||x.content.length>MAX_BYTES*1.4)
  throw Error('GPT_GITHUB_CONTENTS_INVALID');
 const text=Buffer.from(x.content.replace(/\s/g,''),'base64').toString('utf8');
 if(Buffer.byteLength(text)>MAX_BYTES)throw Error('GPT_GITHUB_FILE_TOO_BIG');
 return {sha:x.sha,text,data:JSON.parse(text),path};
}
export async function verifyGithubOwnerAttribution(file,{token,fetcher=fetch}={}){
 if(!file?.path||!SH.test(file.sha)||!tokenValid(token))
  throw Error('GPT_GITHUB_PROVENANCE_INPUT_INVALID');
 const heads=githubHeaders(token);
 const recent=await requestJson(ROOT+'/commits?'+new URLSearchParams({
  path:file.path,sha:BRANCH,per_page:'1'}),{fetcher,headers:heads});
 if(!Array.isArray(recent)||recent.length!==1||!SH.test(recent[0]?.sha||''))
  throw Error('GPT_GITHUB_COMMIT_NOT_FOUND');
 const commit=await requestJson(ROOT+'/commits/'+recent[0].sha,{fetcher,headers:heads});
 const matching=commit?.files?.some(f=>f.filename===file.path&&f.sha===file.sha&&
  ['added','modified'].includes(f.status));
 if(!matching||commit.author?.login!==ACTOR||commit.committer?.login!==ACTOR||
  !Array.isArray(commit.parents)||commit.parents.length!==1)
  throw Error('GPT_GITHUB_OWNER_OR_BLOB_NOT_VERIFIED');
 // GitHub REST commit signatures are unsigned here. We DO NOT claim GPG
 // attestation of the model, only authenticated GitHub-account attribution.
 return {commit_sha:commit.sha,owner_login:ACTOR,blob_sha:file.sha,
  github_signature_verified:commit.commit?.verification?.verified===true,
  model_identity_cryptographically_verified:false};
}
export function sanitizeGptPaperReceipt(r,decision,{now=Date.now()}={}){
 const status=['PAPER_FILLED','BLOCKED','REJECTED','WATCH','HOLD','NO_TRADE',
  'DUPLICATE','NOOP','DATA_GAP'].includes(r?.status)?r.status:'REJECTED';
 const reason=typeof r?.reason==='string'&&/^[A-Z0-9_]+$/.test(r.reason)?
  r.reason.slice(0,100):'LOCAL_PAPER_BRIDGE_UNVERIFIED';
 return {schema:'sniper_r29_public_gpt_paper_receipt.v1',
  mode:'PAPER_ONLY',real_trading_enabled:false,
  account_balance_or_wallet_published:false,actionable:false,
  decision_id:decision.decision_id,action:decision.action,
  received_at_utc:new Date(now).toISOString(),status,reason,
  submitted_by:'GITHUB_OWNER_ATTRIBUTED_GPT_RELAY',
  origin_model_signature_verified:false,
  wallet_touched:false,account_balance_published:false,
  note:'Only local signed paper execution may fill; GitHub is not order authority'};
}
export async function relayGptPaperDecision({token,localCapability,
 fetcher=fetch,localFetcher=fetch,now=Date.now()}={}){
 if(!tokenValid(token)||!capValid(localCapability))
  throw Error('GPT_RELAY_CREDENTIALS_REQUIRED');
 const pointerFile=await readGptGithubFile(GPT_PAPER_DECISION_PATH,{token,fetcher});
 const pointer=validateGptPaperPointer(pointerFile.data,{now});
 const pointerProof=await verifyGithubOwnerAttribution(pointerFile,{token,fetcher});
 const archiveFile=await readGptGithubFile(pointer.archive_path,{token,fetcher});
 const archiveProof=await verifyGithubOwnerAttribution(archiveFile,{token,fetcher});
 if(contentSha256(archiveFile.text)!==pointer.archive_sha256||
    archiveFile.data?.decision_id!==pointer.decision_id||
    archiveFile.data?.created_at_utc!==pointer.published_at_utc)
  throw Error('GPT_RELAY_ARCHIVE_HASH_MISMATCH');
 const validated=validateGptPaperDecision(archiveFile.data,{now,forExecution:false});
 const d=archiveFile.data;
 // Expired BUY/SELL is reported as rejection; no paper order should be
 // attempted. Non-trading archive records can be processed later.
 const expired=validated.trade&&Date.parse(d.expires_at_utc)<=now;
 let response;
 if(!expired){
  const r=await localFetcher('http://127.0.0.1:3030/api/gpt/paper-decision',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(35000),
    headers:{'content-type':'application/json',
      'x-sniper-gpt-bridge':localCapability},
    body:JSON.stringify({schema:'sniper_r29_local_gpt_relay.v1',
      decision:d,archive_sha256:pointer.archive_sha256,
      pointer_commit_sha:pointerProof.commit_sha,
      archive_commit_sha:archiveProof.commit_sha,
      github_owner_verified:true,real_trading_enabled:false})});
  if(!r?.ok)throw Error('GPT_LOCAL_PAPER_RELAY_HTTP_'+r?.status);
  response=await r.json();
  if(response?.ok!==true)throw Error('GPT_LOCAL_PAPER_RELAY_INVALID_RESULT');
 }
 const received=sanitizeGptPaperReceipt(expired?
  {status:'REJECTED',reason:'GPT_DECISION_EXPIRED_NO_EXECUTION'}:
  response?.receipt,d,{now});
 let published=null;
 // Receipts are public but contain neither balances nor token addresses.
 const headers=githubHeaders(token);
 let old=null,sha=null;
 try{
  const prior=await readGptGithubFile(GPT_PAPER_RECEIPT_PATH,{token,fetcher});
  old=prior.data;sha=prior.sha;
 }catch(e){
  if(e.message!=='GPT_GITHUB_GET_HTTP_404')throw e;
 }
 if(old?.decision_id!==received.decision_id||old?.status!==received.status||
  old?.reason!==received.reason){
  const req={message:'research(r29): GPT-authorized local paper receipt (no balances)',
    branch:BRANCH,content:Buffer.from(JSON.stringify(received,null,2)+'\n').toString('base64')};
  if(sha)req.sha=sha;
  const pushed=await requestJson(ROOT+'/contents/'+GPT_PAPER_RECEIPT_PATH,{
    fetcher,headers,method:'PUT',body:req});
  if(!SH.test(pushed?.commit?.sha||''))throw Error('GPT_RECEIPT_COMMIT_INVALID');
  published=pushed.commit.sha;
 }
 return {status:received.status,reason:received.reason,decision_id:d.decision_id,
  action:d.action,owner_commit_verified:true,model_signature_verified:false,
  forwarded_to_local:!expired,published_receipt_commit:published,
  real_trading_enabled:false};
}
