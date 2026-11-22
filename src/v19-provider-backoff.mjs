// Shared research API retry policy: bounded, persistent and inspectable.
// HTTP 429 is a provider throttle, never an indication the market is quiet.
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function providerRetryDelay({httpStatus,previousFailures=0,retryAfter=null,
 atUtc}={}){
 const now=stamp(atUtc);
 if(now===null||!Number.isInteger(previousFailures)||previousFailures<0
   ||(httpStatus!==null&&httpStatus!==undefined&&(!Number.isInteger(httpStatus)||httpStatus<100)))
   throw Error('INVALID_PROVIDER_RETRY_INPUT');
 const throttled=httpStatus===429,temporary=httpStatus===null
   ||httpStatus===undefined||httpStatus===408||httpStatus>=500;
 if(!throttled&&!temporary)return {retry:false,status:'PERMANENT_OR_SUCCESS',next_retry_at_utc:null};
 // Progressive 429 cooldown: 60m → 120m → 240m, cap 4 hours.
 // Temporary network / 5xx errors: 5m → 10m → 20m, cap 60m.
 const base=throttled?60*60000:5*60000;
 const cap=throttled?4*3600000:60*60000;
 const delay=Math.min(cap,base*Math.pow(2,Math.min(previousFailures,10)));
 let hinted=0;
 if(typeof retryAfter==='string'&&retryAfter.trim()){
   const val=retryAfter.trim(),secs=/^\d{1,8}$/.test(val)?Number(val):null;
   if(secs!==null)hinted=secs*1000;
   else {const dt=stamp(val);if(dt!==null)hinted=Math.max(0,dt-now);}
 }
 const wait=Math.min(6*3600000,Math.max(delay,hinted));
 return {retry:true,status:throttled?'RATE_LIMIT_BACKOFF':'TEMPORARY_ERROR_BACKOFF',
   next_retry_at_utc:new Date(now+wait).toISOString(),wait_ms:wait,
   consecutive_failures:previousFailures+1};
}
