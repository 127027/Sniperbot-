import test from 'node:test';
import assert from 'node:assert/strict';
import {detectEarlyMarketAcceleration} from './research-hype-triggers.mjs';
const old='2026-11-10T06:00:00Z',now='2026-11-10T06:02:00Z';
const token='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40);
const candidate=(c={})=>({chain:'base',token_address:token,pool_address:pool,
 candidate_id:'base:'+token+':'+pool,volume_m5_usd:1000,liquidity_usd:20000,
 price_usd:0.01,buys_m5:6,sells_m5:5,
 source_urls:['https://api.geckoterminal.com/api/v2/networks/base/new_pools?page=1'],...c});
const snap=(published_at_utc,candidates)=>({schema:'research_market_snapshot.v1',
 published_at_utc,paper_only:true,actionable:false,candidates});
test('two same-pool fresh observations create a research alert, never a paper purchase',()=>{
 const prev=snap(old,[candidate()]),curr=snap(now,[candidate({
  volume_m5_usd:5000,liquidity_usd:45000,price_usd:.015,buys_m5:45,sells_m5:7
 })]);
 const a=detectEarlyMarketAcceleration(prev,curr);
 assert.equal(a.events.length,1);
 assert.equal(a.evaluated_pairs,1);
 assert.equal(a.events[0].m5_volume_ratio,5);
 assert.equal(a.events[0].recommended_action,'INDEPENDENT_FIVE_ROLE_REVIEW');
 assert.equal(a.events[0].probability_pct,null);
 assert.equal(a.events[0].actionable,false);
 assert.equal(a.events[0].paper_only,true);
 assert(a.events[0].unknown_checks.includes('SELLABILITY'));
 assert(!Object.hasOwn(a.events[0],'amount'));
 assert(!Object.hasOwn(a.events[0],'BUY'));
});
test('same symbol but different exact pool cannot trigger',()=>{
 const prev=snap(old,[candidate()]),curr=snap(now,[candidate({pool_address:'0x'+'f'.repeat(40),
  candidate_id:'base:'+token+':0x'+'f'.repeat(40),
  volume_m5_usd:100000,buys_m5:999,sells_m5:1,price_usd:2,liquidity_usd:900000})]);
 const a=detectEarlyMarketAcceleration(prev,curr);
 assert.equal(a.evaluated_pairs,0);
 assert.equal(a.events.length,0);
});
test('empty/noisy/missing evidence cannot create a five-agent buy signal',()=>{
 const prev=snap(old,[candidate()]),curr=snap(now,[candidate({
  volume_m5_usd:5000,liquidity_usd:5000,price_usd:.03,buys_m5:100,sells_m5:0
 })]);
 assert.equal(detectEarlyMarketAcceleration(prev,curr).events.length,0);
 assert.equal(detectEarlyMarketAcceleration(prev,snap(now,[candidate({
  volume_m5_usd:2000,liquidity_usd:30000,buys_m5:5,sells_m5:5,price_usd:.03
 })])).events.length,0);
 assert.equal(detectEarlyMarketAcceleration(prev,snap(now,[candidate({
  volume_m5_usd:20000,liquidity_usd:30000,buys_m5:35,sells_m5:3,price_usd:null
 })])).events.length,0);
});
test('no previous snapshot and >30min gaps cannot imply acceleration',()=>{
 const current=snap(now,[candidate({volume_m5_usd:10000})]);
 assert.equal(detectEarlyMarketAcceleration(null,current).events.length,0);
 assert.equal(detectEarlyMarketAcceleration(snap('2026-11-09T06:02:00Z',[candidate()]),current).events.length,0);
});
test('untrusted provenance never enters urls and cannot claim uncalibrated probability',()=>{
 const prev=snap(old,[candidate()]),curr=snap(now,[candidate({volume_m5_usd:5000,
  liquidity_usd:45000,price_usd:.015,buys_m5:45,sells_m5:3,
  source_urls:['javascript:alert(1)','https://test:abc@evil.test/path','https://provider.test/pools/real']})]);
 const a=detectEarlyMarketAcceleration(prev,curr);
 assert.deepEqual(a.events[0].source_urls,['https://provider.test/pools/real']);
 assert.equal(a.events[0].probability_pct,null);
});
