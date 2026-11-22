// D1-07: compare predeclared 4/8/12/24 full-review budgets on the
// SAME 24-hour as-of replay observations. This is not actual GPT cost or
// evidence of a profitable threshold. Missing quotes have zero BUY value.
const LEVELS=[4,8,12,24];
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function compareOfflineCadenceBudgets({
 replayEvents=[],policyFrozenAtUtc,asOfUtc
}={}){
 const now=ms(asOfUtc),frozen=ms(policyFrozenAtUtc);
 if(now===null||frozen===null||frozen>now
  ||!Array.isArray(replayEvents)||replayEvents.length!==24)
  throw Error('INVALID_D1_CADENCE_SHADOW_WINDOW');
 const start=ms(replayEvents[0]?.at_utc);
 if(start===null||frozen>start)throw Error('CADENCE_POLICY_NOT_FROZEN_BEFORE_WINDOW');
 for(let i=0;i<24;i++){
  const e=replayEvents[i],at=ms(e?.at_utc);
  if(at===null||at>now||at!==start+i*3600000
   ||!Number.isInteger(e.eligible_snapshots)||e.eligible_snapshots<0
   ||typeof e.status!=='string'||!['DATA_GAP_NO_FRESH_QUOTES','NO_TRADE',
     'BUY','SELL'].includes(e.status))
   throw Error('CADENCE_HISTORICAL_ASOF_WINDOW_INCOMPLETE');
 }
 const variants=LEVELS.map(target=>{
  const every=24/target;let sourceHours=0,missing=0,quoteCandidates=0;
  const sampleHours=[];
  for(let i=0;i<24;i+=every){
   const row=replayEvents[i];
   const n=row.eligible_snapshots;
   sourceHours+=n>0?1:0;
   missing+=n===0?1:0;
   quoteCandidates+=n;
   sampleHours.push({at_utc:row.at_utc,fresh_candidate_count:n,
    model_full_review_slot_only:true});
  }
  return {target_model_reviews_per_24h:target,
   hypothetical_review_slots:sampleHours.length,
   sampled_hours_with_any_fresh_quote:sourceHours,
   sampled_hours_without_fresh_quotes:missing,
   sum_of_fresh_candidate_snapshots_not_unique_pools:quoteCandidates,
   sample_hours:sampleHours,
   marginal_gpt_tokens:null,marginal_gpt_cost_usd:null,
   verified_new_buys_due_to_extra_reviews:null,
   verified_holdout_precision:null,
   actual_gpt_reviews_performed:0};
 });
 return {schema:1,kind:'R29_V19_D1_PRECOMMITTED_CADENCE_SHADOW',
  as_of_utc:asOfUtc,policy_frozen_at_utc:policyFrozenAtUtc,
  replay_hour_count:24,
  budgets:variants,
  full_market_activity_comparison_verified:false,
  future_hindsight_winner_oracle_used:false,
  input_quote_availability_is_not_tradeability:true,
  selected_optimum:null,threshold_policy_modified:false,
  actual_gpt_tokens_used:0,additional_provider_requests:0,
  paper_orders_authorized:0};
}
