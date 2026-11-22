// R29 V1.9 SYS-11 partial: polite free-provider burst pacing.
// A gap is a lower bound on the distance between API request STARTS.
// This cannot override an HTTP-429 Retry-After/cooldown, license or policy.
export const MIN_GECKO_REQUEST_GAP_MS=1700;
const tracked=new Set(['GECKOTERMINAL','GECKOTERMINAL_OHLCV']);
export function planGeckoRequestPacing({
 provider,nowEpochMs,lastGeckoStartedEpochMs=null,
 minGapMs=MIN_GECKO_REQUEST_GAP_MS
}={}){
 if(typeof provider!=='string'
  ||!Number.isFinite(nowEpochMs)||nowEpochMs<0
  ||(lastGeckoStartedEpochMs!==null
    &&(!Number.isFinite(lastGeckoStartedEpochMs)
    ||lastGeckoStartedEpochMs<0||lastGeckoStartedEpochMs>nowEpochMs))
  ||!Number.isInteger(minGapMs)||minGapMs<1000||minGapMs>5000)
  throw Error('INVALID_GECKO_PACING_INPUT');
 const isGecko=tracked.has(provider);
 const wait=isGecko&&lastGeckoStartedEpochMs!==null
  ?Math.max(0,Math.ceil(minGapMs-(nowEpochMs-lastGeckoStartedEpochMs)))
  :0;
 return {schema:1,kind:'R29_V19_FREE_GECKO_BURST_PACING',
  provider,subject_to_gecko_pacing:isGecko,
  minimum_start_separation_ms:isGecko?minGapMs:null,
  wait_ms:wait,rate_limit_override_authorized:false,
  actual_provider_success_not_implied:true,
  note:'429 remains fail-closed: this conservative spacing is not proof that provider rate limits are met.'};
}
