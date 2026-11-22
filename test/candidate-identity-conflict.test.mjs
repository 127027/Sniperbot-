import test from 'node:test';
import assert from 'node:assert/strict';
import {prioritizeDiscoveredPools} from '../src/candidate-queue.mjs';

const observed_at_utc='2026-11-22T06:00:00Z';
const pool='0x'+'a'.repeat(40);
const make=(contract,source_url='https://dexscreener.com/base/'+pool)=>({
 chain:'base',pool,contract,source_url,category:'NEW',
 observed_at_utc,liquidity_usd:10000,volume_24h_usd:25000,symbol:'TEST'
});
test('same pool with two different valid contracts is quarantined for identity verification',()=>{
 const a='0x'+'b'.repeat(40),b='0x'+'c'.repeat(40);
 const result=prioritizeDiscoveredPools([make(a),make(b)],{asOfUtc:observed_at_utc});
 assert.equal(result.input_count,2);
 assert.equal(result.unique_count,1);
 assert.equal(result.identity_conflicts.length,1);
 assert.deepEqual(result.identity_conflicts[0].contracts,[a,b]);
 assert.ok(result.all_candidates[0].errors.includes('CONTRACT_IDENTITY_CONFLICT'));
 assert.equal(result.all_candidates[0].status,'WATCH_OR_VERIFY');
 assert.equal(result.duplicates.length,1);
 assert.equal(result.duplicates[0].contract,b);
});
test('case-only differences on an EVM token address do not create a false conflict',()=>{
 const contract='0x'+'abcdef'.repeat(6)+'abcd';
 const result=prioritizeDiscoveredPools([make(contract),make(contract.toUpperCase().replace('0X','0x'))],{asOfUtc:observed_at_utc});
 assert.equal(result.identity_conflicts.length,0);
 assert.equal(result.unique_count,1);
});
test('incomplete identity is preserved without claiming conflicting valid contracts',()=>{
 const result=prioritizeDiscoveredPools([make(null),make('0x'+'b'.repeat(40))],{asOfUtc:observed_at_utc});
 assert.equal(result.identity_conflicts.length,0);
 assert.equal(result.duplicates.length,1);
});
