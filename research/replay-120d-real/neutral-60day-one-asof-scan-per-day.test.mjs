import test from 'node:test';
import assert from 'node:assert/strict';
import {DAYS,sourceHourForDay,readNeutralFiveMinutes} from './neutral-60day-one-asof-scan-per-day.mjs';
test('all 60 holdout dates generated, no future outside Nov 16',()=>{
 assert.equal(DAYS.length,60);
 assert.equal(DAYS[0].day_utc,'2026-09-18');
 assert.equal(DAYS.at(-1).day_utc,'2026-11-16');
 assert.equal(DAYS[0].day_remaining,60);
 assert.equal(DAYS.at(-1).day_remaining,1);
});
test('earliest archived hour on each day selected without winner/ticker filter',()=>{
 const src={base:'https://replay.shrine.trade/pump',hours:[
 '2026/09/18/23','2026/09/18/01','2026/09/18/12','2026/09/19/00']};
 const p=sourceHourForDay(src,'2026-09-18');
 assert.equal(p.hour,1);
 assert.equal(p.archive_path,'2026/09/18/01.jsonl.zst');
 assert.equal(sourceHourForDay(src,'2026-09-20'),null);
 assert.throws(()=>sourceHourForDay({...src,base:'https://wrong.invalid'},'2026-09-18'),/INVALID_NEUTRAL_HISTORIC_INDEX/);
});
test('missing historical compressed stream is a data gap, not invented trade',async()=>{
 await assert.rejects(()=>readNeutralFiveMinutes({
 date:'2026-09-18',archive_path:'2026/09/18/00.jsonl.zst',
 fetcher:async()=>({ok:false,status:404})}),/SOURCE_HTTP_404/);
});
test('source path cannot be switched to later or other day',async()=>{
 await assert.rejects(()=>readNeutralFiveMinutes({
 date:'2026-09-18',archive_path:'2026/09/19/00.jsonl.zst'
 }),/UNEXPECTED_SOURCE_DAY_OR_PATH/);
});
test('only archived-first-five-minutes fixed source horizon is acceptable',async()=>{
 await assert.rejects(()=>readNeutralFiveMinutes({
 date:'2026-07-20',archive_path:'2026/07/20/00.jsonl.zst'
 }),/UNEXPECTED_SOURCE_DAY_OR_PATH/);
});
