// R29 24/7 daily GPT research cadence. Pure decision support, no API, wallet,
// scheduler, trade, position mutation, or fake GPT invocations.
// Business day runs from 08:00 Europe/Berlin through next day's 07:59.
// The EXISTING hourly GPT automation wakes hourly; this module describes when
// a full evidence-backed review is DUE. No new bot/second task is created.
const DAY=86400000, HOUR=3600000;
const ALLOWED=[1,4,12,24];
const SCHEMA="sniper_r29_adaptive_24h_operating_plan.v1";
function utcMs(value){
 const n=Date.parse(value);
 if(typeof value!=="string"||!Number.isFinite(n)||!value.endsWith("Z"))
  throw Error("R29_CADENCE_UTC_TIMESTAMP_REQUIRED");
 return n;
}
export function berlinClock(atUtc){
 utcMs(atUtc);
 const fmt=new Intl.DateTimeFormat("en-US",{
  timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
 const p=Object.fromEntries(fmt.formatToParts(new Date(atUtc))
  .filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 const hr=Number(p.hour),date=[p.year,p.month,p.day].join("-");
 const businessDate=hr>=8?date:
  new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day))-DAY)
   .toISOString().slice(0,10);
 return {date,operating_day:businessDate,hour:hr,minute:Number(p.minute),
  hours_since_morning:(hr-8+24)%24,time_zone:"Europe/Berlin"};
}
function validMetric(x){
 return typeof x==="number"&&Number.isFinite(x)&&x>=0;
}
export function chooseAdaptiveFrequency({asof_utc,verified_activity=null,
 open_position_count=0,urgent_position_risk=false}={}){
 const clock=utcMs(asof_utc);
 if(!Number.isInteger(open_position_count)||open_position_count<0||
  typeof urgent_position_risk!=="boolean")throw Error("R29_INVALID_POSITION_CONTEXT");
 if(urgent_position_risk&&open_position_count>0)
  return {frequency:24,why:"OPEN_POSITION_VERIFIED_URGENT_RISK",
   evidence_status:"CURRENT_RISK_CONTEXT",model_trading_authority:false};
 let freq=open_position_count>0?12:1;
 let reason=open_position_count>0?"OPEN_POSITIONS_REQUIRE_MONITORING":
  "QUIET_OR_UNVERIFIED_MARKET_MINIMUM_MORNING_CHECK";
 const a=verified_activity;
 if(a&&a.independently_verified===true&&
  utcMs(a.observed_at_utc)<=clock&&clock-utcMs(a.observed_at_utc)<=6*HOUR&&
  validMetric(a.new_pools_24h)&&validMetric(a.independent_buyers_growth_pct)&&
  validMetric(a.volume_growth_pct)){
  let marketFreq=1;
  if(a.new_pools_24h>=60&&a.independent_buyers_growth_pct>=70&&
   a.volume_growth_pct>=100)marketFreq=24;
  else if(a.new_pools_24h>=20&&a.independent_buyers_growth_pct>=30&&
   a.volume_growth_pct>=50)marketFreq=12;
  else if(a.new_pools_24h>=5&&a.independent_buyers_growth_pct>=10&&
   a.volume_growth_pct>=20)marketFreq=4;
  if(marketFreq>freq){freq=marketFreq;reason="INDEPENDENTLY_VERIFIED_ASOF_MARKET_ACTIVITY";}
 }else if(a){
  reason=open_position_count>0?"OPEN_POSITIONS_REQUIRE_MONITORING":
   "ACTIVITY_UNKNOWN_OR_STALE_NO_FREQUENCY_INCREASE";
 }
 return {frequency:freq,why:reason,
  evidence_status:a?.independently_verified===true?
   "VERIFIED_IF_FRESH_SAFETY_STILL_REQUIRED":"NOT_A_TRADING_SIGNAL",
  model_trading_authority:false};
}
export function dailyPlan(input){
 const c=berlinClock(input.asof_utc);
 const f=chooseAdaptiveFrequency(input);
 return {schema:SCHEMA,operating_day:c.operating_day,
  time_zone:"Europe/Berlin",morning_start_local:"08:00",
  hourly_wakeup_only:true,full_gpt_reviews_per_operating_day:f.frequency,
  minimum_full_reviews_if_operational:1,
  maximal_full_reviews:24,
  suggested_local_hours:Array.from({length:f.frequency},
   (_,i)=>(8+i*(24/f.frequency))%24),
  review_trigger_reason:f.why,evidence_status:f.evidence_status,
  can_authorize_live_trades:false,
  paper_buy_sell_requires_independent_safety_and_bot_receipt:true};
}
export function scanDue({
 asof_utc,plan,prior_full_reviews=[],current_evidence_hash=null,
 current_position_hash=null,
 allow_morning_even_if_no_new_digest=true
}={}){
 const t=utcMs(asof_utc),c=berlinClock(asof_utc);
 if(plan?.schema!==SCHEMA||plan.operating_day!==c.operating_day||
  !ALLOWED.includes(plan.full_gpt_reviews_per_operating_day))
  return {due:false,reason:"NO_VALID_PLAN_FOR_OPERATING_DAY"};
 if(!Array.isArray(prior_full_reviews)||prior_full_reviews.length>24)
  throw Error("R29_INVALID_COMPLETED_REVIEW_LEDGER");
 const ordered=[...prior_full_reviews].map(x=>({
  at:utcMs(x.completed_at_utc),
  day:berlinClock(x.completed_at_utc).operating_day,
  evidence:x.evidence_sha256??null,position:x.position_sha256??null,
  kind:x.kind
 })).filter(x=>x.day===c.operating_day&&x.kind==="GPT_FULL_REVIEW")
  .sort((a,b)=>a.at-b.at);
 if(ordered.length>=24)
  return {due:false,reason:"FULL_REVIEW_CAP_24"};
 if(c.hour===8&&ordered.length===0&&allow_morning_even_if_no_new_digest)
  return {due:true,reason:"DAILY_MORNING_BASELINE",count_so_far:0};
 if(ordered.length===0)
  return {due:true,reason:"MISSED_MORNING_BASELINE_RECOVERY",count_so_far:0};
 const last=ordered.at(-1);
 if(t-last.at<HOUR)
  return {due:false,reason:"MIN_ONE_HOUR_BETWEEN_GPT_REVIEWS"};
 if(ordered.length>=plan.full_gpt_reviews_per_operating_day)
  return {due:false,reason:"ADAPTIVE_DAILY_TARGET_ALREADY_MET"};
 const interval=24/plan.full_gpt_reviews_per_operating_day;
 if(c.hours_since_morning%interval!==0)
  return {due:false,reason:"HOURLY_LIGHTWEIGHT_WATCH_NOT_FULL_REVIEW"};
 const newMarket=current_evidence_hash&&current_evidence_hash!==last.evidence;
 const newPosition=current_position_hash&&current_position_hash!==last.position;
 if(!newMarket&&!newPosition)
  return {due:false,reason:"NO_NEW_MARKET_OR_POSITION_EVIDENCE"};
 return {due:true,reason:newPosition?"POSITION_CONTEXT_CHANGED":"NEW_INDEPENDENT_MARKET_EVIDENCE",
  count_so_far:ordered.length};
}
