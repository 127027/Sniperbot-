// R29 ACTUAL HISTORICAL REPLAY research sample at an as-of 5m checkpoint.
// Public neutral Shrine stream, no coin-name queries, NO later than asof input.
// This is one GPT-ready source INPUT, not a completed 60-day trading result.
import {Readable} from 'node:stream';
import {createZstdDecompress} from 'node:zlib';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';

export const ASOF='2026-09-18T00:05:00Z';
const START='2026-09-18T00:00:00Z';
const URL='https://replay.shrine.trade/pump/2026/09/18/00.jsonl.zst';
const CUTOFF=Date.parse(ASOF),EARLIEST=Date.parse(START);
const MAX=400000;
const SOL='So11111111111111111111111111111111111111112';
const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const validAddress=x=>typeof x==='string'&&x.length>=32&&x.length<=44;
const asMillis=x=>{
 if(typeof x!=='number'||!Number.isFinite(x))return NaN;
 return x<1e12?x*1000:x;
};
const n=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;
const quoteType=m=>m===SOL?'SOL':m===USDC?'USDC':'OTHER_OR_UNKNOWN';
export function addAsOfEvent(store,e,{cutoff=CUTOFF,earliest=EARLIEST}={}){
 const eventAt=asMillis(e.timestamp),capturedAt=asMillis(e.localTimestamp);
 if(!Number.isFinite(eventAt)||!Number.isFinite(capturedAt)||capturedAt>cutoff||
    capturedAt<earliest||eventAt>cutoff||eventAt>capturedAt+60000)
  throw Error('FUTURE_INVALID_OR_UNOBSERVED_MARKET_EVENT');
 if(!validAddress(e.mint))return false;
 const pool=validAddress(e.pool)?e.pool:null;
 const id=[e.mint,pool||'NO_POOL'].join(':');
 let x=store.get(id);
 if(!x){
  x={chain:'solana',token_address:e.mint,pool_address:pool,
    quote_asset_mint:validAddress(e.quoteMint)?e.quoteMint:null,
    quote_currency:quoteType(e.quoteMint),
    first_observed_at_utc:new Date(capturedAt).toISOString(),
    last_observed_at_utc:new Date(capturedAt).toISOString(),
    observed_buys:0,observed_sells:0,token_create_events:0,
    creator_risk_asof_verified:'UNKNOWN',
    observed_unique_buying_wallets:new Set(),
    observed_unique_selling_wallets:new Set(),
    buy_quote_volume_original_asset:0,
    sell_quote_volume_original_asset:0,
    most_recent_trade_price_original_quote:null,
    latest_pool_quote_reserves_original_asset:null,
    latest_pool_token_reserves:null,
    observed_non_sol_quote:false,
    first_seen_protocol:e.protocol||null,
    mint_or_freeze_authority_verified_absent:false,
    source_provider_confirmation_independent:false,
    early_historical_bidirectional_pool_execution_proven:false
  };
  store.set(id,x);
 }
 x.last_observed_at_utc=new Date(capturedAt).toISOString();
 if(!x.quote_asset_mint&&validAddress(e.quoteMint)){
  x.quote_asset_mint=e.quoteMint;x.quote_currency=quoteType(e.quoteMint);
 }
 if(x.quote_currency!=='SOL')x.observed_non_sol_quote=true;
 if(e.action==='create'){
  x.token_create_events++;
  if('mintAuthority' in e||'freezeAuthority' in e){
   x.mint_or_freeze_authority_verified_absent=
    (e.mintAuthority===null||e.mintAuthority===undefined)&&
    (e.freezeAuthority===null||e.freezeAuthority===undefined);
  }
 }
 if(e.action==='buy'||e.action==='sell'){
  if(e.action==='buy')x.observed_buys++;
  else x.observed_sells++;
  const wallets=Array.isArray(e.tradersInvolved)?e.tradersInvolved:[];
  for(const trader of wallets){
   if(validAddress(trader)){
    if(e.action==='buy')x.observed_unique_buying_wallets.add(trader);
    else x.observed_unique_selling_wallets.add(trader);
   }
  }
  if(n(e.quoteAmount)!==null){
   if(e.action==='buy')x.buy_quote_volume_original_asset+=e.quoteAmount;
   else x.sell_quote_volume_original_asset+=e.quoteAmount;
  }
  if(n(e.price)!==null)x.most_recent_trade_price_original_quote=e.price;
  if(n(e.quoteInPool)!==null)x.latest_pool_quote_reserves_original_asset=e.quoteInPool;
  if(n(e.tokensInPool)!==null)x.latest_pool_token_reserves=e.tokensInPool;
 }
 return true;
}
function asOutput(x){
 const {observed_unique_buying_wallets:buyers,observed_unique_selling_wallets:sellers,...r}=x;
 return {...r,
  unique_buyers_observed:buyers.size,
  unique_sellers_observed:sellers.size,
  buy_quote_volume_original_asset:Number(r.buy_quote_volume_original_asset.toFixed(9)),
  sell_quote_volume_original_asset:Number(r.sell_quote_volume_original_asset.toFixed(9)),
  buy_to_sell_tx_count_ratio:r.observed_sells===0?null:
   Number((r.observed_buys/r.observed_sells).toFixed(3))};
}
export async function buildFirstFiveMinutes({fetcher=fetch,cutoff=CUTOFF,maxEvents=MAX}={}){
 const abort=new AbortController();
 const timeout=setTimeout(()=>abort.abort(),100000);
 let input,decoder,lines;
 try{
  const response=await fetcher(URL,{signal:abort.signal,redirect:'error'});
  if(!response.ok||!response.body)throw Error('NEUTRAL_ARCHIVE_5M_HTTP_'+response.status);
  input=Readable.fromWeb(response.body);
  decoder=createZstdDecompress();
  input.pipe(decoder);
  lines=createInterface({input:decoder,crlfDelay:Infinity});
  const store=new Map(),seen=new Set(),hash=createHash('sha256');
  let examined=0,accepted=0,duplicates=0,invalid=0,
   source_events_after_asof_seen=0,ended_by='UNKNOWN';
  let firstObserved=null,lastObserved=null;
  for await(const line of lines){
   if(!line)continue;
   if(examined>=maxEvents){ended_by='EARLY_STOP_HARD_SAMPLE_CAP';break}
   let e;
   try{e=JSON.parse(line)}catch{invalid++;continue}
   const at=asMillis(e?.localTimestamp);
   if(Number.isFinite(at)&&at>cutoff){
    source_events_after_asof_seen++;
    ended_by='FIRST_ARCHIVED_EVENT_AFTER_ASOF';
    break;
   }
   if(!Number.isFinite(at)||at<EARLIEST||!Number.isFinite(asMillis(e.timestamp))||
      asMillis(e.timestamp)>cutoff){invalid++;continue}
   examined++;
   // Include in sample hash ONLY lines available as of virtual checkpoint.
   hash.update(line+'\n');
   const key=[e.signature,e.pool,e.mint,e.action,e.txIndex].join(':');
   if(seen.has(key)){duplicates++;continue}
   seen.add(key);
   try{
    if(addAsOfEvent(store,e,{cutoff})){
     accepted++;firstObserved=firstObserved===null?at:Math.min(firstObserved,at);
     lastObserved=lastObserved===null?at:Math.max(lastObserved,at);
    }
   }catch{invalid++}
  }
  const sorted=[...store.values()].map(asOutput).sort((a,b)=>
   // fixed pre-registered asof-neutral activity ranking (not outcome).
   b.unique_buyers_observed-a.unique_buyers_observed||
   b.observed_buys-a.observed_buys||
   a.token_address.localeCompare(b.token_address));
  const candidates=sorted.filter(x=>x.observed_buys>=3&&
   x.quote_currency==='SOL'&&x.pool_address!==null).slice(0,60);
  const result={schema:'r29_neutral_hour_0_first_5min_detached_gpt_candidate_frame.v1',
   virtual_asof_utc:new Date(cutoff).toISOString(),
   neutral_eligible_source_hour:URL,
   source_provider:'SHRINE_ORIGINAL_LOCAL_TIMESTAMP',
   original_archive_file_sha256:null,
   source_prefix_asof_event_lines_sha256:hash.digest('hex'),
   no_later_than_virtual_asof_events_in_candidate_frame:true,
   stream_stopped_at_first_later_event:ended_by==='FIRST_ARCHIVED_EVENT_AFTER_ASOF',
   stream_termination_reason:ended_by,
   later_event_count_encountered_but_NOT_PARSED_INTO_RESULTS:source_events_after_asof_seen,
   provider_archive_upload_time_is_later_than_virtual_asof:true,
   original_live_capture_timestamps_exposed:true,
   historic_live_feed_entitlement_not_independently_proven:true,
   generated_at_real_time_utc:new Date().toISOString(),
   raw_events_examined_before_asof:examined,
   valid_mint_events_accepted:accepted,
   duplicate_signature_events:duplicates,invalid_or_untrusted_events:invalid,
   first_capture_at_utc:firstObserved===null?null:new Date(firstObserved).toISOString(),
   last_capture_at_utc:lastObserved===null?null:new Date(lastObserved).toISOString(),
   eligible_neutral_mint_pool_keys:store.size,
   ranked_neutral_cohort_not_all_market:candidates,
   ranked_candidates_restricted_by_precommitted_buy_count_and_sol_pair:true,
   source_future_coin_winners_used:false,
   known_winner_names_supplied:false,
   current_conversation_sanitized_from_downstream_model_prompt:true,
   historical_GPT_calls_from_this_input:0,
   buyer_cannot_claim_actual_execution_from_historic_other_traders_swaps:true,
   independently_tradeable_USDC_buy_sell_route_proven:false,
   real_or_paper_orders_placed:0,realized_test_usdc_pnl:null};
  if(ended_by!=='FIRST_ARCHIVED_EVENT_AFTER_ASOF')throw Error('ASOF_STREAM_CUTOFF_NOT_REACHED');
  return result;
 }finally{
  clearTimeout(timeout);
  try{lines?.close()}catch{}
  try{input?.destroy()}catch{}
  try{decoder?.destroy()}catch{}
  try{abort.abort()}catch{}
 }
}
if(process.argv[1]?.endsWith('neutral-first5-minute-gpt-candidate-frame.mjs')){
 try{
  const report=await buildFirstFiveMinutes();
  const path=resolve(process.argv[2]||'research/replay-120d-real/generated/first-5m-neutral-asof.json');
  mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(report,null,2)+'\n');
  console.log('R29_FIRST_5M_NEUTRAL_ASOF_INPUT',JSON.stringify({
   at:report.virtual_asof_utc,
   events:report.raw_events_examined_before_asof,
   candidates_seen:report.eligible_neutral_mint_pool_keys,
   candidates_in_frame:report.ranked_neutral_cohort_not_all_market.length,
   stream_proven_to_reach_asof:report.stream_stopped_at_first_later_event,
   actual_GPT_trades:0,pnl:'UNKNOWN'}));
 }catch(e){console.error('R29_FIRST_5M_NEUTRAL_FRAME_FAILED',String(e.message||e));process.exitCode=1;}
}
