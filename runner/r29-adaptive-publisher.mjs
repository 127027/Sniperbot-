// Read-only R29 public GitHub presence for locally archived adaptive research.
// Never transmits wallet, balances, PnL, trade orders, API keys, hostname or user ID.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO='127027/Sniperbot-';
const BRANCH='codex/r29-chatgpt-github-paper-cycle-20261115';
export const ADAPTIVE_PUBLIC_PATH='research/r29/channel/dynamic-research-status.json';
const ENDPOINT='https://api.github.com/repos/'+REPO+'/contents/'+ADAPTIVE_PUBLIC_PATH;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function localDynamicStatusFile(env=process.env){
 return path.join(env.LOCALAPPDATA||path.join(root,'.local'),
   'MemeSniperPaper','dynamic-research','status.json');
}
const validDate=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s));
const finiteInt=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi;
const hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
export function sanitizedAdaptivePresence(local){
 if(local?.schema!=='sniper_r29_dynamic_research_status.v1'||
    local.paper_only!==true||local.actionable!==false||
    !validDate(local.first_seen_at_utc)||!validDate(local.last_review_at_utc)||
    !validDate(local.next_due_at_utc)||
    !/^\d{4}-\d{2}-\d{2}$/.test(local.day_utc||'')||
    !finiteInt(local.day_review_count,1,24)||
    !finiteInt(local.total_review_count,1,100000000)||
    ![1,4,12,24].includes(local.frequency_per_day)||
    !finiteInt(local.experiment_day_index,0,100000)||
    !['OBSERVATION_WARMUP_30_DAYS','LOCKED_FORWARD_TEST_30_DAYS',
      'ONGOING_FORWARD_EVALUATION'].includes(local.experiment_phase)||
    !hash(local.last_review_sha256)||
    local.can_authorize_trades!==false||
    local.real_trading_enabled!==false||
    local.account_balances_included!==false)
    throw Error('R29_DYNAMIC_PUBLIC_DATA_INVALID');
 return {schema:'sniper_r29_public_dynamic_research.v1',paper_only:true,actionable:false,
  research_only:true,real_trading_enabled:false,can_authorize_trades:false,
  account_balance_or_wallet_published:false,
  first_seen_at_utc:local.first_seen_at_utc,day_utc:local.day_utc,
  day_review_count:local.day_review_count,
  total_review_count:local.total_review_count,
  last_review_at_utc:local.last_review_at_utc,next_due_at_utc:local.next_due_at_utc,
  frequency_per_day:local.frequency_per_day,
  experiment_day_index:local.experiment_day_index,experiment_phase:local.experiment_phase,
  last_review_sha256:local.last_review_sha256,
  candidates_observed_last_review:finiteInt(local.recent_candidate_count,0,12)?
   local.recent_candidate_count:0,
  security_verification:'UNKNOWN_NOT_EXECUTABLE',
  confidence:'UNVERIFIED_MARKET_OBSERVATIONS',
  note:'NO_AUTO_PAPER_ORDER; latest read-only research audit, not an AI trader'};
}
function headers(token){
 if(typeof token!=='string'||!/^(?:github_pat_|ghp_)[A-Za-z0-9_]{15,}$/.test(token))
  throw Error('R29_DYNAMIC_TOKEN_REQUIRED');
 return {authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'content-type':'application/json','X-GitHub-Api-Version':'2022-11-28',
   'user-agent':'SniperR29AdaptivePublicStatus/1.0'};
}
export async function syncAdaptivePublicPresence({token,filename=localDynamicStatusFile(),
 fetcher=fetch}={}){
 let local;
 try{
   const bytes=await readFile(filename);
   if(bytes.length>12000)throw Error('R29_DYNAMIC_LOCAL_STATUS_TOO_LARGE');
   local=JSON.parse(bytes.toString('utf8'));
 }catch(e){
   if(e.code==='ENOENT')return {status:'NOT_STARTED_NO_LOCAL_RESEARCH_STATUS',
     skipped:true,published:false};
   throw e;
 }
 const body=sanitizedAdaptivePresence(local);
 const head=headers(token);
 const get=await fetcher(ENDPOINT+'?ref='+encodeURIComponent(BRANCH),
   {method:'GET',headers:head,signal:AbortSignal.timeout(12000)});
 let old=null,sha=null;
 if(get.status===200){
   const j=await get.json();
   if(j?.type!=='file'||typeof j.sha!=='string'||
      !/^[0-9a-f]{40}$/.test(j.sha)||typeof j.content!=='string'||
      j.encoding!=='base64')throw Error('R29_DYNAMIC_GITHUB_READ_INVALID');
   sha=j.sha;
   try{old=JSON.parse(Buffer.from(j.content.replace(/\s/g,''),'base64').toString('utf8'))}
   catch{throw Error('R29_DYNAMIC_GITHUB_INVALID_JSON')}
 }else if(get.status!==404)throw Error('R29_DYNAMIC_GITHUB_GET_HTTP_'+get.status);
 if(old?.schema===body.schema&&
    old.last_review_sha256===body.last_review_sha256&&
    old.total_review_count===body.total_review_count)
   return {status:'UNCHANGED',skipped:true,published:false,public:body};
 const payload={message:'research(r29): first-seen dynamic diagnostic state (no account data)',
   branch:BRANCH,content:Buffer.from(JSON.stringify(body,null,2)+'\n').toString('base64')};
 if(sha)payload.sha=sha;
 const put=await fetcher(ENDPOINT,{method:'PUT',headers:head,
   body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
 if(!put.ok)throw Error('R29_DYNAMIC_GITHUB_WRITE_HTTP_'+put.status);
 const result=await put.json();
 if(!/^[a-f0-9]{40}$/.test(result?.commit?.sha||''))
   throw Error('R29_DYNAMIC_COMMIT_INVALID');
 return {status:'PUBLISHED',skipped:false,published:true,
   commit_sha:result.commit.sha,public:body};
}
