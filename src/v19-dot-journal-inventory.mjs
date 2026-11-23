// R29 V1.9: read-only, current-live five-Dot journal inventory.
// This is a diagnostic of supplied Git snapshots, NOT historical GPT execution
// proof, not a 29h replay, and never a Paper fill or independent issuer proof.
import {createHash} from 'node:crypto';
import {asOfMillis} from './v19-asof-evidence.mjs';
import {resolveDot2CaptureView} from './v19-dot2-capture-view.mjs';

export const LIVE_DOT_IDS=Object.freeze(['dot-1','dot-2','dot-3','dot-4','dot-5']);
const pat=/^research\/journal\/(dot-[1-5])\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\.json$/;
const forensic=/^research\/audits\/dot-traces\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]{8,120}\/dot-5-control\.json$/;
const pendingDot2Forensic=/^research\/audits\/dot-traces\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]{8,120}\/dot-2-discovery\.json$/;
const roleForensics=/^research\/audits\/dot-traces\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]{8,120}\/dot-[1-5]-(?:tempo|discovery|risk|strategy|control)\.json$/;
export const validRoleJournalPath=(role,path)=>
  typeof path==='string'&&(
    path.match(pat)?.[1]===role
    ||(role==='dot-5'&&forensic.test(path)));
const iso=x=>asOfMillis(x);
const sha=/^[a-f0-9]{40}$/;
const hash=raw=>{
 const data=Buffer.from(raw,'utf8');
 return createHash('sha1').update('blob '+data.length+'\0')
   .update(data).digest('hex');
};
const status=(issues)=>issues.length?'INCOMPLETE':'SNAPSHOT_CONSISTENT_UNAUTHENTICATED';

