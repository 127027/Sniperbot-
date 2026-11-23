import test from 'node:test';
import assert from 'node:assert/strict';
import {auditV25TwoPoolCandleFinality}
 from '../src/v25-retro-two-pool-candle-finality-audit.mjs';
import {R29_OCT12_CHAIN_RESEARCH_TARGETS}
 from '../src/v19-october-solana-chain-research.mjs';
const make=(t)=>{
 const now=Date.parse(t.scan_at_utc);
 const start=now-3*60_000;
 return {data:{attributes:{ohlcv_list:Array.from({length:4},(_,i)=>{
   const opened=Math.floor((start+i*60_000)/1000);
   return [opened,1+i,1.1+i,0.9+i,1.05+i,100+i];
 })}}};
};
test('scan 02:00 strictly excludes candle closing 02:00, uses close 01:59',()=>{
 const t=R29_OCT12_CHAIN_RESEARCH_TARGETS[0],r=auditV25TwoPoolCandleFinality({
  target:t,apiResponse:make(t),
  reportedLatestPosthoc:{minute_closed_utc:t.scan_at_utc}});
 assert.equal(r.unguarded_last_candle_close_utc,'2026-10-12T02:00:00.000Z');
 assert.equal(r.predecision_finalized_research_candle_close_utc,'2026-10-12T01:59:00.000Z');
 assert.equal(r.predecision_finalized_research_candle_start_utc,'2026-10-12T01:58:00.000Z');
 assert.equal(r.retrospective_latest_report_label_closed_at_scan,true);
 assert.equal(r.finalization_guard_excluded_at_scan_candle,true);
 assert.equal(r.trade_authorized,false);
});
test('18:00 scans use last research candle closed 17:59 not 18:00',()=>{
 const t=R29_OCT12_CHAIN_RESEARCH_TARGETS[1],r=auditV25TwoPoolCandleFinality({
  target:t,apiResponse:make(t),
  reportedLatestPosthoc:{minute_closed_utc:t.scan_at_utc}});
 assert.equal(r.predecision_finalized_research_candle_close_utc,'2026-10-12T17:59:00.000Z');
 assert.equal(r.original_october_provider_delivery_authenticated,false);
 assert.equal(r.historical_50_usdc_executable_buy_quote,false);
 assert.equal(r.historical_50_usdc_executable_sell_quote,false);
});
test('only exact two neutral original source pool IDs may be audited',()=>{
 const t=R29_OCT12_CHAIN_RESEARCH_TARGETS[0];
 assert.throws(()=>auditV25TwoPoolCandleFinality({
  target:{...t,mint:'3nXL1jYC4rTL9hWnEYz1w4WkbbKceFmb5jxX7RL5pumP'},
  apiResponse:make(t)}),/V25_UNAUTHORIZED_NEUTRAL_CANDLE_TARGET/);
});
test('data gap is explicit, a postevent candle never authorizes trades',()=>{
 const t=R29_OCT12_CHAIN_RESEARCH_TARGETS[0];
 const r=auditV25TwoPoolCandleFinality({
  target:t,apiResponse:{data:{attributes:{ohlcv_list:[]}}}});
 assert.equal(r.predecision_finalized_research_candle_close_utc,null);
 assert.equal(r.unguarded_last_candle_close_utc,null);
 assert.equal(r.trade_authorized,false);
});
