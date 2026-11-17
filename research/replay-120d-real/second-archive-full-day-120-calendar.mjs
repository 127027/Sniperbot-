// R29 independent second-provider 120-day FULL historical HOUR INDEX audit.
// Public day-directory JSON only; no archive transaction bodies, no coin names,
// no trades, no model decisions or user account interactions. Each day gets
// the same neutral treatment. File.uploaded is part of as-of evidence gating.
import {createHash} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const BASE='https://replay.pumpapi.io/';
const DAY=86400000, HOUR=3600000;
const START=Date.parse('2026-07-20T00:00:00Z');
const END=Date.parse('2026-11-17T00:00:00Z');
const DAY_COUNT=(END-START)/DAY;
if(DAY_COUNT!==120)throw Error('R29_120DAY_BOUNDARY_CORRUPT');
const max=2_000_000;
const goodIso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&
 /Z$/.test(s);
const rawSha=s=>createHash('sha256').update(s).digest('hex');
export const CALENDAR=Array.from({length:120},(_,i)=>({
 date:new Date(START+i*DAY).toISOString().slice(0,10),
 stage:i<60?'LEARN_ASOF':'BLIND_HOLDOUT',
 days_to_end:120-i
}));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
export function parseDayDirectory(body,{date}){
 const expected=date.replaceAll('-','/')+'/';
 if(!body||typeof body!=='object'||Array.isArray(body)||
  body.prefix!==expected||!Array.isArray(body.files)||body.files.length>30)
  throw Error('HISTORICAL_DAY_DIRECTORY_SCHEMA_INVALID');
 const seen=new Set();
 const beginning=Date.parse(date+'T00:00:00Z');
 const hours=[];
 for(const f of body.files){
  const match=typeof f.key==='string'&&new RegExp('^'+expected.replaceAll('/','\\/')+'([01][0-9]|2[0-3])\\.jsonl\\.zst$').exec(f.key);
  if(!match)throw Error('INVALID_OR_CROSS_DATE_HOUR_KEY');
  const hour=Number(match[1]);
  if(seen.has(hour))throw Error('DUPLICATE_HOUR_IN_DIRECTORY');
  seen.add(hour);
  if(!Number.isSafeInteger(f.size)||f.size<=0)throw Error('INVALID_ARCHIVE_SIZE');
  if(!goodIso(f.uploaded))throw Error('UNVERIFIED_HISTORICAL_ARCHIVE_UPLOAD_TIME');
  const at=Date.parse(f.uploaded),hourEnd=beginning+(hour+1)*HOUR;
  if(at<hourEnd)throw Error('ARCHIVE_UPLOADED_BEFORE_HOUR_COMPLETED');
  hours.push({
   hour_utc:String(hour).padStart(2,'0'),
   archive_key:f.key,
   compressed_bytes:f.size,
   originally_uploaded_at_utc:new Date(at).toISOString(),
   lag_after_hour_end_seconds:Math.round((at-hourEnd)/1000),
   historical_asof_eligible_not_before_utc:new Date(at).toISOString(),
   source_is_actual_trade_fill:false
  });
 }
 hours.sort((a,b)=>a.hour_utc.localeCompare(b.hour_utc));
 return {date,archive_hours:hours.length,hour_coverage_status:hours.length===24?'24_HOUR_INDEX_PRESENT':'PARTIAL_ARCHIVE_INDEX',
  missing_hours:Array.from({length:24},(_,i)=>String(i).padStart(2,'0')).filter(x=>!seen.has(Number(x))),
  all_files_have_original_archive_publish_time:true,
  compressed_bytes_indexed:hours.reduce((a,x)=>a+x.compressed_bytes,0),
  newest_archived_at_utc:hours.length?hours.at(-1).originally_uploaded_at_utc:null,
  hours};
}
async function getDayDirectory(day,fetcher,maxRetries){
 const url=BASE+day.replaceAll('-','/')+'/';
 for(let attempt=0;attempt<maxRetries;attempt++){
  try{
   const response=await fetcher(url,{headers:{accept:'application/json'},
    signal:AbortSignal.timeout(13000),redirect:'follow'});
   if(response.ok){
    const raw=await response.text();
    if(raw.length>max)throw Error('ARCHIVE_DIRECTORY_OVERSIZE');
    const parsed=parseDayDirectory(JSON.parse(raw),{date:day});
    return {...parsed,status:'VERIFIED_DIRECTORY_HTTP_200',
     directory_sha256:rawSha(raw),directory_url:url};
   }
   if([429,500,502,503,504].includes(response.status)){
    if(attempt+1<maxRetries)await delay(750*(attempt+1));
    continue;
   }
   return {date:day,status:response.status===404?'HISTORICAL_SOURCE_404':'ARCHIVE_HTTP_'+response.status,
    archive_hours:null,compressed_bytes_indexed:null,directory_url:url,
    complete_24hr_proven:false,unknown_missing_hours:true};
  }catch(e){
   if(attempt+1<maxRetries){await delay(750*(attempt+1));continue;}
   return {date:day,status:'DIRECTORY_REQUEST_FAILED',
    cause:String(e.message||e).slice(0,100),archive_hours:null,
    compressed_bytes_indexed:null,complete_24hr_proven:false,unknown_missing_hours:true,
    directory_url:url};
  }
 }
 return {date:day,status:'ARCHIVE_PROVIDER_RATE_LIMIT_OR_UNAVAILABLE',archive_hours:null,
  compressed_bytes_indexed:null,complete_24hr_proven:false,unknown_missing_hours:true,
  directory_url:url};
}
export async function auditFull120DayHours({fetcher=fetch,maxConcurrency=3,maxRetries=4}={}){
 if(!Number.isInteger(maxConcurrency)||maxConcurrency<1||maxConcurrency>6||
 !Number.isInteger(maxRetries)||maxRetries<1||maxRetries>6)
 throw Error('INVALID_SOURCE_AUDIT_LIMITS');
 const days=new Array(120);let next=0;
 async function worker(){
  while(next<120){
   const ix=next++;
   const date=CALENDAR[ix].date;
   const result=await getDayDirectory(date,fetcher,maxRetries);
   days[ix]={...CALENDAR[ix],...result};
  }
 }
 await Promise.all(Array.from({length:maxConcurrency},worker));
 const valid=days.filter(d=>d.status==='VERIFIED_DIRECTORY_HTTP_200');
 const total=valid.reduce((a,x)=>a+x.archive_hours,0);
 return {schema:'r29_second_provider_120day_full_hour_directory_index.v1',
  index_days:120,source_provider:'replay.pumpapi.io',
  generated_at_utc:new Date().toISOString(),
  source_calendar_start:'2026-07-20',source_calendar_end:'2026-11-16',
  days,verified_days:valid.length,
  complete_24_hour_days:valid.filter(d=>d.archive_hours===24).length,
  total_indexed_hour_files:total,
  training_days_with_full_day_index:valid.filter(d=>d.stage==='LEARN_ASOF'&&d.archive_hours===24).length,
  holdout_days_with_full_day_index:valid.filter(d=>d.stage==='BLIND_HOLDOUT'&&d.archive_hours===24).length,
  known_missing_hours_in_verified_days:valid.reduce((a,x)=>a+x.missing_hours.length,0),
  bytes_of_source_files_listed_not_downloaded:valid.reduce((a,x)=>a+x.compressed_bytes_indexed,0),
  neutral_symbol_agnostic_discovery:true,
  no_coin_winners_read:true,
  complete_historical_buy_sell_and_liquidity_proven:false,
  actual_GPT_model_buy_sell_calls:0,source_only_not_a_trade_backtest:true,
  value_of_5000_test_usdc_portfolio_after_trading:null};
}
if(process.argv[1]?.endsWith('second-archive-full-day-120-calendar.mjs')){
 try{
  const r=await auditFull120DayHours();
  const path=resolve(process.argv[2]||'research/replay-120d-real/generated/second-archive-all-120-days-hours.json');
  mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(r,null,2)+'\n');
  console.log('R29_COMPLETE_HISTORIC_ARCHIVE_DIRS',JSON.stringify({
   verified_days:r.verified_days,complete_days:r.complete_24_hour_days,
   train_complete_days:r.training_days_with_full_day_index,
   test_complete_days:r.holdout_days_with_full_day_index,
   indexed_hours:r.total_indexed_hour_files,
   missing_in_verified:r.known_missing_hours_in_verified_days,
   source_bytes_not_downloaded:r.bytes_of_source_files_listed_not_downloaded,
   not_a_trading_backtest:true
  }));
 }catch(e){console.error('R29_HISTORIC_DIR_INDEX_ERROR',String(e.message||e));process.exitCode=1}
}