export function auditLiveFiveDotJournalInventory({
 latestByRole={},rawJournalsByPath={},feedPointer=null,
 asOfUtc
}={}){
 const at=iso(asOfUtc);
 if(at===null||latestByRole===null||typeof latestByRole!=='object'
   ||Array.isArray(latestByRole)||rawJournalsByPath===null
   ||typeof rawJournalsByPath!=='object'||Array.isArray(rawJournalsByPath))
  throw Error('INVALID_LIVE_DOT_INVENTORY_ARGUMENTS');
 const findings=[],details=[];
 for(const id of LIVE_DOT_IDS){
  const pointer=latestByRole[id];
  // An in-flight Dot2 GPT wake may truthfully create a SHA-pinned forensic
  // review but no completed canonical journal yet. Never invent one.
  const pendingDot2=id==='dot-2'
    &&pointer?.status==='CAPTURE_PENDING_DATA_GAP'
    &&pendingDot2Forensic.test(pointer?.forensic_audit_path??'')
    &&(pointer?.journal_path===undefined||pointer?.journal_path===null);
  let forensicRawSha=null;
  const issues=[];
  const issue=(code,detail)=>issues.push({code,detail});
  if(pointer?.dot!==id||pointer?.schema!==1
    ||!pendingDot2&&!validRoleJournalPath(id,pointer?.journal_path))
   issue('MISSING_OR_UNTRUSTED_LATEST_POINTER',id+' requires a valid role-specific latest journal');
  const updated=iso(pointer?.updated_at_utc);
  if(updated===null||updated>at)
   issue('INVALID_OR_FUTURE_POINTER_TIME','Latest pointer must be at or before this audit UTC');
  const path=pointer?.journal_path;
  let raw=null,journal=null,rawSha=null;
  if(validRoleJournalPath(id,path)){
   raw=rawJournalsByPath[path];
   if(typeof raw!=='string')issue('POINTER_JOURNAL_BYTES_NOT_IN_INVENTORY','Raw file missing: '+path);
   else{
    rawSha=hash(raw);
    try{journal=JSON.parse(raw);}catch{issue('JOURNAL_JSON_MALFORMED',path);}
   }
  }
  if(pendingDot2){
   const forensicPath=pointer.forensic_audit_path;
   const body=rawJournalsByPath[forensicPath];
   if(typeof body!=='string')
    issue('DOT2_PENDING_FORENSIC_BYTES_MISSING','Pending GPT forensic trace must exist as Git bytes');
   else{
    forensicRawSha=hash(body);
    let trace=null;
    try{trace=JSON.parse(body)}
    catch{issue('DOT2_PENDING_FORENSIC_JSON_MALFORMED',forensicPath);}
    if(trace!==null){
     const executed=iso(trace.actual_execution_utc??trace.executed_at_utc
       ??trace.actual_execution_at_utc??trace.at_utc);
     if(trace.schema!==1||trace.role!=='dot-2-discovery'
       ||trace.gpt_run_identity!=='UNVERIFIED'
       ||executed===null||executed>at||updated!==null&&executed>updated
       ||trace.orders_written>0||trace.backtest_executed===true)
      issue('DOT2_PENDING_FORENSIC_SEMANTICS_UNTRUSTED',
        'Research trace cannot certify completed GPT or contain orders');
    }
    if(!sha.test(pointer?.forensic_audit_blob_sha??'')
      ||forensicRawSha!==pointer.forensic_audit_blob_sha
      ||pointer.journal_blob_sha!==forensicRawSha)
     issue('DOT2_PENDING_FORENSIC_GIT_BLOB_MISMATCH',
       'Forensic byte SHA must match BOTH immutable pending fields');
   }
  }
  if(journal!==null){
   // Dot1's originally checked-in tempo journal and Dot5's forensic
   // control journal use a ROLE-native schema without a generic kind field.
   // Accept only these exact schemas with independently matching Git bytes;
   // this never authenticates a GPT execution or an external data provider.
   const exactRoleKindless=id==='dot-1'
     &&journal.schema===1&&journal.role==='dot-1-tempo'
     &&iso(journal.gpt_execution_at_utc)!==null
     &&journal.execution_origin==='GPT_SELF_REPORTED'
     &&journal.status==='DATA_GAP'
     &&typeof journal.security==='string'
     &&journal.security.includes('no signals, orders, backtest, wallet changes, or paper fills')
    ||id==='dot-5'&&forensic.test(path)
     &&journal.schema===1&&journal.role==='dot-5-control'
     &&journal.gpt_execution_identity==='UNVERIFIED'
     &&iso(journal.executed_at_utc)!==null
     &&journal.orders_written===0&&journal.paper_fills_claimed===0;
   if(journal?.schema!==1||(typeof journal.kind!=='string'&&!exactRoleKindless))
    issue('JOURNAL_SCHEMA_MISSING',path);
   const referenced=pointer?.journal_blob_sha;
   if(typeof referenced!=='string'||!sha.test(referenced))
    issue('MISSING_IMMUTABLE_JOURNAL_SHA',id+' latest pointer has no verifiable blob SHA');
   else if(rawSha!==referenced)
    issue('JOURNAL_GIT_BLOB_MISMATCH',id+' latest pointer disagrees with immutable journal');
   const executed=iso(journal.executed_at_utc??journal.created_at_utc
    ??journal.observed_at_utc??journal.updated_at_utc
    ??journal.at_utc??journal.gpt_execution_at_utc);
   if(executed===null||executed>at||updated!==null&&executed>updated)
    issue('JOURNAL_TIME_CONTRADICTION','Journal cannot be newer than its latest pointer');
   else if(updated!==null&&updated-executed>10*60*1000)
    issue('LATEST_POINTS_TO_PRIOR_JOURNAL',
      'Pointer updated more than 10min after referenced journal; check separate forensic trace');
   const claimed=journal.dot??journal.role??null;
   if(claimed!==null&&!([id,
     { 'dot-1':'dot-1-tempo','dot-2':'dot-2-discovery',
       'dot-3':'dot-3-risk','dot-4':'dot-4-strategy','dot-5':'dot-5-control'}[id]].includes(claimed)))
    issue('JOURNAL_ROLE_CLAIM_DIFFERENT','Journal role disagrees with its directory');
   // No key/number in a local research file authenticates a GPT execution.
  }
  const linkedForensic=pointer?.forensic_trace_path
    ??pointer?.forensic_audit_path??null;
  if(!roleForensics.test(linkedForensic??'')&&!pendingDot2)
   issue('FORENSIC_TRACE_NOT_LINKED',
    'Latest role pointer has no dedicated forensic trace path');
  if(id==='dot-5'&&forensic.test(path??'')
    &&pointer.forensic_trace_path!==path)
   issue('DOT5_FORENSIC_JOURNAL_POINTER_DIVERGENCE',
    'Dot5 latest journal and forensic trace claim different current files');
  if(id==='dot-2'&&feedPointer?.kind==='LATEST_DOT2_PUBLIC_CAPTURE_POINTER'){
   const pointerAt=iso(pointer?.captured_at_utc),
     feedAt=iso(feedPointer.captured_at_utc);
   const feedPath=feedPointer.evidence_path;
   if(feedAt!==null&&feedAt<=at&&pointerAt!==null&&feedAt>pointerAt
     &&pointer?.evidence_path!==feedPath)
    issue('DOT2_LATEST_BEHIND_FEED',
      'Newer source feed exists; latest Dot2 journal still points to older capture (not necessarily a failed capture)');
   // A newer source can be correctly linked by run/path but still show
   // the PREVIOUS run's pool totals/checkpoint/full-contract count. These
   // source facts must be atomically copied from that exact completed feed.
   if(feedAt!==null&&feedAt<=at&&pointer?.evidence_path===feedPath
      &&pointer?.capture_request_path===feedPointer.request_path){
    const stats=feedPointer.memory_stats;
    const current=pointer?.market_memory_stats;
    if(stats&&current&&
      (stats.total_discovered!==current.total_discovered
       ||stats.first_dot2_detected_count!==current.first_dot2_detected_count))
     issue('DOT2_LATEST_SOURCE_STATS_STALE',
       'Same-run latest pointer kept pool totals from preceding capture');
    if(typeof feedPointer.memory_checkpoint_path==='string'
       &&pointer?.checkpoint_path!==feedPointer.memory_checkpoint_path)
     issue('DOT2_LATEST_SOURCE_CHECKPOINT_STALE',
       'Same-run latest pointer kept prior-run checkpoint');
    if(typeof feedPointer.handoff_counts?.full_contracts==='number'
       &&pointer?.full_contract_candidates!==feedPointer.handoff_counts.full_contracts)
     issue('DOT2_LATEST_HANDOFF_COUNT_STALE',
       'Same-run latest pointer kept previous or partial handoff count');
   }
  }
  details.push({role:id,status:status(issues),
   ...(id==='dot-2'?{reconciled_current_capture:resolveDot2CaptureView({
     gptPointer:pointer,feedPointer,asOfUtc})}:{}),
   latest_pointer_status:pointer?.status??null,
   updated_at_utc:pointer?.updated_at_utc??null,
   journal_path:path??null,claimed_git_blob_sha:pointer?.journal_blob_sha??null,
   computed_git_blob_sha:rawSha??forensicRawSha,
   immutable_bytes_match:typeof pointer?.journal_blob_sha==='string'
     &&(rawSha??forensicRawSha)!==null
     &&pointer.journal_blob_sha===(rawSha??forensicRawSha),
   pending_gpt_research_trace_not_a_completed_journal:pendingDot2,
   forensic_trace_path:linkedForensic,
   genuine_gpt_review_independently_authenticated:false,
   problems:issues});
  findings.push(...issues.map(item=>({role:id,...item})));
 }
 return {schema:1,kind:'R29_V19_LIVE_FIVE_DOT_JOURNAL_INVENTORY',
  as_of_utc:asOfUtc,status:findings.length?'INCOMPLETE_EVIDENCE':'SNAPSHOT_CONSISTENT_NOT_AUTHENTICATED',
  role_count:LIVE_DOT_IDS.length,roles:details,
  issues:findings,issue_count:findings.length,
  verified_live_gpt_runs:0,verified_historical_gpt_runs:0,
  verified_client_fills:0,verified_trades:0,
  all_five_forensic_traces_verified:false,
  no_backtest_or_api_writes:true,not_a_historical_run:true,
  limitations:['Git blobs and local research journals do not independently attest ChatGPT execution.',
   'Dot2 source capture is reconciled separately from the last genuine GPT journal; pending source progress must not count as GPT execution.',
   'All five latest pointers must link per-role forensic traces before complete diagnosis.']};
}
