import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectArchiveIndex,probeArchiveIndex} from './shrine-neutral-hourly-index-audit.mjs';
const base='https://replay.shrine.trade/pump',sha='a'.repeat(64);
test('neutral calendar is 60 train and 60 test with no results/lookahead',()=>{
 const a=inspectArchiveIndex({base,hours:['2026/09/18/00','2026/09/18/01','2026/10/15/10','2026/11/16/23']},{raw_sha256:sha});
 assert.equal(a.days.length,120);
 assert.equal(a.days[0].day_utc,'2026-07-20');
 assert.equal(a.days[59].day_utc,'2026-09-17');
 assert.equal(a.days[60].day_utc,'2026-09-18');
 assert.equal(a.days[119].day_utc,'2026-11-16');
 assert.equal(a.test_hour_total,4);
 assert.equal(a.train_hour_total,0);
 assert.equal(a.test_days_with_any_archived_hour,3);
 assert.equal(a.portfolio_pnl_test_usdc,null);
 assert.equal(a.individual_GPT_model_scans_conducted,0);
});
test('duplicate and malformed source index are rejected',()=>{
 assert.throws(()=>inspectArchiveIndex({base,hours:['2026/09/18/00','2026/09/18/00']},{raw_sha256:sha}),/DUPLICATE/);
 assert.throws(()=>inspectArchiveIndex({base,hours:['2026/09/18/99']},{raw_sha256:sha}),/INVALID_HOUR/);
 assert.throws(()=>inspectArchiveIndex({base:'https://untrusted.invalid',hours:[]},{raw_sha256:sha}),/SCHEMA/);
});
test('live index probe can run with injected strictly read-only stub',async()=>{
 const result=await probeArchiveIndex({fetcher:async()=>({
  ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({base,hours:['2026/09/18/00']})
 })});
 assert.equal(result.test_hour_total,1);
 assert.match(result.raw_index_sha256,/^[a-f0-9]{64}$/);
 assert.equal(result.executable_historical_bidirectional_quotes_attested,false);
});
test('bad JSON and oversized index fail closed',async()=>{
 await assert.rejects(()=>probeArchiveIndex({fetcher:async()=>({
  ok:true,headers:{get:()=>null},text:async()=>'<html/>'
 })}),/INVALID_JSON/);
 await assert.rejects(()=>probeArchiveIndex({fetcher:async()=>({
  ok:true,headers:{get:()=>4000000},text:async()=>{throw Error('should not read')}
 })}),/OVERSIZE/);
});
