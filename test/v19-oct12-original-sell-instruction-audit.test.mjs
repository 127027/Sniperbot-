import test from 'node:test';
import assert from 'node:assert/strict';
import {R29_PINNED_FOUR_OCT12_TRANSACTION_SOURCE_DIGESTS as pins}
 from '../src/v19-oct12-verified-pool-token-account-deltas.mjs';
import {auditPinnedOriginalThirdPartySellInstruction}
 from '../src/v19-oct12-original-sell-instruction-audit.mjs';

test('all four actual source SHA pins are exact and distinct, never oracle-selected',()=>{
 assert.equal(pins.length,4);
 assert.equal(new Set(pins.map(x=>x.sha256)).size,4);
 assert.ok(pins.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
 assert.deepEqual(pins.map(x=>x.scan),[3,3,19,19]);
});
test('tampered or invented historical sell logs cannot certify third-party SOL exits',()=>{
 for(let i=0;i<4;i++){
  assert.throws(()=>auditPinnedOriginalThirdPartySellInstruction({
   index:i,sourceRaw:JSON.stringify({result:{
    version:1,meta:{err:null,logMessages:[
     'Program log: Instruction: SellV3',
     'Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P success']}}})
  }),/ORIGINAL_THIRD_PARTY_SELL_SOURCE_SHA_MISMATCH/);
 }
 assert.throws(()=>auditPinnedOriginalThirdPartySellInstruction({
  index:4,sourceRaw:'{}'}),/ORIGINAL_THIRD_PARTY_SELL_SOURCE_SHA_MISMATCH/);
});
test('untrusted future or copied original labels cannot be source identity by changing index',()=>{
 assert.throws(()=>auditPinnedOriginalThirdPartySellInstruction({
  index:-1,sourceRaw:'{}'}),/ORIGINAL_THIRD_PARTY_SELL_SOURCE_SHA_MISMATCH/);
 assert.throws(()=>auditPinnedOriginalThirdPartySellInstruction({
  index:0,sourceRaw:'{\"future_winner_label\":true}'}),
  /ORIGINAL_THIRD_PARTY_SELL_SOURCE_SHA_MISMATCH/);
});
