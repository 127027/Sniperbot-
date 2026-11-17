import test from 'node:test';
import assert from 'node:assert/strict';
import {DAYS,sourceHourForDay,readNeutralFiveMinutes} from './neutral-training-60day-first5-source.mjs';
test('chronological original sixty training days from July 20 to September 17',()=>{
 assert.equal(DAYS.length,60);
 assert.equal(DAYS[0].day_utc,'2026-07-20');
 assert.equal(DAYS[59].day_utc,'2026-09-17');
 assert.equal(DAYS[0].training_day_countdown,60);
 assert.equal(DAYS[59].training_day_countdown,1);
});
test('historic source strictly first hour of neutral training date, no token winners',()=>{
 const src={base:'https://replay.pumpapi.io',
 hours:['2026/07/20/00','2026/07/20/23','2026/08/15/00']};
 const r=sourceHourForDay(src,'2026-07-20');
 assert.equal(r.hour,0);
 assert.equal(r.archive_path,'2026/07/20/00.jsonl.zst');
 assert.equal(sourceHourForDay(src,'2026-07-21'),null);
});
test('a future holdout day may never be read as training input',async()=>{
 await assert.rejects(()=>readNeutralFiveMinutes({date:'2026-09-18',
 archive_path:'2026/09/18/00.jsonl.zst'}),/UNEXPECTED_SOURCE_DAY_OR_PATH/);
});
test('failed oldest training source is DATA GAP not fake learning',async()=>{
 await assert.rejects(()=>readNeutralFiveMinutes({date:'2026-07-20',
 archive_path:'2026/07/20/00.jsonl.zst',
 fetcher:async()=>({ok:false,status:404})}),/SOURCE_HTTP_404/);
});
