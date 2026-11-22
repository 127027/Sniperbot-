// R29 V1.9 Dot2 – watch previously created or resurfacing pools via
// GeckoTerminal trending pools, in the SAME discovery / risk / trading pipeline.
// A trending rank is NOT evidence of future gains, sellability or a BUY.
import {decodeGeckoNewPools} from './live-pool-discovery.mjs';
import {canonicalChain} from './market-evidence.mjs';
const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const knownChains=['solana','base','ethereum','bsc','robinhood','cronos'];
const slug=x=>x==='ethereum'?'eth':x==='cronos'?'cro':x;
export function emptyOlderPoolState(){
 return {schema:1,kind:'R29_V19_OLDER_POOL_DISCOVERY_STATE',
   checkpoints:{},updated_at_utc:null,orders_authorized:0};
}
export function planOlderPoolCaptures({state=emptyOlderPoolState(),networks=[],
 asOfUtc,maxRequests=0}={}){
 const now=time(asOfUtc);
 if(state?.kind!=='R29_V19_OLDER_POOL_DISCOVERY_STATE'||now===null
   ||!Array.isArray(networks)||!networks.length
   ||networks.some(c=>!knownChains.includes(c))||new Set(networks).size!==networks.length
   ||!Number.isInteger(maxRequests)||maxRequests<0||maxRequests>2)
   throw Error('INVALID_OLDER_POOL_CAPTURE_PLAN');
 const rows=networks.map((chain,index)=>{
   const prior=state.checkpoints[chain]||{};
   const last=time(prior.last_attempt_at_utc);
   const cooldown=time(prior.retry_after_utc);
   const duration=prior.last_duration==='1h'?'24h':'1h';
   return {chain,order:index,last,last_duration:prior.last_duration||null,
     cooldown,duration,page:1,url:'https://api.geckoterminal.com/api/v2/networks/'
       +slug(chain)+'/trending_pools?include=base_token,quote_token'
       +'&duration='+duration+'&page=1'};
 });
 const ready=rows.filter(x=>x.cooldown===null||x.cooldown<=now)
   .sort((a,b)=>(a.last??-Infinity)-(b.last??-Infinity)||a.order-b.order);
 const selected=ready.slice(0,maxRequests);
 return {schema:1,kind:'R29_V19_OLDER_POOL_DISCOVERY_PLAN',
   as_of_utc:asOfUtc,requested_budget:maxRequests,
   tasks:selected.map(x=>({chain:x.chain,page:x.page,duration:x.duration,url:x.url})),
   excluded_cooldowns:rows.filter(x=>x.cooldown!==null&&x.cooldown>now)
     .map(x=>({chain:x.chain,retry_after_utc:new Date(x.cooldown).toISOString()})),
   deferred_count:ready.length-selected.length,
   source_scope:'TRENDING_PAGE_SAMPLE_NOT_ALL_OLD_POOLS',
   provider_calls_performed:0,trade_authorized:false};
}
export function decodeOlderPoolPage({network,response,capturedAtUtc,page=1,
 duration='1h'}={}){
 if(!['1h','24h'].includes(duration))throw Error('INVALID_TRENDING_DURATION');
 const decoded=decodeGeckoNewPools({network,response,capturedAtUtc,page});
 const captured=time(capturedAtUtc);
 const candidates=decoded.candidates.map((r,i)=>{
   const created=time(r.pool_created_at_utc);
   const age=created!==null&&created<=captured
     ?(captured-created)/3600000:null;
   const raw=response.data[r.source_row],a=raw?.attributes||{};
   const momentum=Number(a.price_change_percentage?.h1);
   return {...r,category:age!==null&&age>=24?'OLDER_POOL_WATCH':'TRENDING_AGE_UNKNOWN_OR_NEW',
     source_api:'GECKOTERMINAL_TRENDING_POOLS_JSON',source_duration:duration,
     observed_older_pool_age_hours:age,
     provider_reported_1h_price_change_pct:Number.isFinite(momentum)?momentum:null,
     discovered_as_new:false,revival_confirmed:false,
     buy_eligible:false,trade_authorized:false};
 });
 return {...decoded,source_kind:'GECKOTERMINAL_TRENDING_POOL_WATCH',
   source_duration:duration,candidates,
   older_or_equal_24h_count:candidates.filter(x=>x.category==='OLDER_POOL_WATCH').length,
   revival_confirmed_count:0,
   caveat:'Only currently sampled trending pools; no claim to all historic pools or future gains.'};
}
export function recordOlderPoolCapture({state=emptyOlderPoolState(),task,
 capturedAtUtc,status='OK',sourceRawPath=null,sourceSha256=null,
 retryAfterUtc=null}={}){
 if(state?.kind!=='R29_V19_OLDER_POOL_DISCOVERY_STATE'
   ||!knownChains.includes(task?.chain)||!['1h','24h'].includes(task?.duration)
   ||time(capturedAtUtc)===null||!['OK','HTTP_429','ERROR'].includes(status))
   throw Error('INVALID_OLDER_POOL_CAPTURE_RESULT');
 if(status==='OK'&&(!sourceRawPath?.startsWith('research/feeds/')
   ||!/^[a-f0-9]{64}$/.test(sourceSha256||'')))
   throw Error('MISSING_OLDER_POOL_RAW_PROOF');
 const next=structuredClone(state),prior=next.checkpoints[task.chain]||{};
 if(prior.last_attempt_at_utc&&time(prior.last_attempt_at_utc)>time(capturedAtUtc))
   throw Error('OLDER_POOL_CLOCK_REGRESSION');
 next.checkpoints[task.chain]={last_attempt_at_utc:capturedAtUtc,
   last_success_at_utc:status==='OK'?capturedAtUtc:prior.last_success_at_utc||null,
   last_duration:status==='OK'?task.duration:prior.last_duration||null,
   source_raw_path:status==='OK'?sourceRawPath:prior.source_raw_path||null,
   source_sha256:status==='OK'?sourceSha256:prior.source_sha256||null,
   retry_after_utc:status==='OK'?null:retryAfterUtc,
   success_count:(prior.success_count||0)+(status==='OK'?1:0),
   failures:(prior.failures||0)+(status==='OK'?0:1),status};
 next.updated_at_utc=capturedAtUtc;
 return next;
}
