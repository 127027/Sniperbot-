import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHistoricalCandles,closeAsOf} from '../src/historical-candles.mjs';
const date='2026-11-15',t=Date.parse(date+'T00:00:00Z')/1000;
test('only closed historical candles are knowable at decision time',()=>{
 const tape=normalizeHistoricalCandles({day:date,aggregateMinutes:5,apiResponse:{data:{attributes:{ohlcv_list:[
 [t+1800,.001,.0014,.0009,.0012,20000],
 [t+2100,.0012,.0016,.0011,.0015,24000]
 ]}}}});
 assert.equal(tape.candle_count,2);
 assert.equal(closeAsOf(tape,'2026-11-15T00:34:00Z'),null);
 assert.equal(closeAsOf(tape,'2026-11-15T00:35:00Z').close_usd,.0012);
 assert.equal(closeAsOf(tape,'2026-11-15T00:40:00Z').close_usd,.0015);
 assert.equal(tape.trade_eligible,false);
});
test('provider future high is not a usable pre-close signal',()=>{
 const tape=normalizeHistoricalCandles({day:date,aggregateMinutes:5,apiResponse:{data:{attributes:{ohlcv_list:[[t+2100,.001,.05,.0009,.002,10000]]}}}});
 assert.equal(closeAsOf(tape,'2026-11-15T00:35:00Z'),null);
});
test('bad OHLCV and beyond-day data excluded',()=>{
 const tape=normalizeHistoricalCandles({day:date,aggregateMinutes:5,apiResponse:{data:{attributes:{ohlcv_list:[
 [t+300,.001,.0011,.0008,.001,100],
 [t+600,.01,.009,.009,.01,999],
 [t+86400,.001,.002,.0009,.001,100]
 ]}}}});
 assert.equal(tape.candle_count,1);assert.equal(tape.issues.length,1);
});
test('missing provider data never turns into no opportunities',()=>{
 assert.throws(()=>normalizeHistoricalCandles({day:date,apiResponse:{}}),/NO_PROVIDER_CANDLES/);
});
