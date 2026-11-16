import test from "node:test";
import assert from "node:assert/strict";
import {berlinClock,chooseAdaptiveFrequency,dailyPlan,scanDue,reconsiderDailyPlan}
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

const HOUR_MS=3600000;
const H64=x=>x.repeat(64);
test("4 scans chosen in morning escalate to 24 after the SECOND evidence-backed scan on the SAME day",()=>{
 const first=reconsiderDailyPlan({asof_utc:morning,
  verified_activity:condition(10,morning),
  evidence_sha256:H64("a"),position_sha256:H64("0")});
 assert.equal(first.current_frequency,4);
 assert.equal(first.revision.revision_direction,"INITIAL_BASELINE");
 assert.equal(first.scan.due,true);
 const second="2026-11-17T13:32:00Z"; // local 14:32, second of four
 const firstReview=[actualReview(morning,H64("a"),H64("0"))];
 const escalated=reconsiderDailyPlan({asof_utc:second,
  verified_activity:condition(80,second),previous_plan:first.plan,
  prior_full_reviews:firstReview,
  evidence_sha256:H64("b"),position_sha256:H64("0")});
 assert.equal(escalated.previous_frequency,4);
 assert.equal(escalated.current_frequency,24);
 assert.equal(escalated.revision.revision_direction,"ESCALATION");
 assert.equal(escalated.revision.completed_full_reviews_so_far,1);
 assert.equal(escalated.scan.due,true);
 assert.equal(first.plan.full_gpt_reviews_per_operating_day,4,
  "original morning plan must remain immutable");
 // After the second full scan, cadence is hourly for the rest of today,
 // but only if NEW verified data arrives.
 const third="2026-11-17T14:32:00Z";
 const thirdRun=reconsiderDailyPlan({asof_utc:third,
  previous_plan:escalated.plan,
  verified_activity:condition(80,third),
  prior_full_reviews:[...firstReview,actualReview(second,H64("b"),H64("0"))],
  evidence_sha256:H64("c"),position_sha256:H64("0")});
 assert.equal(thirdRun.current_frequency,24);
 assert.equal(thirdRun.revision,null);
 assert.equal(thirdRun.scan.due,true);
 assert.equal(thirdRun.scan.count_so_far,2);
});
test("daily baseline 1 can be upgraded to 24 HOURS BEFORE any originally planned extra scan",()=>{
 const start=reconsiderDailyPlan({asof_utc:morning,
  evidence_sha256:H64("a"),position_sha256:H64("0")});
 assert.equal(start.current_frequency,1);
 const t="2026-11-17T10:32:00Z";
 const up=reconsiderDailyPlan({asof_utc:t,previous_plan:start.plan,
  verified_activity:condition(80,t),
  prior_full_reviews:[actualReview(morning,H64("a"),H64("0"))],
  evidence_sha256:H64("b"),position_sha256:H64("0")});
 assert.equal(up.current_frequency,24);
 assert.equal(up.scan.due,true);
 assert.equal(up.revision.revision_direction,"ESCALATION");
 const bogus=reconsiderDailyPlan({asof_utc:t,previous_plan:start.plan,
  verified_activity:condition(80,"2026-11-17T20:32:00Z"),
  prior_full_reviews:[actualReview(morning,H64("a"),H64("0"))],
  evidence_sha256:H64("b"),position_sha256:H64("0")});
 assert.equal(bogus.current_frequency,1);
 assert.equal(bogus.scan.due,false);
 assert.equal(bogus.revision,null);
});
test("dynamic 24 -> 1 downgrade can re-escalate later; no prior calls are erased",()=>{
 const high=reconsiderDailyPlan({asof_utc:morning,
  verified_activity:condition(80,morning),
  evidence_sha256:H64("a"),position_sha256:H64("0")});
 assert.equal(high.current_frequency,24);
 const past=Array.from({length:4},(_,i)=>actualReview(
  new Date(Date.parse(morning)+i*HOUR_MS).toISOString(),H64("a"),H64("0")));
 const lowAt="2026-11-17T11:32:00Z";
 const lower=reconsiderDailyPlan({asof_utc:lowAt,previous_plan:high.plan,
  prior_full_reviews:past,evidence_sha256:H64("b"),position_sha256:H64("0")});
 assert.equal(lower.current_frequency,1);
 assert.equal(lower.revision.revision_direction,"DEESCALATION");
 assert.equal(lower.revision.completed_full_reviews_so_far,4);
 assert.equal(lower.scan.due,false);
 assert.equal(lower.scan.reason,"MIN_ONE_HOUR_BETWEEN_GPT_REVIEWS");
 const upswingAt="2026-11-17T12:32:00Z";
 const again=reconsiderDailyPlan({asof_utc:upswingAt,
  previous_plan:lower.plan,prior_full_reviews:past,
  verified_activity:condition(80,upswingAt),
  evidence_sha256:H64("c"),position_sha256:H64("0")});
 assert.equal(again.current_frequency,24);
 assert.equal(again.revision.revision_direction,"ESCALATION");
 assert.equal(again.scan.due,true);
 assert.equal(again.scan.count_so_far,4);
});
test("never manufacture a GPT full scan less than one hour after a previous actual full review",()=>{
 const plan=dailyPlan({asof_utc:morning,verified_activity:condition(80)});
 const prior=[actualReview(morning,H64("a"),H64("0"))];
 const premature=reconsiderDailyPlan({asof_utc:"2026-11-17T08:15:00Z",
  previous_plan:plan,verified_activity:condition(80,"2026-11-17T08:15:00Z"),
  prior_full_reviews:prior,evidence_sha256:H64("b"),
  position_sha256:H64("0")});
 assert.equal(premature.scan.due,false);
 assert.equal(premature.scan.reason,"MIN_ONE_HOUR_BETWEEN_GPT_REVIEWS");
});
test("24 actually completed GPT reviews form a hard cap even with new signals and emergency risk",()=>{
 const done=Array.from({length:24},(_,i)=>
  actualReview(new Date(Date.parse(morning)+i*HOUR_MS).toISOString(),
   H64("a"),H64("0")));
 const last="2026-11-18T06:52:00Z"; // same operating day, after 24th
 const v=reconsiderDailyPlan({asof_utc:last,prior_full_reviews:done,
  previous_plan:dailyPlan({asof_utc:morning,verified_activity:condition(80)}),
  open_position_count:1,urgent_position_risk:true,
  evidence_sha256:H64("b"),position_sha256:H64("1")});
 assert.equal(v.current_frequency,24);
 assert.equal(v.scan.due,false);
 assert.equal(v.scan.reason,"FULL_REVIEW_CAP_24");
});
test("urgent open position may require another GPT review after one hour even without updated hash",()=>{
 const initial=reconsiderDailyPlan({asof_utc:morning,
  evidence_sha256:H64("a"),position_sha256:H64("0")});
 const at="2026-11-17T08:32:00Z";
 const step=reconsiderDailyPlan({asof_utc:at,previous_plan:initial.plan,
  open_position_count:1,urgent_position_risk:true,
  evidence_sha256:H64("a"),position_sha256:H64("0"),
  prior_full_reviews:[actualReview(morning,H64("a"),H64("0"))]});
 assert.equal(step.current_frequency,24);
 assert.equal(step.scan.due,true);
 assert.equal(step.scan.reason,"ONGOING_URGENT_PAPER_POSITION_RISK");
});
test("no future plan revision can be passed back into prior historical replay frames",()=>{
 const late=reconsiderDailyPlan({asof_utc:"2026-11-17T18:32:00Z",
  evidence_sha256:H64("a")});
 assert.throws(()=>reconsiderDailyPlan({
  asof_utc:morning,previous_plan:late.plan,evidence_sha256:H64("b")
 }),/FUTURE_PREVIOUS_PLAN/);
 assert.throws(()=>reconsiderDailyPlan({
  asof_utc:morning,evidence_sha256:"not-a-real-sha"
 }),/SOURCE_SHA256_INVALID/);
});
