// Isolated comparison only: no scheduler, network, client or order publication.
import {createHash} from 'node:crypto';
import {openIntervalSession,intervalDecisionInput,commitIntervalDecision,settleIntervalSignal,closeWorkInterval} from './r29-hourly-interval-session.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const arms=['SINGLE_GPT','FIVE_DOTS'],H=3600000;
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function guard(s){
 if(s?.kind!=='R29_ISOLATED_AB_COMPARISON'||!digest(s.market_manifest_sha256)||!digest(s.policy_sha256)||!Array.isArray(s.hours)||s.hours.length>24||s.orders!==0)throw Error('INVALID_COMPARISON');
 for(const arm of arms){
  const x=s.arms?.[arm];
  if(!x||x.review_mode!==arm||x.session_id!==s.comparison_id+'/'+arm||x.start_utc!==s.start_utc||x.interval_history.length!==s.hours.length||x.orders!==0)throw Error('ARM_STATE_MISMATCH');
 }
 if(s.arms.SINGLE_GPT===s.arms.FIVE_DOTS||s.arms.SINGLE_GPT.ledger===s.arms.FIVE_DOTS.ledger)throw Error('SHARED_ARM_LEDGER');
}
export function openComparison({comparisonId,preparation,marketManifestSha256,policySha256}={}){
 if(typeof comparisonId!=='string'||!comparisonId.trim()||!digest(marketManifestSha256)||!digest(policySha256))throw Error('INVALID_COMPARISON_MANIFEST');
 const opened=arms.map(arm=>openIntervalSession({preparation,sessionId:comparisonId+'/'+arm,reviewMode:arm}));
 if(opened.some(x=>!x.session))return {comparison:null,preflight:opened[0].preflight};
 return {preflight:opened[0].preflight,comparison:{kind:'R29_ISOLATED_AB_COMPARISON',comparison_id:comparisonId,start_utc:preparation.tickUtc,market_manifest_sha256:marketManifestSha256,policy_sha256:policySha256,arms:Object.fromEntries(arms.map((arm,i)=>[arm,opened[i].session])),hours:[],pending_hour:null,orders:0}};
}
export function comparisonInputs(s,preparation){
 guard(s);
 if(s.pending_hour||s.hours.length>=24||Date.parse(preparation.tickUtc)!==Date.parse(s.start_utc)+s.hours.length*H)throw Error('COMPARISON_HOUR_OUT_OF_ORDER');
 const inputs=Object.fromEntries(arms.map(arm=>[arm,intervalDecisionInput(s.arms[arm],preparation)]));
 if(inputs.SINGLE_GPT.preparation_sha256!==inputs.FIVE_DOTS.preparation_sha256)throw Error('UNEQUAL_MARKET_EVIDENCE');
 return inputs;
}
export function commitComparisonHour({comparison:s,preparation,reviews}={}){
 const inputs=comparisonInputs(s,preparation);
 if(!reviews||Object.keys(reviews).length!==2||!arms.every(arm=>reviews[arm]))throw Error('BOTH_ARM_REVIEWS_REQUIRED');
 const next=structuredClone(s);
 for(const arm of arms){
  const r=reviews[arm];
  if(r.arm!==arm||r.input_sha256!==inputs[arm].input_sha256)throw Error('ARM_INPUT_MISMATCH');
  next.arms[arm]=commitIntervalDecision({session:s.arms[arm],preparation,roleReviews:r.roleReviews,singleReview:r.singleReview,decisions:r.decisions});
 }
 next.pending_hour={index:s.hours.length+1,tick_utc:preparation.tickUtc,preparation_sha256:inputs.SINGLE_GPT.preparation_sha256,arms:Object.fromEntries(arms.map(arm=>[arm,{input_sha256:inputs[arm].input_sha256,scan:next.arms[arm].scan_history.at(-1)}]))};
 return next;
}
// Both arms see the same immutable observation envelope. Each may have a different
// pending position. Settlement itself still uses the existing causal verifier.
export function settleComparisonObservation(s,{arm,input}={}){
 guard(s);
 if(!arms.includes(arm)||!s.pending_hour)throw Error('COMPARISON_SETTLEMENT_OUTSIDE_HOUR');
 const result=settleIntervalSignal(s.arms[arm],input);
 const next=structuredClone(s);next.arms[arm]=result.session;
 return {comparison:next,event:result.event};
}
export function closeComparisonHour(s,{atUtc,coverageStatus,coverageSha256,reason}={}){
 guard(s);
 if(s.hours.length>=24)throw Error('COMPARISON_FINISHED');
 if(!s.pending_hour&&coverageStatus!=='DATA_GAP')throw Error('UNREVIEWED_HOUR');
 const next=structuredClone(s);
 const rows={};
 for(const arm of arms){
  const scan=s.pending_hour?.arms[arm].scan;
  const gap=!scan||scan.decisions.some(d=>d.action==='DATA_GAP');
  next.arms[arm]=closeWorkInterval(s.arms[arm],{atUtc,coverageStatus:gap?'DATA_GAP':coverageStatus,coverageSha256,reason});
  rows[arm]={...next.arms[arm].interval_history.at(-1),scan:scan??null};
 }
 next.hours.push({index:s.hours.length+1,tick_utc:s.arms.SINGLE_GPT.interval_start_utc,preparation_sha256:s.pending_hour?.preparation_sha256??null,arms:rows});
 next.pending_hour=null;
 return next;
}
export function comparisonSummary(s){
 guard(s);
 return {hours:s.hours.length,finished:s.hours.length===24,arms:Object.fromEntries(arms.map(arm=>[arm,{reviews:s.arms[arm].review_count,complete_hours:s.hours.filter(h=>h.arms[arm].status==='REVIEWED_DECLARED_SCOPE').length,cash_micro:s.arms[arm].ledger.cash_micro,positions:Object.keys(s.arms[arm].ledger.positions).length}])),actual_gpt_identity_verified:false,winner:null,orders:0};
}
