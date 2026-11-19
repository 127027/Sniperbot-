// R29 canonical research fallback: read the CURRENT local market collector file,
// validate/whitelist public evidence, and mirror it to the SAME R29 GitHub branch
// used by GPT decision/context/receipts. No balance, wallet, API signing or orders.
// This supplements the historic research-gateway-v04 publisher; it does not
// replace the separate risk, sellability, quote and GPT decision authority.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {candidateId} from './research-watchlist.mjs';
import {assertResearch} from './research-market-publisher.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPO='127027/Sniperbot-';
export const CANONICAL_MARKET_BRANCH='codex/r29-chatgpt-github-paper-cycle-20261115';
export const CANONICAL_MARKET_PATH='research/market/latest.json';
export const CANONICAL_MARKET_URL='https://api.github.com/repos/'+REPO+'/contents/'+CANONICAL_MARKET_PATH;
const ISO=x=>typeof x==='string'&&x.endsWith('Z')&&Number.isFinite(Date.parse(x));
const SOURCES=new Set(['GECKOTERMINAL_NEW_POOLS','DEXSCREENER_PROMOTED_PROFILE_FALLBACK']);
const VERIFICATION=new Set(['PROVIDER_ONLY','CROSS_PROVIDER_IDENTITY']);
const CHECKS=new Set(['INDEPENDENT_PAIR_IDENTITY','CONTRACT','LIQUIDITY_RISK','SELLABILITY','PAID_PROFILE_BIAS']);
const SOURCE_HOSTS=new Set(['api.geckoterminal.com','api.dexscreener.com','pumpportal.fun']);
const BOUNDED=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e14?x:null;
const goodUrl=x=>{
 if(typeof x!=='string'||x.length>900||/\s/.test(x))return false;
 try{
  const u=new URL(x);
  return u.protocol==='https:'&&SOURCE_HOSTS.has(u.hostname)&&
    !u.username&&!u.password&&!u.port;
 }catch{return false}
};
const onlySourceUrls=urls=>Array.isArray(urls)?
 [...new Set(urls.filter(goodUrl))].slice(0,5):[];
