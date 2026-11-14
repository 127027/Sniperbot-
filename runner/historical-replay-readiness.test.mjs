import test from 'node:test';
import assert from 'node:assert/strict';
import {auditHistoricalReplayCase,auditHistoricalReplayCases} from './historical-replay-readiness.mjs';

const token='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40);
const complete={
 label:'Synthetic early meme example',chain:'base',token_address:token,pool_address:pool,
 candidate_id:'base:'+token+':'+pool,
 pool_created_at_utc:'2026-01-01T00:00:00Z',
 first_breakout_at_utc:'2026-01-02T00:00:00Z',
 reference_entry_price_usd:.01,peak_within_window_usd:1,
 pre_event_evidence:[{source_url:'https://news.example.org/original',
   public_at_utc:'2026-01-01T06:00:00Z',captured_at_utc:'2026-01-01T06:05:00Z',
   independently_verified:true}],
 complete_launch_cohort:true,independent_sources_verified:true,sellable_quote_at_entry:true
};
test('workbook-style ATH/early price without chain, pre-event chronology and failed launches is UNTESTABLE',()=>{
 const s=auditHistoricalReplayCase({label:'Popular old meme',reference_entry_price_usd:.01,
  peak_within_window_usd:2});
 assert.equal(s.status,'UNTESTABLE_MISSING_DATA');
 assert.equal(s.hypothetical_price_multiple,null);
 assert.equal(s.profitable_exit_verified,false);
 assert(s.blocking_reasons.includes('SURVIVORSHIP_BIAS_NO_COMPLETE_COHORT'));
 assert(s.blocking_reasons.includes('MISSING_VERIFIED_CHAIN_TOKEN_POOL'));
});
test('complete synthetic evidence can pass readiness, NEVER claim detected or sold profitably',()=>{
 const s=auditHistoricalReplayCase(complete);
 assert.equal(s.status,'REPLAY_READY_NOT_PROOF_OF_PREDICTION');
 assert.equal(s.independent_triggers_before_breakout,1);
 assert.equal(s.hypothetical_price_multiple,100);
 assert.equal(s.breakout_hit_before_move,null);
 assert.equal(s.profitable_exit_verified,false);
});
test('an archived tweet first captured AFTER pump is lookahead bias, never valid early detector',()=>{
 const e={...complete.pre_event_evidence[0],
  captured_at_utc:'2026-01-03T00:00:00Z'};
 const s=auditHistoricalReplayCase({...complete,pre_event_evidence:[e]});
 assert.equal(s.status,'UNTESTABLE_MISSING_DATA');
 assert(s.blocking_reasons.includes('NO_INDEPENDENTLY_DATED_PRE_BREAKOUT_TRIGGER'));
});
test('same ticker with different contract and pool is an ID collision',()=>{
 const x=auditHistoricalReplayCase({...complete,candidate_id:'base:unrelated:unrelated'});
 assert.equal(x.status,'UNTESTABLE_MISSING_DATA');
 assert(x.blocking_reasons.includes('IDENTITY_COLLISION'));
});
test('anti-survivorship batch never turns a list of winners into fake replay performance',()=>{
 const r=auditHistoricalReplayCases([complete,{...complete,complete_launch_cohort:false,label:'winner only'}]);
 assert.equal(r.ready,1);assert.equal(r.untestable,1);
 assert.equal(r.actionable,false);
 assert(!Object.hasOwn(r,'hit_rate'));
});
