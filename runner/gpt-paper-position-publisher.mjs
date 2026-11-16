// Read-only public minimal GPT-managed Paper position IDs for EXIT analysis.
// No account balances, quantity, cost basis, wallet, API keys, PnL in USDC.
import {validTokenAddress} from './market.mjs';
import {GPT_PAPER_CONTEXT_PATH,GPT_PAPER_BRANCH,GPT_PAPER_REPO} from './gpt-paper-protocol.mjs';
const ROOT='https://api.github.com/repos/'+GPT_PAPER_REPO+'/contents/'+GPT_PAPER_CONTEXT_PATH;
const tokenOk=t=>typeof t==='string'&&/^(?:github_pat_|ghp_)[A-Za-z0-9_]{15,}$/.test(t);
const timeOk=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s));
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
export function sanitizeGptPublicPositionContext(input,{now=Date.now()}={}){
 if(input?.ok!==true||input.schema!=='sniper_r29_gpt_public_position_context.v1'||
   input.mode!=='PAPER_ONLY'||input.real_trading_enabled!==false||
   input.account_balances_excluded!==true||input.position_amounts_excluded!==true||
   typeof input.gpt_follow_enabled!=='boolean'||typeof input.paper_bot_enabled!=='boolean'||
   !timeOk(input.as_of_utc)||Date.parse(input.as_of_utc)>now||
   now-Date.parse(input.as_of_utc)>120000||
   !Array.isArray(input.positions)||input.positions.length>12)
   throw Error('GPT_POSITION_CONTEXT_UNVERIFIED');
 const positions=input.positions.map(p=>{
  if(!['base','eth','bsc','solana'].includes(p?.chain)||
   !validTokenAddress(p.chain,p.token_address)||
   !validTokenAddress(p.chain,p.pool_address)||
   p.gpt_opened_paper_position!==true||!timeOk(p.opened_at_utc)||
   Date.parse(p.opened_at_utc)>now||
   !finite(p.entry_price_usd)||
   !(p.indicative_price_usd===null||finite(p.indicative_price_usd))||
   !(p.quote_at_utc===null||timeOk(p.quote_at_utc)))
   throw Error('GPT_POSITION_CONTEXT_INVALID_POSITION');
  return {chain:p.chain,token_address:p.token_address,
   pool_address:p.pool_address,opened_at_utc:p.opened_at_utc,
   entry_price_usd:p.entry_price_usd,
   indicative_price_usd:p.indicative_price_usd,
   quote_at_utc:p.quote_at_utc,
   paper_only:true};
 });
 return {schema:'sniper_r29_public_gpt_position_context.v1',
  mode:'PAPER_ONLY',real_trading_enabled:false,
  account_balances_published:false,position_amounts_published:false,
  gpt_follow_enabled:input.gpt_follow_enabled,paper_bot_enabled:input.paper_bot_enabled,
  observed_at_utc:input.as_of_utc,positions,
  warning:'Only GPT-managed virtual position IDs; not proof of executable real swaps'};
}
export async function syncGptPaperPublicPositionContext({token,
 fetcher=fetch,localFetcher=fetch,now=null}={}){
 // The local HTTP service generates as_of_utc DURING the request. Capturing
 // Date.now() as a default argument BEFORE fetch always misclassifies that
 // fresh response as being from the future. Sample after receiving its JSON.
 if(now!==null&&!Number.isFinite(now))throw Error('GPT_POSITION_NOW_INVALID');
 if(!tokenOk(token))throw Error('GPT_POSITION_GITHUB_TOKEN_REQUIRED');
 const local=await localFetcher('http://127.0.0.1:3030/api/gpt/paper/context',{
  method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
 if(!local?.ok)throw Error('GPT_POSITION_LOCAL_HTTP_'+local?.status);
 const localBody=await local.json();
 const observedNow=now===null?Date.now():now;
 const sanitized=sanitizeGptPublicPositionContext(localBody,{now:observedNow});
 const headers={authorization:'Bearer '+token,accept:'application/vnd.github+json',
  'content-type':'application/json','X-GitHub-Api-Version':'2022-11-28',
  'user-agent':'R29-GPT-Paper-Position-Context/1'};
 const url=ROOT+'?ref='+encodeURIComponent(GPT_PAPER_BRANCH);
 const result=await fetcher(url,{method:'GET',headers,redirect:'error',
  signal:AbortSignal.timeout(10000)});
 let old=null,sha=null;
 if(result.status===200){
  const file=await result.json();
  if(file?.type!=='file'||file.encoding!=='base64'||typeof file.content!=='string'||
   !/^[0-9a-f]{40}$/.test(file.sha||''))
   throw Error('GPT_POSITION_REMOTE_INVALID');
  sha=file.sha;
  old=JSON.parse(Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'));
 }else if(result.status!==404)throw Error('GPT_POSITION_GITHUB_READ_HTTP_'+result.status);
 const a=JSON.stringify(old?.positions||[]);
 const b=JSON.stringify(sanitized.positions);
 const unchanged=old?.schema===sanitized.schema&&
  old.gpt_follow_enabled===sanitized.gpt_follow_enabled&&
  old.paper_bot_enabled===sanitized.paper_bot_enabled&&a===b;
 if(unchanged&&timeOk(old?.observed_at_utc)&&observedNow-Date.parse(old.observed_at_utc)>=0&&
    observedNow-Date.parse(old.observed_at_utc)<15*60000)
  return {status:'UNCHANGED',published:false,context:sanitized};
 const payload={message:'research(r29): public GPT-owned PAPER position targets (no balances)',
  branch:GPT_PAPER_BRANCH,
  content:Buffer.from(JSON.stringify(sanitized,null,2)+'\n').toString('base64')};
 if(sha)payload.sha=sha;
 const update=await fetcher(ROOT,{method:'PUT',redirect:'error',
  headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
 if(!update?.ok)throw Error('GPT_POSITION_GITHUB_WRITE_HTTP_'+update?.status);
 const done=await update.json();
 if(!/^[a-f0-9]{40}$/.test(done?.commit?.sha||''))
  throw Error('GPT_POSITION_GITHUB_COMMIT_INVALID');
 return {status:'PUBLISHED',published:true,commit_sha:done.commit.sha,
  context:sanitized};
}
