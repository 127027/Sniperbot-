import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
// Serialized calls within this job; no claim of global coordination across independent runners.
export function pacedFetch(fetcher=fetch,{interval=15000,now=Date.now,wait=sleep,maxCooldown=120000}={}){
 let next=0,blockedUntil=0;const events=[];
 const fn=async(url,options={})=>{
  if(!String(url).startsWith('https://api.geckoterminal.com/'))return fetcher(url,options);
  for(let attempt=1;attempt<=2;attempt++){
   const ms=Math.max(0,next-now(),blockedUntil-now());if(ms>maxCooldown){throw Error('PROVIDER_COOLDOWN_EXCEEDS_BUDGET')}
   if(ms)await wait(ms);
   const at=now();next=at+interval;
   // Original timeout may have been created before pacing; refresh for actual network attempt.
   const r=await fetcher(url,{...options,signal:AbortSignal.timeout(12000)});
   const retry=r.headers.get('retry-after');events.push({url,attempt,at:new Date(at).toISOString(),http_status:r.status,retry_after:retry});
   if(r.status!==429)return r;
   let delay=retry&&/^\d+$/.test(retry)?Number(retry)*1000:retry?Date.parse(retry)-now():60000;
   if(!Number.isFinite(delay)||delay<0)delay=60000;
   blockedUntil=Math.max(blockedUntil,now()+Math.max(interval,delay));
   if(attempt===2||blockedUntil-now()>maxCooldown)return r;
   await r.body?.cancel();
  }
 };
 return {fetch:fn,events};
}
export async function test(){
 let t=0,calls=0;const a=pacedFetch(async()=>++calls===1?new Response('limit',{status:429,headers:{'retry-after':'30'}}):new Response('{}'),{now:()=>t,wait:async m=>{t+=m}});
 await a.fetch('https://api.geckoterminal.com/test');await a.fetch('https://api.geckoterminal.com/test2');
 assert.equal(a.events.length,3);assert.equal(Date.parse(a.events[1].at)-Date.parse(a.events[0].at),30000);assert.equal(Date.parse(a.events[2].at)-Date.parse(a.events[1].at),15000);
 console.log('Pacing fixture PASS: spacing and Retry-After; bounded retries.');
}
