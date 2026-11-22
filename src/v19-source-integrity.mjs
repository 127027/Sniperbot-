// R29 V1.9 – cryptographic byte-level integrity of archived public HTTP data.
// Verifies RAW BYTES and self-reported HTTP metadata. This does NOT prove that
// a claimed October response was captured in October or a provider authenticated it.
import {createHash} from 'node:crypto';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');
const within=x=>typeof x==='string'&&/^research\/feeds\/(?:[A-Za-z0-9_-]+\/)+[A-Za-z0-9._-]+$/.test(x)
 &&!x.includes('..')&&!x.startsWith('/');
const vendor={GECKOTERMINAL:'api.geckoterminal.com',
 GECKOTERMINAL_OHLCV:'api.geckoterminal.com',
 DEXSCREENER:'api.dexscreener.com'};
export function verifyArchivedHttpBytes({rawText,evidence,sourcePath,asOfUtc}={}){
 const decision=(status,reason,detail={})=>({
  schema:1,kind:'R29_V19_ARCHIVED_HTTP_BYTE_PROOF',status,reason,
  source_path:sourcePath??null,
  original_source_capture_time_independently_attested:false,
  historical_dot_discovery_proven:false,paper_buy_authorized:false,
  ...detail
 });
 if(typeof rawText!=='string'||!within(sourcePath)
   ||typeof evidence!=='object'||evidence===null||ms(asOfUtc)===null)
  return decision('REJECTED','INVALID_RAW_OR_PATH_OR_TIME');
 if(evidence.body_path!==sourcePath)return decision('REJECTED','ARCHIVE_PATH_MISMATCH');
 const recorded=ms(evidence.received_at_utc),started=ms(evidence.started_at_utc);
 if(recorded===null||started===null||started>recorded)
  return decision('REJECTED','INVALID_CAPTURE_SEQUENCE');
 const host=vendor[evidence.provider];
 let origin=null;
 try{const u=new URL(evidence.url);if(u.protocol==='https:'&&u.username===''&&u.password==='')origin=u.hostname;}
 catch{}
 if(!host||origin!==host)return decision('REJECTED','UNVERIFIED_PROVIDER_ENDPOINT');
 if(!/^[a-f0-9]{64}$/.test(evidence.response_sha256||''))
  return decision('REJECTED','MISSING_OR_MALFORMED_SHA256');
 const actual=digest(rawText);
 if(actual!==evidence.response_sha256)
  return decision('REJECTED','ORIGINAL_RAW_SHA256_MISMATCH',{
   expected_sha256:evidence.response_sha256,actual_sha256:actual});
 if(!Number.isInteger(evidence.http_status)||evidence.http_status<100
   ||evidence.http_status>599)
  return decision('REJECTED','INVALID_HTTP_STATUS');
 const source={actual_sha256:actual,reported_sha256:evidence.response_sha256,
   received_at_utc:new Date(recorded).toISOString(),
   provider:evidence.provider,source_url:evidence.url,http_status:evidence.http_status,
   raw_bytes_utf8:Buffer.byteLength(rawText,'utf8')};
 if(recorded>ms(asOfUtc))
  return decision('POST_ASOF_ONLY','RESPONSE_WAS_NOT_AVAILABLE_AT_VIRTUAL_TIME',source);
 if(evidence.http_ok!==true||evidence.http_status<200||evidence.http_status>=300)
  return decision('HTTP_ERROR_ARCHIVED','ERROR_RESPONSE_NOT_MARKET_PRICE',source);
 return decision('SOURCE_BYTES_VERIFIED','MATCHED_RAW_SHA_AND_SELF_REPORTED_CAPTURE_TIME',
   {...source,asof_usable_for_research:true,
    proven_executable_quote:false,source_identity_unverified_onchain:true});
}
export function auditCaptureEvidenceBundle({rawFiles={},apiEvidence=[],asOfUtc}={}){
 if(!rawFiles||typeof rawFiles!=='object'||!Array.isArray(apiEvidence)||ms(asOfUtc)===null)
  throw Error('INVALID_ARCHIVE_BUNDLE');
 const proofs=apiEvidence.map(row=>verifyArchivedHttpBytes({
  rawText:rawFiles[row?.body_path],evidence:row,sourcePath:row?.body_path,asOfUtc}));
 return {schema:1,kind:'R29_V19_HTTP_ARCHIVE_INTEGRITY_AUDIT',
  as_of_utc:asOfUtc,checked:proofs.length,
  bytes_verified:proofs.filter(x=>x.status==='SOURCE_BYTES_VERIFIED').length,
  late_capture:proofs.filter(x=>x.status==='POST_ASOF_ONLY').length,
  errors_or_rejected:proofs.filter(x=>!['SOURCE_BYTES_VERIFIED','POST_ASOF_ONLY'].includes(x.status)).length,
  proofs,trade_authorized:false,
  warning:'Matching self-reported SHA proves exact archived bytes, not independently the historical capture time.'};
}
