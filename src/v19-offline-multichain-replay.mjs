// R29 D2-01 / D2-04: replay authentic previously archived HTTP bytes
// across the SIX supported chains without calling a provider or GPT.
// Page/offset samples cannot prove all circulating coins were discovered.
// Repeated prices are OBSERVED RESEARCH, never executable as-of October.
import {verifyArchivedHttpBytes} from './v19-source-integrity.mjs';
import {decodeGeckoNewPools} from './live-pool-discovery.mjs';
const CHAINS=['solana','base','ethereum','bsc','robinhood','cronos'];
const rx=/^research\/feeds\/\d{4}-\d{2}-\d{2}\/\d+\/gecko-(solana|base|ethereum|bsc|robinhood|cronos)-page([1-9]\d{0,2})\.raw\.json$/;
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const marketKey=(c,p)=>c+':'+(c==='solana'?String(p):String(p).toLowerCase());
const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>0?x:null;
export function replayArchivedSixChainEvidence({
 apiEvidence=[],rawFiles={},asOfUtc,maxResearchPairs=100
}={}){
 const now=utc(asOfUtc);
 if(now===null||!Array.isArray(apiEvidence)||apiEvidence.length>10000
  ||!rawFiles||typeof rawFiles!=='object'
  ||!Number.isInteger(maxResearchPairs)||maxResearchPairs<1||maxResearchPairs>10000)
  throw Error('INVALID_OFFLINE_SIX_CHAIN_REPLAY');
 const chains=Object.fromEntries(CHAINS.map(c=>[c,{chain:c,attempts:0,
  http200:0,http429:0,valid_candidate_rows:0,
  original_page_ids:[],unique_pools_in_chain:null}]));
 const byPool=new Map(),failures=[],replayed=[];
 for(const [index,receipt] of apiEvidence.entries()){
  const match=receipt?.body_path?.match(rx);
  if(!match)continue; // DEX source is NOT a Gecko new-pool page.
  const [,chain,pagenum]=match,page=Number(pagenum);
  const c=chains[chain];c.attempts++;
  const raw=rawFiles[receipt.body_path];
  const proof=verifyArchivedHttpBytes({rawText:raw,evidence:receipt,
   sourcePath:receipt.body_path,asOfUtc});
  if(!['SOURCE_BYTES_VERIFIED','HTTP_ERROR_ARCHIVED'].includes(proof.status)){
   failures.push({index,chain,page,reason:proof.reason||proof.status});
   continue;
  }
  if(receipt.http_status===429){
   c.http429++;replayed.push({chain,page,http_status:429,
    source_path:receipt.body_path,pools:0,
    original_failed_page_still_retryable:true});continue;
  }
  if(proof.status!=='SOURCE_BYTES_VERIFIED'||receipt.http_status!==200){
   failures.push({index,chain,page,reason:'UNEXPECTED_PROVIDER_STATUS'});
   continue;
  }
  let decoded;
  try{decoded=decodeGeckoNewPools({network:chain,
    response:JSON.parse(raw),capturedAtUtc:receipt.received_at_utc,page});
  }catch{
   failures.push({index,chain,page,reason:'ORIGINAL_RAW_DECODER_FAILED'});continue;
  }
  c.http200++;c.valid_candidate_rows+=decoded.found_count;
  c.original_page_ids.push(page);
  replayed.push({chain,page,http_status:200,source_path:receipt.body_path,
   pools:decoded.found_count,raw_sha256:proof.actual_sha256,
   original_received_at_utc:receipt.received_at_utc,
   pool_data_are_from_november_not_october:true});
  for(const q of decoded.candidates){
   const k=marketKey(q.chain,q.pool);
   if(!byPool.has(k))byPool.set(k,[]);
   byPool.get(k).push({chain:q.chain,pool:q.pool,pool_kind:q.pool_kind,
    contract:q.contract,price_usd:num(q.observed_price_usd),
    liquidity_usd:num(q.liquidity_usd),volume_24h_usd:num(q.volume_24h_usd),
    captured_at_utc:receipt.received_at_utc,source_path:receipt.body_path});
  }
 }
 const groups=[],paired=[];
 for(const [key,history] of byPool){
  history.sort((a,b)=>a.captured_at_utc.localeCompare(b.captured_at_utc)
   ||a.source_path.localeCompare(b.source_path));
  const distinct=[...new Map(history.map(x=>[x.captured_at_utc,x])).values()];
  const latest=distinct.at(-1);
  const older=distinct.slice(0,-1).reverse().find(x=>
   x.price_usd!==null&&latest.price_usd!==null
   &&utc(latest.captured_at_utc)-utc(x.captured_at_utc)>=5*60000);
  const gap=older?(utc(latest.captured_at_utc)-utc(older.captured_at_utc))/60000:null;
  const eligible=older&&gap<=240&&latest.liquidity_usd!==null
   &&latest.liquidity_usd>=5000&&older.contract&&latest.contract
   &&(latest.chain==='solana'?latest.contract===older.contract:
    latest.contract.toLowerCase()===older.contract.toLowerCase());
  const change=eligible?Math.round((latest.price_usd/older.price_usd-1)*1e6)/1e4:null;
  groups.push({pool_key:key,archived_capture_count:distinct.length,
   most_recent_observation_at_utc:latest.captured_at_utc,
   repeated_price_within_240min:!!eligible});
  if(eligible)paired.push({pool_key:key,observed_return_pct:change,
   first_used_at_utc:older.captured_at_utc,
   last_used_at_utc:latest.captured_at_utc,
   gap_minutes:gap,sources:[older.source_path,latest.source_path],
   observed_quote_not_executable:true,
   original_october_information_not_available:true,
   dot3_safety_approved:false,paper_buy_authorized:false});
 }
 for(const chain of CHAINS){
  const x=chains[chain];
  x.unique_pools_in_chain=groups.filter(g=>g.pool_key.startsWith(chain+':')).length;
  x.original_page_ids=[...new Set(x.original_page_ids)].sort((a,b)=>a-b);
 }
 paired.sort((a,b)=>b.observed_return_pct-a.observed_return_pct
  ||a.pool_key.localeCompare(b.pool_key));
 return {schema:1,kind:'R29_V19_D201_D204_OFFLINE_ORIGINAL_MULTICHAIN_REPLAY',
  as_of_utc:asOfUtc,source_provider:'GECKOTERMINAL_ORIGINAL_ARCHIVE',
  chains:CHAINS.map(c=>chains[c]),
  chains_with_at_least_one_prior_real_http200:CHAINS.filter(c=>chains[c].http200>0).length,
  total_original_http200_pages:replayed.filter(x=>x.http_status===200).length,
  total_original_http429_pages:replayed.filter(x=>x.http_status===429).length,
  unique_pool_keys_from_these_replayed_pages:groups.length,
  observed_price_pairs_5_to_240min_total:paired.length,
  research_pairs:paired.slice(0,maxResearchPairs),
  only_first_n_research_pairs_published:maxResearchPairs,
  historical_price_sample_window_is_november_only:true,
  no_retroactive_october_dot2_detection:true,
  original_http_errors_and_missing_pages_never_removed:true,
  six_chains_having_at_least_one_sample_is_not_complete_coverage:true,
  full_market_coverage_pct:null,
  archive_failures:failures,pages_replayed:replayed,
  actual_network_requests:0,actual_gpt_reviews:0,orders_authorized:0};
}
