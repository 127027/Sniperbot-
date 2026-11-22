// Read-only progress evidence for the user's eight hourly Dot2 research scans.
// Scheduled GPT Wake, GitHub commit, provider HTTP and actual Windows paper
// execution are FOUR different facts. This audit only verifies source captures.
// Does not call network, run replay, authorise orders or modify account state.
import {createHash} from 'node:crypto';
import {asOfMillis} from './v19-asof-evidence.mjs';

export const EIGHT_HOUR_START_UTC='2026-11-22T22:00:00.000Z';
export const EIGHT_HOUR_END_UTC='2026-11-23T06:00:00.000Z';
const start=asOfMillis(EIGHT_HOUR_START_UTC),end=asOfMillis(EIGHT_HOUR_END_UTC);
const requestPat=/^research\/requests\/2026-11-(?:22|23)\/[A-Za-z0-9_-]+\.json$/;
const evidencePat=/^research\/feeds\/2026-11-(?:22|23)\/\d{5,20}\/evidence\.json$/;
const sourcePat=/^research\/feeds\/2026-11-(?:22|23)\/\d{5,20}\/[A-Za-z0-9_.-]+\.raw\.json$/;
const sha256=raw=>createHash('sha256').update(raw).digest('hex');
const resultStatus=(n,records,asof)=>{
 const scheduled=start+n*3600000;
 if(asof<scheduled)return 'FUTURE_WAKE_NOT_DUE';
 if(records.length===0)return 'NO_ARCHIVED_DOT2_REQUEST';
 return 'REQUEST_PRESENT_CAPTURE_PROOF_PENDING';
};

export function auditR29EightHourCaptures({asOfUtc,requests=[],captures=[]}={}){
 const asof=asOfMillis(asOfUtc);
 if(asof===null||!Array.isArray(requests)||!Array.isArray(captures))
  throw Error('INVALID_EIGHT_HOUR_SOURCE_AUDIT_INPUT');
 const windowRows=[];
 const eligibleReqs=requests.filter(r=>{
  const t=asOfMillis(r?.data?.created_at_utc);
  return requestPat.test(r?.path||'')&&r?.data?.schema===1
   &&r.data.kind==='DOT2_DISCOVERY_CAPTURE_REQUEST'
   &&r.data.mode==='PAPER_RESEARCH_ONLY'
   &&r.data.requested_by==='dot-2-discovery'
   &&r.data.do_not_publish_orders===true
   &&t!==null&&t>=start&&t<end&&t<=asof;
 });
 const usableCaptures=captures.filter(c=>
  evidencePat.test(c?.evidence_path||'')&&c?.evidence?.schema===1
  &&c.evidence.kind==='DOT2_PUBLIC_CAPTURE_EVIDENCE'
  &&c.evidence.mode==='PAPER_RESEARCH_ONLY'
  &&c.evidence.published_paper_orders===0
  &&c.evidence.verified_client_fills===0);
 const seenRunIds=new Set();
 let verifiedCount=0;
 for(let hour=0;hour<8;hour++){
  const left=start+hour*3600000,right=left+3600000;
  const atUtc=new Date(left).toISOString(),due=left<=asof;
  const relevant=eligibleReqs.filter(r=>{
   const t=asOfMillis(r.data.created_at_utc);return t>=left&&t<right;
  });
  const exams=[];
  for(const request of relevant){
   const matches=usableCaptures.filter(c=>c.evidence.request_path===request.path);
   for(const c of matches){
    const evidence=c.evidence,done=asOfMillis(evidence.captured_completed_at_utc);
    const created=asOfMillis(request.data.created_at_utc);
    const completion=c.completion,inflight=c.inflight;
    const id=c.evidence_path.match(/\/(\d{5,20})\/evidence\.json$/)?.[1]??null;
    const receipts=Array.isArray(inflight?.http_receipts)?inflight.http_receipts:[];
    const gecko200=receipts.filter(x=>x.provider==='GECKOTERMINAL'
      &&x.http_status===200&&sourcePat.test(x.body_path||'')
      &&typeof x.response_sha256==='string'
      &&/^[a-f0-9]{64}$/.test(x.response_sha256));
    const badBytes=gecko200.filter(x=>
      typeof c.rawBodiesByPath?.[x.body_path]!=='string'
      ||sha256(c.rawBodiesByPath[x.body_path])!==x.response_sha256);
    const completed=done!==null&&done>=created&&done<=asof
      &&completion?.kind==='R29_V19_CAPTURE_COMPLETION_GATE'
      &&completion.workflow_may_report_success===true
      &&completion.verified_http200_planned_pages>=1
      &&inflight?.kind==='R29_V19_INFLIGHT_CAPTURE_JOURNAL'
      &&inflight.run_id===id
      &&gecko200.length>=1&&badBytes.length===0
      &&!seenRunIds.has(id);
    if(completed)seenRunIds.add(id);
    exams.push({run_id:id,evidence_path:c.evidence_path,
      status:completed?'VERIFIED_BOUNDED_HTTP_CAPTURE':'UNVERIFIED_CAPTURE_OR_MISSING_BYTES',
      original_gecko_http200_receipts:gecko200.length,
      sha_verified_gecko_http200_receipts:gecko200.length-badBytes.length,
      provider_http_failures:completion?.provider_http_failures?.length??null,
      global_market_coverage_proven:false,
      current_windows_paper_execution_proven:false,
      independently_authenticated_gpt_review_proven:false});
   }
  }
  const successes=exams.filter(x=>x.status==='VERIFIED_BOUNDED_HTTP_CAPTURE');
  const state=successes.length?'BOUNDED_HTTP_CAPTURE_VERIFIED':
    relevant.length?'REQUEST_PRESENT_CAPTURE_PROOF_PENDING':
    resultStatus(hour,relevant,asof);
  if(successes.length)verifiedCount++;
  windowRows.push({utc_hour_start:atUtc,status:state,
   expected_dot2_wakes:1,archived_requests:relevant.length,
   verified_bounded_capture_count:successes.length,
   verified_hour:successes.length>0,
   proof_rows:exams});
 }
 return {schema:1,kind:'R29_V19_EIGHT_HOUR_PUBLIC_CAPTURE_EVIDENCE_AUDIT',
  as_of_utc:asOfUtc,window_start_utc:EIGHT_HOUR_START_UTC,
  window_end_utc:EIGHT_HOUR_END_UTC,
  intended_hourly_dot2_wakes:8,
  verified_bounded_capture_hours:verifiedCount,
  remaining_unverified_hours:8-verifiedCount,
  eight_source_captures_really_verified:verifiedCount===8,
  global_market_coverage_verified:false,
  independently_authenticated_gpt_reviews:0,
  windows_live_client_scans_proven:0,
  paper_orders_written_by_audit:0,real_money_orders_written_by_audit:0,
  any_provider_calls_made_by_audit:false,
  notes:['Wakes and requests are not proof of provider HTTP success.',
   'At least one raw Gecko HTTP200 with SHA256 plus matching original request and completion verdict is required per hourly bucket.',
   'A bounded successful API capture is not a complete global six-chain scan and not an authenticated GPT strategy review.',
   'Only this read-only audit is claimed; lack of local Windows access cannot be repaired by JSON.'],
  hours:windowRows};
}
