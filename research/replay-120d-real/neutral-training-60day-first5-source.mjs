// R29 neutral 60-day historical original-capture one-daily-checkpoint SOURCE HARVEST.
// This is not 60 GPT model calls, no posthoc gainer selection, no actual trades.
// Streaming through each day's earliest available UTC hour for exactly five
// historical minutes; never decodes later timestamps into the model frame.
// Source snapshots only, one independently reproducible neutral scan per day.
import {Readable} from 'node:stream';
import {createZstdDecompress} from 'node:zlib';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {addAsOfEvent} from './neutral-first5-minute-gpt-candidate-frame.mjs';
const START=Date.parse('2026-07-20T00:00:00Z'),DAY=86400000,HOUR=3600000,MIN=60000;
const INDEX='ALREADY_VERIFIED_NEUTRAL_TRAINING_DIRECTORY_RUN_44064094682';
const ROOT='https://replay.pumpapi.io/';
const CHUNK_DAYS=10,DAILY_CAP=300000;
const iso=t=>new Date(t).toISOString();
const digest=x=>createHash('sha256').update(x).digest('hex');
const safe=x=>typeof x==='number'&&Number.isFinite(x);
const time=x=>safe(x)?x>1e12?x:x*1000:NaN;
export const DAYS=Array.from({length:60},(_,i)=>({
 day_utc:new Date(START+i*DAY).toISOString().slice(0,10),training_day_countdown:60-i
}));
function hasHour(index,day){
 const marker=day.replaceAll('-','/')+'/';
 const hours=index.hours.filter(h=>h.startsWith(marker)).map(h=>Number(h.slice(-2)));
 return hours.length?Math.min(...hours):null;
}
export function sourceHourForDay(index,day){
 if(!index||index.base!==ROOT.slice(0,-1)||!Array.isArray(index.hours)||
   index.hours.length>200000||!/^2026-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(day))
  throw Error('INVALID_NEUTRAL_HISTORIC_INDEX');
 const h=hasHour(index,day);
 return h===null?null:{hour:h,archive_path:day.replaceAll('-','/')+'/'+String(h).padStart(2,'0')+'.jsonl.zst'};
}
export async function readNeutralFiveMinutes({date,archive_path,fetcher=fetch,maxEvents=DAILY_CAP}={}){
 if(!DAYS.some(d=>d.day_utc===date)||
  typeof archive_path!=='string'||!archive_path.startsWith(date.replaceAll('-','/')+'/')||
  !archive_path.endsWith('.jsonl.zst'))throw Error('UNEXPECTED_SOURCE_DAY_OR_PATH');
 const hour=Number(archive_path.split('/').at(-1).slice(0,2));
 if(!Number.isInteger(hour)||hour<0||hour>23)throw Error('BAD_ARCHIVE_HOUR');
 const early=Date.parse(date+'T00:00:00Z')+hour*HOUR,cutoff=early+5*MIN;
 const url=ROOT+archive_path;
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),110000);
 let input,decoder,lines;
 try{
  const res=await fetcher(url,{redirect:'error',signal:abort.signal});
  if(!res.ok||!res.body)throw Error('SOURCE_HTTP_'+res.status);
  input=Readable.fromWeb(res.body);
  decoder=createZstdDecompress();
  input.pipe(decoder);
  lines=createInterface({input:decoder,crlfDelay:Infinity});
  let accepted=0,examined=0,malformed=0,duplicates=0,invalid=0,sawLater=false;
  const store=new Map(),seen=new Set(),hash=createHash('sha256');
  for await(const line of lines){
   if(!line.trim())continue;
   let event;
   try{event=JSON.parse(line)}catch{malformed++;continue}
   const captured=time(event.localTimestamp),occurred=time(event.timestamp);
   if(safe(captured)&&captured>cutoff){sawLater=true;break}
   if(!safe(captured)||!safe(occurred)||captured<early||occurred>cutoff||occurred>captured+60000){
    invalid++;continue
   }
   examined++;
   if(examined>maxEvents)throw Error('ASOF_SAMPLE_TOO_LARGE_NOT_A_COMPLETE_FRAME');
   hash.update(line+'\n');
   const id=[event.signature,event.pool,event.mint,event.action,event.txIndex].join(':');
   if(seen.has(id)){duplicates++;continue}
   seen.add(id);
   try{if(addAsOfEvent(store,event,{cutoff,earliest:early}))accepted++}
   catch{invalid++}
  }
  if(!sawLater)throw Error('ORIGINAL_CAPTURE_STREAM_NEVER_REACHED_CUTOFF');
  const ranked=[...store.values()].filter(x=>x.pool_address&&x.quote_currency==='SOL'&&x.observed_buys>=3)
    .map(x=>({
     chain:'solana',mint:x.token_address,pool_address:x.pool_address,
     asof_initial_candidate_time_utc:x.first_observed_at_utc,
     observed_last_utc:x.last_observed_at_utc,
     protocol:x.first_seen_protocol,
     observed_buys:x.observed_buys,observed_sells:x.observed_sells,
     independently_counted_buy_wallets:x.observed_unique_buying_wallets.size,
     independently_counted_sell_wallets:x.observed_unique_selling_wallets.size,
     observed_sol_buys:x.buy_quote_volume_original_asset,
     observed_sol_sells:x.sell_quote_volume_original_asset,
     latest_sol_pool_reserve_recorded:x.latest_pool_quote_reserves_original_asset,
     latest_swap_mark_price_in_sol_not_usdc:x.most_recent_trade_price_original_quote,
     mint_and_freeze_authority_missing_asof_confirmed:x.mint_or_freeze_authority_verified_absent,
     independent_sellability_and_size_adjusted_quote_verified:false
    }))
    .sort((a,b)=>b.independently_counted_buy_wallets-a.independently_counted_buy_wallets||
     b.observed_buys-a.observed_buys||a.mint.localeCompare(b.mint)||a.pool_address.localeCompare(b.pool_address));
  return {
   schema:'r29_neutral_training_asof_daily_5min_source_frame_v1',
   day_utc:date,virtual_asof_utc:iso(cutoff),
   selected_hour_utc:hour,archive_source_url:url,
   original_source_first5_prefix_sha256:hash.digest('hex'),
   complete_five_minute_original_capture_stream:true,
   later_event_encountered_only_to_stop_stream:true,
   source_sample_event_count:examined,
   research_training_phase_no_trades_permitted:true,
   valid_mint_pool_events:accepted,malformed_lines:malformed,duplicates,invalid,
   neutral_distinct_mint_pool_count:store.size,
   neutral_ranked_solana_pools_in_frame:ranked.slice(0,60),
   neutral_pool_selection_method:'FIRST_ARCHIVED_HOUR_EACH_DAY_FIRST5M_TOP_UNIQUE_BUYER_WALLETS_NO_WHO_WON',
   no_prior_future_gainers_used:true,
   no_later_rug_or_price_outcomes_seen:true,
   provider_original_capture_and_publication_time_independently_attested:false,
   original_live_source_visibility_at_virtual_time_not_proven:true,
   model_invocations_executed_for_day:0,
   paper_buys_executed_for_day:0,paper_sells_executed_for_day:0,
   verified_pnl_test_usdc:null
  };
 }finally{
  clearTimeout(timer);
  try{lines?.close()}catch{}
  try{input?.destroy()}catch{}
  try{decoder?.destroy()}catch{}
  try{abort.abort()}catch{}
 }
}
async function main(){
 const chunk=Number(process.argv[2]),out=resolve(process.argv[3]);
 if(!Number.isInteger(chunk)||chunk<0||chunk>5)throw Error('CHUNK_MUST_BE_0_TO_5');
 // Previously checked entire source-date directories for all training days
 // via second-provider GitHub CI 44064094682; first source hour chosen neutrally.
 const index={base:ROOT.slice(0,-1),hours:DAYS.map(d=>d.day_utc.replaceAll('-','/')+'/00')};
 const raw=JSON.stringify(index);
 const subset=DAYS.slice(chunk*CHUNK_DAYS,(chunk+1)*CHUNK_DAYS);
 mkdirSync(out,{recursive:true});
 const daily=[];
 for(const d of subset){
  let result;
  const src=sourceHourForDay(index,d.day_utc);
  if(!src){
   result={day_utc:d.day_utc,status:'NO_NEUTRAL_TRAINING_SOURCE_HOUR',model_invocations:0};
  }else{
   try{
    const r=await readNeutralFiveMinutes({date:d.day_utc,archive_path:src.archive_path});
    writeFileSync(join(out,d.day_utc+'.json'),JSON.stringify(r,null,2)+'\n');
    result={day_utc:d.day_utc,status:'ASOF_ORIGINAL_CAPTURE_TRAINING_SOURCE_FRAME',
     virtual_asof_utc:r.virtual_asof_utc,source_events:r.source_sample_event_count,
     distinct_mint_pools:r.neutral_distinct_mint_pool_count,
     candidates_for_future_detached_GPT:r.neutral_ranked_solana_pools_in_frame.length,
     source_prefix_hash:r.original_source_first5_prefix_sha256,
     historical_model_invocations_completed:0,confirmed_buy_fills:0,
     confirmed_sell_fills:0,realizable_pnl_test_usdc:null};
   }catch(e){
    result={day_utc:d.day_utc,status:'HISTORICAL_FRAME_FAILED_DATA_GAP',
     error:String(e.message||e).slice(0,100),
     historical_model_invocations_completed:0,realizable_pnl_test_usdc:null}
   }
  }
  daily.push(result);
  console.log('R29_TRAIN_NEUTRAL_FIVE_MIN',JSON.stringify(result));
 }
 const manifest={schema:'r29_neutral_60d_training_first5_source_harvest_chunk.v1',
  days_expected:10,chunk_index:chunk,
  earliest_day:subset[0].day_utc,last_day:subset.at(-1).day_utc,
  source_hour_index_sha256:digest(raw),daily,
  training_only_no_buy_or_sell_signal:true,
  discovered_without_known_future_winners:true,
  never_accessed_posthoc_price_outcomes:true,
  independent_GPT_trading_calls_completed:0,
  this_is_evidence_not_60_day_profit_test:true,
  real_portfolio_unchanged:true
 };
 writeFileSync(join(out,'CHUNK_SUMMARY.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('R29_TRAIN_NEUTRAL_10DAY_SOURCE_CHUNK',JSON.stringify({
  index:chunk,completed:daily.filter(x=>x.status==='ASOF_ORIGINAL_CAPTURE_TRAINING_SOURCE_FRAME').length,
  gap:daily.filter(x=>x.status!=='ASOF_ORIGINAL_CAPTURE_TRAINING_SOURCE_FRAME').length,
  source_events:daily.reduce((a,x)=>a+(x.source_events||0),0)}));
}
if(process.argv[1]?.endsWith('neutral-training-60day-first5-source.mjs')){
 main().catch(e=>{console.error('R29_TRAIN_NEUTRAL_HARVEST_FATAL',String(e.message||e));process.exitCode=1;});
}
