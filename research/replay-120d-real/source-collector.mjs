// R29 REAL 120-day retrospective source acquisition. No trades, no GPT calls.
// Every datum comes from an external URL; errors are explicit, never mocked.
// Public historical CEX charts are NOT independent discovery of DEX meme coins.
// For each historical decision T: only CLOSED candles <= T may be accessed.
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const TRAIN_START='2026-07-20T00:00:00Z';
export const TEST_START='2026-09-18T00:00:00Z';
export const STOP='2026-11-16T09:12:00Z';
export const END_EXCLUSIVE='2026-11-17T00:00:00Z';
export const HOUR=3600000, DAY=86400000;
export const KNOWN_RETROSPECTIVE_SYMBOLS=[
 'DOGEUSDT','SHIBUSDT','PEPEUSDT','FLOKIUSDT','BONKUSDT',
 'WIFUSDT','BOMEUSDT','PENGUUSDT','TRUMPUSDT','PNUTUSDT',
 'TURBOUSDT','NEIROUSDT','MOODENGUSDT'
];
// This is NOT a historically as-of enumerated market universe.
// Names are inherited from R30 source manifest and may have selection bias.
const sha=s=>createHash('sha256').update(s).digest('hex');
const iso=n=>new Date(n).toISOString();
const between=(t,a,b)=>t>=Date.parse(a)&&t<Date.parse(b);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const SOURCE_LIMIT=2600000;
function assertHttps(url){
 const u=new URL(url);
 if(u.protocol!=='https:'||![
  'data-api.binance.vision','api.geckoterminal.com',
  'pumpdata.fun','datasets-server.huggingface.co'
 ].includes(u.hostname))throw Error('REPLAY_REAL_PROVIDER_NOT_ALLOWED');
 return u.toString();
}
export async function sourceText(url,{fetcher=fetch,maxBytes=SOURCE_LIMIT}={}){
 const valid=assertHttps(url);
 const response=await fetcher(valid,{
  headers:{accept:'application/json, text/html','user-agent':'R29RealPointInTimeResearch/1.0'},
  signal:AbortSignal.timeout(22000),redirect:'error'
 });
 if(!response.ok)throw Error('HTTP_'+response.status);
 const raw=await response.text();
 if(Buffer.byteLength(raw)>maxBytes)throw Error('REAL_SOURCE_TOO_LARGE');
 return {url:valid,raw,raw_sha256:sha(raw)};
}
const number=x=>x===null||x===undefined||x===''?NaN:Number(x);
export function normalizeBinanceBars(rows,{start,end}={}){
 if(!Array.isArray(rows)||rows.length>1000||!finite(start)||!finite(end))
  throw Error('CEX_SCHEMA_OR_RANGE');
 const bars=[];
 for(const r of rows){
  if(!Array.isArray(r)||r.length<9)throw Error('CEX_KLINE_MALFORMED');
  const t=number(r[0]),open=number(r[1]),high=number(r[2]),
   low=number(r[3]),close=number(r[4]),quote_vol=number(r[7]),
   trades=number(r[8]);
  if(!finite(t)||t%HOUR!==0||t<start||t>=end||
   bars.length&&t<=bars.at(-1).t||
   ![open,high,low,close,quote_vol,trades].every(finite)||
   low<=0||low>Math.min(open,close)||high<Math.max(open,close)||
   quote_vol<0||!Number.isInteger(trades)||trades<0)
   throw Error('CEX_KLINE_INVALID_OR_NONMONOTONIC');
  bars.push({t,open,high,low,close,quote_vol,trades,
   visible_at_utc:iso(t+HOUR),source_type:'ACTUAL_CEX_KLINE_NOT_DEX_QUOTE'});
 }
 return bars;
}
export function candlesVisibleBefore(bars,time){
 const t=Date.parse(time);
 if(!Number.isFinite(t))throw Error('INVALID_REPLAY_CLOCK');
 return bars.filter(x=>x.t+HOUR<=t);
}
export async function fetchBinanceSymbol(symbol,{fetcher=fetch}={}){
 if(!KNOWN_RETROSPECTIVE_SYMBOLS.includes(symbol))throw Error('UNREGISTERED_RETROSPECTIVE_SYMBOL');
 const start=Date.parse(TRAIN_START)-48*HOUR,
  end=Math.floor(Date.parse(STOP)/HOUR)*HOUR;
 let cursor=start,bars=[],source_parts=[],page=0;
 while(cursor<end&&page<5){
  const url='https://data-api.binance.vision/api/v3/klines?'+
   'symbol='+symbol+'&interval=1h&startTime='+cursor+
   '&endTime='+(end-1)+'&limit=1000';
  let response;
  try{response=await sourceText(url,{fetcher,maxBytes:1050000})}
  catch(e){return {symbol,status:'UNAVAILABLE_OR_INCOMPLETE',
   error:String(e.message||e).slice(0,100),
   bars,source_parts,requested_start_utc:iso(start),
   requested_end_exclusive_utc:iso(end)};}
  let raw;
  try{raw=JSON.parse(response.raw)}catch{raw=null;}
  let chunk;
  try{chunk=normalizeBinanceBars(raw,{start:cursor,end});}
  catch(e){return {symbol,status:'INVALID_PROVIDER_DATA',
   error:String(e.message||e),bars:[],source_parts};}
  source_parts.push({url:response.url,sha256_response_text:response.raw_sha256,
   received_rows:chunk.length});
  if(chunk.length===0)break;
  if(bars.length&&chunk[0].t!==bars.at(-1).t+HOUR)
   return {symbol,status:'GAP_IN_PRICE_HISTORY',bars,source_parts};
  bars.push(...chunk);
  cursor=chunk.at(-1).t+HOUR;page++;
 }
 const expected=(end-start)/HOUR;
 return {symbol,status:bars.length===expected?'COMPLETE':'PARTIAL',
  source:'BINANCE_PUBLIC_SPOT_REST_1H',source_parts,
  warmup_start_utc:iso(start),end_exclusive_utc:iso(end),
  observed_bars:bars.length,expected_bars:expected,
  normalized_sha256:sha(JSON.stringify(bars)),bars};
}
const months=['2026-07','2026-08','2026-09','2026-10','2026-11'];
const monthNames={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,
 Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
const decodeHtml=s=>s.replace(/&nbsp;/g,' ').replace(/&#x27;/g,"'")
 .replace(/&amp;/g,'&').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
export function parsePumpMonthlyHtml(html,month){
 const rows=[];
 for(const tr of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/ig)){
  const cells=[...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/ig)].map(x=>decodeHtml(x[1]));
  if(cells.length<7)continue;
  const date=cells[0].match(/\b([A-Z][a-z]{2})\s+(\d{1,2}),?\s+2026\b/);
  if(!date)continue;
  const ymd='2026-'+String(monthNames[date[1]]).padStart(2,'0')+
   '-'+date[2].padStart(2,'0');
  if(!ymd.startsWith(month+'-'))continue;
  const nat=x=>Number(x.replace(/,/g,'').replace(/[^\d]/g,''));
  const launches=nat(cells[1]),graduated=nat(cells[2]),
   sol_vol=nat(cells[4]),unique_wallets=nat(cells[6]);
  if(![launches,graduated,sol_vol,unique_wallets].every(x=>Number.isInteger(x)&&x>=0))
   continue;
  rows.push({date_utc:ymd,launches,graduated,sol_volume:sol_vol,
   reported_wallets_trading:unique_wallets,
   source_scope:'PUMPFUN_RETROSPECTIVE_DAILY_AGGREGATE',
   excludes_per_mint_asof_security:true});
 }
 return rows;
}
export async function fetchPumpDailySummary({fetcher=fetch}={}){
 const details=[],days=[];
 for(const month of months){
  const url='https://pumpdata.fun/stats/'+month;
  try{
   const r=await sourceText(url,{fetcher,maxBytes:900000});
   const rows=parsePumpMonthlyHtml(r.raw,month);
   details.push({url:r.url,sha256_response_text:r.raw_sha256,
    month,extracted_day_rows:rows.length,status:rows.length?'OK':'HTML_PARSE_NO_DAYS'});
   days.push(...rows);
  }catch(e){details.push({url,month,status:'UNAVAILABLE',error:String(e.message||e)})}
 }
 return {provider:'PUMPDATA_FUN_NOT_INDEPENDENTLY_ONCHAIN_ATTESTED',
  retrieved_as_of_today_not_historical_archive_at_each_date:true,
  validation_note:'Aggregate values are retrospective; following-day availability cannot be independently proved from these pages',
  sources:details,days};
}
export async function fetchPepeDexDaily({fetcher=fetch}={}){
 const pool='0xa43fe16908251ee70ef74718545e4fe6c5ccec9f';
 const before=Math.floor(Date.parse(STOP)/1000);
 const url='https://api.geckoterminal.com/api/v2/networks/eth/pools/'+pool+
  '/ohlcv/day?aggregate=1&before_timestamp='+before+'&limit=140';
 try{
  const d=await sourceText(url,{fetcher,maxBytes:800000});
  const o=JSON.parse(d.raw);
  const a=o?.data?.attributes?.ohlcv_list;
  if(!Array.isArray(a)||a.length>140)throw Error('GECKO_SCHEMA_INVALID');
  const rows=a.map(r=>({day_utc:iso(number(r[0])*1000).slice(0,10),
   open:number(r[1]),high:number(r[2]),low:number(r[3]),close:number(r[4]),
   volume:number(r[5])}))
  .filter(x=>x.day_utc>='2026-07-20'&&x.day_utc<='2026-11-15'&&
   [x.open,x.high,x.low,x.close,x.volume].every(finite)&&x.low>0)
  .sort((a,b)=>a.day_utc.localeCompare(b.day_utc));
  return {status:rows.length?'OBSERVED':'NO_CANDLES',
   source_url:url,raw_sha256:d.raw_sha256,
   pool,chain:'eth',symbol:'PEPE',
   no_historical_liquidity_or_sellability_proof:true,
   rows};
 }catch(e){return {status:'UNAVAILABLE',error:String(e.message||e),source_url:url,rows:[]}}
}
export async function fetchHuggingFaceAsOfSample({fetcher=fetch}={}){
 // Research ONLY. This dataset ALSO includes future graduation, rug and peak
 // outcomes. We whitelist just launch-time or first-60-second observations
 // and NEVER pass raw dataset rows to a historical decision actor.
 const settings=[['launches_legacy',100],['launches',100]];
 const sets=[];
 for(const [config,length] of settings){
  const url='https://datasets-server.huggingface.co/rows?dataset=loopholetape%2Fpumpfun-launches&config='+
   config+'&split=train&offset=0&length='+length;
  try{
   const d=await sourceText(url,{fetcher,maxBytes:550000});
   const o=JSON.parse(d.raw);
   if(!Array.isArray(o.rows))throw Error('HF_DATASET_SCHEMA_INVALID');
   const clean=o.rows.map(x=>x.row).filter(x=>x&&typeof x==='object')
   .map(x=>({chain:'solana',mint:x.mint,creator:x.creator,
    launched_at:x.launched_at,symbol:x.symbol,
    first10s_dev_share:finite(x.f10_dev_share)?x.f10_dev_share:null,
    first10s_n_buys:finite(x.f10_n_buys)?x.f10_n_buys:null,
    visible_after_utc:iso(Date.parse(x.launched_at)+15000),
    status:'RETROSPECTIVE_EVENT_CLAIM_NOT_INDEPENDENTLY_RPC_VERIFIED'}))
   .filter(x=>Number.isFinite(Date.parse(x.launched_at)));
   sets.push({config,status:'OBSERVED_WITH_RESEARCH_PROVENANCE_WARNING',
    url,raw_sha256:d.raw_sha256,
    total_dataset_rows:o.num_rows_total??null,
    sampled_rows:clean.length,
    first_sample_mints:clean.slice(0,15),
    omitted_future_outcome_fields:true});
  }catch(e){sets.push({config,status:'UNAVAILABLE',error:String(e.message||e),url})}
 }
 return {source:'HUGGING_FACE_THIRD_PARTY_HISTORICAL_EVENTS',
  asof_fields_only:true,not_full_or_unbiased_sample:true,sets};
}
export async function collectHistoricalSources({fetcher=fetch}={}){
 let queue=[...KNOWN_RETROSPECTIVE_SYMBOLS],results=[];
 const worker=async()=>{
  while(queue.length){
   const symbol=queue.shift();
   const result=await fetchBinanceSymbol(symbol,{fetcher});
   results.push(result);
   console.log('REAL_SOURCE_BINANCE',symbol,result.status,
    result.bars?.length||0,result.expected_bars||null);
  }
 };
 await Promise.all(Array.from({length:3},worker));
 const [pump,dex,hf]=await Promise.all([
  fetchPumpDailySummary({fetcher}),
  fetchPepeDexDaily({fetcher}),
  fetchHuggingFaceAsOfSample({fetcher})
 ]);
 return {schema:'sniper_r29_real120_collected_sources.v1',
  fetch_time_utc:new Date().toISOString(),
  window:{training_start:TRAIN_START,testing_start:TEST_START,
   last_replay_scan_at_or_before:STOP,heldout_end_exclusive:END_EXCLUSIVE},
  source_class:'HISTORICAL_RECORDED_EXTERNAL_DATA_NO_FICTITIOUS_TOKENS',
  known_cex_meme_cohort:'R30_RETROSPECTIVELY_SELECTED_NOT_ASOF_DISCOVERY',
  provider_status:{binance_completed:results.filter(x=>x.status==='COMPLETE').length,
   pump_months:pump.sources.filter(x=>x.status==='OK').length,
   pump_daily_aggregates:pump.days.length,
   gecko_dex_daily:dex.rows.length,
   huggingface_sample_rows:hf.sets.reduce((a,s)=>a+(s.sampled_rows||0),0)},
  binance:results.sort((a,b)=>KNOWN_RETROSPECTIVE_SYMBOLS.indexOf(a.symbol)-
   KNOWN_RETROSPECTIVE_SYMBOLS.indexOf(b.symbol)),
  pump,dex,hf,
  no_execution_prices_guaranteed:true,no_live_orders:true,
  no_api_key_required:true,no_paid_openai_api_used:true};
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===
 fileURLToPath(import.meta.url);
if(isMain){
 const sources=await collectHistoricalSources();
 const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'generated');
 mkdirSync(base,{recursive:true});
 const dest=path.join(base,'real-sources.json');
 writeFileSync(dest,JSON.stringify(sources,null,2)+'\n','utf8');
 console.log('REAL_SOURCE_MANIFEST '+JSON.stringify(sources.provider_status));
 console.log('REAL_SOURCE_FILE '+dest);
}
