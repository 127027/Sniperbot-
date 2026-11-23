// R29: deterministic, read-only next-backtest five-role freshness audit.
// A git blob hash proves Git bytes only, NOT an authenticated GPT invocation
// or the original source availability at an October 2026 decision timestamp.
import {createHash} from 'node:crypto';
import {asOfMillis} from './v19-asof-evidence.mjs';
import {LIVE_DOT_IDS} from './v19-dot-journal-inventory.mjs';
import {resolveDot2CaptureView} from './v19-dot2-capture-view.mjs';

const MAX_TRACE_AGE_MS=2*60*60*1000;
const sourceRoles=Object.freeze({
 'dot-1':'dot-1-tempo',
 'dot-2':'dot-2-discovery',
 'dot-3':'dot-3-risk',
 'dot-4':'dot-4-strategy',
 'dot-5':'dot-5-control'});
const tracePath=/^research\/audits\/dot-traces\/(\d{4}-\d{2}-\d{2})\/([A-Za-z0-9_-]{8,120})\/(dot-[1-5]-(?:tempo|discovery|risk|strategy|control))\.json$/;
const gitSha=raw=>{
 const data=Buffer.from(raw,'utf8');
 return createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
};
const time=(value)=>asOfMillis(value);
const roleAt=(obj)=>[
 obj?.executed_at_utc,obj?.actual_execution_at_utc,obj?.actual_gpt_execution_at_utc,
 obj?.actual_execution_utc,obj?.at_utc,obj?.execution_at_utc,obj?.created_at_utc
].find(x=>time(x)!==null)??null;
const authClaim=obj=>
 obj?.gpt_execution_identity==='VERIFIED_INDEPENDENTLY'
 ||obj?.execution_authentication==='VERIFIED_INDEPENDENTLY'
 ||obj?.review_is_independently_authenticated===true
 ||obj?.authentic_gpt_review_receipt===true;
const err=(role,code)=>({role,code});

