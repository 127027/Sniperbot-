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
 // The provider is shared by new_pools and optional trending/OHLCV.
 // Only a strictly typed -pageN response can count as a PLANNED PAGE.
 // A valid trending response is a separate supplementary HTTP receipt,
 // never a silently discarded error and never a phantom planned page.
 const gecko=journal.http_receipts.filter(r=>r?.provider==='GECKOTERMINAL');
 const pageRx=/^research\/feeds\/\d{4}-\d{2}-\d{2}\/(\d+)\/gecko-(solana|base|ethereum|bsc|robinhood|cronos)-page([1-9]\d{0,2})\.raw\.json$/;
 const olderRx=/^research\/feeds\/\d{4}-\d{2}-\d{2}\/(\d+)\/gecko-(solana|base|ethereum|bsc|robinhood|cronos)-trending-(1h|6h|24h)\.raw\.json$/;
 const succeeded=new Set();
 const failed=[],supplemental=[];
 for(const r of gecko){
  const path=String(r.body_path||''),match=path.match(pageRx),
   older=match?null:path.match(olderRx);
  if(!/^[0-9a-f]{64}$/.test(r.response_sha256||'')
    ||(!match&&!older)||(match||older)[1]!==runId){
   reasons.push('UNVERIFIABLE_GECKO_RECEIPT');continue;
  }
  if(older){
   supplemental.push({chain:older[2],lane:'TRENDING',
    status:r.http_status??null,source_path:path});
   if(r.http_status!==200)
    reasons.push('SUPPLEMENTAL_GECKO_HTTP_FAILURE');
   continue;
  }
  const candidate=key(match[2],Number(match[3]));
  if(!planned.some(p=>key(p.chain,p.page)===candidate)){
   reasons.push('RECEIPT_NOT_IN_REQUEST_PLAN');continue;
  }
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
 // In the cooldown branch also require NO supplementary provider HTTP;
 // one successful extra endpoint cannot masquerade as a fully deferred wake.
 // A deliberately paused scan is not a provider error. No HTTP call may be
 // performed under the persistent 429 cooldown. Every planned page must be
 // recorded as DEFERRED and the future retry timestamp must be evidenced.
 const cooldown=evidence.metrics?.v19_gecko_provider_429_cooldown;
 const retry=Date.parse(cooldown?.retry_not_before_utc||'');
 const completion=Date.parse(evidence.captured_completed_at_utc||'');
 const deferredKeys=evidence.page_capture_deferred.map(p=>key(p.chain,p.page));
 const isSafeDeferred=planned.length>0&&gecko.length===0
  &&!journal.http_receipts.some(r=>r.provider==='GECKOTERMINAL_OHLCV')
  &&!evidence.api_evidence.some(r=>r?.provider==='GECKOTERMINAL')
  &&failed.length===0&&evidence.page_capture_failures.length===0
  &&cooldown?.active===true&&Number.isFinite(retry)
  &&Number.isFinite(completion)&&retry>completion
  &&deferredKeys.length===planned.length
  &&unique(deferredKeys)
  &&planned.every(p=>deferredKeys.includes(key(p.chain,p.page)))
  &&journal.unresolved_planned_pages_this_run.length===planned.length
  &&journal.proven_successful_pages_this_run===0
  &&journal.state==='FINALIZED_BY_RUNNER';
 const onlyExpectedDeferralReasons=reasons.every(r=>[
  'PLANNED_PAGES_WITHOUT_HTTP200','UNATTEMPTED_DEFERRED_PAGES',
  'JOURNAL_CONFIRMS_INCOMPLETE_CAPTURE','PROVEN_PAGE_COUNT_MISMATCH'
 ].includes(r));
 if(isSafeDeferred&&onlyExpectedDeferralReasons){
  reasons.length=0;
  coverageWarnings.push('PERSISTED_PROVIDER_COOLDOWN_NO_HTTP_ATTEMPT');
 }
 const deferredAccepted=isSafeDeferred&&onlyExpectedDeferralReasons;
 return {schema:1,kind:'R29_V19_CAPTURE_COMPLETION_GATE',
  status:deferredAccepted?'DEFERRED_BY_PERSISTED_COOLDOWN':
   reasons.length?'PARTIAL_OR_INVALID_CAPTURE':
   missingChains.length?'BOUNDED_SAMPLE_COMPLETE_COVERAGE_INCOMPLETE':'REQUESTED_SAMPLE_COMPLETE',
  requested_chain_count:wanted.length,
  planned_page_count:planned.length,
  verified_http200_planned_pages:succeeded.size,
  missing_requested_chains:missingChains,
  unresolved_planned_pages:missingPages,
  provider_http_failures:failed,
  supplemental_gecko_receipts:supplemental,
  supplemental_gecko_http_failures:supplemental.filter(x=>x.status!==200),
  reasons:[...new Set(reasons)],coverage_warnings:coverageWarnings,
  workflow_may_report_success:reasons.length===0,
  global_market_coverage_proven:false,
  paper_orders_authorized:0};
}
