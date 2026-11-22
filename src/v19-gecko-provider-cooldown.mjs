// R29 SYS-11 (partial): a GeckoTerminal HTTP 429 throttles the shared provider,
// not just the individual chain, page, trending or OHLCV endpoint.
// No network access and no trading authorization in this pure check.
const asMillis=x=>typeof x==='string'&&x.trim()&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function activeGeckoProviderCooldown({checkpoints={},atUtc,runRetryAtUtc=null}={}){
 const now=asMillis(atUtc);
 if(now===null||!checkpoints||typeof checkpoints!=='object'||Array.isArray(checkpoints)
   ||(runRetryAtUtc!==null&&asMillis(runRetryAtUtc)===null))
   throw Error('INVALID_GECKO_PROVIDER_COOLDOWN_INPUT');
 const observed=[];
 for(const [key,item] of Object.entries(checkpoints)){
   if(!key.endsWith(':GECKOTERMINAL')
     ||item?.last_status!=='HTTP_429')continue;
   const until=asMillis(item.retry_after_utc);
   if(until!==null&&until>now)observed.push({until,source:'PERSISTED_'+key});
 }
 const current=asMillis(runRetryAtUtc);
 if(current!==null&&current>now)observed.push({until:current,source:'IN_RUN_HTTP_429'});
 observed.sort((a,b)=>b.until-a.until);
 const latest=observed[0]||null;
 return {schema:1,kind:'R29_GECKO_PROVIDER_429_COOLDOWN',
   provider_scope:'GECKOTERMINAL_ALL_ENDPOINTS',active:!!latest,
   retry_not_before_utc:latest?new Date(latest.until).toISOString():null,
   source:latest?.source||null,
   http_requests_authorized:!latest,
   never_equate_throttle_to_quiet_market:true,
   paper_orders_authorized:0};
}