export function auditFiveDotNextBacktestForensicFreshness({
 latestByRole={},rawForensicByPath={},feedPointer=null,asOfUtc
}={}){
 const now=time(asOfUtc);
 if(now===null||!latestByRole||Array.isArray(latestByRole)
  ||!rawForensicByPath||Array.isArray(rawForensicByPath)
  ||typeof latestByRole!=='object'||typeof rawForensicByPath!=='object')
  throw Error('INVALID_FIVE_DOT_NEXT_BACKTEST_FRESHNESS_INPUT');
 const byRole=new Map(LIVE_DOT_IDS.map(x=>[x,[]]));
 let rejected=0;
 for(const [path,raw] of Object.entries(rawForensicByPath)){
  const match=path.match(tracePath);
  if(!match||typeof raw!=='string'){rejected++;continue;}
  const role=Object.keys(sourceRoles).find(x=>sourceRoles[x]===match[3]);
  if(!role||time(match[1]+'T00:00:00.000Z')===null){
   rejected++;continue;
  }
  let trace;
  try{trace=JSON.parse(raw)}
  catch{rejected++;continue;}
  const at=roleAt(trace),atMs=time(at);
  const identity=trace?.role;
  // A self-labelled file cannot swap role, claim future execution, nor
  // inject history/replay outputs as a current forensic trace.
  if(trace?.schema!==1||(identity!==undefined
    &&identity!==role&&identity!==sourceRoles[role])
   ||atMs===null||atMs>now
   ||new Date(atMs).toISOString().slice(0,10)!==match[1]
   ||trace.backtest_triggered===true
   ||trace.orders_written>0||trace.paper_fills_claimed>0){
   rejected++;continue;
  }
  byRole.get(role).push({path,at_utc:new Date(atMs).toISOString(),
   git_blob_sha:gitSha(raw),
   source_only:true,
   independent_gpt_execution_proven:false,
   self_reported_gpt_authenticated:authClaim(trace),
   trace_current_capture_run_id:trace?.source_capture_run_id
     ??trace?.source_run_id??null});
 }
 const issues=[],roles=[];
 for(const role of LIVE_DOT_IDS){
  const traceCandidates=byRole.get(role).sort((a,b)=>
   time(b.at_utc)-time(a.at_utc)||a.path.localeCompare(b.path));
  const best=traceCandidates[0]??null,pointer=latestByRole[role];
  const pointerAt=time(pointer?.updated_at_utc);
  const issuesForRole=[];
  const add=code=>{issuesForRole.push(code);issues.push(err(role,code));};
  if(pointer?.dot!==role||pointer?.schema!==1||pointerAt===null
   ||pointerAt>now)add('INVALID_OR_MISSING_ROLE_LATEST_POINTER');
  if(!best)add('MISSING_VALID_CURRENT_ROLE_FORENSIC_TRACE');
  else{
   if(now-time(best.at_utc)>MAX_TRACE_AGE_MS)
    add('FORENSIC_REVIEW_MORE_THAN_TWO_HOURS_OLD');
   if(pointerAt!==null&&time(best.at_utc)-pointerAt>5*60*1000)
    add('ROLE_LATEST_POINTER_BEHIND_FORENSIC_RESEARCH');
   if(best.self_reported_gpt_authenticated)
    add('SELF_REPORTED_AUTHENTICATION_NOT_INDEPENDENT_PROOF');
  }
  let captureView=null;
  if(role==='dot-2'){
   captureView=resolveDot2CaptureView({
    gptPointer:pointer,feedPointer,asOfUtc});
   const completed=time(feedPointer?.captured_at_utc);
   if(['CAPTURE_PENDING_DATA_GAP','CAPTURE_PENDING_GPT_RECEIPT_UNVERIFIED_DATA_GAP'].includes(pointer?.status)
    &&feedPointer?.request_path===pointer?.capture_request_path
    &&completed!==null&&pointerAt!==null&&completed>pointerAt
    &&completed<=now)
    add('SAME_REQUEST_SOURCE_CAPTURE_COMPLETE_BUT_GPT_REVIEW_STILL_PENDING');
   if(captureView.status==='LATEST_FEED_NOT_VERIFIABLE_FROM_POINTER')
    add('CURRENT_COMPLETED_FEED_POINTER_NOT_VALID');
   if(captureView.latest_gpt_review_authenticated_independently!==false)
    throw Error('UNSAFE_DOT2_GPT_AUTH_ASSUMPTION');
  }
  roles.push({role,latest_pointer_at_utc:pointerAt===null?null:
   new Date(pointerAt).toISOString(),
   latest_pointer_status:pointer?.status??null,
   freshest_forensic_trace:best,
   recent_forensic_traces_read:traceCandidates.length,
   provenance_scope:'GIT_BLOB_ONLY_NOT_GPT_OR_PROVIDER_AUTHENTICATION',
   source_capture_separate_from_gpt_review:role==='dot-2'
    ?captureView:null,
   self_reported_trace_available:best!==null,
   original_october_five_dot_gpt_review_proven:false,
   windows_paper_receipt_proven:false,
   status:issuesForRole.length?'REQUIRES_RECONCILIATION':
    'RESEARCH_TRACE_CURRENT_UNAUTHENTICATED',
   issues:issuesForRole});
 }
 return {schema:1,kind:'R29_V19_FIVE_DOT_NEXT_BACKTEST_FRESHNESS_AUDIT',
  as_of_utc:asOfUtc,roles,role_count:5,
  roles_with_valid_trace:roles.filter(x=>x.freshest_forensic_trace).length,
  roles_with_recent_trace:roles.filter(x=>x.freshest_forensic_trace
   &&now-time(x.freshest_forensic_trace.at_utc)<=MAX_TRACE_AGE_MS).length,
  role_latest_pointers_behind_newer_traces:roles.filter(x=>
   x.issues.includes('ROLE_LATEST_POINTER_BEHIND_FORENSIC_RESEARCH')).map(x=>x.role),
  rejected_untrusted_or_future_trace_files:rejected,
  issues,issue_count:issues.length,
  no_automatic_role_pointer_or_source_rewriting:true,
  actual_five_gpt_october_journals_independently_authenticated:0,
  original_october_market_snapshot_coverage_verified:false,
  original_october_risk_or_sellability_verified:false,
  local_windows_paper_client_receipts_verified:false,
  next_historical_qa04_release_authorized:false,
  no_quotes_or_orders_created:true};
}
