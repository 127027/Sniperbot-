// R29: current Dot2 market capture is not identical to the last GPT review.
// Resolve the latest research feed separately; never relabel a pending GPT
// journal as completed by an HTTP-only GitHub Actions capture.
import {asOfMillis} from './v19-asof-evidence.mjs';

const feedPath=/^research\/feeds\/(\d{4}-\d{2}-\d{2})\/(\d{5,20})\/evidence\.json$/;
const requestPath=/^research\/requests\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\.json$/;
const iso=asOfMillis;

export function resolveDot2CaptureView({gptPointer,feedPointer,asOfUtc}={}){
 const now=iso(asOfUtc);
 if(now===null)throw Error('INVALID_DOT2_ASOF');
 const gptAt=iso(gptPointer?.updated_at_utc);
 const prevAt=iso(gptPointer?.captured_at_utc);
 const feedAt=iso(feedPointer?.captured_at_utc);
 const match=typeof feedPointer?.evidence_path==='string'
  ?feedPointer.evidence_path.match(feedPath):null;
 const sourceValid=feedPointer?.schema===1
  &&feedPointer?.kind==='LATEST_DOT2_PUBLIC_CAPTURE_POINTER'
  &&feedPointer?.mode==='PAPER_RESEARCH_ONLY'
  &&match!==null&&feedAt!==null&&feedAt<=now
  &&typeof feedPointer?.request_path==='string'
  &&requestPath.test(feedPointer.request_path)
  &&gptPointer?.dot==='dot-2';
 const deferredSharedProviderWake=gptPointer?.status===
   'RESEARCH_WAKE_CAPTURE_DEFERRED_CONCURRENT_PROVIDER_DATA_GAP'
   &&gptPointer?.capture_request_path==null
   &&gptPointer?.orders_created===0
   &&gptPointer?.paper_fills_claimed===0
   &&gptPointer?.backtest_executed===false;
 const newer=sourceValid&&(prevAt===null||feedAt>prevAt);
 const effectivePath=newer?feedPointer.evidence_path:
  typeof gptPointer?.evidence_path==='string'?gptPointer.evidence_path:null;
 const effectiveAt=newer?feedPointer.captured_at_utc:
  prevAt===null?null:gptPointer.captured_at_utc;
 return {schema:1,kind:'R29_V19_DOT2_SEPARATED_CAPTURE_GPT_VIEW',
  status:!sourceValid?'LATEST_FEED_NOT_VERIFIABLE_FROM_POINTER':
    newer?'NEWER_CAPTURE_SEPARATE_FROM_LAST_GPT_REVIEW':
      'NO_NEWER_FEED_THAN_LAST_GPT_REVIEW',
  last_gpt_review_pointer_at_utc:gptAt===null?null:gptPointer.updated_at_utc,
  last_gpt_journal_path:gptPointer?.journal_path??null,
  last_gpt_review_source_at_utc:prevAt===null?null:gptPointer.captured_at_utc,
  last_gpt_review_status:gptPointer?.status??null,
  latest_feed_source_at_utc:sourceValid?feedPointer.captured_at_utc:null,
  latest_feed_evidence_path:sourceValid?feedPointer.evidence_path:null,
  latest_feed_run_id:sourceValid?match[2]:null,
  current_wake_new_provider_request_created:deferredSharedProviderWake?false:null,
  concurrent_provider_research_deferred_without_capture:deferredSharedProviderWake,
  prior_feed_reused_during_deferred_wake:deferredSharedProviderWake
    &&sourceValid&&gptPointer?.evidence_path===feedPointer.evidence_path,
  deferred_state_does_not_validate_a_gpt_review:true,
  feed_matches_last_gpt_request:sourceValid
    ?gptPointer.capture_request_path===feedPointer.request_path:null,
  effective_research_capture_at_utc:effectiveAt,
  effective_research_evidence_path:effectivePath,
  new_capture_requires_separate_gpt_review:newer,
  current_research_raw_sha_verified_independently:false,
  latest_gpt_review_authenticated_independently:false,
  trade_eligible:false,orders_created:0,backtest_executed:false,
  note:'Feed capture may complete after GPT journal. The view reconciles source metadata without fabricating another GPT execution or Paper fill.'};
}
