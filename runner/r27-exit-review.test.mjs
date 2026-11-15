import test from 'node:test';
import assert from 'node:assert/strict';
import {detectR27ExitRisk} from './r27-exit-review.mjs';
const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40);
const prev={schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
 published_at_utc:'2026-11-15T10:00:00Z',
 candidates:[{candidate_id:'eth:'+token+':'+pool,chain:'eth',
  token_address:token,pool_address:pool,price_usd:.5,liquidity_usd:90000,
  volume_m5_usd:50000,buys_m5:70,sells_m5:25}]};
test('large simultaneous price/liquidity loss becomes nonexecuting SELL review',()=>{
 const current=structuredClone(prev);current.published_at_utc='2026-11-15T10:02:00Z';
 current.candidates[0]={...prev.candidates[0],price_usd:.44,
  liquidity_usd:60000,volume_m5_usd:20000,buys_m5:10,sells_m5:40};
 const x=detectR27ExitRisk(prev,current);
 assert.equal(x.reviews.length,1);
 assert.equal(x.reviews[0].recommended_action,'REVIEW_PAPER_POSITION_FOR_SELL');
 assert.equal(x.auto_sells,0);
 assert.equal(x.reviews[0].sellability_verified,false);
 assert.equal(x.reviews[0].auto_sold,false);
});
test('short-lived whale volume without price or LP loss creates no SELL claim',()=>{
 const current=structuredClone(prev);current.published_at_utc='2026-11-15T10:02:00Z';
 current.candidates[0]={...prev.candidates[0],price_usd:.52,
  liquidity_usd:94000,volume_m5_usd:15000,buys_m5:2,sells_m5:90};
 assert.equal(detectR27ExitRisk(prev,current).reviews.length,0);
});
test('stale or tampered prior snapshot cannot raise artificial signal',()=>{
 const old={...prev,published_at_utc:'2026-11-15T09:40:00Z'};
 const next={...prev,published_at_utc:'2026-11-15T10:02:00Z'};
 next.candidates[0]={...prev.candidates[0],price_usd:.3,liquidity_usd:10000};
 assert.equal(detectR27ExitRisk(old,next).reviews.length,0);
 assert.equal(detectR27ExitRisk({...prev,actionable:true},next).reviews.length,0);
});
