import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {OCT12_ORIGINAL_BLOCK_TARGETS as targets,
 makeR29OriginalSlotOrderRequest,auditR29OriginalSlotOrder}
 from '../src/v19-oct12-solana-verified-block-order.mjs';
const rec=(index,signatures=[],options={})=>{
 const req=makeR29OriginalSlotOrderRequest(index);
 const t=targets[index];
 const data={jsonrpc:'2.0',id:req.id,result:{
  blockTime:t.block_time_unix,parentSlot:t.slot-1,
  blockhash:'foo',previousBlockhash:'bar',signatures}};
 const raw_text=JSON.stringify(data);
 return {url:'https://api.mainnet.solana.com',method:'POST',
  request:req,http_status:200,raw_text,
  raw_sha256:createHash('sha256').update(raw_text).digest('hex'),
  captured_at_utc:'2026-11-23T09:00:00.000Z',...options};
};
test('three precommitted source slots and V1 read-only getBlock signatures only',()=>{
 assert.equal(targets.length,3);
 assert.deepEqual(targets.map(x=>x.slot),[455874036,455874058,456137491]);
 for(let i=0;i<3;i++){
  const x=makeR29OriginalSlotOrderRequest(i);
  assert.equal(x.method,'getBlock');
  assert.equal(x.params[1].transactionDetails,'signatures');
  assert.equal(x.params[1].maxSupportedTransactionVersion,1);
  assert.equal(x.params[1].commitment,'finalized');
 }
 assert.throws(()=>makeR29OriginalSlotOrderRequest(3),/UNAUTHORIZED/);
});
test('ARIANA original same-slot consecutive two-asset snapshots can be corroborated by signature order',()=>{
 const list=[
  'AAAAAAAAAAAA',
  targets[2].signatures[1],
  'CCCCCCCCCCCC',
  targets[2].signatures[0]
 ];
 const r=auditR29OriginalSlotOrder({index:2,receipt:rec(2,list)});
 assert.equal(r.status,'BLOCK_MEMBERSHIP_VERIFIED');
 assert.equal(r.ariana_order_confirmed_by_slot_sequence,true);
 assert.deepEqual(r.signature_indices,[3,1]);
 assert.equal(r.original_gpt_at_scan_available,false);
 assert.equal(r.historical_trading_quote_or_safety_proven,false);
 assert.equal(r.trade_authorized,false);
});
test('ARIANA inverse chain order cannot masquerade as supported accounting continuity',()=>{
 const r=auditR29OriginalSlotOrder({index:2,receipt:rec(2,targets[2].signatures)});
 assert.equal(r.ariana_order_confirmed_by_slot_sequence,false);
 assert.equal(r.exact_original_signature_membership,true);
 assert.equal(r.trade_authorized,false);
});
test('unavailable public RPC or incomplete block with one signature is DATA_GAP',()=>{
 const absent=auditR29OriginalSlotOrder({
  index:2,receipt:rec(2,[],{http_status:429})});
 assert.equal(absent.status,'DATA_GAP');
 assert.equal(absent.code,'PUBLIC_RPC_HTTP_UNAVAILABLE');
 const missing=auditR29OriginalSlotOrder({
  index:2,receipt:rec(2,[targets[2].signatures[0]])});
 assert.equal(missing.exact_original_signature_membership,false);
 assert.equal(missing.status,'DATA_GAP');
 assert.equal(missing.ariana_order_confirmed_by_slot_sequence,null);
});
test('stale event time cannot be rewritten and SHA-pinned original response must match',()=>{
 const b=rec(0,targets[0].signatures);
 assert.equal(auditR29OriginalSlotOrder({index:0,receipt:b}).block_order_proven,true);
 assert.throws(()=>auditR29OriginalSlotOrder({index:0,receipt:{
  ...b,captured_at_utc:'2026-10-12T01:59:58.000Z'}}),/UNTRUSTED/);
 assert.throws(()=>auditR29OriginalSlotOrder({index:0,receipt:{
  ...b,raw_sha256:'b'.repeat(64)}}),/UNTRUSTED/);
 const j=JSON.parse(b.raw_text);j.result.blockTime+=20;
 const raw_text=JSON.stringify(j);
 const altered=auditR29OriginalSlotOrder({index:0,receipt:{
  ...b,raw_text,raw_sha256:createHash('sha256').update(raw_text).digest('hex')}});
 assert.equal(altered.status,'DATA_GAP');
 assert.equal(altered.code,'MISSING_OR_INCONSISTENT_ORIGINAL_SLOT_BLOCK_DATA');
});
