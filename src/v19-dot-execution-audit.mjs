// R29 V1.9 SYS-08: One market/decision engine; five transparent role audits.
// Model replay steps are NOT GPT executions, even if named dot1..dot5.
// Future GPT journals can be imported only with independent verification by a
// separate trusted verifier; this module never treats a self-claimed run as proof.
const roles=Object.freeze(['dot-1-tempo','dot-2-discovery','dot-3-risk',
 'dot-4-strategy','dot-5-control']);
const date=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export const FIVE_R29_ROLES=roles;
export function auditFiveDotExecution({events=[],asOfUtc,
 claimedGptJournals=[],mode='HISTORICAL_ASOF'}={}){
 const asof=date(asOfUtc);
 if(asof===null||!Array.isArray(events)||!Array.isArray(claimedGptJournals)
  ||!['HISTORICAL_ASOF','LIVE_PAPER'].includes(mode))
  throw Error('INVALID_R29_DOT_EXECUTION_AUDIT');
 const perRole=roles.map(id=>({role:id,source:'SIMULATED',
   genuine_gpt_invocations:0,authenticated_gpt_decisions:0,
   modeled_role_steps:events.length,
   verified_paper_orders:0,verified_paper_fills:0,
   execution_evidence_required:'TRUSTED_ISSUER_AND_GITHUB_BLOB_OR_WORKFLOW_PROOF'}));
 const entries=events.map((ev,i)=>{
   const observed=date(ev?.at_utc);
   if(observed===null||observed>asof)throw Error('REPLAY_EVENT_AFTER_ASOF');
   return {index:i,at_utc:ev.at_utc,origin:'SIMULATED',
     full_review_due:ev.full_review===true,
     target_full_reviews_per_day:ev.target_per_24h??null,
     modeled_actions:Array.isArray(ev.actions)?ev.actions.map(a=>({
       action:a.action,reason:a.reason??null,origin:'DETERMINISTIC_MODEL',
       not_an_actual_gpt_decision:true,not_an_actual_paper_fill:true})):[],
     dot_roles:roles.map(role=>({role,origin:'SIMULATED',
       real_gpt_invocation:false})),
     verified_gpt_run_count:0,published_order_count:0};
 });
 const claimed=[];
 for(const [i,j] of claimedGptJournals.entries()){
   const at=date(j?.executed_at_utc),role=j?.role;
   claimed.push({index:i,role:roles.includes(role)?role:null,
     claimed_run_at_utc:at===null?null:new Date(at).toISOString(),
     status:at===null||at>asof?'INVALID_OR_FUTURE_CLAIM':
       !roles.includes(role)?'UNKNOWN_ROLE_CLAIM':
       'UNVERIFIED_GPT_EXECUTION_CLAIM',
     counted_as_actual_execution:false,
     missing_independent_authentication:true});
 }
 const due=entries.filter(x=>x.full_review_due).length;
 return {schema:1,kind:'R29_V19_FIVE_DOT_EXECUTION_PROVENANCE',
   mode,as_of_utc:asOfUtc,model_tick_count:entries.length,
   full_review_due_count:due,
   simulated_role_step_count:entries.length*roles.length,
   modeled_signal_action_count:entries.reduce((sum,x)=>sum+x.modeled_actions.length,0),
   genuine_gpt_invocations:0,verified_gpt_run_count:0,
   claimed_gpt_journal_count:claimed.length,
   unauthenticated_gpt_claims:claimed,
   published_paper_orders:0,verified_paper_fills:0,
   per_role:perRole,ticks:entries,
   no_provider_activity_executed:true,
   no_github_order_published:true,
   future_authentic_gpt_runs_require_verified_issuer_and_matching_blob:true,
   limitations:[
    'Role labels represent deterministic replay steps only, not five ChatGPT Dots running.',
    'A user-supplied or repo-stored claim of GPT execution cannot self-authenticate.',
    'Executed GPT reviews and client PAPER receipts require separately verified source records.'
   ]};
}
