// R29 canonical research fallback: read the CURRENT local market collector file,
// validate/whitelist public evidence, and mirror it to the SAME R29 GitHub branch
// used by GPT decision/context/receipts. No balance, wallet, API signing or orders.
// This supplements the historic research-gateway-v04 publisher; it does not
// replace the separate risk, sellability, quote and GPT decision authority.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {candidateId} from './research-watchlist.mjs';
import {validTokenAddress} from './market.mjs';
import {assertResearch} from './research-market-publisher.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPO='127027/Sniperbot-';
export const CANONICAL_MARKET_BRANCH='codex/r29-chatgpt-github-paper-cycle-20261115';
export const CANONICAL_MARKET_PATH='research/market/latest.json';
export const CANONICAL_MARKET_URL='https://api.github.com/repos/'+REPO+'/contents/'+CANONICAL_MARKET_PATH;
const ISO=x=>typeof x==='string'&&x.endsWith('Z')&&Number.isFinite(Date.parse(x));
const SOURCES=new Set(['GECKOTERMINAL_NEW_POOLS','GECKOTERMINAL_TRENDING_POOLS',
 'DEXSCREENER_PROMOTED_PROFILE_FALLBACK','R29_RANKING_CROSS_PROVIDER_POOL']);
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

// News and DEX narrative observations are independent RESEARCH inputs.
// Unknown URL fields, private metadata, inferred token identities and
// instructions contained in headlines never cross this public projection.
const NEWS_TAGS=new Set(['PUBLIC_NEWS_NARRATIVE_LEAD','MEME_CULTURE_CANDIDATE',
 'PUBLIC_FIGURE_CONTEXT','POSSIBLE_CRYPTO_TOKEN_CONTEXT',
 'GENERAL_EVENT_CATALYST_CANDIDATE']);
const NARRATIVE_TAGS=new Set(['NEW_TOKEN_PROFILE','COMMUNITY_TAKEOVER_UNVERIFIED','PAID_BOOST']);
function safeNewsLink(link){
 try{
  if(typeof link!=='string'||link.length>900||/\s/.test(link))return null;
  const url=new URL(link);
  if(url.protocol!=='https:'||url.username||url.password||url.port||
     !url.hostname.includes('.')||url.hostname==='localhost')return null;
  return url.toString();
 }catch{return null}
}
function publicNewsLead(e,at){
 if(!e||e.paper_only!==true||e.actionable!==false||
   !/^news-[a-f0-9]{32}$/.test(e.event_id||'')||
   !timeWindow(e.first_observed_at_utc,Date.parse(at),60*60_000)||
   !ISO(e.original_published_at_utc)||
   Date.parse(e.original_published_at_utc)>Date.parse(e.first_observed_at_utc)+60000||
   e.source_timestamp_quality!=='RSS_PUBLISHER_CLAIM_NOT_INDEPENDENTLY_ARCHIVED'||
   e.original_post_content_independently_verified!==false||
   e.chain!==null||e.token_address!==null||
   e.pool_address!==null||e.candidate_id!==null||
   typeof e.source_name!=='string'||!/^[A-Za-z0-9_-]{2,40}$/.test(e.source_name)||
   typeof e.title!=='string'||e.title.length<3||e.title.length>700)return null;
 const url=safeNewsLink(e.source_url);
 const categories=Array.isArray(e.signal_categories)?
   [...new Set(e.signal_categories.filter(t=>NEWS_TAGS.has(t)))].slice(0,4):[];
 if(!url||!categories.length)return null;
 return {event_id:e.event_id,source_name:e.source_name,source_url:url,
  title:e.title.replace(/[\u0000-\u001f<>]/g,' ').slice(0,250),
  original_published_at_utc:e.original_published_at_utc,
  first_observed_at_utc:e.first_observed_at_utc,
  source_timestamp_quality:e.source_timestamp_quality,
  signal_categories:categories,chain:null,token_address:null,pool_address:null,
  candidate_id:null,original_post_content_independently_verified:false,
  paper_only:true,actionable:false};
}
function publicNarrativeLead(e,at,candidates){
 if(!e||e.paper_only!==true||e.actionable!==false||
    e.origin!=='DEXSCREENER_METADATA_ONLY'||e.organic_social_verified!==false||
    e.probability_pct!==null||!timeWindow(e.observed_at_utc,Date.parse(at),60*60_000)||
    !['solana','base','bsc','eth'].includes(e.chain)||
    !validTokenAddress(e.chain,e.token_address)||
    typeof e.paid_promotion_seen!=='boolean')return null;
 const categories=Array.isArray(e.signal_categories)?
   [...new Set(e.signal_categories.filter(t=>NARRATIVE_TAGS.has(t)))].slice(0,3):[];
 const urls=onlySourceUrls(e.source_urls);
 if(!categories.length||!urls.length||!urls.every(u=>new URL(u).hostname==='api.dexscreener.com'))return null;
 const matches=candidates.filter(c=>c.chain===e.chain&&c.token_address===e.token_address);
 const linked=matches.length===1&&e.candidate_id===matches[0].candidate_id&&
   e.pool_address===matches[0].pool_address;
 return {chain:e.chain,token_address:e.token_address,observed_at_utc:e.observed_at_utc,
  origin:'DEXSCREENER_METADATA_ONLY',source_urls:urls,signal_categories:categories,
  paid_promotion_seen:e.paid_promotion_seen,organic_social_verified:false,
  candidate_id:linked?matches[0].candidate_id:null,
  pool_address:linked?matches[0].pool_address:null,
  paper_only:true,actionable:false,probability_pct:null,
  claim_status:linked?'SAME_CHAIN_TOKEN_POOL_LINK_NOT_SAFETY_VALIDATED':
    matches.length>1?'MULTIPLE_POOLS_REQUIRE_REVIEW':'UNVERIFIED_COIN_OR_NARRATIVE'};
}
// V6.4: additional neutral public ranking candidates, NOT market pools,
// not independent contract validation, not an early pre-breakout observation.
// Preserve unsupported chains for research only; never as executable candidates.
const RANKINGS=new Set(['SOLANA_NEW','SOLANA_GAINERS','BSC_NEW','BSC_GAINERS',
 'BASE_NEW','ETH_GAINERS','ROBINHOOD_NEW','ARC_NEW']);
