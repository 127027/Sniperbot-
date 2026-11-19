// R29 BACKTEST-ONLY: deterministic structural chunk audit regression.
// Synthetic events only. Never proof of historical origin or trading.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditNeutralFrameChunks} from './r29-neutral-frame-chunk-coverage-audit.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const asof='2026-09-18T01:20:00Z';
const events=Array.from({length:108010},(_,i)=>({
  source_id:'synthetic',event_id:String(i),
  event_at_utc:'2026-09-18T01:00:00Z',
  provider_captured_at_utc:'2026-09-18T01:01:00Z'
}));
const make=es=>({virtual_asof_utc:asof,expected_event_count:es.length,
  expected_frame_sha256:hash(es),
  chunks:[0,50000,100000].filter(x=>x<es.length).map((offset,index)=>{
    const part=es.slice(offset,offset+50000);
    return {index,start_offset:offset,events:part,events_sha256:hash(part)};
  })});
const valid=make(events);
const result=auditNeutralFrameChunks(valid);
assert.equal(result.event_count,108010);
assert.equal(result.chunk_count,3);
assert.equal(result.model_invocation_permitted,false);
assert.equal(result.provider_capture_independently_attested,false);
function reject(mutator,code){
  const obj=make(events);
  mutator(obj);
  assert.throws(()=>auditNeutralFrameChunks(obj),e=>e.message===code);
}
reject(x=>{x.expected_event_count=108011},'INCOMPLETE_FRAME');
reject(x=>{x.chunks[1].start_offset=49999},'CHUNK_GAP_OR_OVERLAP');
reject(x=>{x.chunks[2].events[0]={...x.chunks[2].events[0],event_id:'changed'}},'CHUNK_DIGEST_MISMATCH');
reject(x=>{x.chunks[2].events[0]={...x.chunks[2].events[0],event_id:'0'};x.chunks[2].events_sha256=hash(x.chunks[2].events)},'DUPLICATE_EVENT');
reject(x=>{x.chunks[0].events[0]={...x.chunks[0].events[0],provider_captured_at_utc:'2026-09-18T01:21:00Z'};x.chunks[0].events_sha256=hash(x.chunks[0].events)},'FUTURE_OR_UNDATED_EVENT');
reject(x=>{x.chunks[0].events_sha256='0'.repeat(64)},'CHUNK_DIGEST_MISMATCH');
reject(x=>{x.expected_frame_sha256='0'.repeat(64)},'FRAME_DIGEST_MISMATCH');
console.log('R29 synthetic 108010-event chunk audit: 1 positive + 7 negative cases PASS; origin NOT attested');
