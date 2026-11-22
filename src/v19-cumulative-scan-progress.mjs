// D2-02 / SYS-05: cumulative progress is only a bounded user-defined
// SOURCE PAGE SAMPLE, never the percentage of all memecoins on-chain.
// Planned HTTP requests and failed/deferred pages contribute ZERO progress.
const CHAIN_SET=new Set(['solana','base','ethereum','bsc','robinhood','cronos']);
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const pct=(n,d)=>d?Math.round(n/d*10000)/100:null;
export function summarizeCumulativeScanProgress({coverage,networks,
 targetPagesPerChain=10,asOfUtc}={}){
 const now=ms(asOfUtc);
 if(coverage?.kind!=='R29_V19_OFFSET_PAGE_COVERAGE'||now===null
 ||!Array.isArray(networks)||!networks.length
 ||networks.some(c=>!CHAIN_SET.has(c))||new Set(networks).size!==networks.length
 ||!Number.isInteger(targetPagesPerChain)||targetPagesPerChain<1
 ||targetPagesPerChain>1000)
  throw Error('INVALID_BOUNDED_SCAN_PROGRESS');
 const lanes=[],total=networks.length*targetPagesPerChain;
 for(const chain of networks){
  const state=coverage.chains?.[chain]||{};
  const received=[];
  for(let page=1;page<=targetPagesPerChain;page++){
   const proof=state.pages?.[page];
   if(!proof)continue;
   const receivedAt=ms(proof.last_success_at_utc);
   if(receivedAt===null||receivedAt>now
    ||typeof proof.last_source_path!=='string'
    ||!proof.last_source_path.startsWith('research/feeds/')
    ||!/^[a-f0-9]{64}$/.test(proof.last_sha256||''))continue;
   received.push(page);
  }
  const missing=Array.from({length:targetPagesPerChain},(_,i)=>i+1)
   .filter(p=>!received.includes(p));
  lanes.push({chain,unique_successful_pages_in_plan:received.length,
   intended_pages:targetPagesPerChain,
   captured_page_numbers:received,
   still_missing_page_numbers:missing,
   progress_pct:pct(received.length,targetPagesPerChain),
   documented_waiting_page_numbers:(state.pending_pages||[])
    .filter(v=>Number.isInteger(v)&&v>=1&&v<=targetPagesPerChain),
   provider_success_not_inferred_from_requested_pages:true});
 }
 const done=lanes.reduce((sum,x)=>sum+x.unique_successful_pages_in_plan,0);
 return {schema:1,kind:'R29_V19_BOUNDED_CAPTURE_PLAN_PROGRESS',
  as_of_utc:asOfUtc,
  numerator_successful_unique_chain_pages:done,
  denominator_fixed_planned_chain_pages:total,
  captured_plan_progress_pct:pct(done,total),
  missing_planned_pages:total-done,
  per_chain:lanes,
  sampled_chain_count:networks.length,
  total_known_meme_market_coverage_pct:null,
  scope:'FIXED_CHAIN_PAGE_SAMPLE_NOT_ENTIRE_MEMECOIN_MARKET',
  historic_success_may_be_stale:true,
  raw_evidence_hashes_are_pointers_not_independent_proof:true,
  moving_offset_pages_can_duplicate_or_miss_pools:true,
  excludes_unattempted_http_429_and_deferred_pages:true,
  actual_gpt_reviews:0,orders_authorized:0};
}