function publicRankingLead(x,at){
 if(!x||x.paper_only!==true||x.actionable!==false||
  x.paper_entry_authorized!==false||x.pool_address!==null||
  x.candidate_id!==null||x.pool_identity_verified!==false||
  x.contract_identity_independently_verified!==false||
  x.trade_safety_verified!==false||
  x.source!=='SASA_PUBLIC_RANKING_RESEARCH'||
  x.claim_status!=='RANKING_TOKEN_LEAD_NOT_POOL_OR_EARLY_SIGNAL'||
  !RANKINGS.has(x.source_key)||
  !timeWindow(x.observed_at_utc,Date.parse(at),60*60_000)||
  !['solana','base','bsc','eth','robinhood','arc'].includes(x.chain))return null;
 const evm=['base','bsc','eth','robinhood','arc'].includes(x.chain);
 if(!(evm?/^0x[a-f0-9]{40}$/.test(x.token_address||''):
   validTokenAddress('solana',x.token_address)))return null;
 const source='https://sasapad.fun/top/';
 if(typeof x.source_url!=='string'||!x.source_url.startsWith(source)||
   !/^https:\/\/sasapad\.fun\/top\/[a-z0-9-]+\/$/.test(x.source_url))
  return null;
 const url='https://sasapad.fun/x/'+x.chain+'/'+x.token_address+'/';
 if(x.token_url!==url)return null;
 return {chain:x.chain,token_address:x.token_address,
  observed_at_utc:x.observed_at_utc,source:x.source,source_key:x.source_key,
  source_url:x.source_url,token_url:url,pool_address:null,candidate_id:null,
  contract_identity_independently_verified:false,pool_identity_verified:false,
  trade_safety_verified:false,paper_entry_authorized:false,
  paper_only:true,actionable:false,
  claim_status:'RANKING_TOKEN_LEAD_NOT_POOL_OR_EARLY_SIGNAL'};
}
function publicCoverage(raw,allowed,max){
 if(!Array.isArray(raw))return [];
 return raw.slice(0,max).filter(x=>x&&allowed.has(x.feed||x.source)&&
  ['OK','SOURCE_UNAVAILABLE'].includes(x.status))
  .map(x=>({...(x.feed?{feed:x.feed}:{source:x.source}),
   status:x.status}));
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
  source:['GECKOTERMINAL','GECKOTERMINAL_TRENDING',
    'DEXSCREENER_PROFILES_FALLBACK'].includes(c.source)?
   c.source:'OTHER',
  // Retain bounded, explicit failure reasons. Previously every HTTP 429,
  // timeout, DNS failure and skipped trending request became SOURCE_INCOMPLETE,
  // making the real Windows bottleneck impossible for GPT to diagnose.
  status:['OK','PARTIAL','PROMOTED_PROFILES_ONLY','NO_PAIR_IDENTITIES',
   'HTTP_429_RATE_LIMIT','SKIPPED_AFTER_RATE_LIMIT','TIMEOUT',
   'SOURCE_UNAVAILABLE','PROVIDER_RESPONSE_INVALID','NETWORK_ENOTFOUND','NETWORK_EAI_AGAIN',
   'NETWORK_ECONNRESET','NETWORK_ECONNREFUSED'].includes(c.status)?
   c.status:/^HTTP_(?:[45][0-9]{2})$/.test(c.status||'')?
    c.status:'SOURCE_INCOMPLETE',
  provider_rows:Math.max(0,Math.min(2000,Math.floor(BOUNDED(c.provider_rows)||0))),
  valid_identities:Math.max(0,Math.min(2000,Math.floor(BOUNDED(c.valid_identities)||0))),
  ...(Number.isInteger(c.pages_ok)&&c.pages_ok>=0&&c.pages_ok<=2?
   {pages_ok:c.pages_ok}:{}),
  ...(Number.isInteger(c.pages_requested)&&c.pages_requested>=1&&c.pages_requested<=2?
   {pages_requested:c.pages_requested}:{}),
  ...(Number.isInteger(c.omitted_by_research_cap)&&c.omitted_by_research_cap>=0?
   {omitted_by_research_cap:Math.min(2000,c.omitted_by_research_cap)}:{})
 }));
 const newsLeads=[...new Map((snapshot.news_leads||[])
  .map(e=>publicNewsLead(e,at)).filter(Boolean).map(e=>[e.event_id,e])).values()].slice(0,16);
 const narrativeLeads=[...new Map((snapshot.narrative_leads||[])
  .map(e=>publicNarrativeLead(e,at,candidates)).filter(Boolean)
  .map(e=>[e.chain+':'+e.token_address,e])).values()].slice(0,24);
 const rankingLeads=[...new Map((snapshot.ranking_leads||[])
  .map(x=>publicRankingLead(x,at)).filter(Boolean)
  .map(x=>[x.chain+':'+x.token_address,x])).values()].slice(0,48);
 const rankingCoverage=(snapshot.ranking_coverage||[]).slice(0,8)
  .filter(x=>x&&RANKINGS.has(x.source)&&
   ['OK','NO_VALID_TOKEN_LINKS','SOURCE_UNAVAILABLE'].includes(x.status))
  .map(x=>({source:x.source,status:x.status,
   token_leads:Math.max(0,Math.min(40,Math.floor(BOUNDED(x.token_leads)||0))),
   observed_at_utc:timeWindow(x.observed_at_utc,Date.parse(at),60*60_000)?
    x.observed_at_utc:null}));
 // Source-trace is public research only: do not export token selection,
 // personal funds, device identity, free-text errors, or any order status.
 const rank=snapshot.ranking_pool_resolution;
 const rankingPoolResolution=rank?{
   schema:'r29_ranking_pool_resolution.v1',paper_only:true,actionable:false,
   attempted:rank.attempted,cross_provider_matched:rank.cross_provider_matched,
   admitted:rank.admitted,capacity_skipped:rank.capacity_skipped,
   status:rank.status,checks:rank.checks.map(x=>({chain:x.chain,status:x.status}))
 }:null;
 const publicSnapshot={
  schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
  producer:'R29 read-only current local market collector canonical relay',
  published_at_utc:at,collection_status:'OBSERVED_OR_PARTIAL',
  coverage,candidates,research_alerts:alerts.slice(0,24),
  news_leads:newsLeads,narrative_leads:narrativeLeads,
  ranking_leads:rankingLeads,ranking_coverage:rankingCoverage,
  ...(rankingPoolResolution?{ranking_pool_resolution:rankingPoolResolution}:{}),
  news_coverage:publicCoverage(snapshot.news_coverage,
   new Set(['Decrypt','BeInCrypto','Cointelegraph','BBCWorld','BBCBusiness','BBCTech','BBCEntertainment','BBCUSCanada']),8),
  narrative_coverage:publicCoverage(snapshot.narrative_coverage,
   new Set(['NEW_TOKEN_PROFILE','COMMUNITY_TAKEOVER_UNVERIFIED','PAID_BOOST']),3),
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
   pages_per_chain:Number.isInteger(snapshot.summary?.pages_per_chain)?
    Math.max(0,Math.min(2,snapshot.summary.pages_per_chain)):0,
   source_identifiers_before_selection:Math.max(0,Math.min(20000,
    Math.floor(BOUNDED(snapshot.summary?.valid_source_identities_before_selection)||0))),
   omitted_by_per_chain_cap:Math.max(0,Math.min(20000,
    Math.floor(BOUNDED(snapshot.summary?.omitted_by_per_chain_cap)||0))),
   provider_coverage_ok:coverage.filter(x=>x.status==='OK').length,
   provider_coverage_failed:coverage.filter(x=>!['OK','PARTIAL','PROMOTED_PROFILES_ONLY',
    'NO_PAIR_IDENTITIES'].includes(x.status)).length,
   research_universe_complete:false,
   cross_checked:candidates.filter(x=>
    x.verification==='CROSS_PROVIDER_IDENTITY').length,
   promotional_only:candidates.filter(x=>x.promotion_biased).length,
   news_events_available:newsLeads.length,narrative_tokens_available:narrativeLeads.length,
   ranking_pool_attempted:rankingPoolResolution?.attempted??null,
   ranking_pool_cross_provider_matched:rankingPoolResolution?.cross_provider_matched??null,
   ranking_pool_admitted:rankingPoolResolution?.admitted??null,
   ranking_pool_capacity_skipped:rankingPoolResolution?.capacity_skipped??null,
   independent_ranking_research_leads:rankingLeads.length,
   unsupported_ranking_chain_leads:rankingLeads.filter(x=>['robinhood','arc'].includes(x.chain)).length,
   news_and_narratives_are_research_only:true,
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
