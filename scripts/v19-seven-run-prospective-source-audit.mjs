// R29 REAL 7-run archived source reconstruction (without fresh API or backtest).
// This is an OBSERVED NOVEMBER QUOTE RECHECK analysis, not October
// original source discovery, not verified quote-time, not a PAPER order.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {replayArchivedSixChainEvidence} from '../src/v19-offline-multichain-replay.mjs';
const ids=Object.freeze([
 '45036887325','45044300013','45057658912',
 '45064131641','45064898786','45065920534','45066246697'
]);
const clock=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const sha=text=>createHash('sha256').update(text,'utf8').digest('hex');
const asOfUtc=process.env.R29_SOURCE_READINESS_ASOF_UTC??new Date().toISOString();
if(clock(asOfUtc)===null)throw Error('INVALID_ARCHIVE_READ_TIME');
const receipts=[],rawFiles={},captures=[],dedup=new Set(),archived=[];
for(const id of ids){
 const dir='research/feeds/2026-11-22/'+id+'/';
 const evidence=JSON.parse(await readFile(dir+'evidence.json','utf8'));
 if(evidence.kind!=='DOT2_PUBLIC_CAPTURE_EVIDENCE'
  ||!Array.isArray(evidence.api_evidence)
  ||clock(evidence.captured_completed_at_utc)>clock(asOfUtc))
  throw Error('INVALID_REAL_CAPTURE_PROVENANCE_'+id);
 for(const row of evidence.api_evidence){
  if(!row.body_path.startsWith(dir)||dedup.has(row.body_path)
    ||clock(row.received_at_utc)>clock(asOfUtc))
    throw Error('DUPLICATE_OR_FUTURE_OR_WRONG_CAPTURE_PATH_'+id);
  dedup.add(row.body_path);
  const raw=await readFile(row.body_path,'utf8');
  if(sha(raw)!==row.response_sha256)
    throw Error('REAL_ARCHIVED_ORIGINAL_RAW_SHA256_CHANGED_'+row.body_path);
  rawFiles[row.body_path]=raw;
  receipts.push(row);
  archived.push({run_id:id,path:row.body_path,sha256:row.response_sha256,
   http_status:row.http_status,provider:row.provider,
   received_at_utc:row.received_at_utc});
 }
 captures.push({run_id:id,captured_completed_at_utc:evidence.captured_completed_at_utc,
  source_evidence_path:dir+'evidence.json',
  responses:evidence.api_evidence.length,
  http200:evidence.api_evidence.filter(e=>e.http_status===200).length,
  http429:evidence.api_evidence.filter(e=>e.http_status===429).length,
  gateway_original_http200_verified:true,
  capture_result_is_not_independent_upstream_quote_time:true});
}
const original=replayArchivedSixChainEvidence({
 apiEvidence:receipts,rawFiles,asOfUtc,maxResearchPairs:500
});
if(original.archive_failures.length||original.chains.length!==6
 ||original.chains_with_at_least_one_prior_real_http200!==6
 ||original.total_original_http429_pages!==3
 ||original.actual_network_requests!==0||original.orders_authorized!==0)
 throw Error('UNEXPECTED_SEVEN_RUN_SIX_CHAIN_ORIGINAL_REPLAY');
const report={schema:1,kind:'R29_V19_7REAL_GITHUB_CAPTURE_PROSPECTIVE_SOURCE_AUDIT',
 as_of_utc:asOfUtc,source_commit:process.env.GITHUB_SHA??null,
 original_capture_run_ids:ids,original_capture_count:captures.length,
 original_receipts_count:receipts.length,
 original_error_429_count:receipts.filter(x=>x.http_status===429).length,
 recorded_captures:captures,
 origin_sha256_manifest:sha(JSON.stringify(archived)),
 chain_and_original_source_timing:original,
 asof_window_all_sources_november_only:true,
 source_provider_quote_time_independently_verified:false,
 actual_paper_client_fills:0,actual_gpt_decisions_claimed:0,
 actual_network_calls_during_audit:0,actual_orders_published:0,
 automatic_trade_authorized:false,
 note:'Only HTTP response archival availability: no proof that all markets existed or tradable at the same time, no original October as-of, no completed 1/3/6h outcome cohort.'
};
await mkdir('probe-artifacts',{recursive:true});
await writeFile('probe-artifacts/v19-seven-real-source-momentum-readiness.json',
 JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log('R29_7REAL_CAPTURE_SOURCE_AUDIT',JSON.stringify({
 status:'PASS',captured_runs:ids.length,original_receipts:receipts.length,
 original_gecko_http200_pages:original.total_original_http200_pages,
 original_gecko_http429_pages:original.total_original_http429_pages,
 six_chains_with_http200:original.chains_with_at_least_one_prior_real_http200,
 unique_pool_keys:original.unique_pool_keys_from_these_replayed_pages,
 observed_same_pool_price_pairs_5_to_240min:original.observed_price_pairs_5_to_240min_total,
 provider_quote_time_verifications:0,orders:0,provider_requests:0,
 output:'probe-artifacts/v19-seven-real-source-momentum-readiness.json'
}));
