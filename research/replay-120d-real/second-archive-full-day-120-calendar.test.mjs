import test from 'node:test';
import assert from 'node:assert/strict';
import {CALENDAR,parseDayDirectory,auditFull120DayHours} from './second-archive-full-day-120-calendar.mjs';
const row=(day,i)=>({key:day.replaceAll('-','/')+'/'+String(i).padStart(2,'0')+'.jsonl.zst',
 size:420000000+i,uploaded:new Date(Date.parse(day+'T00:00:00Z')+(i+1)*3600000+15000).toISOString()});
const body=day=>({prefix:day.replaceAll('-','/')+'/',files:Array.from({length:24},(_,i)=>row(day,i))});
test('120 calendar days exactly 60 learn+60 holdout',()=>{
 assert.equal(CALENDAR.length,120);
 assert.equal(CALENDAR[0].date,'2026-07-20');
 assert.equal(CALENDAR[59].date,'2026-09-17');
 assert.equal(CALENDAR[60].date,'2026-09-18');
 assert.equal(CALENDAR[119].date,'2026-11-16');
});
test('each provider day listing has all 24 keyed hours and original upload clock',()=>{
 const r=parseDayDirectory(body('2026-09-18'),{date:'2026-09-18'});
 assert.equal(r.archive_hours,24);
 assert.equal(r.hour_coverage_status,'24_HOUR_INDEX_PRESENT');
 assert.equal(r.hours[0].lag_after_hour_end_seconds,15);
 assert.equal(r.hours[23].historical_asof_eligible_not_before_utc,'2026-09-19T00:00:15.000Z');
 assert.equal(r.compressed_bytes_indexed,24*420000000+276);
 assert.equal(r.missing_hours.length,0);
});
test('missing hours are not guessed to exist and are reported',()=>{
 const d=body('2026-09-18');d.files.splice(5,1);
 const r=parseDayDirectory(d,{date:'2026-09-18'});
 assert.equal(r.archive_hours,23);
 assert.deepEqual(r.missing_hours,['05']);
});
test('foreign dates, duplicates, impossible upload clocks are forbidden',()=>{
 assert.throws(()=>parseDayDirectory({...body('2026-07-20'),prefix:'2026/07/21/'},{date:'2026-07-20'}),/SCHEMA_INVALID/);
 const d=body('2026-07-20');d.files[0]=d.files[1];
 assert.throws(()=>parseDayDirectory(d,{date:'2026-07-20'}),/DUPLICATE_HOUR/);
 const e=body('2026-07-20');e.files[0].uploaded='2026-07-20T00:55:00Z';
 assert.throws(()=>parseDayDirectory(e,{date:'2026-07-20'}),/ARCHIVE_UPLOADED_BEFORE_HOUR_COMPLETED/);
});
test('neutral 120 day archive directory audit does not turn files into trades',async()=>{
 const r=await auditFull120DayHours({maxConcurrency:3,fetcher:async url=>{
  const date=url.match(/2026\/(\d\d)\/(\d\d)/);
  const day='2026-'+date[1]+'-'+date[2];
  return {ok:true,text:async()=>JSON.stringify(body(day))};
 }});
 assert.equal(r.verified_days,120);
 assert.equal(r.complete_24_hour_days,120);
 assert.equal(r.total_indexed_hour_files,2880);
 assert.equal(r.training_days_with_full_day_index,60);
 assert.equal(r.holdout_days_with_full_day_index,60);
 assert.equal(r.no_coin_winners_read,true);
 assert.equal(r.value_of_5000_test_usdc_portfolio_after_trading,null);
});
test('failed directory remains unverifiable; not zero trades',async()=>{
 const r=await auditFull120DayHours({maxConcurrency:3,maxRetries:1,fetcher:async(url)=>{
  const date=url.match(/2026\/(\d\d)\/(\d\d)/);
  const day='2026-'+date[1]+'-'+date[2];
  return day==='2026-09-18'?{ok:false,status:404}:{ok:true,text:async()=>JSON.stringify(body(day))};
 }});
 assert.equal(r.verified_days,119);
 assert.equal(r.total_indexed_hour_files,2856);
 assert.equal(r.days[60].status,'HISTORICAL_SOURCE_404');
 assert.equal(r.complete_historical_buy_sell_and_liquidity_proven,false);
});
