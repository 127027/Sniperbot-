// R29 public diagnostic for the actual laptop research feed. Read-only.
// This is NOT evidence of a GPT model call or permission to buy a memecoin.
// No account balances, token keys, wallet addresses, local paths or identifiers.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPO='127027/Sniperbot-';
const BRANCH='codex/r29-chatgpt-github-paper-cycle-20261115';
const MARKET_BRANCH='codex/research-gateway-v04';
const HOST='https://api.github.com/repos/'+REPO+'/contents/';
export const PUBLIC_SOURCE_HEALTH_PATH='research/r29/channel/forward-source-health.json';
export const SOURCE_HEALTH_SCHEMA='sniper_r29_forward_source_health.v1';
const REMOTE_MARKET='research/market/latest.json';
const TIME=x=>typeof x==='string'&&x.endsWith('Z')&&Number.isFinite(Date.parse(x));
const age=(at,now)=>TIME(at)&&Date.parse(at)<=now?
 Math.round((now-Date.parse(at))/60000):null;
const nowISO=n=>new Date(n).toISOString();
const tokenValid=x=>typeof x==='string'&&/^(?:github_pat_|ghp_)[A-Za-z0-9_]{15,}$/.test(x);
// Only classify a known local publication failure; never export raw exception
// strings from a user's machine or GitHub token into a public repository.
function classifiedMarketPublishError(s){
 if(!s||typeof s.publish_error!=='string'||!s.publish_error)
  return 'NONE_REPORTED';
 const e=s.publish_error.toUpperCase();
 if(e.includes('RESEARCH_PUBLISH_TOKEN')||e.includes('TOKEN_NOT_CONFIGURED'))
  return 'TOKEN_NOT_CONFIGURED';
 if(e.includes('UNSAFE')||e.includes('INVALID')||e.includes('SNAPSHOT'))
  return 'SCHEMA_OR_PROVENANCE_REJECTED';
 if(e.includes('HTTP_')||e.includes('GITHUB')||e.includes('COMMIT'))
  return 'GITHUB_RESEARCH_WRITE_FAILURE';
 return 'UNCLASSIFIED_PUBLICATION_ERROR';
}
const allowStreamStatus=new Set(['CONNECTED_FREE_ONLY','CONNECTING',
 'RECONNECTING','STALE_FEED_RECONNECTING','PROVIDER_REJECTED',
 'BLOCKED_PERSISTENCE','STOPPED','STARTING']);
