// R29 V1.9 D2-01: forensic audit of ORIGINAL HTTP bytes, not a fetcher.
// A six-chain plan or a memory checkpoint is NOT evidence of six HTTP captures.
// Git blob IDs are pinned independently; no winner labels, decisions or trades.
import {canonicalChain} from './market-evidence.mjs';
import {verifyArchivedHttpBytes} from './v19-source-integrity.mjs';
import {decodeGeckoNewPools} from './live-pool-discovery.mjs';

export const SIX_CHAINS=Object.freeze([
 'solana','base','ethereum','bsc','robinhood','cronos']);
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?
 Date.parse(x):null;
const rawPath=/^research\/feeds\/\d{4}-\d{2}-\d{2}\/\d+\/gecko-(solana|base|ethereum|bsc|robinhood|cronos)-page(\d+)\.raw\.json$/;
const gitSha=/^[a-f0-9]{40}$/;

export function auditSixChainCaptureWindow({
 sources=[],windowStartUtc,windowEndUtc,asOfUtc
}={}){
 const start=ms(windowStartUtc),end=ms(windowEndUtc),asOf=ms(asOfUtc);
 if(!Array.isArray(sources)||sources.length>500||start===null||end===null
  ||asOf===null||start>=end||end>asOf)
  throw Error('INVALID_V19_CHAIN_AUDIT_WINDOW');
 const checks=[];
 for(const [i,source] of sources.entries()){
  const path=source?.raw_path,match=typeof path==='string'?path.match(rawPath):null;
  const chain=match?.[1]??null,page=match?Number(match[2]):null;
  const evidence=source?.http_evidence;
  let status='UNVERIFIED_MISSING_OR_MALFORMED_SOURCE',proof=null,decoded=null;
  const received=ms(evidence?.received_at_utc);
  if(match&&Number.isInteger(page)&&page>=1&&page<=1000
    &&typeof source.raw_text==='string'&&gitSha.test(source.git_blob_sha1||'')
    &&evidence?.provider==='GECKOTERMINAL'){
   proof=verifyArchivedHttpBytes({rawText:source.raw_text,evidence,
    sourcePath:path,asOfUtc,expectedGitBlobSha1:source.git_blob_sha1});
   if(proof.status!=='SOURCE_BYTES_VERIFIED'){
    status=proof.reason||proof.status;
   }else{
    // Verify provider URL network and page against *archived* source filename.
    let matchEndpoint=false;
    try{
     const u=new URL(evidence.url);
     const parts=u.pathname.match(/^\/api\/v2\/networks\/([^/]+)\/new_pools$/);
     matchEndpoint=!!parts&&canonicalChain(parts[1])===chain
       &&u.searchParams.get('page')===String(page);
    }catch{}
    if(!matchEndpoint)status='CHAIN_PAGE_URL_MISMATCH';
    else if(received<start||received>end)status='OUTSIDE_CAPTURE_WINDOW';
    else{
     try{
      decoded=decodeGeckoNewPools({network:chain,
       response:JSON.parse(source.raw_text),
       capturedAtUtc:evidence.received_at_utc,page});
      status='ORIGINAL_HTTP_200_BYTES_AND_BLOB_VERIFIED';
     }catch{status='DECODE_ERROR_NO_COVERAGE';}
    }
   }
  }
  checks.push({source_index:i,chain,page,
   source_path:path??null,captured_at_utc:evidence?.received_at_utc??null,
   status,original_http_sha256:proof?.actual_sha256??null,
   git_blob_id_verified:proof?.git_blob_sha_matched_independent_reference===true,
   raw_source_byte_count:proof?.raw_bytes_utf8??null,
   reported_byte_count:evidence?.raw_bytes_utf8??null,
   reported_size_matches_verified_bytes:
     typeof proof?.raw_bytes_utf8==='number'
     &&Number.isInteger(evidence?.raw_bytes_utf8)
       ?proof.raw_bytes_utf8===evidence.raw_bytes_utf8:null,
   size_metadata_mismatch_does_not_invalidate_matching_cryptographic_hashes:true,
   response_has_zero_pools:decoded?decoded.requested_pool_count===0:null,
   raw_pool_rows:decoded?.requested_pool_count??null,
   decoder_accepted:decoded?.found_count??null,
   decoder_rejected:decoded?.rejected_count??null,
   source_is_original_http_capture_proven_by_github_commit_time:false,
   historical_gpt_review_verified:false,trade_authorized:false});
 }
 const byChain=SIX_CHAINS.map(chain=>{
  const ok=checks.filter(c=>c.chain===chain
    &&c.status==='ORIGINAL_HTTP_200_BYTES_AND_BLOB_VERIFIED');
  const all=checks.filter(c=>c.chain===chain);
  return {chain,status:ok.length?'CAPTURE_VERIFIED':
    all.length?'SOURCES_FAILED_OR_OUT_OF_WINDOW':'NO_SOURCE_FOR_CHAIN',
   verified_http_sources:ok.length,
   observed_pool_ids:ok.reduce((sum,x)=>sum+(x.decoder_accepted??0),0),
   raw_pool_rows:ok.reduce((sum,x)=>sum+(x.raw_pool_rows??0),0),
   nonempty_pool_response_verified:ok.some(x=>x.raw_pool_rows>0),
   first_verified_received_at_utc:ok.length?
     ok.map(x=>x.captured_at_utc).sort()[0]:null};
 });
 const verified=byChain.filter(c=>c.verified_http_sources>0);
 const times=checks.filter(x=>x.status==='ORIGINAL_HTTP_200_BYTES_AND_BLOB_VERIFIED')
  .map(x=>ms(x.captured_at_utc)).filter(x=>x!==null);
 return {schema:1,kind:'R29_V19_DOT2_SIX_CHAIN_ARCHIVE_WINDOW_AUDIT',
  window_start_utc:windowStartUtc,window_end_utc:windowEndUtc,
  as_of_utc:asOfUtc,required_chains:[...SIX_CHAINS],
  verified_chain_count:verified.length,required_chain_count:6,
  all_six_chains_have_verified_http_samples:verified.length===6,
  chains_with_nonempty_responses:verified.filter(x=>x.nonempty_pool_response_verified).length,
  checked_source_count:checks.length,
  recorded_byte_count_mismatches:checks.filter(x=>
    x.status==='ORIGINAL_HTTP_200_BYTES_AND_BLOB_VERIFIED'
    &&x.reported_size_matches_verified_bytes===false).map(x=>({
      chain:x.chain,source_path:x.source_path,
      reported_bytes:x.reported_byte_count,verified_bytes:x.raw_source_byte_count})),
  earliest_sample_at_utc:times.length?new Date(Math.min(...times)).toISOString():null,
  latest_sample_at_utc:times.length?new Date(Math.max(...times)).toISOString():null,
  actual_sample_time_span_minutes:times.length>=2?
    Math.round((Math.max(...times)-Math.min(...times))/60000*100)/100:null,
  by_chain:byChain,source_checks:checks,
  every_page_and_pool_globally_observed:false,
  original_october_2026_dot2_capture_proven:false,
  effective_paper_trading_authorized:false,
  note:'HTTP 200 plus two exact-byte hashes proves archived source identity, not whole-chain coverage or independently witnessed provider timestamps.'};
}
