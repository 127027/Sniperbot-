// R29 V1.9 read-only 22 Nov original-archive audit. No network/API/wallet writes.
import {readFile} from 'node:fs/promises';
import {auditSixChainCaptureWindow} from '../src/v19-six-chain-capture-audit.mjs';
const manifest=JSON.parse(await readFile(
 'research/audits/v19-six-chain-originals-2026-11-22.json','utf8'));
if(manifest.kind!=='R29_V19_RESEARCH_ONLY_SIX_CHAIN_ARCHIVE_MANIFEST')
 throw Error('INVALID_SOURCE_MANIFEST');
const sources=await Promise.all(manifest.samples.map(async s=>{
 const [raw_text,evidence]=await Promise.all([
  readFile(s.source_path,'utf8'),
  readFile(s.evidence_path,'utf8').then(JSON.parse)
 ]);
 const http_evidence=evidence.api_evidence?.find(x=>x.body_path===s.source_path);
 if(!http_evidence||http_evidence.received_at_utc!==s.reported_http_received_at_utc)
  throw Error('ORIGINAL_HTTP_EVIDENCE_MISMATCH: '+s.chain);
 return {raw_path:s.source_path,raw_text,
  git_blob_sha1:s.expected_git_blob_sha1,http_evidence};
}));
const at='2026-11-22T10:00:00.000Z';
const evalWindow=w=>auditSixChainCaptureWindow({sources,
 windowStartUtc:w.start_utc,windowEndUtc:w.end_utc,asOfUtc:at});
const day=evalWindow(manifest.window_24h),five=evalWindow(manifest.window_5h);
const summary={kind:'R29_V19_DOT2_ORIGINAL_SIX_CHAIN_AUDIT',
 day_window:{start:manifest.window_24h.start_utc,end:manifest.window_24h.end_utc,
  verified_chains:day.verified_chain_count,
  nonempty_http_responses:day.chains_with_nonempty_responses},
 five_hour_window:{start:manifest.window_5h.start_utc,
  end:manifest.window_5h.end_utc,verified_chains:five.verified_chain_count,
  missing_chains:five.by_chain.filter(x=>x.verified_http_sources===0).map(x=>x.chain)},
 original_capture_span_minutes:day.actual_sample_time_span_minutes,
 metadata_byte_count_mismatches:day.recorded_byte_count_mismatches,
 all_archives_sha256_plus_pinned_git_blob_verified:
  day.all_six_chains_have_verified_http_samples
  &&day.source_checks.every(x=>x.git_blob_id_verified),
 october_original_dot_gpt_activity_proven:false,
 live_paper_trading_authorized:false,
 conclusion:'D2-01 PARTIAL – six archives proven within 24h; five-hour 6/6 not proven.'};
console.log(JSON.stringify(summary,null,2));
if(!summary.all_archives_sha256_plus_pinned_git_blob_verified)
 throw Error('SIX_CHAIN_ARCHIVE_INTEGRITY_FAILED');
if(day.verified_chain_count!==6||five.verified_chain_count!==5)
 throw Error('SIX_CHAIN_WINDOW_EXPECTATION_CHANGED_REVIEW_REQUIRED');
