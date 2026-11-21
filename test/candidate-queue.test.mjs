import test from 'node:test';
import assert from 'node:assert/strict';
import {prioritizeDiscoveredPools} from '../src/candidate-queue.mjs';
import {canonicalChain,exactPoolUrl,tokenValid,poolValid} from '../src/market-evidence.mjs';
const now='2026-11-21T12:00:00Z';
const x=(chain,pool,options={})=>({chain,pool,observed_at_utc:now,category:'NEW',
 liquidity_usd:12000,volume_24h_usd:40000,symbol:'T',source_url:'https://example.org',...options});
const E='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
test('the neglected historical networks are recognized without bypassing verification',()=>{
 assert.equal(canonicalChain('Robinhood'), 'robinhood');
 assert.equal(canonicalChain('Cronos'), 'cronos');
 assert.equal(canonicalChain('BNB'), 'bsc');
 assert.equal(tokenValid('robinhood',E),true);
 assert.equal(poolValid('cro',E),true);
 assert.equal(exactPoolUrl('https://www.geckoterminal.com/cro/pools/'+E,'cronos',E),true);
 assert.equal(exactPoolUrl('https://www.geckoterminal.com/robinhood/pools/'+E,'robinhood',E),true);
});
test('all observations survive queue capacity and incomplete contracts',()=>{
 const xs=Array.from({length:51},(_,i)=>x(i%2?'robinhood':'cronos','0x'+i.toString(16).padStart(40,'0')));
 const r=prioritizeDiscoveredPools(xs,{asOfUtc:now,detailedLimit:12});
 assert.equal(r.input_count,51);assert.equal(r.unique_count,51);
 assert.equal(r.reviewed_in_depth.length,12);assert.equal(r.pending_queue.length,39);
 assert.equal(r.blocked_contracts,51);
 assert.equal(r.all_candidates.length,51);
});
test('do not silently drop duplicates, future observations or unknown chains',()=>{
 const r=prioritizeDiscoveredPools([x('base',E),x('base',E,{contract:E}),x('unknown',E),x('solana','So11111111111111111111111111111111111111112',{observed_at_utc:'2026-11-22T00:00:00Z'})],{asOfUtc:now,detailedLimit:2});
 assert.equal(r.input_count,4);assert.equal(r.unique_count,3);assert.equal(r.duplicates.length,1);
 assert.equal(r.pending_queue.length,1);
 assert.ok(r.all_candidates.some(z=>z.errors.includes('INVALID_OR_FUTURE_OBSERVATION')));
});
test('rank must not use hindsight gain or winner names',()=>{
 const a=x('base',E,{source_url:'https://example.org',later_return_percent:123456,symbol:'WINNER'});
 const b=x('base','0x'+'b'.repeat(40),{symbol:'NEUTRAL'});
 const r=prioritizeDiscoveredPools([a,b],{asOfUtc:now,detailedLimit:10});
 assert.equal(r.all_candidates[0].priority,r.all_candidates[1].priority);
});