async function localJson(file,{limit=30000}={}){
 try{
  const bytes=await readFile(file);
  if(bytes.length>limit)throw Error('SOURCE_HEALTH_LOCAL_STATUS_TOO_BIG');
  return JSON.parse(bytes.toString('utf8'));
 }catch(e){if(e.code==='ENOENT')return null;throw e}
}
async function getGithubContent(url,{token,fetcher}){
 const resp=await fetcher(url,{method:'GET',redirect:'error',
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28','user-agent':'R29-ReadOnly-Source-Health'},
  signal:AbortSignal.timeout(12000)});
 if(resp.status===404)return null;
 if(!resp?.ok)throw Error('SOURCE_HEALTH_GITHUB_READ_FAILED');
 const raw=await resp.json();
 if(raw?.type!=='file'||raw.encoding!=='base64'||
  typeof raw.content!=='string'||raw.content.length>350000)
  throw Error('SOURCE_HEALTH_GITHUB_CONTENT_INVALID');
 return JSON.parse(Buffer.from(raw.content.replace(/\s/g,''),'base64').toString('utf8'));
}
export function summarizeForwardSourceHealth({
 now=Date.now(),marketStatus=null,streamStatus=null,remoteMarket=null,
 remoteMarketAccess='UNAVAILABLE'
}={}){
 if(!Number.isFinite(now))throw Error('SOURCE_HEALTH_NOW_REQUIRED');
 const validMarket=marketStatus?.schema==='research_market_collector_status.v1'&&
  marketStatus.paper_only===true&&marketStatus.actionable===false;
 const validStream=streamStatus?.schema==='sniper_r29_solana_live_stream_status.v1'&&
  streamStatus.paper_only===true&&streamStatus.actionable===false;
 const marketLag=validMarket?age(marketStatus.last_check_at_utc,now):null;
 const streamConnected=validStream&&streamStatus.status==='CONNECTED_FREE_ONLY'&&
  streamStatus.connected===true;
 const streamLag=validStream?age(streamStatus.last_connected_at_utc,now):null;
 const remoteValid=remoteMarket?.schema==='research_market_snapshot.v1'&&
  remoteMarket.paper_only===true&&remoteMarket.actionable===false;
 const publicLag=remoteValid?age(remoteMarket.published_at_utc,now):null;
 const collectorFresh=marketLag!==null&&marketLag<=6;
 const marketPublishedRecently=publicLag!==null&&publicLag<=30;
 const marketStatusCode=!validMarket?'LOCAL_COLLECTOR_STATUS_MISSING_OR_INVALID':
  !collectorFresh?'LOCAL_COLLECTOR_STALE':
  marketStatus.status!=='RUNNING_RESEARCH'?'LOCAL_RESEARCH_SOURCE_BLOCKED':
  marketStatus.publishing_enabled!==true?'LOCAL_GITHUB_MARKET_PUBLISH_DISABLED':
  !marketPublishedRecently?'PUBLIC_MARKET_FEED_STALE':'RESEARCH_FEED_RECENT';
 const streamCode=!validStream?'SOLANA_STREAM_STATUS_MISSING_OR_INVALID':
  !streamConnected?'SOLANA_STREAM_NOT_CONFIRMED_CONNECTED':
  'SOLANA_STREAM_PROVIDER_CONNECTED_UNVERIFIED';
 return {
  schema:SOURCE_HEALTH_SCHEMA,mode:'PAPER_ONLY',real_trading_enabled:false,
  checked_at_utc:nowISO(now),market_source_status:marketStatusCode,
  market_collector_recent:collectorFresh,
  market_collector_last_check_utc:validMarket?marketStatus.last_check_at_utc:null,
  market_collector_lag_minutes:marketLag,
  market_github_publishing_configured:validMarket&&marketStatus.publishing_enabled===true,
  market_publication_error_class:validMarket?classifiedMarketPublishError(marketStatus):'UNKNOWN_NO_LOCAL_STATUS',
  public_market_recent:marketPublishedRecently,
  public_market_last_capture_utc:remoteValid?remoteMarket.published_at_utc:null,
  public_market_lag_minutes:publicLag,
  public_market_access:remoteMarketAccess,
  public_market_research_not_tradable:true,
  solana_stream_status:streamCode,
  solana_stream_provider_status:validStream&&allowStreamStatus.has(streamStatus.status)?
   streamStatus.status:'UNVERIFIED_OR_NOT_INSTALLED',
  solana_stream_last_connection_utc:validStream?streamStatus.last_connected_at_utc:null,
  solana_stream_connection_lag_minutes:streamLag,
  solana_stream_event_finality_verified:false,
  actual_gpt_model_scans_verified:false,
  actual_paper_fills_verified:false,
  source_complete:false,
  recommendation:'DO_NOT_BUY_ON_SOURCE_STATUS_ALONE',
  account_balance_or_private_wallet_published:false,
  // Critical: never report nominal current prices, stake limits or wallet IDs.
  note:'Independent future coin discovery requires current source identity, contract safety, and executable two-way quotes before any GPT BUY.'
 };
}
export async function syncPublicForwardSourceHealth({
 token,fetcher=fetch,now=Date.now(),
 marketFile=path.join(ROOT,'.local','research-market','status.json'),
 streamFile=path.join(ROOT,'.local','solana-live-stream','status.json')
}={}){
 if(!tokenValid(token)||!Number.isFinite(now))throw Error('SOURCE_HEALTH_AUTH_REQUIRED');
 const [market,stream]=await Promise.all([
  localJson(marketFile),localJson(streamFile)
 ]);
 const marketUrl=HOST+REMOTE_MARKET+'?ref='+encodeURIComponent(MARKET_BRANCH);
 let remote=null,remoteAccess='UNAVAILABLE';
 try{
  remote=await getGithubContent(marketUrl,{token,fetcher});
  remoteAccess=remote?'OK':'MISSING';
 }catch{remoteAccess='READ_FAILED';}
 const status=summarizeForwardSourceHealth({
  now,marketStatus:market,streamStatus:stream,
  remoteMarket:remote,remoteMarketAccess:remoteAccess});
 const url=HOST+PUBLIC_SOURCE_HEALTH_PATH;
 const previous=await fetcher(url+'?ref='+encodeURIComponent(BRANCH),{
  method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28','user-agent':'R29-ReadOnly-Source-Health'}});
 let old=null,sha=null;
 if(previous.status===200){
  const data=await previous.json();
  if(data?.type!=='file'||!/^[0-9a-f]{40}$/.test(data.sha||'')||
    data.encoding!=='base64'||typeof data.content!=='string'||
    data.content.length>12000)
   throw Error('SOURCE_HEALTH_EXISTING_REMOTE_INVALID');
  sha=data.sha;
  old=JSON.parse(Buffer.from(data.content.replace(/\s/g,''),'base64').toString('utf8'));
 }else if(previous.status!==404)
  throw Error('SOURCE_HEALTH_EXISTING_REMOTE_UNAVAILABLE');
 const past=age(old?.checked_at_utc,now);
 const noChange=old?.schema===SOURCE_HEALTH_SCHEMA&&
  old.market_source_status===status.market_source_status&&
  old.public_market_last_capture_utc===status.public_market_last_capture_utc&&
  old.solana_stream_status===status.solana_stream_status&&
  old.solana_stream_provider_status===status.solana_stream_provider_status&&
  old.market_github_publishing_configured===status.market_github_publishing_configured&&
  old.market_publication_error_class===status.market_publication_error_class&&
  old.public_market_access===status.public_market_access;
 if(noChange&&past!==null&&past<15)
  return {published:false,status:'UNCHANGED_RECENT',public:status};
 const payload={message:'research(r29): source freshness and missing link diagnostic only',
  branch:BRANCH,content:Buffer.from(JSON.stringify(status,null,2)+'\n').toString('base64')};
 if(sha)payload.sha=sha;
 const put=await fetcher(url,{method:'PUT',redirect:'error',
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'content-type':'application/json','X-GitHub-Api-Version':'2022-11-28',
   'user-agent':'R29-ReadOnly-Source-Health'},
  body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
 if(!put?.ok)throw Error('SOURCE_HEALTH_GITHUB_WRITE_FAILED');
 const result=await put.json();
 if(!/^[0-9a-f]{40}$/.test(result?.commit?.sha||''))
  throw Error('SOURCE_HEALTH_COMMIT_MISSING');
 return {published:true,status:'PUBLISHED',commit_sha:result.commit.sha,public:status};
}
