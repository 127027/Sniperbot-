// Separate immutable source observations from risk and trading authorization.
// No source is promoted to a safe BUY merely because two price websites agree.
import {canonicalChain,tokenValid,poolValid} from './market-evidence.mjs';
const ms=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
const key=(c,p)=>c+':'+(c==='solana'?p:String(p).toLowerCase());
export function makeResearchHandoff({evidence,atUtc,maxAgeMinutes=10}={}){
 const now=ms(atUtc);
 if(now===null||!Number.isFinite(maxAgeMinutes)||maxAgeMinutes<=0)throw Error('INVALID_HANDOFF_TIME');
 if(evidence?.kind!=='DOT2_PUBLIC_CAPTURE_EVIDENCE'||evidence?.mode!=='PAPER_RESEARCH_ONLY')
  throw Error('INVALID_RESEARCH_FEED');
 const capture=ms(evidence.captured_completed_at_utc);
 const fresh=capture!==null&&capture<=now&&now-capture<=maxAgeMinutes*60000;
 const pairs=Array.isArray(evidence.dex_checks)?evidence.dex_checks:[];
 const raw=[];
 for(const item of [...(evidence.gecko?.candidates??[]),...(evidence.older_pool_candidates??[])]){
   const c=canonicalChain(item?.chain),pool=item?.pool,contract=item?.contract;
   if(!c||!poolValid(c,pool,item?.pool_kind))continue;
   raw.push({chain:c,pool,pool_kind:item.pool_kind||null,contract:tokenValid(c,contract)?contract:null,
    source_url:item.source_url||null,
    symbol:item.symbol||null,source_class:item.source_api==='GECKOTERMINAL_TRENDING_POOLS_JSON'
      ?'GECKOTERMINAL_TRENDING_RESEARCH_ONLY':'GECKOTERMINAL_POOL_WITH_BASE_CONTRACT',
    primary_quote_usd:item.observed_price_usd,primary_liquidity_usd:item.liquidity_usd,
    captured_at_utc:item.observed_at_utc});
 }
 for(const item of evidence.dex_fallback_candidates??[]){
   const c=canonicalChain(item?.chain),pool=item?.pool,contract=item?.contract;
   if(!c||!poolValid(c,pool,item?.pool_kind))continue;
   raw.push({chain:c,pool,pool_kind:item.pool_kind||null,contract:tokenValid(c,contract)?contract:null,
    source_url:item.source_url||null,
    symbol:item.symbol||null,source_class:'DEX_SINGLE_SOURCE_RECOVERY',
    primary_quote_usd:null,primary_liquidity_usd:null,captured_at_utc:item.observed_at_utc});
 }
 const dedup=new Map();
 for(const c of raw){
   const k=key(c.chain,c.pool);
   const old=dedup.get(k);
   if(!old||(!old.contract&&c.contract)||(old.source_class==='DEX_SINGLE_SOURCE_RECOVERY'&&c.source_class!=='DEX_SINGLE_SOURCE_RECOVERY'))
    dedup.set(k,c);
 }
 const candidates=[];
 for(const c of dedup.values()){
   const p=pairs.find(p=>canonicalChain(p.chain)===c.chain&&p.pool&&key(c.chain,p.pool)===key(c.chain,c.pool));
   const independentlyMatched=['GECKOTERMINAL_POOL_WITH_BASE_CONTRACT','GECKOTERMINAL_TRENDING_RESEARCH_ONLY'].includes(c.source_class)&&p?.matched===true
      &&p?.status==='TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY';
   const independentQuote=fresh&&independentlyMatched;
   const sourceObservations=[];
   // Raw HTTP capture times are used only for indicative research. The source
   // has NOT supplied a verified provider quote time or independent upstream.
   if(c.source_class!=='DEX_SINGLE_SOURCE_RECOVERY'
     &&typeof c.source_url==='string'
     &&typeof c.primary_quote_usd==='number'&&c.primary_quote_usd>0
     &&typeof c.primary_liquidity_usd==='number'&&c.primary_liquidity_usd>0){
     sourceObservations.push({provider_id:'GECKOTERMINAL',chain:c.chain,
       pool:c.pool,contract:c.contract,source_url:c.source_url,
       captured_at_utc:c.captured_at_utc,provider_quote_asof_utc:null,
       price_usdc:c.primary_quote_usd,liquidity_usdc:c.primary_liquidity_usd,
       source_archive_blob_sha:null,upstream_feed_id:null});
   }
   if(p?.matched===true&&typeof p.dexscreener_price_usd==='number'
      &&p.dexscreener_price_usd>0&&typeof p.dexscreener_liquidity_usd==='number'
      &&p.dexscreener_liquidity_usd>0){
     sourceObservations.push({provider_id:'DEXSCREENER',chain:c.chain,
       pool:c.pool,contract:c.contract,
       source_url:'https://dexscreener.com/'+c.chain+'/'+c.pool,
       captured_at_utc:p.checked_at_utc,provider_quote_asof_utc:null,
       price_usdc:p.dexscreener_price_usd,
       liquidity_usdc:p.dexscreener_liquidity_usd,
       source_archive_blob_sha:null,upstream_feed_id:null});
   }
   const researchLevel=independentQuote?'TWO_DOMAIN_PRICE_LIQUIDITY_PROVISIONAL':
      c.source_class==='DEX_SINGLE_SOURCE_RECOVERY'?'SINGLE_PROVIDER_CONTRACT_ONLY':
      p?.status==='PRICE_DISAGREEMENT'?'PRICE_DISAGREEMENT':
      'POOL_IDENTITY_ONLY_NEEDS_RISK_CHECK';
   candidates.push({...c,pool_key:key(c.chain,c.pool),evidence_path:evidence.request_path||null,
      source_observations:sourceObservations,
      research_level:!fresh?'STALE_SOURCE_FOR_LIVE_RISK':researchLevel,
      second_source_price_usd:p?.dexscreener_price_usd??null,
      second_source_liquidity_usd:p?.dexscreener_liquidity_usd??null,
      second_source_checked_at_utc:p?.checked_at_utc??null,
      price_disagreement_pct:p?.price_divergence_pct??null,
      independent_price_liquidity_ready:independentQuote,
      qualified_for_risk_review:!!c.contract&&fresh,
      security_verified:false,sellability_verified:false,
      BUY_AUTHORIZED:false});
 }
 return {schema:1,kind:'DOT2_TO_DOT3_EVIDENCE_HANDOFF',as_of_utc:atUtc,
  source_request_path:evidence.request_path,source_capture_utc:evidence.captured_completed_at_utc,
  live_capture_fresh:fresh,counts:{observations:raw.length,unique_pools:candidates.length,
    full_contracts:candidates.filter(x=>x.contract).length,
    independently_quote_matched:candidates.filter(x=>x.independent_price_liquidity_ready).length,
    risk_review_candidates:candidates.filter(x=>x.qualified_for_risk_review).length,
    trade_eligible:0},
  candidates,explicit_restriction:'Source evidence only; risk and sellability must be separately verified by Dot3 before any Dot4 BUY.'};
}
