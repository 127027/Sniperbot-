import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {classifyHistoricalSource,buildDayPackets,RESULT} from './dot-historical-source-gate.mjs';
// All names, dates, transactions and bytes below are SYNTHETIC fixtures, not real historical findings.
const hash=s=>createHash('sha256').update(s).digest('hex');
const example={
 id:'fictional-1',kind:'NEWS_ORIGINAL',
 event_at_utc:'2024-09-10T10:00:00Z',
 available_from_utc:'2024-09-10T10:00:00Z',
 url:'https://example.org/fictional-news'
};
test('original date on current mutable site is discovery clue, NEVER time-verified historical original',()=>{
 const s={...example,proof_type:'CONTEMPORARY_SITE_DATE_ONLY'};
 assert.equal(classifyHistoricalSource(s,'2024-09-10T23:59:59Z').grade,RESULT.METADATA);
 assert.equal(classifyHistoricalSource({...s,proof_type:'PROVISIONAL_PLATFORM_DATE'},'2024-09-10T23:59:59Z').grade,RESULT.PROVISIONAL);
});
test('news dated 2024-09-15 cannot appear on virtual 2024-09-14',()=>{
 const s={...example,event_at_utc:'2024-09-15T10:00:00Z',
  available_from_utc:'2024-09-15T10:00:00Z',
  proof_type:'CONTEMPORARY_SITE_DATE_ONLY'};
 assert.equal(classifyHistoricalSource(s,'2024-09-14T23:59:59Z').grade,RESULT.FUTURE);
});
test('synthetic fixture archive is admissible only from its 2024 capture date, never earlier',()=>{
 const original='SYNTHETIC ORIGINAL BODY FOR VALIDATOR TEST ONLY';
 const s={...example,proof_type:'VERIFIED_2024_ARCHIVE',
  available_from_utc:'2024-09-11T10:00:00Z',
  capture_at_utc:'2024-09-11T10:00:00Z',
  archive_url:'https://web.archive.org/web/20240911100000/https://example.org/fictional-news',
  original_bytes:original,original_sha256:hash(original),archived_original_bytes_verified:true};
 assert.equal(classifyHistoricalSource(s,'2024-09-10T23:59:59Z').grade,RESULT.FUTURE);
 assert.equal(classifyHistoricalSource(s,'2024-09-11T23:59:59Z').grade,RESULT.STRICT);
 const corrupted={...s,original_sha256:'f'.repeat(64)};
 assert.equal(classifyHistoricalSource(corrupted,'2024-09-11T23:59:59Z').grade,RESULT.INVALID);
 const mismatched={...s,archive_url:'https://web.archive.org/web/20240912100000/https://example.org/fictional-news'};
 assert.equal(classifyHistoricalSource(mismatched,'2024-09-11T23:59:59Z').grade,RESULT.INVALID);
});
test('onchain reconstruction must not be represented as actually discovered by a 2024 Dot',()=>{
 const s={...example,id:'fictional-tx',kind:'ONCHAIN_TX',proof_type:'VERIFIED_ORIGINAL_CHAIN_TX',
  url:'https://example.org/tx',block_at_utc:'2024-09-10T10:00:00Z',
  block_slot:123456789,tx_signature:'synthetic_tx_signature_00001',
  historical_tx_verified:true,historical_state_replayed:true,
  independent_slot_confirmation:true,explorer_url:'https://example.org/ledger-proof'};
 const r=classifyHistoricalSource(s,'2024-09-10T23:59:59Z');
 assert.equal(r.grade,RESULT.LEDGER);
 assert.match(r.reason,/DISCOVERY_NEEDS_2024_FEED_PROOF/);
 assert.equal(classifyHistoricalSource({...s,historical_state_replayed:false},'2024-09-10T23:59:59Z').grade,RESULT.INVALID);
});
test('retrospective OHLC known in 2026 is evaluation only, not prior event input',()=>{
 const s={...example,kind:'MARKET_TRADE',proof_type:'CONTEMPORARY_SITE_DATE_ONLY',method:'RETROSPECTIVE_DAILY_OHLC'};
 assert.equal(classifyHistoricalSource(s,'2024-09-10T23:59:59Z').grade,RESULT.HINDSIGHT);
});
test('daily packet splits provisional clues, historical ledger reconstruction and auditable originals',()=>{
 const exampleOriginal='SYNTHETIC ARCHIVAL TEXT – NOTHING ABOUT ANY REAL TOKEN';
 const archived={...example,id:'synthetic-original',proof_type:'VERIFIED_2024_ARCHIVE',
  available_from_utc:'2024-09-11T10:00:00Z',
  capture_at_utc:'2024-09-11T10:00:00Z',
  archive_url:'https://web.archive.org/web/20240911100000/https://example.org/fictional-news',
  original_bytes:exampleOriginal,original_sha256:hash(exampleOriginal),archived_original_bytes_verified:true};
 const onlyDate={...example,id:'synthetic-mutable',proof_type:'CONTEMPORARY_SITE_DATE_ONLY'};
 const out=buildDayPackets([archived,onlyDate],{
  start_utc:'2024-09-10T00:00:00Z',end_utc:'2024-09-12T23:59:59Z'});
 assert.equal(out.days,3);
 assert.equal(out.packets[0].unverified_research_leads.length,1);
 assert.equal(out.packets[0].original_archived_inputs.length,0);
 assert.equal(out.packets[1].original_archived_inputs.length,1);
 assert.equal(out.packets[1].qualified_buy_orders,0);
 assert.equal(out.status,'SOURCE_GRADE_DIAGNOSTIC_NOT_FIVE_DOT_BLIND_REPLAY');
});
test('duplicate source IDs are rejected, no fake sixty-one source rows generated',()=>{
 const input={...example,proof_type:'CONTEMPORARY_SITE_DATE_ONLY'};
 assert.throws(()=>buildDayPackets([input,input],{
 start_utc:'2024-09-10T00:00:00Z',end_utc:'2024-11-09T23:59:59Z'}),/DUPLICATE_OR_INVALID_SOURCE_ID/);
 const x=buildDayPackets([input],{start_utc:'2024-09-10T00:00:00Z',end_utc:'2024-11-09T23:59:59Z'});
 assert.equal(x.days,61);
 assert.equal(x.packets.filter(p=>p.unverified_research_leads.length>0).length,1);
 assert.equal(x.packets.filter(p=>p.qualified_buy_orders>0).length,0);
 assert.equal(x.original_verified_feed_complete,false);
});
