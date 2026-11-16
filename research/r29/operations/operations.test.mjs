import test from "node:test";
import assert from "node:assert/strict";
import {berlinClock,chooseAdaptiveFrequency,dailyPlan,scanDue}
 from "./adaptive-daily-cadence.mjs";
import {priceMovementAudit,immutableLessonProposal}
 from "./decision-outcome-learning.mjs";

const morning="2026-11-17T07:32:00Z";
const future="2026-11-17T09:32:00Z";
const condition=(number,at=morning)=>({
 observed_at_utc:at,independently_verified:true,
 new_pools_24h:number,independent_buyers_growth_pct:number*2,
 volume_growth_pct:number*2
});
const actualReview=(at,ev="a",pos="p")=>({
 completed_at_utc:at,kind:"GPT_FULL_REVIEW",
 evidence_sha256:ev,position_sha256:pos
});
test("Berlin morning is 08 local in winter and spring DST",()=>{
 const winter=berlinClock("2026-11-17T07:32:00Z");
 assert.equal(winter.hour,8);
 assert.equal(winter.operating_day,"2026-11-17");
 const summer=berlinClock("2026-07-20T06:32:00Z");
 assert.equal(summer.hour,8);
 assert.equal(summer.operating_day,"2026-07-20");
 assert.equal(berlinClock("2026-11-18T06:32:00Z").operating_day,
  "2026-11-17");
 assert.equal(berlinClock("2026-11-18T07:32:00Z").operating_day,
  "2026-11-18");
});
test("baseline 1, verified activity 4/12/24, open positions >=12",()=>{
 assert.equal(chooseAdaptiveFrequency({asof_utc:morning}).frequency,1);
 assert.equal(chooseAdaptiveFrequency({asof_utc:morning,
  verified_activity:condition(10)}).frequency,4);
 assert.equal(chooseAdaptiveFrequency({asof_utc:morning,
  verified_activity:condition(35)}).frequency,12);
 assert.equal(chooseAdaptiveFrequency({asof_utc:morning,
  verified_activity:condition(80)}).frequency,24);
 assert.equal(chooseAdaptiveFrequency({asof_utc:morning,
  open_position_count:1}).frequency,12);
 assert.equal(chooseAdaptiveFrequency({asof_utc:morning,
  open_position_count:1,urgent_position_risk:true}).frequency,24);
 assert.equal(chooseAdaptiveFrequency({asof_utc:morning,
  verified_activity:condition(80,"2026-11-16T00:00:00Z")
 }).frequency,1);
});
test("independently claimed activity without a valid observation timestamp fails closed",()=>{
 const invalid={independently_verified:true,new_pools_24h:100,
  independent_buyers_growth_pct:200,volume_growth_pct:200};
 assert.equal(chooseAdaptiveFrequency({asof_utc:morning,
  verified_activity:invalid}).frequency,1);
 assert.equal(chooseAdaptiveFrequency({asof_utc:morning,
  verified_activity:{...invalid,observed_at_utc:"NOT_A_TIME"},
  open_position_count:1}).frequency,12);
});
test("morning baseline is always one decision, later cadence checks are evidence-dependent",()=>{
 const plan=dailyPlan({asof_utc:morning,verified_activity:condition(35)});
 assert.equal(plan.full_gpt_reviews_per_operating_day,12);
 assert.equal(plan.suggested_local_hours.length,12);
 assert.deepEqual(scanDue({asof_utc:morning,plan}),
  {due:true,reason:"DAILY_MORNING_BASELINE",count_so_far:0});
 const prior=[actualReview(morning)];
 assert.equal(scanDue({asof_utc:"2026-11-17T08:32:00Z",
  plan,prior_full_reviews:prior,current_evidence_hash:"b"}).due,false);
 assert.equal(scanDue({asof_utc:future,plan,
  prior_full_reviews:prior,current_evidence_hash:"a",
  current_position_hash:"p"}).due,false);
 assert.equal(scanDue({asof_utc:future,plan,
  prior_full_reviews:prior,current_evidence_hash:"b"}).due,true);
});
test("one scan per day is sufficient on quiet days and never invent 24 model calls",()=>{
 const plan=dailyPlan({asof_utc:morning});
 const prior=[actualReview(morning)];
 assert.equal(plan.full_gpt_reviews_per_operating_day,1);
 assert.equal(scanDue({asof_utc:future,plan,prior_full_reviews:prior,
  current_evidence_hash:"new_hash"}).due,false);
 assert.equal(scanDue({asof_utc:"2026-11-18T07:32:00Z",plan}).due,false);
});
const mint="DKqreigeHRrprvz7zduATdY3442dgVbsuhMSZ35Ppump";
const D="2026-10-15T01:00:00Z";
const trade=(at,quote=10,pool="p",tokenMint=mint)=>({
 mint:tokenMint,at_utc:at,quote_mint:"So11111111111111111111111111111111111111112",
 pool,venue:"curve",failed:false,side:"buy",
 quote_amount_raw:quote,token_amount_raw:10});
test("a rejected token that later rallied is an OBSERVED price miss, not an executable-profit claim",()=>{
 const result=priceMovementAudit({
  decision:{mint,virtual_decision_at_utc:D,research_verdict:"WATCH"},
  observed_swaps:[
   trade("2026-10-15T00:55:00Z",10),
   trade("2026-10-15T02:00:00Z",20),
   trade("2026-10-15T02:30:00Z",50,"OTHER_POOL"),
   trade("2026-10-15T04:00:00Z",100,"p","otherMint")
  ],evaluation_at_utc:"2026-10-15T03:00:00Z"});
 assert.equal(result.audit_status,
  "REJECTED_OR_WATCHED_LATER_PRICE_RALLY_OBSERVED_NOT_EXECUTABLE_PROOF");
 assert.equal(result.observed_post_decision_max_ratio,2);
 assert.equal(result.same_market_later_executed_swaps,1);
 assert.equal(result.hypothetical_profit_test_usdc,null);
 assert.equal(result.real_quote_executability_proven,false);
 const proposal=immutableLessonProposal(result,{
  authored_at_utc:"2026-11-16T18:00:00Z",reviewer:"GPT_R29"});
 assert.equal(proposal.missed_observed_rally_not_executable_profit,true);
 assert.equal(proposal.must_not_rewrite_historical_decision,true);
 assert.equal(proposal.may_only_influence_decisions_after_utc,
  "2026-11-16T18:00:00Z");
 assert.equal(proposal.validated_improvement_in_forward_trading,false);
});
test("when a coin has no valid comparable historical baseline do not fabricate a missed winner",()=>{
 const result=priceMovementAudit({
  decision:{mint,virtual_decision_at_utc:D,research_verdict:"NO_TRADE"},
  observed_swaps:[trade("2026-10-15T02:00:00Z",200)],
  evaluation_at_utc:"2026-10-16T00:00:00Z"});
 assert.equal(result.audit_status,"NO_COMPARABLE_BASELINE");
 assert.equal(result.observed_missed_price_movement,null);
});
test("future observations and wrong quote/pool are excluded from posthoc evidence",()=>{
 const result=priceMovementAudit({
  decision:{mint,virtual_decision_at_utc:D,research_verdict:"NO_TRADE"},
  observed_swaps:[
   trade("2026-10-15T00:59:00Z",10),
   trade("2026-10-15T02:00:00Z",100),
   trade("2026-10-15T01:10:00Z",100,"WRONG_POOL")
  ],evaluation_at_utc:"2026-10-15T01:30:00Z"});
 assert.equal(result.same_market_later_executed_swaps,0);
 assert.equal(result.observed_missed_price_movement,null);
});
