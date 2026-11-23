import test from 'node:test';
import assert from 'node:assert/strict';
import {R29_PINNED_FOUR_OCT12_TRANSACTION_SOURCE_DIGESTS as pins,
 analyzePinnedOriginalPoolOwnerBalanceDeltas}
 from '../src/v19-oct12-verified-pool-token-account-deltas.mjs';

test('exactly 4 historical original V1 RPC raw-body sources are SHA-256 pinned',()=>{
 assert.equal(pins.length,4);
 assert.deepEqual(pins.map(x=>x.scan),[3,3,19,19]);
 assert.equal(new Set(pins.map(x=>x.file)).size,4);
 assert.equal(new Set(pins.map(x=>x.sha256)).size,4);
 assert.ok(pins.every(x=>/^[0-9a-f]{64}$/.test(x.sha256)));
});
test('post-event forged source cannot be parsed as 2026-10-12 original chain movement',()=>{
 for(let i=0;i<4;i++){
  assert.throws(()=>analyzePinnedOriginalPoolOwnerBalanceDeltas({
   index:i,sourceRaw:JSON.stringify({version:1,meta:{preTokenBalances:[],
    postTokenBalances:[]},blockTime:1791770393})}),
   /NOT_PINNED_ORIGINAL_SOLANA_TX_RAW_RESPONSE/);
 }
});
test('no alternate run-id or negative index can forge a proof',()=>{
 assert.throws(()=>analyzePinnedOriginalPoolOwnerBalanceDeltas({
  index:2,sourceRunId:'future-untrusted',sourceRaw:'{}'}),
  /NOT_PINNED_ORIGINAL_SOLANA_TX_RAW_RESPONSE/);
 assert.throws(()=>analyzePinnedOriginalPoolOwnerBalanceDeltas({
  index:4,sourceRaw:'{}'}),
  /NOT_PINNED_ORIGINAL_SOLANA_TX_RAW_RESPONSE/);
});
