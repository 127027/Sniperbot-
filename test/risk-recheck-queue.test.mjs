import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRiskRecheckQueue} from '../src/risk-recheck-queue.mjs';
const t='2026-11-21T18:25:00Z',pool='0x'+'b'.repeat(40),contract='0x'+'a'.repeat(40);
const item={chain:'base',pool,contract,symbol:'AAA',status:'DATA_GAP',
 gecko:{url:'https://www.geckoterminal.com/base/pools/'+pool,price_usd:.001,liquidity_usd:11000,captured_at_utc:t},
 dex:{url:'https://dexscreener.com/base/'+pool,price_usd:.00101,liquidity_usd:12000,captured_at_utc:t,identity_verified:true}};
test('two correctly matched quotes still cannot authorize a BUY without proof of sellability and provider time',()=>{
 const r=buildRiskRecheckQueue({report:{updated_at_utc:t,candidates:[item]},asOfUtc:t});
 assert.equal(r.worklist[0].eligible_for_buy,false);
 assert.ok(r.worklist[0].risk_blockers.includes('PRICE_PROVIDER_TIME_UNKNOWN'));
 assert.ok(r.worklist[0].risk_blockers.includes('SELLABILITY_UNVERIFIED'));
 assert.equal(r.actual_orders,0);
});
test('provider divergence and missing second quote produce prioritized work not trades',()=>{
 const r=buildRiskRecheckQueue({report:{candidates:[
 {...item,dex:{...item.dex,price_usd:2}}, {...item,dex:{...item.dex,price_usd:null,identity_verified:false}}
 ]},asOfUtc:t});
 assert.equal(r.scanned_candidate_count,2);
 assert.equal(r.counts.PROVIDER_PRICE_CONFLICT,1);
 assert.equal(r.counts.MISSING_INDEPENDENT_QUOTE,1);
 assert.equal(r.worklist.every(x=>x.eligible_for_buy===false),true);
});
test('stale captures are not allowed into current order queue',()=>{
 const r=buildRiskRecheckQueue({report:{candidates:[item]},asOfUtc:'2026-11-21T19:00:00Z'});
 assert.equal(r.counts.STALE_CAPTURE,1);
 assert.equal(r.worklist[0].next_action,'REFRESH_TWO_EXACT_POOL_SOURCES');
});
test('no made up records for empty report and parameter validation',()=>{
 const r=buildRiskRecheckQueue({report:{candidates:[]},asOfUtc:t});
 assert.equal(r.worklist.length,0);
 assert.throws(()=>buildRiskRecheckQueue({report:{candidates:[]},asOfUtc:'2020-foo'}),/INVALID_RISK/);
});
