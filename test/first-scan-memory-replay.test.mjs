import test from 'node:test';
import assert from 'node:assert/strict';
import {replayFirstScanMemory} from '../src/first-scan-memory-replay.mjs';
const date='2026-10-12';
const candle=(s,p=1)=>({known_no_earlier_than_utc:s,close_usd:p});
const base=(id,created,candles)=>({id,symbol:id,chain:'bsc',pool_created_at_utc:created,candles});
test('first scan opens full available history, later scans only add evidence',()=>{
 const pool=base('old','2024-01-01T00:00:00Z',[
  candle('2025-10-01T00:05:00Z'),candle('2026-10-12T00:20:00Z'),candle('2026-10-12T01:20:00Z')]);
 const r=replayFirstScanMemory({date,pools:[pool]});
 assert.equal(r.steps.length,24);
 assert.equal(r.steps[0].phase,'FIRST_RUN_HISTORICAL_BACKFILL_AS_OF_TIME');
 assert.equal(r.steps[0].retained_pool_count,1);
 assert.equal(r.steps[0].total_known_prior_closed_candles,1);
 assert.equal(r.steps[1].total_known_prior_closed_candles,2);
 assert.equal(r.steps[2].total_known_prior_closed_candles,3);
 assert.equal(r.steps[23].retained_pool_count,1);
 assert.equal(r.steps[23].already_known_at_scan_start,1);
 assert.equal(r.steps[23].oldest_source_age_limit_minutes,null);
});
test('future pool not visible at 00:15, becomes visible at 01:15; future candle never early',()=>{
 const r=replayFirstScanMemory({date,pools:[base('new','2026-10-12T00:30:00Z',[
 candle('2026-10-12T00:40:00Z'),candle('2026-10-12T01:20:00Z')])]});
 assert.equal(r.steps[0].retained_pool_count,0);
 assert.equal(r.steps[1].newly_appeared_count,1);
 assert.equal(r.steps[1].total_known_prior_closed_candles,1);
 assert.equal(r.steps[2].total_known_prior_closed_candles,2);
 assert.equal(r.historical_discovery_verified,false);
});
test('candles known after current Dot2 tick are excluded despite strategy :35',()=>{
 const r=replayFirstScanMemory({date,pools:[base('p','2026-10-11T12:00:00Z',[
 candle('2026-10-12T00:10:00Z'),candle('2026-10-12T00:30:00Z')])]});
 assert.equal(r.steps[0].total_known_prior_closed_candles,1);
 assert.equal(r.steps[1].total_known_prior_closed_candles,2);
});
test('unavailable history yields empty memory, not invented trades',()=>{
 const r=replayFirstScanMemory({date,pools:[],modelScans:[{decisions:[{action:'BUY_EXPERIMENT'}]}]});
 assert.equal(r.steps[0].modeled_buys,1);
 assert.equal(r.steps[0].all_historical_dot_buys,0);
 assert.equal(r.total_cumulative_pool_count,0);
});
