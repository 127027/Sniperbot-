import test from 'node:test';
import assert from 'node:assert/strict';
import {repairSingleUnknownIndex} from './repair-second-archive-one-gap.mjs';
const START=Date.parse('2026-07-20T00:00:00Z');
const day=i=>new Date(START+i*86400000).toISOString().slice(0,10);
const uploaded=(date,i)=>new Date(Date.parse(date+'T00:00:00Z')+(i+1)*3600000+20000).toISOString();
const directory=date=>({prefix:date.replaceAll('-','/')+'/',
 files:Array.from({length:24},(_,i)=>({
  key:date.replaceAll('-','/')+'/'+String(i).padStart(2,'0')+'.jsonl.zst',size:100000000,uploaded:uploaded(date,i)
 }))});
const original=()=>({schema:'r29_second_provider_120day_full_hour_directory_index.v1',
 no_coin_winners_read:true,verified_days:119,complete_24_hour_days:119,
 generated_at_utc:'2026-11-17T00:00:00Z',
 days:Array.from({length:120},(_,i)=>i===60?
 {date:day(i),stage:'BLIND_HOLDOUT',status:'RATE_LIMIT',archive_hours:null}:
 {date:day(i),stage:i<60?'LEARN_ASOF':'BLIND_HOLDOUT',
 status:'VERIFIED_DIRECTORY_HTTP_200',archive_hours:24,missing_hours:[],
 compressed_bytes_indexed:2400000000})});
test('one failed day is retried only, preserving 119 original directories',async()=>{
 const orig=original();let fetched=0;
 const r=await repairSingleUnknownIndex(orig,{fetcher:async url=>{
  fetched++;assert.match(url,/2026\/09\/18\/$/);
  return {ok:true,text:async()=>JSON.stringify(directory('2026-09-18'))};
 }});
 assert.equal(fetched,1);
 assert.equal(r.verified_days,120);
 assert.equal(r.complete_24_hour_days,120);
 assert.equal(r.total_indexed_hour_files,2880);
 assert.equal(r.training_days_with_full_day_index,60);
 assert.equal(r.holdout_days_with_full_day_index,60);
 assert.equal(r.unknown_source_day_utc_before_repair,'2026-09-18');
 assert.equal(r.actual_executable_PnL_test_USDC,null);
});
test('repaired source must be original expected neutral date',async()=>{
 await assert.rejects(()=>repairSingleUnknownIndex(original(),{fetcher:async()=>({ok:true,
  text:async()=>JSON.stringify(directory('2026-09-19'))})}),/SCHEMA_INVALID/);
});
test('never rewrite a completely verified or multiply unknown report',async()=>{
 const r=original();r.verified_days=120;r.complete_24_hour_days=120;
 await assert.rejects(()=>repairSingleUnknownIndex(r),/EXPECTED_EXACTLY_ONE/);
});
