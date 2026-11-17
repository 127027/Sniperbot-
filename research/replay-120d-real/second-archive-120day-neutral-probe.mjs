// R29 SECOND archival source complete 120-day calendar transport probe.
// All dates included: strictly chronological, equal source sampling, no ticker list.
import {anchorURL} from './neutral-second-archive-head-pilot.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const START=Date.parse('2026-07-20T00:00:00Z'),DAY=86400000;
const HOUR_SET=[0,23],CONCURRENCY=6;
export const CALENDAR=Array.from({length:120},(_,i)=>{
 const day=new Date(START+i*DAY).toISOString().slice(0,10);
 return {day_utc:day,phase:i<60?'LEARN_ASOF':'BLIND_TEST',
   countdown:120-i};
});
export async function audit120NeutralArchive({fetcher=fetch,dayList=CALENDAR,hours=HOUR_SET}={}){
 if(!Array.isArray(dayList)||dayList.length!==120||
    dayList.some((x,i)=>x.day_utc!==CALENDAR[i].day_utc||x.phase!==CALENDAR[i].phase))
  throw Error('HISTORICAL_120DAY_CALENDAR_INVALID');
 if(!Array.isArray(hours)||hours.length===0||hours.some(x=>!Number.isInteger(x)||x<0||x>23))
  throw Error('INVALID_HOUR_CENSUS');
 const jobs=dayList.flatMap((x,i)=>hours.map(h=>({i,h,date:x.day_utc,url:anchorURL(x.day_utc,h)})));
 const results=new Array(jobs.length);
 let position=0;
 async function worker(){
  while(position<jobs.length){
   const i=position++,job=jobs[i];
   try{
    const r=await fetcher(job.url,{method:'HEAD',redirect:'follow',
     signal:AbortSignal.timeout(12000),headers:{accept:'application/octet-stream'}});
    results[i]={day_utc:job.date,hour_utc:job.h,
     status_code:r.status,status:r.ok?'PRESENT':r.status===404?'ABSENT':'UNKNOWN'};
   }catch(e){
    results[i]={day_utc:job.date,hour_utc:job.h,
     status_code:null,status:'UNVERIFIED',exception:String(e.message||e).slice(0,50)};
   }
  }
 }
 await Promise.all(Array.from({length:CONCURRENCY},worker));
 const days=CALENDAR.map((d,i)=>{
  const checked=results.filter(x=>x.day_utc===d.day_utc);
  const present=checked.filter(x=>x.status==='PRESENT').length;
  const absent=checked.filter(x=>x.status==='ABSENT').length;
  const unknown=checked.filter(x=>!['PRESENT','ABSENT'].includes(x.status)).length;
  return {...d,checked_hours:checked.length,present_hours:present,
   absent_hours:absent,unknown_hours:unknown,
   checked_statuses:checked.map(x=>({hour_utc:x.hour_utc,status:x.status,status_code:x.status_code})),
   full_day_archived_proven:hours.length===24&&present===24,
   original_historical_trades_read:false,
   actually_reconstructed_gpt_decisions:0,
   realizable_pnl_usdc:null};
 });
 return {schema:'r29_second_archived_source_120day_neutral_hour_probe.v1',
  provider:'https://replay.pumpapi.io/',source_docs:'https://docs.zeroslip.ai/historical-replay',
  timestamp_generated_utc:new Date().toISOString(),days,
  neutral_predefined_hours_utc:hours,
  all_120_calendar_days_sampled:true,
  total_anchor_probes:results.length,
  available_anchor_hours:results.filter(x=>x.status==='PRESENT').length,
  absent_anchor_hours:results.filter(x=>x.status==='ABSENT').length,
  unknown_anchor_hours:results.filter(x=>!['PRESENT','ABSENT'].includes(x.status)).length,
  learning_days_with_at_least_one_anchor:days.filter(d=>d.phase==='LEARN_ASOF'&&d.present_hours>0).length,
  testing_days_with_at_least_one_anchor:days.filter(d=>d.phase==='BLIND_TEST'&&d.present_hours>0).length,
  all_24_hours_checked_per_day:hours.length===24,
  posthoc_coin_list_used:false,no_market_outcomes_read:true,
  current_real_trading_enabled:false,
  independent_GPT_model_calls_at_virtual_times_proven:0,
  verified_60day_pnl_test_usdc:null,
  archive_index_is_not_complete_historical_trading_or_execution_proof:true};
}
if(process.argv[1]?.endsWith('second-archive-120day-neutral-probe.mjs')){
 try{
  const report=await audit120NeutralArchive();
  const out=resolve(process.argv[2]||'research/replay-120d-real/generated/second-archive-120-day-00-23-coverage.json');
  mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log('R29_SECOND_ARCHIVE_120D',JSON.stringify({
   train_days:report.learning_days_with_at_least_one_anchor,
   test_days:report.testing_days_with_at_least_one_anchor,
   anchors_present:report.available_anchor_hours,total:report.total_anchor_probes,
   anchors_missing:report.absent_anchor_hours,anchors_unknown:report.unknown_anchor_hours,
   not_full_24hr_proof:!report.all_24_hours_checked_per_day
  }));
 }catch(e){console.error('R29_SECOND_ARCHIVE_120D_ERROR',String(e.message||e));process.exitCode=1}
}
