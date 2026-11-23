import test from 'node:test';
import assert from 'node:assert/strict';
import {replayCausalResearch,validateCausalEvent} from '../src/v19-causal-replay-research.mjs';
const base={chain:'solana-mainnet',pool:'pool-address-123456',contract:'contract-address-123456',published_at_utc:'2026-10-12T00:10:00Z',available_at_utc:'2026-10-12T00:11:00Z',captured_at_utc:'2026-10-12T00:12:00Z',source_origin_verified:true,original_bytes_verified:true,source_blob_sha:'a'.repeat(40)};
test('future observation not available to prior hour',()=>{const r=replayCausalResearch({events:[base]});assert.equal(r.ticks[0].newly_available.length,0);assert.equal(r.ticks[1].newly_available.length,1);assert.equal(r.orders_created,0);});
test('missing source time quarantined',()=>{const r=replayCausalResearch({events:[{...base,available_at_utc:null}]});assert.equal(r.accepted_source_count,0);assert.equal(r.quarantined[0].reason,'SOURCE_TIME_UNKNOWN');});
test('oracle is never used',()=>{assert.equal(validateCausalEvent({...base,post_event_oracle:true}),'ORACLE_INPUT_FORBIDDEN');});
test('retrospective capture does not prove October availability',()=>{const r=replayCausalResearch({events:[{...base,captured_at_utc:'2026-11-23T00:00:00Z',available_at_utc:null}]});assert.equal(r.accepted_source_count,0);});
test('timestamp contradiction rejected',()=>{assert.equal(validateCausalEvent({...base,available_at_utc:'2026-10-12T00:09:00Z'}),'SOURCE_TIME_CONTRADICTION');});
test('no input is a transparent no-trade diagnostic, not success',()=>{const r=replayCausalResearch();assert.equal(r.ticks.length,24);assert.equal(r.backtest_success_claimed,false);assert.equal(r.client_fills_claimed,0);});

test('claiming earlier provider availability does not backdate a later captured quote',()=>{
 const late={...base,available_at_utc:'2026-10-12T00:11:00Z',captured_at_utc:'2026-10-12T07:12:00Z'};
 const r=replayCausalResearch({events:[late]});
 assert.equal(r.ticks[1].newly_available.length,0);
 assert.equal(r.ticks[7].newly_available.length,0);
 assert.equal(r.ticks[8].newly_available.length,1);
 assert.equal(r.ticks[8].newly_available[0].captured_at_utc,late.captured_at_utc);
 assert.equal(r.orders_created,0);
});
test('a November reconstruction of an October price cannot enter an October replay',()=>{
 const r=replayCausalResearch({events:[{...base,captured_at_utc:'2026-11-23T00:00:00Z'}]});
 assert.equal(r.accepted_source_count,0);
 assert.equal(r.quarantined[0].reason,'CAPTURE_AFTER_TEST_WINDOW');
 assert.equal(r.ticks.every(t=>t.newly_available.length===0),true);
});
test('captured observations past last tick are unused, not prescient',()=>{
 const r=replayCausalResearch({events:[{...base,captured_at_utc:'2026-10-12T23:45:00Z'}]});
 assert.equal(r.accepted_source_count,1);
 assert.equal(r.unused_before_end,1);
 assert.equal(r.ticks[23].newly_available.length,0);
 assert.equal(r.client_fills_claimed,0);
});
test('unrelated events are ordered by capture rather than provider claimed availability',()=>{
 const early={...base,contract:'contract-early-123456',available_at_utc:'2026-10-12T00:10:00Z',captured_at_utc:'2026-10-12T00:20:00Z'};
 const late={...base,contract:'contract-late-123456',available_at_utc:'2026-10-12T00:01:00Z',published_at_utc:'2026-10-12T00:00:00Z',captured_at_utc:'2026-10-12T00:30:00Z'};
 const r=replayCausalResearch({events:[late,early]});
 assert.deepEqual(r.ticks[1].newly_available.map(e=>e.contract),['contract-early-123456','contract-late-123456']);
});

test('timezone-less timestamps and impossible UTC calendar dates are rejected',()=>{
 assert.equal(validateCausalEvent({...base,available_at_utc:'2026-10-12T00:11:00'}),'SOURCE_TIME_UNKNOWN');
 assert.equal(validateCausalEvent({...base,published_at_utc:'2026-02-30T00:10:00Z'}),'SOURCE_TIME_UNKNOWN');
});
test('post-event winner gains and ranks cannot enter source evidence',()=>{
 assert.equal(validateCausalEvent({...base,reported_gain_pct:1000}),'ORACLE_INPUT_FORBIDDEN');
 assert.equal(validateCausalEvent({...base,post_event_rank:1}),'ORACLE_INPUT_FORBIDDEN');
 assert.equal(validateCausalEvent({...base,source_class:'POST_EVENT_ORACLE'}),'ORACLE_INPUT_FORBIDDEN');
});
