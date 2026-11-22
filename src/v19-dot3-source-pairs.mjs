// R29 V1.9 D3-02: explicit multi-chain quote-source capability and upstream audit.
// Distinct domains can corroborate research but are NOT proof of independent
// upstream pricing or of a tradable token. This module never emits orders.
import {canonicalChain,tokenValid,poolValid,parsePoolUrl,exactPoolUrl} from './market-evidence.mjs';

const CHAINS=Object.freeze(['solana','ethereum','base','bsc','robinhood','cronos']);
const providers=Object.freeze(['GECKOTERMINAL','DEXSCREENER']);
const ts=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const norm=(chain,x)=>chain==='solana'?x:String(x).toLowerCase();
const validNumber=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const pageChain=c=>c==='ethereum'?'eth':c==='cronos'?'cro':c;

export function describeDot3SourceCapabilities({chains=CHAINS}={}){
 if(!Array.isArray(chains)||!chains.length||chains.some(x=>!CHAINS.includes(x))
   ||new Set(chains).size!==chains.length)throw Error('INVALID_SOURCE_CAPABILITY_CHAINS');
 return {schema:1,kind:'R29_V19_DOT3_SOURCE_CAPABILITIES',
  chains:chains.map(chain=>({chain,
   probes:[
    {provider:'GECKOTERMINAL',api_path_template:
      'https://api.geckoterminal.com/api/v2/networks/'+pageChain(chain)+'/pools/{pool}',
     endpoint_support:'REQUIRES_OBSERVED_HTTP_PROOF'},
    {provider:'DEXSCREENER',api_path_template:
      'https://api.dexscreener.com/latest/dex/pairs/'+chain+'/{pool}',
     endpoint_support:'REQUIRES_OBSERVED_HTTP_PROOF'}],
   fallback_if_missing:'DATA_GAP_WITH_PROVIDER_RETRY_NOT_PERMANENT_REJECTED',
   upstream_independence_proven:false})),
  provider_count:providers.length,
  endpoint_templates_are_not_availability_claims:true,
  real_api_calls:0,trades_authorized:0};
}
export function auditDot3QuoteSourcePair({coin,observations=[],asOfUtc,
 maxAgeSeconds=90,maximumDisagreementPct=3,minimumLiquidityUsd=5000}={}){
 const at=ts(asOfUtc),chain=canonicalChain(coin?.chain);
 if(at===null||!chain||!poolValid(chain,coin?.pool,coin?.pool_kind)
   ||!tokenValid(chain,coin?.contract)||!Array.isArray(observations)
   ||!Number.isInteger(maxAgeSeconds)||maxAgeSeconds<1||maxAgeSeconds>600
   ||typeof maximumDisagreementPct!=='number'||maximumDisagreementPct<0
   ||typeof minimumLiquidityUsd!=='number'||minimumLiquidityUsd<0)
  throw Error('INVALID_DOT3_SOURCE_PAIR_INPUT');
 const accepted=[],rejected=[];
 for(const [index,q] of observations.entries()){
  const parsed=parsePoolUrl(q?.source_url);
  if(!parsed||!providers.includes(parsed.provider)
   ||!exactPoolUrl(q.source_url,chain,coin.pool)
   ||canonicalChain(q?.chain)!==chain||!tokenValid(chain,q?.contract)
   ||norm(chain,q.contract)!==norm(chain,coin.contract)
   ||!poolValid(chain,q?.pool,coin.pool_kind)
   ||norm(chain,q.pool)!==norm(chain,coin.pool)){
   rejected.push({index,reason:'EXACT_CHAIN_CONTRACT_POOL_OR_SOURCE_MISMATCH'});continue;
  }
  const captured=ts(q.captured_at_utc),provided=ts(q.provider_quote_asof_utc);
  const validCaptured=captured!==null&&captured<=at;
  if(!validCaptured){rejected.push({index,reason:'FUTURE_OR_MISSING_HTTP_CAPTURE'});continue;}
  if(!validNumber(q.price_usdc)||!validNumber(q.liquidity_usdc)){
   rejected.push({index,reason:'INVALID_PRICE_OR_LIQUIDITY'});continue;
  }
  // A provider-time field is never inferred from the HTTP response time.
  const providerTimeVerified=q.provider_time_independently_verified===true
    &&provided!==null&&provided<=captured&&at-provided<=maxAgeSeconds*1000;
  // Self-declared provider-time verification is insufficient without a
  // separately referenced verified source proof. This audit stays advisory.
  const captureFresh=at-captured<=maxAgeSeconds*1000;
  accepted.push({provider:parsed.provider,domain:parsed.host,
   chain,pool:coin.pool,contract:coin.contract,
   captured_at_utc:q.captured_at_utc,
   provider_quote_asof_utc:q.provider_quote_asof_utc??null,
   provider_quote_freshness_asserted:providerTimeVerified,
   provider_quote_time_independently_attested:false,
   http_capture_fresh:captureFresh,
   source_archive_blob_sha:q.source_archive_blob_sha??null,
   upstream_feed_id:q.upstream_feed_id??null,
   upstream_feed_identity_independently_attested:false,
   price_usdc:q.price_usdc,liquidity_usdc:q.liquidity_usdc,
   quote_independently_authenticated:false});
 }
 // Use the most recent captured quote per hostname, never count two
 // requests to one domain as independent corroboration.
 const byHost=new Map();
 for(const q of accepted){
  const old=byHost.get(q.domain);
  if(!old||ts(q.captured_at_utc)>ts(old.captured_at_utc))byHost.set(q.domain,q);
 }
 const pair=[...byHost.values()];
 const distinctDomains=pair.length>=2,agesOk=pair.length>=2
   &&pair.every(q=>q.http_capture_fresh);
 const prices=pair.slice(0,2).map(q=>q.price_usdc);
 const divergence=prices.length===2
   ?100*Math.abs(prices[0]-prices[1])/((prices[0]+prices[1])/2):null;
 const liquidity=pair.length>=2?Math.min(...pair.map(q=>q.liquidity_usdc)):null;
 const knownUpstreams=pair.slice(0,2).map(q=>q.upstream_feed_id);
 const assertedUpstreamOverlap=knownUpstreams.length===2&&knownUpstreams.every(x=>typeof x==='string'&&x)
   &&knownUpstreams[0]===knownUpstreams[1];
 const quoteConflict=divergence!==null&&divergence>maximumDisagreementPct;
 const tooLittleLiquidity=liquidity!==null&&liquidity<minimumLiquidityUsd;
 const status=!distinctDomains?'MISSING_SECOND_DISTINCT_DOMAIN':
   !agesOk?'HTTP_CAPTURE_STALE':
   assertedUpstreamOverlap?'SAME_REPORTED_UPSTREAM':
   quoteConflict?'INDICATIVE_PRICE_DISAGREEMENT':
   tooLittleLiquidity?'INDICATIVE_LOW_LIQUIDITY':
   'TWO_DOMAIN_INDICATIVE_ONLY';
 const nextAction=status==='MISSING_SECOND_DISTINCT_DOMAIN'?'FETCH_ALTERNATIVE_EXACT_POOL_SOURCE':
   status==='HTTP_CAPTURE_STALE'?'REFRESH_SOURCE_CAPTURES':
   status==='SAME_REPORTED_UPSTREAM'?'FIND_PROVABLY_INDEPENDENT_UPSTREAM':
   status==='INDICATIVE_PRICE_DISAGREEMENT'?'RECHECK_CONFLICTING_QUOTES':
   status==='INDICATIVE_LOW_LIQUIDITY'?'RECHECK_LIQUIDITY_AND_EXIT_DEPTH':
   'VERIFY_PROVIDER_TIMES_UPSTREAM_AND_SELLABILITY';
 return {schema:1,kind:'R29_V19_DOT3_TWO_DOMAIN_SOURCE_AUDIT',as_of_utc:asOfUtc,
   chain,pool:coin.pool,contract:coin.contract,status,next_action,
   observations_received:observations.length,observations_structurally_matched:accepted.length,
   distinct_valid_domains:byHost.size,rejected,
   distinct_web_domains_observed:distinctDomains,
   upstream_overlap_reported:assertedUpstreamOverlap,
   independently_verified_upstream_count:0,
   real_upstream_independence_proven:false,
   provider_quote_times_independently_verified:false,
   full_quote_pair_age_valid:agesOk,
   quoted_price_disagreement_pct:divergence,
   minimum_observed_liquidity_usd:liquidity,
   matched_sources:pair,
   provider_chain_support_proven:accepted.length>0,
   research_only:true,trade_authorized:false,
   quote_quality:'INDICATIVE_WEB_ONLY',
   reason:'Different domains are not proof of distinct upstream pricing; provider times and source authenticity remain unverified.'};
}
