// R29 V1.9: Dot3 recovery worklist from actual Dot2 -> Dot3 research handoff.
// No hidden extra Dot, no provider calls, no promotion to PAPER_ELIGIBLE.
// Evidence gaps stay DATA_GAP and retain a next action, not permanent REJECTED.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
import {assessDot3RiskStatus} from './v19-dot3-risk-status.mjs';
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const iso=x=>new Date(x).toISOString();
const asKey=(c,p)=>c+':'+(c==='solana'?p:String(p).toLowerCase());
const finite=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function emptyDot3RecheckState(){
 return {schema:1,kind:'R29_V19_DOT3_RECHECK_STATE',by_pool:{},
  updated_at_utc:null,executed_provider_requests:0,orders_authorized:0};
}
export function planDot3EvidenceRechecks({handoff,asOfUtc,
 state=emptyDot3RecheckState(),maxRequests=6,maxCaptureAgeMinutes=10}={}){
 const t=stamp(asOfUtc);
 if(t===null||handoff?.kind!=='DOT2_TO_DOT3_EVIDENCE_HANDOFF'
  ||!Array.isArray(handoff.candidates)||state?.kind!=='R29_V19_DOT3_RECHECK_STATE'
  ||!Number.isInteger(maxRequests)||maxRequests<0||maxRequests>50
  ||!Number.isInteger(maxCaptureAgeMinutes)||maxCaptureAgeMinutes<1||maxCaptureAgeMinutes>120)
  throw Error('INVALID_DOT3_RECHECK_REQUEST');
 const merged=new Map(),skipped=[];
 for(let i=0;i<handoff.candidates.length;i++){
  const c=handoff.candidates[i],ch=canonicalChain(c?.chain),p=c?.pool;
  if(!ch||!poolValid(ch,p,c?.pool_kind)||c?.reported_gain_pct!==undefined
   ||c?.future_winner_label!==undefined||c?.source_class==='POST_EVENT_ORACLE'){
   skipped.push({index:i,reason:'UNTRUSTED_IDENTITY_OR_POST_EVENT_LABEL'});continue;
  }
  const key=asKey(ch,p);
  if(merged.has(key)){
   skipped.push({index:i,reason:'DUPLICATE_POOL_FROM_SAME_HANDOFF'});continue;
  }
  const captured=stamp(c.captured_at_utc);
  const after=stamp(c.second_source_checked_at_utc);
  // A later as-of cannot see a source that has not yet arrived.
  if((captured!==null&&captured>t)||(after!==null&&after>t)){
   skipped.push({index:i,reason:'FUTURE_CAPTURE_NOT_ELIGIBLE'});continue;
  }
  const age=captured===null?null:(t-captured)/60000;
  const fresh=age!==null&&age<=maxCaptureAgeMinutes;
  const contractOk=tokenValid(ch,c.contract);
  const diff=finite(c.price_disagreement_pct);
  const low=([c.primary_liquidity_usd,c.second_source_liquidity_usd]
   .map(finite).some(x=>x!==null&&x<5000));
  const fields=[];
  if(!contractOk)fields.push('TOKEN_CONTRACT');
  if(!fresh)fields.push('FRESH_POOL_CAPTURE');
  if(!c.independent_price_liquidity_ready)
   fields.push('INDEPENDENT_EXACT_POOL_PRICE_AND_LIQUIDITY');
  if(diff!==null&&diff>3)fields.push('QUOTE_DIVERGENCE_RECHECK');
  if(low)fields.push('LOW_LIQUIDITY_CONFIRMATION');
  if(c.security_verified!==true)fields.push('SECURITY_ATTESTATION');
  if(c.sellability_verified!==true)fields.push('SELLABILITY_ATTESTATION');
  // Neither Gecko/Dex source provides a verified quote-as-of in this handoff.
  fields.push('PROVIDER_QUOTE_ASOF');
  const action= !contractOk?'VERIFY_CONTRACT_AND_POOL_IDENTITY':
   !fresh?'REFRESH_EXACT_POOL_CAPTURE':
   diff!==null&&diff>3?'RECHECK_CONFLICTING_PROVIDER_QUOTES':
   !c.independent_price_liquidity_ready?'FETCH_MISSING_EXACT_POOL_SECOND_SOURCE':
   low?'RECHECK_EXACT_POOL_LIQUIDITY':
   c.sellability_verified!==true?'VERIFY_SELLABILITY_AND_TAX':
   c.security_verified!==true?'VERIFY_CONTRACT_SECURITY':
   'VERIFY_PROVIDER_QUOTE_TIME';
  const classification=assessDot3RiskStatus({candidate:c,asOfUtc,mode:'LIVE_PAPER'});
  const previous=state.by_pool[key]||{};
  const cooldown=stamp(previous.retry_after_utc);
  const scheduled=cooldown===null||cooldown<=t;
  const nextDue=cooldown!==null&&cooldown>t?iso(cooldown):iso(t);
  merged.set(key,{
   key,chain:ch,pool:p,pool_kind:c.pool_kind||null,contract:contractOk?c.contract:null,
   symbol:c.symbol||null,source_capture_at_utc:c.captured_at_utc||null,
   source_evidence_path:c.evidence_path||null,
   status:classification.status,reason:classification.reason,
   risk_status_source:'R29_V19_DOT3_RISK_STATE',
   missing_fields:[...new Set([...fields,...classification.missing_fields])],
   next_action:action,next_recheck_at_utc:nextDue,
   retriable:scheduled,source_age_minutes:age,
   verification_basis:'DOT2_HANDOFF_ONLY_NOT_EXTERNAL_RISK_PROOF',
   previous_recheck_count:previous.attempt_count||0,
   observed_quote_divergence_pct:diff,low_liquidity_observed:low,
   evidence_deadline_at_utc:iso(t+maxCaptureAgeMinutes*60000),
   trade_authorized:false,paper_filled:false
  });
 }
 const all=[...merged.values()].sort((a,b)=>{
  // Urgent fresh, potentially fast-moving research comes first, but all
  // unscheduled candidates survive in backlog. Deterministic key tie-break.
  const urgency=x=>(x.contract?10:0)+(x.source_age_minutes!==null
   &&x.source_age_minutes<=maxCaptureAgeMinutes?5:0)
   +(x.observed_quote_divergence_pct!==null?2:0);
  return urgency(b)-urgency(a)||a.previous_recheck_count-b.previous_recheck_count
    ||a.key.localeCompare(b.key);
 });
 const ready=all.filter(x=>x.retriable),selected=ready.slice(0,maxRequests);
 return {schema:1,kind:'R29_V19_DOT3_EVIDENCE_RECHECK_PLAN',
  as_of_utc:asOfUtc,source_kind:handoff.kind,
  candidate_count:all.length,missing_evidence_count:all.filter(x=>x.status==='DATA_GAP').length,
  watch_candidates:all.filter(x=>x.status==='WATCH').length,
  confirmed_proven_risk_rejects:0,ready_count:ready.length,
  selected_count:selected.length,backlog_count:all.length-selected.length,
  selected,watchlist:all,
  skipped,research_only:true,no_future_labels_used:true,
  actual_provider_rechecks:0,actual_paper_orders:0,actual_gpt_reviews:0,
  limitation:'One as-of evidence worklist. No real quote fetch, source attestation, sellability result or BUY authorization.'};
}
export function recordDot3RecheckAttempt(state,{key,attemptAtUtc,
 status,sourceEvidencePath=null,retryAfterUtc=null}={}){
 const t=stamp(attemptAtUtc);
 if(state?.kind!=='R29_V19_DOT3_RECHECK_STATE'||t===null
  ||typeof key!=='string'||!key.includes(':')
  ||!['CAPTURED_NEW_EVIDENCE','HTTP_429','PROVIDER_ERROR','NO_NEW_EVIDENCE'].includes(status)
  ||(retryAfterUtc!==null&&stamp(retryAfterUtc)===null))
  throw Error('INVALID_DOT3_RECHECK_OUTCOME');
 const old=state.by_pool[key]||{};
 if(old.last_attempt_at_utc&&stamp(old.last_attempt_at_utc)>=t)
  throw Error('DUPLICATE_OR_REVERSED_DOT3_RECHECK');
 const out=structuredClone(state),count=(old.attempt_count||0)+1;
 const delay=status==='HTTP_429'?60*60000:status==='PROVIDER_ERROR'?10*60000:
  status==='NO_NEW_EVIDENCE'?5*60000:0;
 const minimum=t+delay,requested=retryAfterUtc===null?minimum:Math.max(minimum,stamp(retryAfterUtc));
 out.by_pool[key]={
  attempt_count:count,last_attempt_at_utc:iso(t),last_status:status,
  last_source_evidence_path:status==='CAPTURED_NEW_EVIDENCE'?sourceEvidencePath:null,
  // Successful acquisition only means new bytes exist, not verified risk.
  last_recheck_completed_with_new_bytes:status==='CAPTURED_NEW_EVIDENCE',
  retry_after_utc:delay>0?iso(requested):null,eligible_for_buy:false};
 out.updated_at_utc=iso(t);
 // No actual provider request is claimed by data shaped as an observation.
 out.executed_provider_requests=state.executed_provider_requests||0;
 return out;
}
