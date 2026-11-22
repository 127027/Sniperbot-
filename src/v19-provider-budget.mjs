// SYS-11: one persistable, conservative rolling-window limiter for the
// EXISTING Dot2 capture runner. Both Gecko endpoints share one provider bucket.
// A budget reservation is a REQUEST START, not an HTTP 200 or GPT review.
// No network, paper orders, API keys, or trading authority in this module.
import {providerRetryDelay} from './v19-provider-backoff.mjs';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const iso=t=>new Date(t).toISOString();
const WINDOW_MS=60000;
const POLICY=Object.freeze({
 GECKOTERMINAL:{per_minute:8,lanes:{NEW_POOLS:6,TRENDING:2,OHLCV:2}},
 DEXSCREENER:{per_minute:120,lanes:{PAIR:120}}
});
const group=provider=>provider==='GECKOTERMINAL_OHLCV'?'GECKOTERMINAL':provider;
const valid=(provider,lane)=>Object.hasOwn(POLICY,group(provider))
 &&Object.hasOwn(POLICY[group(provider)].lanes,lane);
export function emptyProviderBudgetState(){
 return {schema:1,kind:'R29_V19_PERSISTENT_PROVIDER_BUDGET',window_ms:WINDOW_MS,
  providers:{},updated_at_utc:null,orders_authorized:0};
}
function readState(state){
 if(state?.kind!=='R29_V19_PERSISTENT_PROVIDER_BUDGET'||state.schema!==1
  ||state.window_ms!==WINDOW_MS||typeof state.providers!=='object'
  ||state.providers===null||Array.isArray(state.providers))
  throw Error('INVALID_PROVIDER_BUDGET_STATE');
 return state;
}
function normalize(raw,at){
 const history=Array.isArray(raw?.recent_starts)?raw.recent_starts:[];
 // Historical start times must never be in the future. Do not silently
 // discard corrupt or future entries and thereby generate more rate capacity.
 if(history.some(v=>ms(v?.at_utc)===null||ms(v.at_utc)>at
  ||typeof v.id!=='string'||!v.id||!Number.isInteger(v.http_status??0)
  ||!['NEW_POOLS','TRENDING','OHLCV','PAIR'].includes(v.lane)))
  throw Error('CORRUPT_PROVIDER_REQUEST_HISTORY');
 return history.filter(v=>at-ms(v.at_utc)<WINDOW_MS);
}
const nextDue=(xs,at)=>xs.length?Math.max(0,Math.min(...xs.map(x=>ms(x.at_utc)+WINDOW_MS-at))):0;
export function inspectProviderBudget({state=emptyProviderBudgetState(),provider,
 lane,asOfUtc,requestId}={}){
 readState(state);
 const at=ms(asOfUtc),g=group(provider);
 if(at===null||!valid(provider,lane)||typeof requestId!=='string'
  ||requestId.length<8||requestId.length>200)
  throw Error('INVALID_PROVIDER_BUDGET_REQUEST');
 const previous=state.providers[g]||{},rows=normalize(previous,at);
 const cool=ms(previous.cooldown_until_utc);
 if(previous.cooldown_until_utc!==undefined
   &&previous.cooldown_until_utc!==null&&cool===null)
  throw Error('INVALID_PROVIDER_COOLDOWN');
 if(rows.some(v=>v.id===requestId))
  return {allowed:false,reason:'REQUEST_ALREADY_RESERVED',
   wait_ms:null,retry_not_before_utc:null,provider:g,lane};
 if(cool!==null&&cool>at)
  return {allowed:false,reason:'PROVIDER_COOLDOWN',
   wait_ms:cool-at,retry_not_before_utc:iso(cool),provider:g,lane};
 const laneRows=rows.filter(x=>x.lane===lane),policy=POLICY[g];
 const full=rows.length>=policy.per_minute;
 const laneFull=laneRows.length>=policy.lanes[lane];
 if(full||laneFull){
  const wait=Math.max(full?nextDue(rows,at):0,laneFull?nextDue(laneRows,at):0,1);
  return {allowed:false,reason:'ROLLING_WINDOW_BUDGET',
   wait_ms:wait,retry_not_before_utc:iso(at+wait),provider:g,lane,
   rolling_provider_starts:rows.length,rolling_lane_starts:laneRows.length};
 }
 return {allowed:true,reason:'BUDGET_AVAILABLE',wait_ms:0,
  retry_not_before_utc:null,provider:g,lane,
  rolling_provider_starts:rows.length,rolling_lane_starts:laneRows.length,
  provider_cap_per_minute:policy.per_minute,lane_cap_per_minute:policy.lanes[lane]};
}
export function reserveProviderRequest({state=emptyProviderBudgetState(),
 provider,lane,asOfUtc,requestId}={}){
 const gate=inspectProviderBudget({state,provider,lane,asOfUtc,requestId});
 if(!gate.allowed)return {gate,state};
 const at=ms(asOfUtc),old=state.providers[gate.provider]||{};
 const next=structuredClone(state);
 next.providers[gate.provider]={
  ...old,recent_starts:[...normalize(old,at),
    {at_utc:iso(at),id:requestId,lane,http_status:null}],
  request_starts_total:(old.request_starts_total||0)+1
 };
 next.updated_at_utc=iso(at);
 return {gate,state:next};
}
export function recordProviderResponse({state,provider,lane,requestId,
 asOfUtc,httpStatus=null,retryAfter=null}={}){
 readState(state);
 const at=ms(asOfUtc),g=group(provider);
 if(at===null||!valid(provider,lane)||!Number.isInteger(httpStatus??0)
  ||(httpStatus!==null&&(httpStatus<100||httpStatus>599)))
  throw Error('INVALID_PROVIDER_RESPONSE_RECEIPT');
 const old=state.providers[g],history=old?.recent_starts||[];
 const index=history.findIndex(v=>v.id===requestId&&v.lane===lane);
 if(index<0||ms(history[index].at_utc)>at)
  throw Error('PROVIDER_RESPONSE_WITHOUT_RESERVATION');
 if(history[index].http_status!==null)
  throw Error('DUPLICATE_PROVIDER_RESPONSE_RECEIPT');
 const next=structuredClone(state),record=next.providers[g];
 record.recent_starts[index].http_status=httpStatus;
 if(httpStatus===429){
  const retry=providerRetryDelay({httpStatus:429,
   previousFailures:record.consecutive_429||0,retryAfter,atUtc:iso(at)});
  // Deterministic, small jitter avoids synchronized retry swarms while
  // respecting (never shortening) the upstream Retry-After/cooldown.
  const jitter=[...requestId].reduce((n,c)=>(n*31+c.charCodeAt(0))%1501,0);
  const until=ms(retry.next_retry_at_utc)+jitter;
  record.cooldown_until_utc=iso(Math.max(until,ms(record.cooldown_until_utc)??0));
  record.consecutive_429=(record.consecutive_429||0)+1;
  record.consecutive_temporary=0;
 }else if(httpStatus===null||httpStatus===408||httpStatus>=500){
  const retry=providerRetryDelay({httpStatus,
   previousFailures:record.consecutive_temporary||0,retryAfter,atUtc:iso(at)});
  const jitter=[...requestId].reduce((n,c)=>(n*31+c.charCodeAt(0))%1501,0);
  record.cooldown_until_utc=iso(Math.max(
   ms(record.cooldown_until_utc)??0,ms(retry.next_retry_at_utc)+jitter));
  record.consecutive_temporary=(record.consecutive_temporary||0)+1;
 }else if(httpStatus>=200&&httpStatus<300){
  record.consecutive_429=0;
  record.consecutive_temporary=0;
  if(ms(record.cooldown_until_utc)!==null
    &&ms(record.cooldown_until_utc)<=at)record.cooldown_until_utc=null;
 }
 record.last_http_status=httpStatus;
 record.last_response_at_utc=iso(at);
 next.updated_at_utc=iso(at);
 return next;
}
export function summarizeProviderBudget({state,asOfUtc}={}){
 readState(state);
 const at=ms(asOfUtc);
 if(at===null)throw Error('INVALID_PROVIDER_BUDGET_TIME');
 const per_provider={};
 for(const g of Object.keys(POLICY)){
  const row=state.providers[g]||{},history=normalize(row,at);
  per_provider[g]={rolling_starts:history.length,
   caps:POLICY[g],last_http_status:row.last_http_status??null,
   cooldown_until_utc:row.cooldown_until_utc??null,
   request_starts_total:row.request_starts_total||0,
   rolling_429:history.filter(x=>x.http_status===429).length,
   started_lanes:Object.fromEntries(Object.keys(POLICY[g].lanes)
    .map(lane=>[lane,history.filter(x=>x.lane===lane).length]))};
 }
 return {schema:1,kind:'R29_V19_PROVIDER_BUDGET_REPORT',
  as_of_utc:iso(at),per_provider,provider_limits_are_conservative_not_guaranteed:true,
  provider_429_never_means_quiet_market:true,market_coverage_complete:false,
  actual_gpt_reviews:0,orders_authorized:0};
}
