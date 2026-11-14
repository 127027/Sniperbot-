import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyMemecoinBreakouts,MULTIPLIERS} from './memecoin-outcomes.mjs';
const anchor='2026-01-01T00:00:00Z',t=d=>new Date(Date.parse(anchor)+d*3600_000).toISOString();
const full=Array.from({length:14*24*2+1},(_,i)=>({at_utc:t(i/2),price_usd:1}));
test('a 10x observed price is not a proven 10x sale or a fabricated 50x',()=>{
 const r=classifyMemecoinBreakouts({first_seen_at_utc:anchor,entry_price_usd:1,
  observations:[{at_utc:t(1),price_usd:12}],observed_until_at_utc:t(2)});
 assert.deepEqual(MULTIPLIERS,[2,5,10,50,200]);
 assert.equal(r.outcomes[10].hit,true);
 assert.equal(r.outcomes[50].hit,null);
 assert.equal(r.simulated_sell_quote_available,false);
 assert.equal(r.coverage_complete,false);
});
test('complete 14d observation can mark a price target missed, never profit',()=>{
 const sparse=classifyMemecoinBreakouts({first_seen_at_utc:anchor,entry_price_usd:1,
  observations:full,observed_until_at_utc:t(14*24)});
 assert.equal(sparse.coverage_complete,true);
 assert.equal(sparse.outcomes[2].hit,null,'Even 30-minute samples can miss a rapid intrainterval pump');
 const verified=classifyMemecoinBreakouts({first_seen_at_utc:anchor,entry_price_usd:1,
  observations:full,observed_until_at_utc:t(14*24),
  independently_verified_quotes:true,complete_ohlcv_coverage:true});
 assert.equal(verified.negative_outcomes_verified,true);
 assert.equal(verified.outcomes[2].hit,false);
 assert.equal(verified.outcomes[200].hit,false);
});
test('missing follow-ups cannot label a failed launch as confirmed negative',()=>{
 const r=classifyMemecoinBreakouts({first_seen_at_utc:anchor,entry_price_usd:1,
  observations:[{at_utc:t(1),price_usd:0.001}],observed_until_at_utc:t(14*24)});
 assert.equal(r.outcomes[2].hit,null);
 assert.equal(r.coverage_complete,false);
});
test('quotes outside the 14-day window are ignored',()=>{
 const r=classifyMemecoinBreakouts({first_seen_at_utc:anchor,entry_price_usd:1,
  observations:[{at_utc:t(14*24+1),price_usd:200}],observed_until_at_utc:t(15*24)});
 assert.equal(r.outcomes[200].hit,null);
});
test('invalid prices cannot form evidence of extreme winners',()=>{
 const r=classifyMemecoinBreakouts({first_seen_at_utc:anchor,entry_price_usd:0,
  observations:[{at_utc:t(1),price_usd:999}],observed_until_at_utc:t(14*24)});
 assert.equal(r.error,'INVALID_INPUT');
});
