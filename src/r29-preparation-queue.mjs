// Preparation queue uses wall-clock time, never advances the historical clock.
import {createHash} from 'node:crypto';
const ms=x=>typeof x==='string'?Date.parse(x):NaN,iso=x=>new Date(x).toISOString();
const hash=x=>createHash('sha256').update(x).digest('hex');
export const preparationRequestKey=({provider,url,body=null})=>hash(JSON.stringify({provider,url,body}));
export function emptyPreparationQueue(){return {kind:'R29_PREPARATION_REQUEST_QUEUE',schema:1,virtual_tick_utc:'2026-10-12T00:00:00.000Z',requests:{},providers:{},orders:0};}
export function reservePreparationRequest(state,request,nowUtc){
 const at=ms(nowUtc),key=preparationRequestKey(request);
 if(state.kind!=='R29_PREPARATION_REQUEST_QUEUE'||!Number.isFinite(at)||!request.provider||!request.url)throw Error('INVALID_PREPARATION_QUEUE');
 const old=state.requests[key],p=state.providers[request.provider]||{};
 if(old?.status==='CAPTURED')return {allowed:false,reason:'ALREADY_CAPTURED',key,state};
 if(old?.status==='IN_FLIGHT')return {allowed:false,reason:'UNRESOLVED_IN_FLIGHT',key,state};
 if(ms(p.cooldown_until_utc)>at)return {allowed:false,reason:'PROVIDER_COOLDOWN',key,state};
 if(ms(old?.retry_not_before_utc)>at)return {allowed:false,reason:'REQUEST_COOLDOWN',key,state};
 const starts=(p.starts||[]).filter(t=>{if(!Number.isFinite(ms(t))||ms(t)>at)throw Error('INVALID_REQUEST_HISTORY');return at-ms(t)<60000;});
 if(starts.length>=8)return {allowed:false,reason:'ROLLING_BUDGET',key,state};
 const next=structuredClone(state);next.providers[request.provider]={...p,starts:[...starts,nowUtc]};
 next.requests[key]={request,status:'IN_FLIGHT',started_at_utc:nowUtc,attempts:(old?.attempts||0)+1,previous_receipts:old?.previous_receipts||[]};
 return {allowed:true,key,state:next};
}
export function recordPreparationReceipt(state,key,{raw,httpStatus,retryAfter=null,nowUtc,usable=false,artifactPath}){
 const at=ms(nowUtc),old=state.requests[key];
 if(old?.status!=='IN_FLIGHT'||!Number.isFinite(at)||at<ms(old.started_at_utc)||typeof raw!=='string'||!artifactPath)throw Error('UNRESERVED_RECEIPT');
 const next=structuredClone(state),r=next.requests[key],p=next.providers[r.request.provider];
 const receipt={http_status:httpStatus,retry_after:retryAfter,received_at_utc:nowUtc,sha256:hash(raw),artifact_path:artifactPath,usable};
 r.previous_receipts.push(receipt);
 if(httpStatus===200&&usable){r.status='CAPTURED';r.receipt=receipt;return next;}
 r.status='PENDING';r.receipt=receipt;
 const seconds=typeof retryAfter==='string'&&/^\d+$/.test(retryAfter)?Number(retryAfter)*1000:Math.max(0,ms(retryAfter)-at)||0;
 const wait=Math.max(seconds,httpStatus===429||httpStatus===503?60000:300000);
 r.retry_not_before_utc=iso(at+wait);
 if(httpStatus===429||httpStatus===503)p.cooldown_until_utc=iso(Math.max(ms(p.cooldown_until_utc)||0,at+wait));
 return next;
}
