// R29 strictly causal offline replay. Research-only: never writes orders or balances.
// Events are immutable observations; timestamps must be independently evidenced.
const ms = (v) => typeof v === 'string' && Number.isFinite(Date.parse(v)) ? Date.parse(v) : null;
const validId = (x) => typeof x === 'string' && x.length > 8;
export function validateCausalEvent(e) {
 if (!e || typeof e !== 'object') return 'INVALID_EVENT';
 if (typeof e.chain !== 'string' || !e.chain.trim() || !validId(e.pool) || !validId(e.contract)) return 'IDENTITY_UNKNOWN';
 if (ms(e.available_at_utc) === null || ms(e.published_at_utc) === null || ms(e.captured_at_utc) === null) return 'SOURCE_TIME_UNKNOWN';
 if (ms(e.published_at_utc) > ms(e.available_at_utc) || ms(e.available_at_utc) > ms(e.captured_at_utc)) return 'SOURCE_TIME_CONTRADICTION';
 if (e.source_origin_verified !== true || e.original_bytes_verified !== true) return 'SOURCE_UNVERIFIED';
 if (typeof e.source_blob_sha !== 'string' || !/^[a-f0-9]{40}$/.test(e.source_blob_sha)) return 'SOURCE_BLOB_MISSING';
 if (e.post_event_oracle === true || e.future_label === true) return 'ORACLE_INPUT_FORBIDDEN';
 return null;
}
export function replayCausalResearch({events=[],start_utc='2026-10-12T00:00:00.000Z',end_utc='2026-10-13T00:00:00.000Z',step_minutes=60}={}) {
 const start=ms(start_utc), end=ms(end_utc);
 if(start===null || end===null || end<=start || !Number.isInteger(step_minutes) || step_minutes<1) throw new Error('INVALID_REPLAY_WINDOW');
 const accepted=[],quarantined=[];
 for(const [index,event] of events.entries()) {
  const reason=validateCausalEvent(event);
  if(reason) quarantined.push({index,reason});
  else if(ms(event.available_at_utc)>=end) quarantined.push({index,reason:'AFTER_TEST_WINDOW'});
  else accepted.push({...event,_input_index:index});
 }
 accepted.sort((a,b)=>ms(a.available_at_utc)-ms(b.available_at_utc)||a._input_index-b._input_index);
 const ticks=[];let cursor=0;
 for(let at=start;at<end;at+=step_minutes*60000){
  const newly_available=[];
  while(cursor<accepted.length && ms(accepted[cursor].available_at_utc)<=at) {
   const e=accepted[cursor++];
   newly_available.push({input_index:e._input_index,chain:e.chain,pool:e.pool,contract:e.contract,available_at_utc:e.available_at_utc});
  }
  ticks.push({virtual_time_utc:new Date(at).toISOString(),newly_available,decision:'NO_TRADE',reason:'RESEARCH_ONLY_NO_AUTHENTICATED_ISSUER_SELLABILITY_OR_CLIENT',paper_fills:0});
 }
 return {schema:1,mode:'OFFLINE_CAUSAL_DIAGNOSTIC_ONLY',start_utc:new Date(start).toISOString(),end_utc:new Date(end).toISOString(),ticks,quarantined,accepted_source_count:accepted.length,unused_before_end:accepted.length-cursor,orders_created:0,client_fills_claimed:0,backtest_success_claimed:false,limitations:['No verified historical October market universe supplied by this function','NO_TRADE is not a profitable backtest','No paper fills or execution simulation','Does not infer source availability from OHLCV timestamps']};
}
