import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateHourlyPricePatterns} from '../src/forensic-price-patterns.mjs';
const date='2026-11-15';
const candle=(at,price)=>({known_no_earlier_than_utc:at,close_usd:price});
test('cannot discover pool after Dot2 :15 within the same :35 cycle',()=>{
 const tape={candle_count:3,candles:[candle('2026-11-15T00:35:00Z',1),
 candle('2026-11-15T01:00:00Z',1.08),candle('2026-11-15T01:35:00Z',1.15)]};
 const r=evaluateHourlyPricePatterns({date,tape,pool_created_at_utc:'2026-11-15T00:32:00Z'});
 assert.equal(r.scan_results[0].status,'NOT_IN_PREVIOUS_DOT2_SCAN');
 assert.equal(r.scan_results[1].status,'ENTRY_PRICE_PATTERN_ONLY');
 assert.equal(r.verified_buys,0);
});
test('future candle close is not accessible to prior scans',()=>{
 const tape={candle_count:2,candles:[candle('2026-11-15T00:36:00Z',1),
 candle('2026-11-15T01:40:00Z',5)]};
 const r=evaluateHourlyPricePatterns({date,tape,pool_created_at_utc:'2026-11-15T00:00:00Z'});
 assert.equal(r.scan_results[0].scanned_candle_closed_at_utc,null);
 assert.equal(r.scan_results[1].scanned_candle_closed_at_utc,null);
 assert.equal(r.patterns.length,0);
});
test('take-profit and stop-loss patterns are not claimed as verified trades',()=>{
 const tape={candle_count:5,candles:[candle('2026-11-15T00:00:00Z',1),
 candle('2026-11-15T00:30:00Z',1.1),
 candle('2026-11-15T01:30:00Z',1.6),
 candle('2026-11-15T02:30:00Z',1.1)]};
 const r=evaluateHourlyPricePatterns({date,tape,pool_created_at_utc:'2026-11-14T23:00:00Z'});
 assert.equal(r.patterns[0].type,'ENTRY_PRICE_PATTERN_ONLY');
 assert.equal(r.patterns[1].type,'EXIT_PRICE_PATTERN_ONLY');
 assert.equal(r.verified_buys,0);assert.equal(r.verified_sells,0);
});
