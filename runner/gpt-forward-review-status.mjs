// R29 V5.9 – read-only GPT-authored forward review index.
// The LOCAL deterministic collector is not a GPT scan. This status does not
// authorize trades and cannot cryptographically attest a model invocation.
export const GPT_FORWARD_STATUS_PATH='research/r29/channel/gpt-forward-review-status.json';
export const GPT_FORWARD_STATUS_SCHEMA='sniper_r29_gpt_forward_review_status.v1';
const MIN_HOUR_MS=60*60_000;
const validUtc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&
 Number.isFinite(Date.parse(s));
const asUtc=s=>Date.parse(s);
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const id=s=>typeof s==='string'&&/^gptreview_[a-f0-9]{32}$/.test(s);
const act=new Set(['BUY','WATCH','HOLD','SELL','NO_ACTION']);
const safePath=s=>typeof s==='string'&&
 /^research\/r29\/gpt-strategy\/experiences\/\d{4}-\d\d-\d\d\/[A-Za-z0-9._-]{1,125}\.md$/.test(s);
const err=()=>{throw Error('GPT_FORWARD_REVIEW_STATUS_INVALID')};
export function validateGptForwardStatus(x,{now=Date.now()}={}){
 if(!x||typeof x!=='object'||Array.isArray(x)||
  x.schema!==GPT_FORWARD_STATUS_SCHEMA||x.paper_only!==true||
  x.real_trading_enabled!==false||x.actionable!==false||
  x.source!=='GPT_MODEL_AUTHORED_REVIEW_INDEX'||
  typeof x.utc_day!=='string'||!/^\d{4}-\d\d-\d\d$/.test(x.utc_day)||
  !Number.isInteger(x.target_per_day)||x.target_per_day<4||x.target_per_day>24||
  !['LOW','MEDIUM','HIGH','URGENT'].includes(x.model_chosen_activity_level)||
  typeof x.model_cadence_reason!=='string'||x.model_cadence_reason.length<20||
  x.model_cadence_reason.length>500||
  !Array.isArray(x.reviews)||x.reviews.length>24||!Number.isFinite(now)||
  !validUtc(x.updated_at_utc)||asUtc(x.updated_at_utc)>now+30000||
  !validUtc(x.next_due_at_utc)||
  asUtc(x.next_due_at_utc)<asUtc(x.updated_at_utc)-60000||
  asUtc(x.next_due_at_utc)>asUtc(x.updated_at_utc)+26*60*60_000)
  err();
 let prior=null;
 const seen=new Set();
 for(const r of x.reviews){
  if(!r||!id(r.review_id)||seen.has(r.review_id)||
   !validUtc(r.completed_at_utc)||r.completed_at_utc.slice(0,10)!==x.utc_day||
   asUtc(r.completed_at_utc)>now+30000||
   !validUtc(r.market_observed_at_utc)||
   asUtc(r.market_observed_at_utc)>asUtc(r.completed_at_utc)||
   asUtc(r.completed_at_utc)-asUtc(r.market_observed_at_utc)>30*60_000||
   !digest(r.market_source_sha256)||!safePath(r.artifact_path)||
   !r.artifact_path.includes('/'+x.utc_day+'/')||
   !Number.isInteger(r.candidates_seen)||r.candidates_seen<0||r.candidates_seen>5000||
   !Number.isInteger(r.candidates_reviewed)||r.candidates_reviewed<1||
   r.candidates_reviewed>r.candidates_seen||
   !act.has(r.action)||r.model_review_completed!==true||
   (prior!==null&&asUtc(r.completed_at_utc)-prior<MIN_HOUR_MS))
   err();
  seen.add(r.review_id);prior=asUtc(r.completed_at_utc);
 }
 if(x.reviews.length&&asUtc(x.updated_at_utc)<prior)err();
 // Nothing from the local market collector may increment this counter.
 return x;
}
export function publicGptForwardStatus(value,{now=Date.now()}={}){
 if(!value)return {schema:GPT_FORWARD_STATUS_SCHEMA,available:false,
  utc_day:new Date(now).toISOString().slice(0,10),
  completed_reviews_today:0,target_per_day:null,last_review_at_utc:null,
  next_due_at_utc:null,reason:'NO_GPT_MODEL_REVIEW_INDEX',model_identity_attested:false,
  trade_authorized:false,real_trading_enabled:false};
 const x=validateGptForwardStatus(value,{now});
 const today=new Date(now).toISOString().slice(0,10);
 if(x.utc_day!==today)return {schema:GPT_FORWARD_STATUS_SCHEMA,available:false,
  utc_day:today,completed_reviews_today:0,target_per_day:null,
  last_review_at_utc:null,next_due_at_utc:null,
  reason:'GPT_REVIEW_INDEX_PREVIOUS_UTC_DAY',model_identity_attested:false,
  trade_authorized:false,real_trading_enabled:false};
 const last=x.reviews.at(-1);
 return {schema:GPT_FORWARD_STATUS_SCHEMA,available:true,utc_day:today,
  completed_reviews_today:x.reviews.length,target_per_day:x.target_per_day,
  model_chosen_activity_level:x.model_chosen_activity_level,
  cadence_reason:x.model_cadence_reason,
  last_review_at_utc:last?.completed_at_utc||null,
  next_due_at_utc:x.next_due_at_utc,
  recent:x.reviews.slice(-6).reverse().map(r=>({
   completed_at_utc:r.completed_at_utc,action:r.action,
   candidates_seen:r.candidates_seen,candidates_reviewed:r.candidates_reviewed,
   artifact_path:r.artifact_path,trade_authorized:false
  })),
  reason:'GPT_REPORTED_REVIEWS_NOT_INDEPENDENT_MODEL_ATTESTATION',
  model_identity_attested:false,trade_authorized:false,
  real_trading_enabled:false};
}
