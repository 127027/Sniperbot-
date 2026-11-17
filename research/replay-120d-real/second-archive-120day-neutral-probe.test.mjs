import test from 'node:test';
import assert from 'node:assert/strict';
import {CALENDAR,audit120NeutralArchive} from './second-archive-120day-neutral-probe.mjs';
test('complete 120-day chronological 60+60 source horizon with no winners',()=>{
 assert.equal(CALENDAR.length,120);
 assert.deepEqual([CALENDAR[0].day_utc,CALENDAR[59].day_utc,CALENDAR[60].day_utc,CALENDAR[119].day_utc],
 ['2026-07-20','2026-09-17','2026-09-18','2026-11-16']);
 assert.equal(CALENDAR.filter(d=>d.phase==='LEARN_ASOF').length,60);
 assert.equal(CALENDAR.filter(d=>d.phase==='BLIND_TEST').length,60);
});
test('all 120 days checked equally, 2 anchor hours cannot assert full market',async()=>{
 const requests=[];
 const r=await audit120NeutralArchive({fetcher:async(url,options)=>{
  assert.equal(options.method,'HEAD');requests.push(url);
  return {status:200,ok:true};
 }});
 assert.equal(r.total_anchor_probes,240);
 assert.equal(requests.length,240);
 assert.equal(r.learning_days_with_at_least_one_anchor,60);
 assert.equal(r.testing_days_with_at_least_one_anchor,60);
 assert.equal(r.all_24_hours_checked_per_day,false);
 assert.ok(r.days.every(x=>x.checked_hours===2&&!x.full_day_archived_proven));
 assert.equal(r.verified_60day_pnl_test_usdc,null);
});
test('missing source day is NOT an interpreted NO_TRADE decision',async()=>{
 const r=await audit120NeutralArchive({fetcher:async url=>({
  status:url.includes('/2026/09/18/')?404:200,
  ok:!url.includes('/2026/09/18/')
 })});
 assert.equal(r.testing_days_with_at_least_one_anchor,59);
 assert.equal(r.days[60].absent_hours,2);
 assert.equal(r.days[60].actually_reconstructed_gpt_decisions,0);
});
test('bad interval cannot masquerade as 120-day evaluation',async()=>{
 await assert.rejects(()=>audit120NeutralArchive({dayList:CALENDAR.slice(1)}),/CALENDAR_INVALID/);
});
