// Recover pools previously lost by the decoder, from immutable original raw JSON.
// The historical original HTTP capture is a different fact from later indexing.
import {createHash} from 'node:crypto';
import {decodeGeckoNewPools} from './live-pool-discovery.mjs';
const sha256=x=>createHash('sha256').update(x,'utf8').digest('hex');
export function recoverArchivedV4({rawText,evidence,rawPath}={}){
 if(typeof rawText!=='string'||!rawText||evidence?.kind!=='DOT2_PUBLIC_CAPTURE_EVIDENCE'
   ||typeof rawPath!=='string'||!rawPath.startsWith('research/feeds/'))
   throw Error('INVALID_ARCHIVE_RECOVERY_INPUT');
 const original=(evidence.api_evidence||[]).find(e=>e.body_path===rawPath&&e.provider==='GECKOTERMINAL'
   &&e.http_ok===true&&e.http_status===200);
 if(!original||!/^[a-f0-9]{64}$/.test(original.response_sha256||'')
   ||sha256(rawText)!==original.response_sha256)throw Error('ARCHIVE_RAW_HASH_NOT_PROVEN');
 const observed=original.received_at_utc;
 if(!Number.isFinite(Date.parse(observed))||!evidence.source_chain
   ||!Number.isInteger(evidence.selected_page))throw Error('ARCHIVE_CAPTURE_METADATA_MISSING');
 let data;
 try{data=JSON.parse(rawText);}catch{throw Error('ARCHIVE_RAW_JSON_INVALID');}
 const decoded=decodeGeckoNewPools({network:evidence.source_chain,response:data,
   capturedAtUtc:observed,page:evidence.selected_page});
 const candidates=decoded.candidates.filter(c=>c.pool_kind==='UNISWAP_V4_POOL_ID')
   .map(c=>({...c,category:'ARCHIVED_V4_RECOVERY_NOT_FRESH',
     originally_raw_captured_at_utc:observed,
     original_raw_source_path:rawPath,
     recovered_from_original_capture:true,
     original_dot2_discovery_verified:false,
     trade_authorized:false}));
 return {schema:1,kind:'R29_V18_ARCHIVED_V4_RECOVERY',mode:'PAPER_RESEARCH_ONLY',
  source_original_raw_path:rawPath,source_original_sha256:original.response_sha256,
  originally_raw_captured_at_utc:observed,
  recovered_at_utc:null,
  decoded_total:decoded.found_count,recovered_v4_count:candidates.length,candidates,
  trade_authorized:false,history_reconstruction_not_fresh_quote:true};
}
