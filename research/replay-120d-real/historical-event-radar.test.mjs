import test from 'node:test';
import assert from 'node:assert/strict';
import {compileAsOfEventReviewTriggers} from './historical-event-radar.mjs';
const A='2026-10-15T12:00:00.000Z';
const id='9'.repeat(44),pool='8'.repeat(44),sha='a'.repeat(64);
const make=(event_type,event_id,n=0,extra={})=>({
 event_type,event_id,event_at_utc:new Date(Date.parse(A)+n).toISOString(),
 provider_captured_at_utc:new Date(Date.parse(A)+n+22000).toISOString(),
 chain:'solana',token_address:id,pool_address:pool,source_sha256:sha,
 transaction_finality:'unverified',...extra
});
test('migration captured after 22 seconds creates read-only review, not claimed 22-second purchase',()=>{
 const x=compileAsOfEventReviewTriggers([make('MIGRATION','migration')],{
  virtual_asof_utc:'2026-10-15T12:01:00.000Z'});
 assert.equal(x.triggers[0].kind,'POOL_MIGRATION');
 assert.equal(x.triggers[0].observed_latency_ms,22000);
 assert.equal(x.triggers[0].review_available_at_utc,'2026-10-15T12:00:22.000Z');
 assert.equal(x.triggers[0].quoted_execution_proven,false);
 assert.equal(x.no_trade_intents_issued,true);
 assert.equal(x.no_gpt_calls_claimed,true);
 assert.equal(x.paper_only,true);
});
test('no future provider observation can be used at decision timestamp',()=>{
 assert.throws(()=>compileAsOfEventReviewTriggers([make('MIGRATION','m')],{
  virtual_asof_utc:'2026-10-15T12:00:21.000Z'}),/FUTURE_LEAK/);
 assert.throws(()=>compileAsOfEventReviewTriggers([make('MIGRATION','m',0,{
  event_at_utc:'2026-10-15T12:02:00.000Z'})],{
  virtual_asof_utc:'2026-10-15T12:01:00.000Z'}),/FUTURE_LEAK/);
});
test('five separate transactions are one review lead, not five distinct wallets',()=>{
 const e=Array.from({length:5},(_,i)=>make('DEX_BUY','tx-'+i,i*1000,{
  transaction_signature:'sig-'+i}));
 const x=compileAsOfEventReviewTriggers(e,{virtual_asof_utc:'2026-10-15T12:02:00.000Z'});
 assert.equal(x.triggers.length,1);
 assert.equal(x.triggers[0].kind,'BUY_TRANSACTION_BURST');
 assert.equal(x.triggers[0].source_event_ids.length,5);
 assert.equal(x.triggers[0].independent_buyers_verified,false);
});
test('same signature and event IDs do not inflate buy bursts',()=>{
 const e=Array.from({length:8},(_,i)=>make('DEX_BUY','tx-'+i,i*1000,{
  transaction_signature:'one-tx'}));
 const x=compileAsOfEventReviewTriggers([...e,e[0]],{
  virtual_asof_utc:'2026-10-15T12:02:00.000Z'});
 assert.equal(x.triggers.length,0);
 assert.equal(x.scanned_event_count,8);
});
test('read-only alerts include neutral pool creation and pool-liquidity changes',()=>{
 const x=compileAsOfEventReviewTriggers([
  make('POOL_CREATE','pool'),make('POOL_LIQUIDITY','lp',4000),
  make('TOKEN_CREATE','token',1000,{pool_address:null})
 ],{virtual_asof_utc:'2026-10-15T12:03:00.000Z'});
 assert.deepEqual(x.triggers.map(z=>z.kind),['POOL_CREATED','TOKEN_CREATED','LIQUIDITY_EVENT']);
 assert.ok(x.triggers.every(z=>z.outcome_known===false&&z.actionable===false));
 assert.ok(x.triggers.find(z=>z.kind==='TOKEN_CREATED').missing_checks.includes('POOL_IDENTITY'));
});
test('caps are explicit and invalid source hash fails closed',()=>{
 const e=Array.from({length:6},(_,i)=>make('MIGRATION','m-'+i,i*1000));
 const x=compileAsOfEventReviewTriggers(e,{virtual_asof_utc:'2026-10-15T12:02:00.000Z',
  maxTriggers:2});
 assert.equal(x.omitted_trigger_count,4);
 assert.throws(()=>compileAsOfEventReviewTriggers([make('MIGRATION','x',0,{source_sha256:'bad'})],
  {virtual_asof_utc:'2026-10-15T12:02:00.000Z'}),/UNTRUSTED_EVENT/);
});
