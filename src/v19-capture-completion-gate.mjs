// SYS-11 / QA-03: distinguish an archived partial provider capture from
// successful completion of every chain/page requested by the operator.
// Research only. Neither GitHub workflow success nor HTTP200 authorizes trades.
const chains=new Set(['solana','base','ethereum','bsc','robinhood','cronos']);
const validRun=x=>typeof x==='string'&&/^\d{1,20}$/.test(x);
const key=(chain,page)=>chain+':'+page;
const validPage=p=>p&&chains.has(p.chain)&&Number.isInteger(p.page)&&p.page>0&&p.page<=1000;
const unique=xs=>new Set(xs).size===xs.length;

export function assessCaptureCompletion({request,journal,evidence,runId}={}){
 if(!validRun(runId)||request?.mode!=='PAPER_RESEARCH_ONLY'
  ||request?.kind!=='DOT2_DISCOVERY_CAPTURE_REQUEST'
  ||!Array.isArray(request.networks)||!request.networks.length
  ||request.networks.some(c=>!chains.has(c))
  ||journal?.kind!=='R29_V19_INFLIGHT_CAPTURE_JOURNAL'
  ||journal.run_id!==runId
  ||!Array.isArray(journal.planned_pages)
  ||!Array.isArray(journal.http_receipts)
  ||!Array.isArray(journal.unresolved_planned_pages_this_run)
  ||evidence?.kind!=='DOT2_PUBLIC_CAPTURE_EVIDENCE'
  ||evidence.mode!=='PAPER_RESEARCH_ONLY'
  ||!Array.isArray(evidence.page_capture_failures)
  ||!Array.isArray(evidence.page_capture_deferred)
  ||!Array.isArray(evidence.api_evidence))
  throw Error('INVALID_CAPTURE_COMPLETION_EVIDENCE');

 const reasons=[],coverageWarnings=[];
 const planned=journal.planned_pages, wanted=[...new Set(request.networks)];
 if(planned.length===0)reasons.push('NO_PAGES_PLANNED');
 if(planned.some(p=>!validPage(p))||!unique(planned.map(p=>key(p.chain,p.page))))
  reasons.push('INVALID_OR_DUPLICATE_PLANNED_PAGE');
 const gecko=journal.http_receipts.filter(r=>r?.provider==='GECKOTERMINAL');
 const succeeded=new Set();
 const failed=[];
 for(const r of gecko){
  const match=String(r.body_path||'').match(
   /^research\/feeds\/\d{4}-\d{2}-\d{2}\/(\d+)\/gecko-(solana|base|ethereum|bsc|robinhood|cronos)-page([1-9]\d{0,2})\.raw\.json$/);
  if(!match||match[1]!==runId||!/^[0-9a-f]{64}$/.test(r.response_sha256||''))
   {reasons.push('UNVERIFIABLE_GECKO_RECEIPT');continue;}
  const candidate=key(match[2],Number(match[3]));
  if(!planned.some(p=>key(p.chain,p.page)===candidate))
   {reasons.push('RECEIPT_NOT_IN_REQUEST_PLAN');continue;}
  if(r.http_status===200)succeeded.add(candidate);
  else failed.push({page:candidate,status:r.http_status??null});
 }
 const requestedChains=Object.fromEntries(wanted.map(c=>[c,false]));
 for(const p of planned)if(succeeded.has(key(p.chain,p.page))
  &&Object.hasOwn(requestedChains,p.chain))requestedChains[p.chain]=true;
 const missingChains=Object.keys(requestedChains).filter(c=>!requestedChains[c]);
 const missingPages=planned.filter(p=>!succeeded.has(key(p.chain,p.page)));
 // Intentionally budgeted partial sampling is legitimate progress when all
 // *planned* pages succeeded; it must not be mislabeled as a provider failure.
 if(missingChains.length)coverageWarnings.push('REQUESTED_CHAINS_OUTSIDE_SUCCESSFUL_SAMPLE');
 if(missingPages.length)reasons.push('PLANNED_PAGES_WITHOUT_HTTP200');
 if(failed.length||evidence.page_capture_failures.length)reasons.push('PROVIDER_HTTP_FAILURES');
 if(evidence.page_capture_deferred.length)reasons.push('UNATTEMPTED_DEFERRED_PAGES');
 if(journal.state!=='FINALIZED_BY_RUNNER')reasons.push('RUNNER_NOT_FINALIZED');
 if(journal.has_unresolved_page_gaps!==false
  ||journal.unresolved_planned_pages_this_run.length!==0
  ||journal.status_is_not_successful_capture!==false)
   reasons.push('JOURNAL_CONFIRMS_INCOMPLETE_CAPTURE');
 if(journal.proven_successful_pages_this_run!==planned.length
  ||succeeded.size!==planned.length)reasons.push('PROVEN_PAGE_COUNT_MISMATCH');
 const actual=evidence.metrics?.v19_actual_chain_capture;
 if(actual?.all_six_requested_chains_received_this_run===true
  &&wanted.length===6&&missingChains.length)reasons.push('FALSE_ALL_SIX_CHAIN_CLAIM');
 if(evidence.published_paper_orders!==0||evidence.verified_client_fills!==0)
  reasons.push('NOT_RESEARCH_ONLY');
 return {schema:1,kind:'R29_V19_CAPTURE_COMPLETION_GATE',
  status:reasons.length?'PARTIAL_OR_INVALID_CAPTURE':
   missingChains.length?'BOUNDED_SAMPLE_COMPLETE_COVERAGE_INCOMPLETE':'REQUESTED_SAMPLE_COMPLETE',
  requested_chain_count:wanted.length,
  planned_page_count:planned.length,
  verified_http200_planned_pages:succeeded.size,
  missing_requested_chains:missingChains,
  unresolved_planned_pages:missingPages,
  provider_http_failures:failed,
  reasons:[...new Set(reasons)],coverage_warnings:coverageWarnings,
  workflow_may_report_success:reasons.length===0,
  global_market_coverage_proven:false,
  paper_orders_authorized:0};
}
