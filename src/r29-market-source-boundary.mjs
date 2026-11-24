// Research input boundary: same analysis contract, different clocks and sources.
// No order permission, no claim of source-side quote accuracy or GPT execution.
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const time=s=>typeof s==='string'?Date.parse(s):NaN;
const ok=x=>Number.isFinite(x);
const roles=['TEMPO','DISCOVERY','RISK','STRATEGY','QA'];
export function verifyOnlineReceipt({receipt,raw,scanStartedUtc,decisionUtc,maxAgeMs=600000}={}){
 const start=time(scanStartedUtc),now=time(decisionUtc),sent=time(receipt?.started_at_utc),received=time(receipt?.received_at_utc);
 if(!ok(start)||!ok(now)||start>now||!Number.isSafeInteger(maxAgeMs)||maxAgeMs<1)throw Error('INVALID_SCAN_CLOCK');
 const fail=reason=>({status:'DATA_GAP',reason,usable_current_observation:false,trade_authorized:false});
 if(!Buffer.isBuffer(raw)&&typeof raw!=='string')return fail('RAW_RESPONSE_MISSING');
 if(sha(raw)!==receipt?.response_sha256)return fail('RAW_RESPONSE_HASH_MISMATCH');
 if(receipt.http_status!==200||receipt.http_ok!==true)return fail('HTTP_NOT_SUCCESSFUL');
 if(!ok(sent)||!ok(received)||sent>received||received>now)return fail('INVALID_RECEIPT_CLOCK');
 if(sent<start)return fail('NOT_FETCHED_FOR_CURRENT_SCAN');
 if(now-received>maxAgeMs)return fail('CURRENT_CAPTURE_EXPIRED');
 let parsed;try{parsed=JSON.parse(raw.toString());}catch{return fail('INVALID_JSON');}
 if(!parsed||typeof parsed!=='object')return fail('INVALID_SOURCE_PAYLOAD');
 return {status:'CURRENT_ONLINE_OBSERVATION',provider:receipt.provider,source_url:receipt.url,observed_at_utc:receipt.received_at_utc,source_sha256:receipt.response_sha256,usable_current_observation:true,provider_quote_time_verified:false,execution_quote_verified:false,trade_authorized:false};
}
export function verifyReplayObservation({raw,expectedSha256,eventAtUtc,modeledAvailableAtUtc,virtualTickUtc,maxAgeMs=600000}={}){
 const event=time(eventAtUtc),available=time(modeledAvailableAtUtc),tick=time(virtualTickUtc);
 const fail=reason=>({status:'DATA_GAP',reason,usable_current_observation:false,trade_authorized:false});
 if(!Buffer.isBuffer(raw)&&typeof raw!=='string')return fail('RAW_ARCHIVE_MISSING');
 if(sha(raw)!==expectedSha256)return fail('ARCHIVE_HASH_MISMATCH');
 if(![event,available,tick].every(ok)||event>available||available>=tick)return fail('FUTURE_OR_UNAVAILABLE_AT_VIRTUAL_TICK');
 if(!Number.isSafeInteger(maxAgeMs)||maxAgeMs<1||tick-event>maxAgeMs)return fail('VIRTUAL_OBSERVATION_EXPIRED');
 return {status:'RECONSTRUCTED_ASOF_OBSERVATION',observed_at_utc:eventAtUtc,available_at_utc:modeledAvailableAtUtc,source_sha256:expectedSha256,usable_current_observation:true,original_live_delivery_proven:false,execution_quote_verified:false,trade_authorized:false};
}
export function marketReviewBoundary({mode,scanId,tickUtc,onlineReceipts=[],replayObservations=[],historyReferences=[],requiredProviders=[]}={}){
 if(!['LIVE_PAPER','HISTORICAL_ASOF'].includes(mode)||typeof scanId!=='string'||!scanId||!ok(time(tickUtc))||!Array.isArray(requiredProviders))throw Error('INVALID_REVIEW_BOUNDARY');
 if(mode==='LIVE_PAPER'&&replayObservations.length||mode==='HISTORICAL_ASOF'&&onlineReceipts.length)throw Error('MODE_SOURCE_MIXING');
 const current=mode==='LIVE_PAPER'?onlineReceipts.map(r=>verifyOnlineReceipt({...r,decisionUtc:tickUtc})):replayObservations.map(r=>verifyReplayObservation({...r,virtualTickUtc:tickUtc}));
 const history=historyReferences.map(r=>{
  if(!ok(time(r.available_at_utc))||time(r.available_at_utc)>=time(tickUtc)||typeof r.source_sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.source_sha256))throw Error('HISTORY_NOT_CAUSALLY_AVAILABLE');
  return {source_sha256:r.source_sha256,available_at_utc:r.available_at_utc,classification:'HISTORICAL_CONTEXT_ONLY'};
 });
 const usable=current.filter(r=>r.usable_current_observation),missing=requiredProviders.filter(p=>!usable.some(r=>r.provider===p));
 const packet={mode,scan_id:scanId,tick_utc:tickUtc,current_observations:current,historical_context:history,missing_providers:missing,required_roles:roles};
 return {...packet,input_sha256:sha(JSON.stringify(packet)),status:usable.length&&missing.length===0?'SOURCE_INPUT_PRESENT_RESEARCH_ONLY':'DATA_GAP',current_observation_count:usable.length,all_five_roles_online_verified:false,market_scope_complete:false,execution_quote_verified:false,trade_authorized:false,orders:0};
}
