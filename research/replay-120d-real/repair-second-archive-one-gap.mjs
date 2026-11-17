// R29 repair only the missing historical DAY DIRECTORY from a verified 120-day
// neutral archive index. No transaction bodies, winner selection or trades.
import {parseDayDirectory} from './second-archive-full-day-120-calendar.mjs';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
const sha=s=>createHash('sha256').update(s).digest('hex');
const legit=a=>a&&a.schema==='r29_second_provider_120day_full_hour_directory_index.v1'&&
 Array.isArray(a.days)&&a.days.length===120&&a.no_coin_winners_read===true;
export async function repairSingleUnknownIndex(original,{fetcher=fetch}={}){
 if(!legit(original))throw Error('ORIGINAL_NEUTRAL_ARCHIVE_LEDGER_INVALID');
 const missing=original.days.filter(x=>x.status!=='VERIFIED_DIRECTORY_HTTP_200');
 if(missing.length!==1||original.verified_days!==119||original.complete_24_hour_days!==119)
  throw Error('EXPECTED_EXACTLY_ONE_UNVERIFIED_DAY');
 const date=missing[0].date,url='https://replay.pumpapi.io/'+date.replaceAll('-','/')+'/';
 let fetched=null;
 for(let retry=0;retry<4;retry++){
  try{
   const r=await fetcher(url,{headers:{accept:'application/json'},
    signal:AbortSignal.timeout(15000),redirect:'follow'});
   if(r.ok){
    const raw=await r.text();
    if(raw.length>2000000)throw Error('REPAIRED_INDEX_OVERSIZE');
    const parsed=parseDayDirectory(JSON.parse(raw),{date});
    fetched={...parsed,status:'VERIFIED_DIRECTORY_HTTP_200',
     directory_sha256:sha(raw),directory_url:url};
    break;
   }
   if(![429,500,502,503,504].includes(r.status))
    throw Error('UNRECOVERABLE_ARCHIVE_HTTP_'+r.status);
  }catch(e){if(retry===3)throw e;}
  await sleep(850*(retry+1));
 }
 if(!fetched)throw Error('REPAIR_SOURCE_NOT_VERIFIED');
 const days=original.days.map(x=>x.date===date?{...x,...fetched}:x);
 const verified=days.filter(x=>x.status==='VERIFIED_DIRECTORY_HTTP_200');
 const complete=verified.filter(x=>x.archive_hours===24);
 const result={...original,schema:'r29_second_provider_120day_full_hour_directory_index_repaired.v1',
  original_119day_partial_report_generated_at_utc:original.generated_at_utc,
  unknown_source_day_utc_before_repair:date,repair_finished_at_utc:new Date().toISOString(),
  days,verified_days:verified.length,complete_24_hour_days:complete.length,
  total_indexed_hour_files:verified.reduce((n,x)=>n+x.archive_hours,0),
  training_days_with_full_day_index:complete.filter(x=>x.stage==='LEARN_ASOF').length,
  holdout_days_with_full_day_index:complete.filter(x=>x.stage==='BLIND_HOLDOUT').length,
  known_missing_hours_in_verified_days:verified.reduce((n,x)=>n+x.missing_hours.length,0),
  bytes_of_source_files_listed_not_downloaded:verified.reduce((n,x)=>n+x.compressed_bytes_indexed,0),
  last_source_repair_extracted_from_same_neutral_hour_directory:true,
  no_posthoc_winner_selection:true,
  no_historical_GPT_trades_executed:true,
  actual_executable_PnL_test_USDC:null};
 return result;
}
if(process.argv[1]?.endsWith('repair-second-archive-one-gap.mjs')){
 try{
  const src=resolve(process.argv[2]);const dst=resolve(process.argv[3]);
  const data=JSON.parse(readFileSync(src,'utf8'));
  const r=await repairSingleUnknownIndex(data);
  mkdirSync(dirname(dst),{recursive:true});writeFileSync(dst,JSON.stringify(r,null,2)+'\n');
  console.log('R29_SECOND_ARCHIVE_REPAIRED',JSON.stringify({
   repaired: r.unknown_source_day_utc_before_repair,
   verified_days:r.verified_days,complete_days:r.complete_24_hour_days,
   total_indexed_hours:r.total_indexed_hour_files,
   compressed_bytes_indexed:r.bytes_of_source_files_listed_not_downloaded,
   no_historical_GPT_trades:true}));
 }catch(e){console.error('R29_SECOND_ARCHIVE_REPAIR_FAILED',String(e.message||e));process.exitCode=1}
}
