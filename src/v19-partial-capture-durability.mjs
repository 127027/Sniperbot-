// R29 SYS-11/QA-03: fail-closed temporary capture journal.
// At job START reserve each intended chain/page as pending; a later confirmed
// successful full-page HTTP capture clears it, never a proposal or HTTP 429.
// This file is research-only. It does NOT publish orders or imply market coverage.
import {updatePageCoverage} from './v19-page-coverage.mjs';
const at=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const safeRun=x=>typeof x==='string'&&/^\d{1,20}$/.test(x);
export function stagePendingCapture({pageCoverage,tasks,atUtc,runId}={}){
 const time=at(atUtc);
 if(pageCoverage?.kind!=='R29_V19_OFFSET_PAGE_COVERAGE'
  ||!Array.isArray(tasks)||!time||!safeRun(String(runId))
  ||tasks.some(x=>!x||typeof x.chain!=='string'
     ||!Number.isInteger(x.page)||x.page<1||x.page>1000))
  throw Error('INVALID_PENDING_CAPTURE_STAGE');
 const staged=updatePageCoverage(pageCoverage,{asOfUtc:time,deferred:tasks.map(x=>({
  chain:x.chain,page:x.page
 }))});
 return {pageCoverage:staged.updated_memory,
  journal:{schema:1,kind:'R29_V19_INFLIGHT_CAPTURE_JOURNAL',
   mode:'PAPER_RESEARCH_ONLY',run_id:String(runId),started_at_utc:time,
   planned_pages:tasks.map(x=>({chain:x.chain,page:x.page})),
   http_receipts:[],raw_source_files:[],
   state:'STARTED_NOT_FINALIZED',
   status_is_not_successful_capture:true,
   source_http_successes:0,orders_authorized:0}};
}
export function appendPartialHttpReceipt(journal,{evidence,atUtc}={}){
 const time=at(atUtc);
 if(journal?.kind!=='R29_V19_INFLIGHT_CAPTURE_JOURNAL'||!time
   ||!evidence||!Number.isInteger(evidence.http_status)
   ||evidence.http_status<100||evidence.http_status>599
   ||typeof evidence.body_path!=='string'
   ||!evidence.body_path.startsWith('research/feeds/')
   ||!/^[a-f0-9]{64}$/.test(evidence.response_sha256||''))
  throw Error('INVALID_PARTIAL_HTTP_RECEIPT');
 if(journal.http_receipts.some(x=>x.body_path===evidence.body_path))
   throw Error('DUPLICATE_PARTIAL_HTTP_RECEIPT');
 const next=structuredClone(journal);
 next.http_receipts.push({
  provider:evidence.provider,http_status:evidence.http_status,
  started_at_utc:evidence.started_at_utc,
  received_at_utc:evidence.received_at_utc,
  response_sha256:evidence.response_sha256,
  body_path:evidence.body_path
 });
 next.raw_source_files.push(evidence.body_path);
 next.last_receipt_journaled_at_utc=time;
 next.source_http_successes=next.http_receipts.filter(x=>
   x.http_status>=200&&x.http_status<300).length;
 // An HTTP 200 is not necessarily decoded or indexed; the captured pages
 // are pending until the final page-coverage reconciliation completes.
 next.status_is_not_successful_capture=true;
 return next;
}
export function closePartialCapture(journal,{atUtc,finalCoverage}={}){
 const time=at(atUtc);
 if(journal?.kind!=='R29_V19_INFLIGHT_CAPTURE_JOURNAL'||!time
  ||finalCoverage?.kind!=='R29_V19_OFFSET_PAGE_COVERAGE')
  throw Error('INVALID_PARTIAL_CAPTURE_FINALIZATION');
 const next=structuredClone(journal);
 next.state='FINALIZED_BY_RUNNER';
 next.finalized_at_utc=time;
 next.status_is_not_successful_capture=false;
 next.final_page_coverage_path='research/state/page-coverage.json';
 return next;
}
