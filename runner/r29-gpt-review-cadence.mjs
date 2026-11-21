// R29 V6.12: the EXISTING hourly GPT wake may choose 4/8/12/24
// real model reviews per UTC day. A research status target is NOT a
// verification of executed GPT invocations, nor a second trading scheduler.
// The hourly wake remains in charge of applying this decision after reviewing
// independently available market evidence. No interval <60min or >24/day.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateGptForwardStatus} from './gpt-forward-review-status.mjs';

const FREQUENCIES=Object.freeze([4,8,12,24]);
const HOUR=3600000,DAY=24*HOUR;
const dateOk=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s));
const iso=n=>new Date(n).toISOString();

export const GPT_MODEL_SCAN_FREQUENCIES=FREQUENCIES;
export function planGptReviewCadence(index,{
 now=Date.now(),selectedFrequencyPerDay=null,previousDayLastReviewAtUtc=null
}={}){
 if(!Number.isFinite(now)||now<0||!index)
  throw Error('R29_GPT_CADENCE_CLOCK_OR_STATUS_INVALID');
 const x=validateGptForwardStatus(index,{now});
 const frequency=selectedFrequencyPerDay??x.target_per_day;
 if(!FREQUENCIES.includes(frequency))
  throw Error('R29_GPT_CADENCE_FREQUENCY_INVALID');
 const utcDay=iso(now).slice(0,10);
 // A stale previous-day index does not count as a new-day scan.
 const todayReviews=x.utc_day===utcDay?x.reviews:[];
 const count=todayReviews.length;
 const last=x.reviews.at(-1)?.completed_at_utc||null;
 const other=previousDayLastReviewAtUtc;
 if(other!==null&&(!dateOk(other)||Date.parse(other)>now))
  throw Error('R29_GPT_CADENCE_PRIOR_REVIEW_INVALID');
 if(last!==null&&Date.parse(last)>now)
  throw Error('R29_GPT_CADENCE_REVIEW_IN_FUTURE');
 const latest=[last,other].filter(Boolean)
  .sort((a,b)=>Date.parse(b)-Date.parse(a))[0]||null;
 const lastTime=latest===null?null:Date.parse(latest);
 const period=DAY/frequency;
 const nextDueTime=lastTime===null?now:lastTime+period;
 const futureMidnight=Date.parse(utcDay+'T00:00:00.000Z')+DAY;
 const due=count<24&&now>=nextDueTime;
 // A mid-day 4→24 increase takes effect immediately after the minimum
 // one-hour separation, not after waiting for the old six-hour interval.
 // The underlying GitHub/ChatGPT hourly wake is not rescheduled here.
 const remainingScheduledHours=Math.max(0,Math.floor(
  (futureMidnight-Math.max(now,nextDueTime))/HOUR));
 const feasibleAdditional=Math.min(24-count,
  Math.max(0,remainingScheduledHours+(due?1:0)));
 const maxPossibleToday=count+feasibleAdditional;
 return {
  schema:'sniper_r29_v612_gpt_cadence_plan.v1',
  mode:'PAPER_RESEARCH_ONLY',strategy_authority:'GPT_ONLY',
  utc_day:utcDay,now_utc:iso(now),
  selected_frequency_per_day:frequency,
  target_review_interval_minutes:period/60000,
  real_reviews_observed_today:count,
  // Not an instruction to create a scan: an already scheduled task must
  // actually do the Web research and write the validated immutable journal.
  review_due_now:due,
  earliest_valid_review_at_utc:iso(Math.max(now,nextDueTime)),
  max_review_count_per_utc_day:24,
  at_most_one_actual_review_per_hour:true,
  possible_remaining_utc_day_hourly_slots:feasibleAdditional,
  selected_target_feasible_remaining_today:maxPossibleToday>=frequency,
  index_next_due_at_utc:x.next_due_at_utc,
  // This catches the old 12/day status that used next_due=last+1h,
  // which claimed twice the capacity of a strict 12/day cadence.
  index_next_due_matches_selected_frequency:lastTime!==null&&
   Math.abs(Date.parse(x.next_due_at_utc)-nextDueTime)<=1000,
  signal_scan_is_not_executed_gpt_review:true,
  full_coin_universe_observed:false,
  paper_trade_authorized:false,
  real_trading_enabled:false
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const index=JSON.parse(readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)),
   '../research/r29/channel/gpt-forward-review-status.json'),'utf8'));
 const selected=process.argv[2]===undefined?null:Number(process.argv[2]);
 console.log('R29_GPT_CADENCE_PLAN='+JSON.stringify(planGptReviewCadence(index,{
  selectedFrequencyPerDay:selected})));
}