const SHA=/^[0-9a-f]{40}$/;
function timeWindow(at,now,maxMs){
 if(!ISO(at))return false;
 const t=Date.parse(at);
 return t<=now&&t>=now-maxMs;
}
function publicCandidate(c,at){
 if(!c||typeof c!=='object'||Array.isArray(c)||
  !SOURCES.has(c.source)||!VERIFICATION.has(c.verification)||
  c.promotion_biased!==(c.source==='DEXSCREENER_PROMOTED_PROFILE_FALLBACK')||
  !timeWindow(c.observed_at_utc,Date.parse(at),5*60_000))return null;
 let id;
 try{id=candidateId(c.chain,c.token_address,c.pool_address)}catch{return null}
 if(id!==c.candidate_id)return null;
 const urls=onlySourceUrls(c.source_urls);
 if(!urls.length)return null;
 const created=ISO(c.pool_created_at_utc)&&
  Date.parse(c.pool_created_at_utc)<=Date.parse(c.observed_at_utc)?
  c.pool_created_at_utc:null;
 const checks=Array.isArray(c.unresolved_checks)?
  [...new Set(c.unresolved_checks.filter(x=>CHECKS.has(x)))]:[];
 return {chain:c.chain,token_address:c.token_address,pool_address:c.pool_address,
  candidate_id:id,observed_at_utc:c.observed_at_utc,pool_created_at_utc:created,
  liquidity_usd:BOUNDED(c.liquidity_usd),volume_m5_usd:BOUNDED(c.volume_m5_usd),
  price_usd:BOUNDED(c.price_usd),buys_m5:BOUNDED(c.buys_m5),sells_m5:BOUNDED(c.sells_m5),
  source:c.source,verification:c.verification,
  promotion_biased:c.promotion_biased,
  source_urls:urls,unresolved_checks:
   [...new Set([...checks,'CONTRACT','LIQUIDITY_RISK','SELLABILITY'])]};
}
function publicAlert(e,at,candidates){
 if(!e||e.paper_only!==true||e.actionable!==false||
  !timeWindow(e.observed_at_utc,Date.parse(at),60*60_000)||
  !/^research-alert-[a-f0-9]{32}$/.test(e.event_id||''))return null;
 const goodCandidates=new Set(candidates.map(x=>x.candidate_id));
 const isStream=['SOLANA_STREAM_NEW_TOKEN','SOLANA_STREAM_MIGRATION'].includes(e.event_type);
 const isFirst=e.event_type==='NEW_POOL_FIRST_OBSERVED';
 const isAcceleration=e.event_type==='MARKET_ACCELERATION';
 if(!isStream&&!isFirst&&!isAcceleration)return null;
 if(isFirst||isAcceleration){
  if(!goodCandidates.has(e.candidate_id))return null;
 }
 if(isStream){
  if(e.chain!=='solana'||typeof e.token_address!=='string')return null;
 }
 const required=['CONTRACT_SECURITY','LP_CONTROL','SELLABILITY',
  'EXECUTABLE_BUY_AND_SELL_QUOTE','INDEPENDENT_REVIEW'];
 const out={
  event_id:e.event_id,event_type:e.event_type,
  chain:e.chain,token_address:e.token_address,pool_address:e.pool_address??null,
  candidate_id:isStream?(e.candidate_id??null):
   goodCandidates.has(e.candidate_id)?e.candidate_id:null,
  observed_at_utc:e.observed_at_utc,
  paper_only:true,actionable:false,probability_pct:null,
  recommended_action:'INDEPENDENT_FIVE_ROLE_REVIEW',
  unknown_checks:required,warning:'Observation only, never a BUY signal.'
 };
 if(isFirst){
  if(!ISO(e.pool_created_at_utc)||!Number.isFinite(e.provider_creation_age_at_observation_ms)||
    !goodCandidates.has(e.candidate_id))return null;
  out.pool_created_at_utc=e.pool_created_at_utc;
  out.provider_creation_age_at_observation_ms=e.provider_creation_age_at_observation_ms;
  out.source_urls=onlySourceUrls(e.source_urls);
  if(!out.source_urls.length)return null;
 }else if(isStream){
  // The original validated provider event supplied these fields. No forging
  // an onchain timestamp, liquidity or confidence from arrival-only data.
  out.unknown_checks=['CHAIN_FINALITY','POOL_IDENTITY_IF_UNKNOWN',
   'UNIQUE_WALLET_ANALYSIS','CONTRACT_SECURITY','LP_CONTROL',
   'EXECUTABLE_BUY_AND_SELL_QUOTES','FEES_AND_SLIPPAGE'];
  out.source_event_at_utc=null;
  out.source_timestamp_quality='LOCAL_RECEIVE_ONLY';
  out.transaction_signature=e.transaction_signature;
  out.provider=e.provider;
  out.chain_finality='UNVERIFIED_PROVIDER_EVENT';
  out.source_urls=onlySourceUrls(e.source_urls);
  if(out.source_urls.length!==1||
    out.source_urls[0]!=='https://pumpportal.fun/data-api/real-time/')return null;
 }else{
  // Acceleration is derived from local two-snapshot observation; no confidence.
  out.current_liquidity_usd=BOUNDED(e.current_liquidity_usd);
 }
 return out;
}
export function canonicalPublicMarketProjection(snapshot,{now=Date.now()}={}){
 assertResearch(snapshot);
 if(!Number.isFinite(now)||snapshot.collection_status!=='OBSERVED_OR_PARTIAL'||
  !timeWindow(snapshot.published_at_utc,now,10*60_000))
  throw Error('R29_CANONICAL_MARKET_STALE_OR_UNAVAILABLE');
 const at=snapshot.published_at_utc;
 const ids=new Set(),candidates=[];
 for(const c of snapshot.candidates){
  const clean=publicCandidate(c,at);
  if(!clean||ids.has(clean.candidate_id))continue;
  ids.add(clean.candidate_id);candidates.push(clean);
 }
 if(!candidates.length)throw Error('R29_CANONICAL_NO_TRUSTED_POOL_IDENTITIES');
 const alerts=[];
 for(const e of snapshot.research_alerts||[]){
  const clean=publicAlert(e,at,candidates);
  if(clean&&alerts.every(x=>x.event_id!==clean.event_id))alerts.push(clean);
 }
 const coverage=(snapshot.coverage||[]).slice(0,12).map(c=>({
  chain:['solana','base','bsc','eth'].includes(c.chain)?c.chain:'unknown',
  source:['GECKOTERMINAL','DEXSCREENER_PROFILES_FALLBACK'].includes(c.source)?
   c.source:'OTHER',
  status:['OK','PARTIAL','PROMOTED_PROFILES_ONLY','NO_PAIR_IDENTITIES'].includes(c.status)?
   c.status:'SOURCE_INCOMPLETE',
  provider_rows:Math.max(0,Math.min(2000,Math.floor(BOUNDED(c.provider_rows)||0))),
  valid_identities:Math.max(0,Math.min(2000,Math.floor(BOUNDED(c.valid_identities)||0)))
 }));
 const publicSnapshot={
  schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
  producer:'R29 read-only current local market collector canonical relay',
  published_at_utc:at,collection_status:'OBSERVED_OR_PARTIAL',
  coverage,candidates,research_alerts:alerts.slice(0,24),
  // Preserve independently recorded exact-pool SCOUT candidates for GPT
  // across pages/scans. Old observations are visibly stale, never order proof.
  watch_candidates:(snapshot.watch_candidates||[]).slice(0,24).map(x=>({
    candidate_id:x.candidate_id,chain:x.chain,token_address:x.token_address,
    pool_address:x.pool_address,first_seen_at_utc:x.first_seen_at_utc,
    last_seen_at_utc:x.last_seen_at_utc,observation_count:x.observation_count,
    verification:x.verification,
    last_indicative_price_usd:x.last_indicative_price_usd,
    last_indicative_liquidity_usd:x.last_indicative_liquidity_usd,
    last_indicative_volume_m5_usd:x.last_indicative_volume_m5_usd,
    source:'LOCAL_SCOUT_OBSERVATIONS',
    research_status:'SCOUT_WATCH_NOT_GPT_DECISION',
    paper_only:true,actionable:false,paper_entry_authorized:false
  })),
  summary:{identities:candidates.length,discovery_cap_per_scan:96,
   pages_per_chain:0,cross_checked:candidates.filter(x=>
    x.verification==='CROSS_PROVIDER_IDENTITY').length,
   promotional_only:candidates.filter(x=>x.promotion_biased).length,
   note:'Canonical fallback from current local capture, no safety, exit quote or trading authority.'}
 };
 assertResearch(publicSnapshot);
 return publicSnapshot;
}
const access=token=>{
 if(typeof token!=='string'||!/^(?:github_pat_|ghp_)[A-Za-z0-9_]{15,}$/.test(token))
  throw Error('R29_CANONICAL_RELAY_GITHUB_TOKEN_REQUIRED');
 return {authorization:'Bearer '+token,accept:'application/vnd.github+json',
  'content-type':'application/json','X-GitHub-Api-Version':'2022-11-28',
  'user-agent':'R29-PaperOnly-Market-Relay'};
};
export async function mirrorFreshLocalMarketToCanonical({
 token,fetcher=fetch,now=Date.now(),
 filename=path.join(ROOT,'.local','research-market','latest.json')
}={}){
 const headers=access(token);
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!Number.isFinite(now))
  throw Error('R29_CANONICAL_RELAY_INVALID_CONFIG');
 let raw;
 try{raw=await readFile(filename)}
 catch(e){
  if(e.code==='ENOENT')return {published:false,status:'NO_LOCAL_CAPTURE'};
  throw e;
 }
 if(raw.length>300_000)throw Error('R29_CANONICAL_RELAY_LOCAL_DATA_TOO_LARGE');
 const projected=canonicalPublicMarketProjection(JSON.parse(raw.toString('utf8')),{now});
 const url=CANONICAL_MARKET_URL,ref=CANONICAL_MARKET_BRANCH;
 const get=await fetcher(url+'?ref='+encodeURIComponent(ref),{method:'GET',
  redirect:'error',headers,signal:AbortSignal.timeout(12000)});
 let sha=null,old=null;
 if(get.status===200){
  const j=await get.json();
  if(j.type!=='file'||!SHA.test(j.sha||'')||j.encoding!=='base64'||
    typeof j.content!=='string'||j.content.length>420000)
   throw Error('R29_CANONICAL_MARKET_REMOTE_INVALID');
  sha=j.sha;
  try{old=JSON.parse(Buffer.from(j.content.replace(/\s/g,''),'base64').toString('utf8'))}
  catch{throw Error('R29_CANONICAL_MARKET_REMOTE_JSON_INVALID')}
 }else if(get.status!==404)
  throw Error('R29_CANONICAL_MARKET_READ_HTTP_'+get.status);
 if(old&&old.schema==='research_market_snapshot.v1'&&
  old.paper_only===true&&old.actionable===false&&
  ISO(old.published_at_utc)&&
  Date.parse(old.published_at_utc)>=Date.parse(projected.published_at_utc))
  return {published:false,status:'CAPTURE_NOT_NEWER',at_utc:projected.published_at_utc};
 const body={message:'research(r29): fresh read-only canonical market capture, never trade',
  branch:ref,content:Buffer.from(JSON.stringify(projected,null,2)+'\n').toString('base64')};
 if(sha)body.sha=sha;
 const put=await fetcher(url,{method:'PUT',redirect:'error',headers,
  signal:AbortSignal.timeout(12000),body:JSON.stringify(body)});
 if(put.status===409||put.status===422)throw Error('R29_CANONICAL_MARKET_GITHUB_CONFLICT');
 if(!put?.ok)throw Error('R29_CANONICAL_MARKET_WRITE_HTTP_'+put?.status);
 const written=await put.json();
 if(!SHA.test(written?.commit?.sha||''))
  throw Error('R29_CANONICAL_MARKET_WRITE_NOT_CONFIRMED');
 return {published:true,status:'CANONICAL_PUBLIC_RESEARCH_ONLY',
  at_utc:projected.published_at_utc,commit_sha:written.commit.sha,
  branch:CANONICAL_MARKET_BRANCH,paper_order_created:false,
  market_candidates:projected.candidates.length,early_events:projected.research_alerts.length};
}
