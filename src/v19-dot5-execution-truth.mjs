// D5-03: distinguish deterministic five-role analysis from actual GPT work.
// No self-reported journal, GitHub label or source hash is a verified GPT run.
import {FIVE_R29_ROLES} from './v19-dot-execution-audit.mjs';
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
export function buildDotExecutionTruth({roleAudit,asOfUtc,sourceCapture=null}={}){
 const asof=iso(asOfUtc);
 if(!asof||roleAudit?.kind!=='R29_V19_FIVE_DOT_EXECUTION_PROVENANCE'
   ||iso(roleAudit.as_of_utc)===null||iso(roleAudit.as_of_utc)>asof
   ||!Array.isArray(roleAudit.per_role)||roleAudit.per_role.length!==5
   ||roleAudit.per_role.some((v,i)=>v.role!==FIVE_R29_ROLES[i])
   ||(sourceCapture!==null&&(sourceCapture.kind!=='DOT2_PUBLIC_CAPTURE_EVIDENCE'
    ||iso(sourceCapture.captured_completed_at_utc)===null
    ||iso(sourceCapture.captured_completed_at_utc)>asof)))
   throw Error('INVALID_D5_03_EXECUTION_TRUTH_SOURCE');
 const api=sourceCapture?.api_evidence;
 const captures=Array.isArray(api)?api.filter(x=>x&&x.http_status!=null):[];
 const output=roleAudit.per_role.map((p,i)=>({
  role:FIVE_R29_ROLES[i],
  execution_type:'DETERMINISTIC_ROLE_SIMULATION_ONLY',
  simulated_role_steps:p.modeled_role_steps,
  modeled_review_due_count:i===0?roleAudit.full_review_due_count:null,
  authenticated_gpt_reviews:0,
  unverified_claimed_reviews:i===0?roleAudit.claimed_gpt_journal_count:0,
  actual_gpt_inputs:null,actual_gpt_outputs:null,
  measured_gpt_input_tokens:null,measured_gpt_output_tokens:null,
  measured_gpt_cost_usd:null,
  external_review_authentication_proof:null,
  client_confirmed_paper_orders:0,client_confirmed_paper_fills:0
 }));
 return {schema:1,kind:'R29_D5_03_EXECUTION_TRUTH_REPORT',as_of_utc:asOfUtc,
  modeled_role_steps:roleAudit.simulated_role_step_count,
  modeled_review_due_count:roleAudit.full_review_due_count,
  modeled_signal_actions:roleAudit.modeled_signal_action_count,
  verified_real_gpt_reviews:0,
  self_reported_gpt_claims_excluded:roleAudit.claimed_gpt_journal_count,
  independently_attributable_gpt_coverage:null,
  actual_gpt_review_cost_usd:null,
  actual_gpt_input_tokens:null,actual_gpt_output_tokens:null,
  provider_http_response_count:captures.length,
  provider_http_success_count:captures.filter(x=>x.http_ok===true).length,
  http_captures_are_not_gpt_reviews:true,
  actual_client_confirmed_paper_fills:0,
  origin_boundary:'ROLE_SIMULATION_IS_NOT_GPT_EXECUTED',
  per_dot:output,
  note:'Actual verified GPT review and client PAPER execution counts remain zero until authentic external receipts are independently checked. No cost/tokens invented.'};
}
