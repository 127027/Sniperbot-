// R29 V1.9 – chronological GeckoTerminal OHLCV source adapter for Dot2.
// A past candle fetched today is a RETROSPECTIVE RECONSTRUCTION, never
// a capture made in the past. Never promote provider candles into Dot3 orders.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const ts=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const nr=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
const net=c=>c==='ethereum'?'eth':c==='cronos'?'cro':c;
const clean=(x)=>Number.isInteger(x)&&x>0?x:null;
export function makeGeckoOhlcvRequest({chain,pool,pool_kind=null,tokenContract=null,
 timeframe='minute',aggregate=1,limit=1000,beforeTimestamp,
}={}){
 const c=canonicalChain(chain);
 const validAgg=({minute:[1,5,15],hour:[1,4,12],day:[1]})[timeframe];
 if(!c||!poolValid(c,pool,pool_kind)||!validAgg?.includes(aggregate)
  ||!Number.isInteger(limit)||limit<1||limit>1000
  ||!clean(beforeTimestamp)||beforeTimestamp>4102444800
  ||(tokenContract!==null&&!tokenValid(c,tokenContract)))
  throw Error('INVALID_GECKO_OHLCV_REQUEST');
 // Gecko returns token=base by default; Contract must be resolved separately
 // and compared to provider response before claiming token-specific prices.
 const path='https://api.geckoterminal.com/api/v2/networks/'+net(c)
  +'/pools/'+encodeURIComponent(pool)+'/ohlcv/'+timeframe;
 const params='?aggregate='+aggregate+'&limit='+limit
  +'&currency=usd&token=base&include_empty_intervals=false'
  +'&before_timestamp='+beforeTimestamp;
 return {schema:1,kind:'R29_V19_OHLCV_REQUEST',chain:c,pool,pool_kind,
  requested_base_contract:tokenContract,source_url:path+params,
  timeframe,aggregate,limit,before_timestamp:beforeTimestamp,
  paid_api_required:false,trade_authorized:false};
}
export function decodeGeckoOhlcv({request,response,capturedAtUtc,
 sourceRawPath,sourceSha256,asOfUtc=capturedAtUtc}={}){
 if(request?.kind!=='R29_V19_OHLCV_REQUEST'
  ||!sourceRawPath?.startsWith('research/feeds/')
  ||!(/^[a-f0-9]{64}$/).test(sourceSha256||'')
  ||ts(capturedAtUtc)===null||ts(asOfUtc)===null
  ||!Array.isArray(response?.data?.attributes?.ohlcv_list))
  throw Error('INVALID_GECKO_OHLCV_CAPTURE');
 const captured=ts(capturedAtUtc),asof=ts(asOfUtc);
 const period=(request.timeframe==='minute'?60:request.timeframe==='hour'?3600:86400)
   *request.aggregate*1000;
 const base=response?.meta?.base?.address;
 // Gecko OHLCV prices are for the selected base token, never an arbitrary
 // symbol. Missing or wrong base-token identity makes all candle prices
 // unusable for contract-specific Dot2 features.
 const same=(a,b)=>request.chain==='solana'?a===b:String(a).toLowerCase()===String(b).toLowerCase();
 const contractKnown=request.requested_base_contract===null
  ||(tokenValid(request.chain,base)&&same(base,request.requested_base_contract));
 const reasons=[],seen=new Set(),candles=[],raw=response.data.attributes.ohlcv_list;
 for(const entry of raw){
  if(!Array.isArray(entry)||entry.length<6||!clean(entry[0])
    ||entry[0]>=request.before_timestamp){
   reasons.push('INVALID_OR_NONDECREASING_CURSOR');continue;
  }
  const [seconds,open,high,low,close,volume]=entry;
  const candleStart=seconds*1000,candleEnd=candleStart+period;
  if(seen.has(seconds)){reasons.push('DUPLICATE_CANDLE_TIMESTAMP');continue;}
  seen.add(seconds);
  if([open,high,low,close,volume].some(v=>nr(v)===null)
     ||open<=0||high<=0||low<=0||close<=0||volume<0
     ||high<Math.max(open,close,low)||low>Math.min(open,close,high)){
   reasons.push('INVALID_OHLCV_VALUES');continue;
  }
  if(!contractKnown){reasons.push('BASE_CONTRACT_MISMATCH_OR_UNKNOWN');continue;}
  // A candle can only become a research feature after its close.
  const historical=candleEnd<captured;
  candles.push({start_at_utc:new Date(candleStart).toISOString(),
   known_no_earlier_than_utc:new Date(candleEnd).toISOString(),
   open_usd:open,high_usd:high,low_usd:low,close_usd:close,volume_usd:volume,
   source_class:historical?'RETRO_ASOF_RECONSTRUCTION':'ORIGINAL_CAPTURE',
   available_at_utc:capturedAtUtc,
   original_capture_at_candle_time_proven:false,
   source_raw_path:sourceRawPath,source_raw_sha256:sourceSha256,
   risk_eligible:false,trade_authorized:false});
 }
 candles.sort((a,b)=>a.start_at_utc.localeCompare(b.start_at_utc));
 const oldest=raw.filter(x=>Array.isArray(x)&&clean(x[0]))
   .map(x=>x[0]).sort((a,b)=>a-b)[0]??null;
 const lastVisible=candles.filter(c=>ts(c.known_no_earlier_than_utc)<=asof
   &&ts(c.available_at_utc)<=asof);
 return {schema:1,kind:'R29_V19_GECKO_OHLCV_ARCHIVED_RESEARCH_ONLY',
  chain:request.chain,pool:request.pool,pool_kind:request.pool_kind,
  requested_base_contract:request.requested_base_contract,
  provider_reported_base_contract:base||null,base_contract_matches:contractKnown,
  original_http_captured_at_utc:capturedAtUtc,source_raw_path:sourceRawPath,
  source_raw_sha256:sourceSha256,request_url:request.source_url,
  requested_before_timestamp:request.before_timestamp,
  raw_candle_count:raw.length,decoded_candle_count:candles.length,
  excluded_rows:reasons,
  next_before_timestamp:oldest===null?null:oldest,
  response_reached_cursor_end:raw.length<request.limit,
  earliest_candle_start_utc:candles[0]?.start_at_utc??null,
  most_recent_candle_start_utc:candles.at(-1)?.start_at_utc??null,
  visible_at_requested_asof_candles:lastVisible.length,
  retro_candle_count:candles.filter(x=>x.source_class==='RETRO_ASOF_RECONSTRUCTION').length,
  candles,source_age_proof:'HTTP_CAPTURE_TIME_ONLY_NOT_HISTORICAL_DOT_DISCOVERY',
  original_archive_independently_verified:false,orders_authorized:0};
}
export function planNextGeckoOhlcvPage({previousRequest,previousPage,
 remainingPages=1}={}){
 if(previousRequest?.kind!=='R29_V19_OHLCV_REQUEST'
   ||previousPage?.kind!=='R29_V19_GECKO_OHLCV_ARCHIVED_RESEARCH_ONLY'
   ||previousPage.chain!==previousRequest.chain
   ||previousPage.pool!==previousRequest.pool
   ||!Number.isInteger(remainingPages)||remainingPages<0||remainingPages>20)
  throw Error('INVALID_OHLCV_CURSOR_STATE');
 const next=previousPage.next_before_timestamp;
 if(remainingPages===0||previousPage.response_reached_cursor_end
    ||!clean(next)||next>=previousRequest.before_timestamp)
  return {status:'STOP',next_request:null,reason:
   remainingPages===0?'PAGE_BUDGET_EXHAUSTED':
   previousPage.response_reached_cursor_end?'SOURCE_PAGE_UNDER_LIMIT':'NONDECREASING_OR_EMPTY_CURSOR'};
 return {status:'CONTINUE',reason:'OLDER_PAGE_ONLY',
  next_request:makeGeckoOhlcvRequest({...previousRequest,beforeTimestamp:next})};
}
