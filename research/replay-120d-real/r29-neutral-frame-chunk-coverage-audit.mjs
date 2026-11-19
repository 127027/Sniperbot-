// R29 BACKTEST-ONLY: neutral frame chunk-coverage auditor.
// Does not choose tokens, invoke GPT, place orders, or claim provenance.
import {createHash} from 'node:crypto';
const sha = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw new Error(code); };
const positive = n => Number.isSafeInteger(n) && n >= 0;
export function auditNeutralFrameChunks({virtual_asof_utc,expected_event_count,chunks,expected_frame_sha256}){
  if(!Number.isFinite(Date.parse(virtual_asof_utc)) || !positive(expected_event_count))
    fail('INVALID_FRAME_METADATA');
  if(!Array.isArray(chunks) || !chunks.length) fail('NO_CHUNKS');
  if(!/^[a-f0-9]{64}$/i.test(expected_frame_sha256||'')) fail('FRAME_DIGEST_REQUIRED');
  let count=0;
  const seen=new Set(), ordered=[];
  for(let i=0;i<chunks.length;i++){
    const chunk=chunks[i];
    if(chunk.index!==i || !Array.isArray(chunk.events) || chunk.events.length>50000)
      fail('CHUNK_INDEX_OR_SIZE_INVALID');
    if(chunk.start_offset!==count) fail('CHUNK_GAP_OR_OVERLAP');
    const canonical=JSON.stringify(chunk.events);
    if(sha(canonical)!==chunk.events_sha256) fail('CHUNK_DIGEST_MISMATCH');
    for(const e of chunk.events){
      if(typeof e.event_id!=='string'||!e.event_id || typeof e.source_id!=='string'||!e.source_id)
        fail('EVENT_IDENTITY_MISSING');
      const key=JSON.stringify([e.source_id,e.event_id]);
      if(seen.has(key)) fail('DUPLICATE_EVENT');
      seen.add(key);
      if(!Number.isFinite(Date.parse(e.event_at_utc)) ||
         !Number.isFinite(Date.parse(e.provider_captured_at_utc)) ||
         Date.parse(e.event_at_utc)>Date.parse(virtual_asof_utc) ||
         Date.parse(e.provider_captured_at_utc)>Date.parse(virtual_asof_utc))
        fail('FUTURE_OR_UNDATED_EVENT');
      ordered.push(e);
    }
    count+=chunk.events.length;
  }
  if(count!==expected_event_count) fail('INCOMPLETE_FRAME');
  // Canonical order is the original source order, not a retrospective ranking.
  const actual=sha(JSON.stringify(ordered));
  if(actual!==expected_frame_sha256) fail('FRAME_DIGEST_MISMATCH');
  return {status:'STRUCTURAL_COVERAGE_ONLY_NOT_PROVEN_HISTORICAL_ORIGIN',
    virtual_asof_utc,event_count:count,chunk_count:chunks.length,
    frame_sha256:actual,complete_count_and_order_verified:true,
    provider_capture_independently_attested:false,
    all_sources_covered:false,model_invocation_permitted:false,
    historical_trades_or_fills_proven:false};
}
