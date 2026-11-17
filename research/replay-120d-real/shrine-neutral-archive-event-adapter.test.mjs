import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNeutralShrineEvent,normalizeNeutralShrineHour} from './shrine-neutral-archive-event-adapter.mjs';
import {buildNeutralHistoricalModelInput} from './blind-neutral-market-gpt-input.mjs';
const time=Date.parse('2026-09-18T00:00:04Z')/1000;
const md={archive_hour_utc:'2026-09-18T00:00:00Z',archive_sha256:'a'.repeat(64)};
const event={
 action:'buy',protocol:'PUMPFUN',timestamp:time,localTimestamp:(time*1000)+800,
 signature:'5'.repeat(88),block:303003033,txIndex:15,
 mint:'9'.repeat(44),pool:'8'.repeat(44),quoteMint:'7'.repeat(44),
 price:0.000001,tokenAmount:100000,quoteAmount:0.1,
 tokensInPool:200000,quoteInPool:5.6
};
test('archive buy maps to original quote price, never USD executable quote',()=>{
 const r=normalizeNeutralShrineEvent(event,md);
 assert.equal(r.event_type,'DEX_BUY');
 assert.equal(r.chain,'solana');
 assert.equal(r.quote_asset,event.quoteMint);
 assert.equal(r.source_recorded_trade_price_quote,0.000001);
 assert.equal('indicative_price_usd' in r,false);
 assert.equal(r.transaction_finality,'unverified');
 assert.equal(r.data_quality,'ARCHIVED_PROVIDER_EVENT_NOT_CONFIRMED_EXECUTABLE_FILL');
});
test('all eligible events remain neutral without known-winner selection',()=>{
 const r=normalizeNeutralShrineHour([event,{...event,action:'sell',txIndex:16,
 timestamp:time+10,localTimestamp:time*1000+10800}],md);
 assert.equal(r.length,2);
 assert.deepEqual(r.map(x=>x.event_type),['DEX_BUY','DEX_SELL']);
});
test('source event can pass independent no-hindsight model input gate',()=>{
 const normalized=normalizeNeutralShrineEvent(event,md);
 const sealed=buildNeutralHistoricalModelInput({
 virtual_asof_utc:'2026-09-18T01:00:00Z',phase:'TRADE_TEST',
 discovery_mode:'NEUTRAL_ALL_AVAILABLE_EVENTS',
 candidate_source:'NEUTRAL_SEQUENTIAL_ARCHIVE',
 current_user_conversation_included:false,
 retrospective_winners_supplied:false,
 market_events:[normalized],media_items:[],prior_lessons:[],
 open_positions:[],reviews_completed_today:0,missing_source_categories:['no executable sell quote']
 });
 assert.equal(sealed.payload.market_events[0].source_recorded_trade_price_quote,0.000001);
 assert.equal(sealed.payload.market_events[0].quote_asset,'7'.repeat(44));
 assert.equal(sealed.payload.trading_and_wallet_actions_permitted,false);
});
test('localTimestamp after virtual scan is rejected, not replayed early',()=>{
 const future={...event,localTimestamp:Date.parse('2026-09-18T02:00:00Z')};
 assert.throws(()=>normalizeNeutralShrineEvent(future,md),/ORIGINAL_STREAM_TIMESTAMP_INVALID/);
});
test('reject unpinned source and unknown action but never invent missing price',()=>{
 assert.throws(()=>normalizeNeutralShrineEvent(event,{...md,archive_sha256:null}),/SHA256_NOT_VERIFIED/);
 assert.equal(normalizeNeutralShrineEvent({...event,action:'unknown'},md),null);
 const p=normalizeNeutralShrineEvent({...event,action:'create',price:undefined},md);
 assert.equal(p.source_recorded_trade_price_quote,null);
 assert.equal(p.event_type,'TOKEN_CREATE');
});
