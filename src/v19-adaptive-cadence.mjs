// Dot1 V1.9: ONE adaptive 4/8/12/24 cadence state machine for live PAPER
// research and historical as-of replay. This makes RECOMMENDATIONS only.
import {chooseCadence,LEVELS} from './cadence.mjs';
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function advanceAdaptiveCadence({
 previous=null,metrics=null,asOfUtc,initialTarget=4
}={}){
 const now=stamp(asOfUtc);
 if(now===null||!LEVELS.includes(initialTarget)
   ||(previous!==null&&(!LEVELS.includes(previous.target)
     ||!Number.isInteger(previous.quiet_confirmations)
     ||previous.quiet_confirmations<0)))
   throw Error('INVALID_V19_DOT1_CADENCE_STATE');
 const prior=previous||{target:initialTarget,quiet_confirmations:0,
   last_evaluated_at_utc:null};
 const oldTime=stamp(prior.last_evaluated_at_utc);
 if(oldTime!==null&&now<oldTime)throw Error('CADENCE_TIMESTAMP_REGRESSION');
 if(oldTime===now)return {schema:1,kind:'R29_V19_DOT1_CADENCE_RECOMMENDATION',
   at_utc:asOfUtc,target:prior.target,reason:'IDEMPOTENT_ALREADY_EVALUATED',
   quiet_confirmations:prior.quiet_confirmations,state:structuredClone(prior),
   actual_gpt_reviews:0,orders_authorized:0};
 // The state machine below enforces the 2-check hysteresis itself; ask
 // the stateless kernel for the raw target instead of double-counting it.
 const candidate=chooseCadence(metrics?.dataAvailable===true
   ?{...metrics,consecutiveQuietChecks:2}:metrics,prior.target);
 const comparable=metrics?.dataAvailable===true
   &&metrics.allowDownshift===true&&metrics.comparableWindowComplete===true
   &&metrics.observed_volume_pairs>0;
 // Quiet means a CONFIRMED like-for-like panel: not merely a source outage,
 // and not a sharp negative-volume shock.
 const quiet=comparable&&metrics.newPools<12&&metrics.eligible<2
   &&metrics.openPositions<3
   &&Number.isFinite(metrics.volumeChangePct)
   &&Math.abs(metrics.volumeChangePct)<25;
 let target=prior.target,reason=candidate.reason,checks=0;
 if(candidate.target>prior.target){
   target=candidate.target;reason='IMMEDIATE_VERIFIED_ACTIVITY_UPSHIFT';
 }else if(candidate.target<prior.target&&quiet){
   checks=prior.quiet_confirmations+1;
   if(checks>=2){
     const idx=LEVELS.indexOf(prior.target);
     target=Math.max(candidate.target,LEVELS[idx-1]);
     reason='TWO_CONFIRMED_QUIET_WINDOWS_ONE_LEVEL_DOWNSHIFT';checks=0;
   }else reason='ONE_QUIET_WINDOW_WAIT_FOR_CONFIRMATION';
 }else if(candidate.target<prior.target){
   reason='NO_VERIFIED_QUIET_PANEL_FOR_DOWNSHIFT';
 }else{
   // Stable target may still be quiet for future downshift, but never count
   // a stale page or re-used as-of timestamp twice.
   checks=quiet?Math.min(2,prior.quiet_confirmations+1):0;
 }
 const state={target,quiet_confirmations:checks,last_evaluated_at_utc:asOfUtc};
 return {schema:1,kind:'R29_V19_DOT1_CADENCE_RECOMMENDATION',
   at_utc:asOfUtc,previous_target:prior.target,target,
   reason,quiet_confirmations:checks,
   observed_market_data:metrics?.dataAvailable===true,
   compared_all_requested_panels:comparable,quiet_verified:quiet,
   state,actual_gpt_reviews:0,orders_authorized:0};
}
