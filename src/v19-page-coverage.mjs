// Dot2 V1.9: immutable source refs plus compact per-chain offset-page coverage.
// Gecko new_pools pagination is a moving offset; observing pages 1..N at
// different times NEVER proves the whole market was captured.
import {canonicalChain,poolValid} from './market-evidence.mjs';
import {asOfMillis} from './v19-asof-evidence.mjs';
const MAX_PAGE=1000;
const key=(c,p)=>c+':'+(c==='solana'?p:String(p).toLowerCase());
export function emptyPageCoverage(){
 return {schema:1,kind:'R29_V19_OFFSET_PAGE_COVERAGE',chains:{},
   market_universe_complete:false,provider_snapshots_are_atomic:false,
   last_recorded_at_utc:null};
}
export function updatePageCoverage(existing,{successes=[],failures=[],deferred=[],asOfUtc}={}){
 const now=asOfMillis(asOfUtc);
 if(now===null||!Array.isArray(successes)||!Array.isArray(failures)||!Array.isArray(deferred)
   ||!existing||existing.kind!=='R29_V19_OFFSET_PAGE_COVERAGE')
   throw Error('INVALID_V19_PAGE_COVERAGE');
 const state=structuredClone(existing),runDetails=[],seenThisRun=new Map(),overlap=[];
 const ensure=(chain)=>{
   const c=canonicalChain(chain);
   if(!c)throw Error('INVALID_PAGE_CHAIN');
   state.chains[c]??={max_observed_page:0,pages:{},pending_pages:[],
     successful_pages:0,failed_pages:0,last_page1_capture_at_utc:null,
     known_offset_shift_risk:true};
   return {c,s:state.chains[c]};
 };
 const pageOf=x=>{
   if(!Number.isInteger(x?.page)||x.page<1||x.page>MAX_PAGE)
     throw Error('INVALID_PAGE_NUMBER');
   return x.page;
 };
 for(const item of successes){
   const {c,s}=ensure(item.chain),page=pageOf(item),captured=asOfMillis(item.captured_at_utc);
   if(captured===null||captured>now||!Array.isArray(item.candidates)
     ||typeof item.source_path!=='string'||!item.source_path.startsWith('research/feeds/')
     ||typeof item.source_sha256!=='string'||!/^[a-f0-9]{64}$/.test(item.source_sha256))
     throw Error('INVALID_PAGE_SUCCESS_PROOF');
   const refs=new Set();
   for(const candidate of item.candidates){
     if(canonicalChain(candidate?.chain)!==c||!poolValid(c,candidate?.pool,candidate?.pool_kind))
       continue;
     const poolKey=key(c,candidate.pool);refs.add(poolKey);
     if(seenThisRun.has(poolKey)&&seenThisRun.get(poolKey)!==page)
       overlap.push({chain:c,pool_key:poolKey,pages:[seenThisRun.get(poolKey),page]});
     else seenThisRun.set(poolKey,page);
   }
   if(page>s.max_observed_page){
     for(let p=s.max_observed_page+1;p<page;p++)
       if(!s.pages[p]&&!s.pending_pages.includes(p))s.pending_pages.push(p);
     s.max_observed_page=page;
   }
   const prev=s.pages[page];
   s.pages[page]={last_success_at_utc:new Date(captured).toISOString(),
     first_success_at_utc:prev?.first_success_at_utc??new Date(captured).toISOString(),
     last_source_path:item.source_path,last_sha256:item.source_sha256,
     last_observed_valid_pools:refs.size,
     last_raw_records:item.requested_pool_count??null,
     last_decoder_rejections:item.rejected_count??null,
     successful_captures:(prev?.successful_captures||0)+1,
     prior_success_at_utc:prev?.last_success_at_utc??null};
   if(page===1)s.last_page1_capture_at_utc=new Date(captured).toISOString();
   s.pending_pages=s.pending_pages.filter(x=>x!==page);
   s.successful_pages++;
   runDetails.push({chain:c,page,status:'CAPTURED',path:item.source_path,
     raw_sha256:item.source_sha256,observed_unique_pools:refs.size,
     raw_records:item.requested_pool_count??null,
     rejected_rows:item.rejected_count??null});
 }
 for(const item of failures){
   const {c,s}=ensure(item.chain),page=pageOf(item);
   const attempted=asOfMillis(item.attempt_at_utc);
   if(attempted===null||attempted>now)throw Error('INVALID_PAGE_FAILURE_TIME');
   if(!s.pending_pages.includes(page))s.pending_pages.push(page);
   s.failed_pages++;
   runDetails.push({chain:c,page,status:'CAPTURE_FAILED',
     http_status:item.http_status??null,reason:item.reason??null});
 }
 for(const item of deferred){
   const {c,s}=ensure(item.chain),page=pageOf(item);
   if(!s.pending_pages.includes(page))s.pending_pages.push(page);
   runDetails.push({chain:c,page,status:'DEFERRED_NOT_FETCHED'});
 }
 const chains=Object.entries(state.chains).map(([chain,s])=>{
   s.pending_pages=[...new Set(s.pending_pages)]
     .sort((a,b)=>a-b);
   const capturedPages=Object.keys(s.pages).map(Number).sort((a,b)=>a-b);
   const page1=asOfMillis(s.last_page1_capture_at_utc);
   const stamps=capturedPages.map(p=>asOfMillis(s.pages[p].last_success_at_utc))
     .filter(n=>n!==null);
   const spread=page1===null||!stamps.length?null:
     (Math.max(...stamps)-Math.min(...stamps))/1000;
   const captureCoherent=spread!==null&&capturedPages.length>=2
     &&s.pending_pages.length===0&&spread<=90;
   return {chain,ever_captured_pages:capturedPages.length,
     max_observed_page:s.max_observed_page,missing_page_indices:[...s.pending_pages],
     offset_shift_may_hide_pools:true,latest_page_span_seconds:spread,
     recent_set_within_90s:captureCoherent,
     whole_market_complete:false,has_failed_or_deferred_pages:s.pending_pages.length>0};
 });
 state.last_recorded_at_utc=asOfUtc;
 return {schema:1,kind:'R29_V19_PAGE_COVERAGE_REPORT',
   as_of_utc:asOfUtc,updated_memory:state,
   run:{attempted:successes.length+failures.length,
     succeeded:successes.length,failed:failures.length,
     deferred:deferred.length,duplicate_pool_ids_across_pages:overlap.length,
     duplicate_pool_details:overlap,details:runDetails},
   chain_coverage:chains,
   total_unresolved_page_indices:chains.reduce((n,x)=>n+x.missing_page_indices.length,0),
   coverage_is_complete:false,
   warning:'Offset pages move as pools arrive. No page count alone proves exhaustive discovery.',
   orders_authorized:0};
}
