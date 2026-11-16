// R29 appendix-only FALSE-NEGATIVE / rejected-winner outcome audit.
// Historical decision stays immutable; post-hoc price observations are NEVER
// inserted in its research evidence or treated as an actually executable fill.
import {createHash} from "node:crypto";
const hash=x=>createHash("sha256").update(x).digest("hex");
const MS_HOUR=3600000;
const validClock=x=>typeof x==="string"&&x.endsWith("Z")&&
 Number.isFinite(Date.parse(x));
export function priceMovementAudit({
 decision,observed_swaps=[],evaluation_at_utc,
 horizon_hours=24,missed_move_ratio=1.75,
 last_baseline_max_age_minutes=60
}={}){
 if(!decision||!validClock(decision.virtual_decision_at_utc)||
  !validClock(evaluation_at_utc)||
  !["NO_TRADE","WATCH","BUY","HOLD","SELL"].includes(decision.research_verdict)||
  typeof decision.mint!=="string"||!decision.mint||
  !Number.isFinite(horizon_hours)||horizon_hours<=0||horizon_hours>1440||
  !Number.isFinite(missed_move_ratio)||missed_move_ratio<=1||
  !Number.isFinite(last_baseline_max_age_minutes)||last_baseline_max_age_minutes<=0||
  !Array.isArray(observed_swaps)||observed_swaps.length>3000000)
  throw Error("R29_INVALID_PRICE_AUDIT_INPUT");
 const D=Date.parse(decision.virtual_decision_at_utc);
 const E=Date.parse(evaluation_at_utc);
 if(E<D)throw Error("R29_FUTURE_AUDIT_NOT_YET_ALLOWED");
 const stop=Math.min(D+horizon_hours*MS_HOUR,E);
 const valid=observed_swaps.map((x,i)=>{
  const at=Date.parse(x.at_utc);
  const amount=Number(x.quote_amount_raw);
  const qty=Number(x.token_amount_raw);
  const comparable=x.mint===decision.mint&&
   validClock(x.at_utc)&&Number.isFinite(at)&&
   x.failed===false&&["buy","sell"].includes(x.side)&&
   typeof x.quote_mint==="string"&&x.quote_mint.length>0&&
   (typeof x.pool==="string"||x.pool===null)&&
   typeof x.venue==="string"&&x.venue.length>0&&
   amount>0&&qty>0&&Number.isFinite(amount)&&Number.isFinite(qty);
  return comparable?{...x,at,raw_price:amount/qty,index:i}:null;
 }).filter(Boolean).sort((a,b)=>a.at-b.at||a.index-b.index);
 const before=valid.filter(x=>x.at<D&&D-x.at<=last_baseline_max_age_minutes*60000);
 const base=before.at(-1);
 const resultBase={
  schema:"sniper_r29_posthoc_rejected_coin_outcome_audit.v1",
  chain:"solana",mint:decision.mint,
  historical_virtual_decision_at_utc:decision.virtual_decision_at_utc,
  historical_verdict_unchanged:decision.research_verdict,
  evaluation_at_utc,source_class:"POSTHOC_EXECUTED_THIRD_PARTY_SWAP_EVENTS_NOT_OUR_FILLED_TRADES",
  outcome_not_visible_to_original_decision:true,
  historical_policy_frozen:true,
  historical_model_fills_proven:0,
  hypothetical_profit_test_usdc:null,
  observed_missed_price_movement:null,
  real_quote_executability_proven:false,
  source_mint_matches:true,
  first_reasonably_executable_quote_available:false,
  reference_quote_token:null,reference_pool:null,reference_venue:null,
  baseline_raw_quote_per_raw_token:null,observed_post_decision_max_ratio:null,
  observed_post_decision_min_ratio:null,
  same_market_later_executed_swaps:0,
  audit_status:"NO_COMPARABLE_BASELINE"
 };
 if(!base)return resultBase;
 const later=valid.filter(x=>x.at>D&&x.at<=stop&&
  x.quote_mint===base.quote_mint&&x.pool===base.pool&&
  x.venue===base.venue);
 const matching={...resultBase,reference_quote_token:base.quote_mint,
  reference_pool:base.pool,reference_venue:base.venue,
  baseline_observed_at_utc:base.at_utc,
  baseline_raw_quote_per_raw_token:base.raw_price,
  same_market_later_executed_swaps:later.length,
  total_posthoc_review_horizon_hours:horizon_hours,
  reference_is_another_wallet_actual_trade_not_our_fill:true};
 if(!later.length)return {...matching,audit_status:"NO_SAME_MARKET_LATER_SWAPS"};
 const ratios=later.map(x=>x.raw_price/base.raw_price);
 if(ratios.some(x=>!Number.isFinite(x)||x<=0))
  return {...matching,audit_status:"UNSTABLE_PRICE_RATIO"};
 const max=Math.max(...ratios),min=Math.min(...ratios);
 const mostExtreme=later[ratios.indexOf(max)];
 const rejected=["NO_TRADE","WATCH"].includes(decision.research_verdict);
 return {...matching,
  observed_post_decision_max_ratio:max,
  observed_post_decision_min_ratio:min,
  first_later_observed_at_utc:later[0].at_utc,
  last_later_observed_at_utc:later.at(-1).at_utc,
  max_observed_at_utc:mostExtreme.at_utc,
  observed_missed_price_movement:rejected&&max>=missed_move_ratio,
  audit_status:rejected&&max>=missed_move_ratio?
   "REJECTED_OR_WATCHED_LATER_PRICE_RALLY_OBSERVED_NOT_EXECUTABLE_PROOF":
   "POSTHOC_PRICE_MOVEMENT_OBSERVED",
  interpretation:"Raw quote/token amount ratio compares only identical quote mint, pool and venue; the ratio is a documented price observation, NOT a claim that a 50-5000 USDC order could fill or exit."};
}
export function immutableLessonProposal(audit,{authored_at_utc,reviewer}={}){
 if(audit?.schema!=="sniper_r29_posthoc_rejected_coin_outcome_audit.v1"||
  !validClock(authored_at_utc)||!reviewer||
  Date.parse(authored_at_utc)<Date.parse(audit.evaluation_at_utc))
  throw Error("R29_INVALID_LESSON_AUDIT");
 const observed=audit.audit_status.startsWith("REJECTED_OR_WATCHED");
 const id="lesson_"+hash([audit.chain,audit.mint,audit.historical_virtual_decision_at_utc,
  audit.evaluation_at_utc,audit.audit_status].join("|")).slice(0,24);
 return {
  schema:"sniper_r29_forward_only_learning_proposal.v1",
  id,chain:audit.chain,mint:audit.mint,
  decision_at_utc:audit.historical_virtual_decision_at_utc,
  original_verdict:audit.historical_verdict_unchanged,
  outcome_evaluated_at_utc:audit.evaluation_at_utc,
  lesson_published_at_utc:authored_at_utc,
  hypothesis:observed?
   "Review whether early genuine buyer diversity, venue consistency, authentic news or liquidity could have been detected at the original time. Do NOT remove mandatory contract/sellability KO gates.":
   "Keep the decision evidence intact; missing outcomes or a price move below threshold do not prove the signal was correctly or incorrectly rejected.",
  validated_improvement_in_forward_trading:false,
  requires_separate_forward_test:true,
  source_audit_status:audit.audit_status,
  missed_observed_rally_not_executable_profit:observed,
  must_not_rewrite_historical_decision:true,
  may_only_influence_decisions_after_utc:authored_at_utc,
  reviewer,
  independent_contract_quote_and_wallet_proof_still_required:true
 };
}
