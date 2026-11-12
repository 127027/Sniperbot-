// R07-only research-report auditing. Never creates or authorizes buy/sell orders.
// Independent original content and archived bytes must still be checked OUTSIDE this metadata auditor.
const START='2024-09-10',END='2024-11-09';
export const R07_ROLES=Object.freeze(['news_discovery','social_acceleration','onchain_liquidity','contract_security','opportunity_qa']);
const dateValid=s=>typeof s==='string'&&/^2024-\d{2}-\d{2}$/.test(s)&&s>=START&&s<=END&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const asArray=x=>Array.isArray(x)?x:[];
const validEvm=s=>typeof s==='string'&&/^0x[0-9a-f]{40}$/.test(s);
const validSol=s=>typeof s==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
export function validR07CandidateId(id){
 if(typeof id!=='string')return false;
 const a=id.split(':');if(a.length!==3)return false;
 if(a[0]==='solana')return validSol(a[1])&&validSol(a[2]);
 if(['eth','base','bsc'].includes(a[0]))return validEvm(a[1])&&validEvm(a[2]);
 return false;
}
export function auditR07Role(report,expectedRole){
 const errors=[];
 if(!R07_ROLES.includes(expectedRole))errors.push('UNKNOWN_EXPECTED_ROLE');
 if(!report||report.schema!=='research_historical_r07_role.v1'||report.role!==expectedRole)
  errors.push('ROLE_OR_SCHEMA_MISMATCH');
 if(report?.paper_only!==true||report?.actionable!==false)errors.push('UNSAFE_ACTIONABLE_RESEARCH');
 if(report?.period?.start_utc!=='2024-09-10T00:00:00Z'||
    report?.period?.end_utc!=='2024-11-09T23:59:59Z'||
    report?.period?.days!==61)errors.push('PERIOD_MISMATCH');
 if(!['PENDING','COMPLETED','BLOCKED'].includes(report?.state))errors.push('INVALID_STATE');
 const days=asArray(report?.daily_findings),seen=new Set();
 if(days.length>61)errors.push('TOO_MANY_DAYS');
 for(const d of days){
  if(!dateValid(d?.virtual_day_utc))errors.push('OUTSIDE_VIRTUAL_WINDOW');
  if(seen.has(d.virtual_day_utc))errors.push('DUPLICATE_VIRTUAL_DAY');
  seen.add(d.virtual_day_utc);
  // Later timestamps are not proof of what was available at an earlier virtual day.
  for(const s of asArray(d?.source_urls_with_capture_timestamps)){
   const capture=typeof s==='object'&&s!==null?s.capture_at_utc:null;
   if(!capture||!Number.isFinite(Date.parse(capture))||
      capture>d.virtual_day_utc+'T23:59:59.999Z')errors.push('AFTER_DAY_OR_UNKNOWN_SOURCE_CAPTURE');
  }
 }
 const first=asArray(report?.first_discovers),advisories=asArray(report?.qualified_paper_buy_advisories);
 for(const p of [...first,...advisories]){
  if(!dateValid(p?.first_valid_day_utc||p?.virtual_day_utc))errors.push('INVALID_DECISION_DATE');
  if(p?.candidate_id!=null&&!validR07CandidateId(p.candidate_id))errors.push('INVALID_CANDIDATE_ID');
  if(p?.actionable===true||p?.signed_order||p?.wallet_tx)errors.push('RESEARCH_MUST_NOT_EXECUTE');
 }
 if(report?.state==='PENDING'&&(days.length||first.length||advisories.length))errors.push('PENDING_WITH_DECISIONS');
 const complete=report?.state==='COMPLETED'&&errors.length===0;
 return {role:expectedRole,state:report?.state??'MISSING',schema_valid:errors.length===0,
  completed_and_schema_valid:complete,days_reported:days.length,
  first_discovers:first.length,hypothetical_advisories:advisories.length,
  errors:[...new Set(errors)],asof_independent_content_verified:false,
  limitation:'Metadata and agent assertions cannot authenticate historical source bytes or original swap quotes'};
}
export function summarizeR07Reports(byRole){
 const roles=R07_ROLES.map(role=>auditR07Role(byRole?.[role],role));
 const allValid=roles.every(x=>x.completed_and_schema_valid);
 const knownIds=new Set();
 for(const role of R07_ROLES)
  for(const e of asArray(byRole?.[role]?.first_discovers))
   if(validR07CandidateId(e.candidate_id))knownIds.add(e.candidate_id);
 return {schema:'dot_r07_audit.v1',test_interval:[START,END],roles,all_five_completed:allValid,
  distinct_identified_research_candidates:knownIds.size,reported_candidate_ids:[...knownIds].sort(),
  certified_historical_predictive_performance:false,executed_paper_buys:0,executed_paper_sells:0,
  status:!allValid?'WAITING_FOR_VALIDATED_ROLE_REPORTS':'ROLE_REPORTS_PRESENT_NEEDS_INDEPENDENT_ASOF_AUDIT',
  note:'Never treat historical retrospective search as the model running in that year; original archived bytes and negative cohort required'};
}
