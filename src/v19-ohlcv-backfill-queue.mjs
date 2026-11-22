// Dot2 V1.9: bounded, persistent, all-age Gecko OHLCV cursor per market.
// No hindsight winner lists. Never authorizes trades or rewrites original captures.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const marketId=(c,p)=>c+':'+(c==='solana'?p:String(p).toLowerCase());
export function emptyOhlcvBackfillState(){
 return {schema:1,kind:'R29_V19_GECKO_OHLCV_BACKFILL_STATE',markets:{},
  generated_at_utc:null,orders_authorized:0,market_coverage_complete:false};
}
export function planOhlcvBackfill({state=emptyOhlcvBackfillState(),
 candidates=[],asOfUtc,maxRequests=0,limit=600}={}){
 const now=ms(asOfUtc);
 if(state?.kind!=='R29_V19_GECKO_OHLCV_BACKFILL_STATE'||now===null
   ||!Array.isArray(candidates)||!Number.isInteger(maxRequests)||maxRequests<0
   ||maxRequests>2||!Number.isInteger(limit)||limit<1||limit>1000)
  throw Error('INVALID_OHLCV_BACKFILL_PLAN');
 const all=new Map(),rejected=[];
 for(const [i,v] of candidates.entries()){
  const chain=canonicalChain(v?.chain),pool=v?.pool,contract=v?.contract;
  if(!chain||!poolValid(chain,pool,v?.pool_kind)||!tokenValid(chain,contract)
   ||v?.reported_gain_pct!==undefined||v?.future_winner_label!==undefined
   ||v?.source_class==='POST_EVENT_ORACLE'){
    rejected.push({index:i,reason:'INVALID_IDENTITY_OR_POST_EVENT_ORACLE'});continue;
  }
  const key=marketId(chain,pool),prior=state.markets[key];
  if(prior?.completed)continue;
  const cursor=prior?.next_before_timestamp??Math.floor(now/1000)+1;
  if(!Number.isInteger(cursor)||cursor<1||cursor>Math.floor(now/1000)+1){
    rejected.push({index:i,reason:'INVALID_CURSOR_OR_FUTURE_TIMESTAMP'});continue;
  }
  if(!all.has(key))all.set(key,{key,chain,pool,pool_kind:v.pool_kind||null,
   contract,last_attempt_at_utc:prior?.last_attempt_at_utc??null,
   next_before_timestamp:cursor,completed_pages:prior?.successful_pages??0,
   last_status:prior?.last_status??'NEVER_ATTEMPTED'});
 }
 const ranked=[...all.values()].sort((a,b)=>
   (ms(a.last_attempt_at_utc)??-Infinity)-(ms(b.last_attempt_at_utc)??-Infinity)
    ||a.key.localeCompare(b.key));
 return {schema:1,kind:'R29_V19_GECKO_OHLCV_BACKFILL_PLAN',
  as_of_utc:asOfUtc,budget:maxRequests,limit,
  targets:ranked.slice(0,maxRequests),
  deferred_market_count:Math.max(0,ranked.length-maxRequests),
  rejected,only_prior_known_pool_ids:true,all_history_accessible_without_age_cutoff:true,
  no_future_winner_labels:true,provider_calls_performed:0,trade_authorized:false};
}
export function recordOhlcvBackfill(state,{target,page=null,asOfUtc,status='OK',
 sourceRawPath=null,sourceSha256=null,retryAfterUtc=null}={}){
 const now=ms(asOfUtc);
 if(state?.kind!=='R29_V19_GECKO_OHLCV_BACKFILL_STATE'||now===null
   ||typeof target?.key!=='string'
   ||!Number.isInteger(target.next_before_timestamp)
   ||!['OK','HTTP_429','HTTP_ERROR','INVALID_RESPONSE','SOURCE_ERROR'].includes(status))
  throw Error('INVALID_OHLCV_BACKFILL_RESULT');
 const prior=state.markets[target.key]||{},next=structuredClone(state);
 if(prior.last_attempt_at_utc&&ms(prior.last_attempt_at_utc)>now)
  throw Error('OHLCV_BACKFILL_TIME_REGRESSION');
 const succeeded=status==='OK';
 if(succeeded&&(
  page?.kind!=='R29_V19_GECKO_OHLCV_ARCHIVED_RESEARCH_ONLY'
  ||page.chain!==target.chain||page.pool!==target.pool
  ||page.requested_before_timestamp!==target.next_before_timestamp
  ||page.original_http_captured_at_utc!==asOfUtc
  ||page.source_raw_path!==sourceRawPath||page.source_raw_sha256!==sourceSha256
  ||!Number.isInteger(page.next_before_timestamp)
  ||page.next_before_timestamp>=target.next_before_timestamp
  ||!sourceRawPath?.startsWith('research/feeds/')
  ||!(/^[a-f0-9]{64}$/).test(sourceSha256||'')
  ||!page.base_contract_matches||page.decoded_candle_count<1))
  throw Error('UNVERIFIED_OHLCV_PAGE_IDENTITY_OR_CURSOR');
 const existing=prior.source_refs||[];
 const ref=succeeded?{path:sourceRawPath,sha256:sourceSha256,
  captured_at_utc:asOfUtc,before_timestamp:target.next_before_timestamp}:null;
 if(ref&&existing.some(x=>x.path===ref.path))
  throw Error('DUPLICATE_OHLCV_SOURCE_PATH');
 next.markets[target.key]={chain:target.chain,pool:target.pool,contract:target.contract,
  next_before_timestamp:succeeded?page.next_before_timestamp:target.next_before_timestamp,
  successful_pages:(prior.successful_pages||0)+(succeeded?1:0),
  failed_pages:(prior.failed_pages||0)+(succeeded?0:1),
  last_attempt_at_utc:asOfUtc,last_success_at_utc:succeeded?asOfUtc:prior.last_success_at_utc??null,
  last_status:status,
  retry_after_utc:succeeded?null:retryAfterUtc,
  completed:succeeded&&page.response_reached_cursor_end===true,
  source_refs:ref?[...existing,ref]:existing,
  earliest_candle_at_utc:succeeded?page.earliest_candle_start_utc:prior.earliest_candle_at_utc??null};
 next.generated_at_utc=asOfUtc;
 return next;
}
