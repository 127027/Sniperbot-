// UTC hourly capture tracking. A requested hour is NOT a completed scan.
// Late retrieval never backdates the knowledge time of a live market observation.
const ms=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
const hour=3600000,iso=x=>new Date(x).toISOString();
export function hourlyCaptureDay(day){
 const t=ms(day+'T00:00:00Z');
 if(t===null||iso(t).slice(0,10)!==day)throw Error('INVALID_CAPTURE_DAY');
 return {schema:1,kind:'R29_24_HOUR_CAPTURE_SLOT_LEDGER',day_utc:day,slots:Array.from({length:24},(_,i)=>({slot_utc:iso(t+i*hour),attempts:[]})),full_market_coverage_proven:false,actual_gpt_reviews:0,orders_authorized:0};
}
function checked(state){
 const expected=hourlyCaptureDay(state?.day_utc);
 if(state?.kind!==expected.kind||state.schema!==1||state.slots?.length!==24||state.slots.some((x,i)=>x.slot_utc!==expected.slots[i].slot_utc||!Array.isArray(x.attempts)))throw Error('INVALID_CAPTURE_SLOT_LEDGER');
 return structuredClone(state);
}
export function startHourlyCapture(state,{requestedAtUtc,startedAtUtc,runId,requestCommit,stateCommit}={}){
 const next=checked(state),requested=ms(requestedAtUtc),started=ms(startedAtUtc);
 if(requested===null||started===null||started<requested||iso(requested).slice(0,10)!==state.day_utc||!/^\d+$/.test(runId||'')||![requestCommit,stateCommit].every(x=>/^[a-f0-9]{40}$/.test(x||''))||next.slots.some(s=>s.attempts.some(a=>a.run_id===runId)))throw Error('INVALID_OR_DUPLICATE_CAPTURE_SLOT_ATTEMPT');
 const slot=next.slots[new Date(requested).getUTCHours()];
 slot.attempts.push({run_id:runId,requested_at_utc:iso(requested),actual_started_at_utc:iso(started),request_commit:requestCommit,state_commit:stateCommit,late_start:started>=ms(slot.slot_utc)+hour,status:'STARTED',actual_completed_at_utc:null,knowledge_backdated:false});
 return next;
}
export function finishHourlyCapture(state,{runId,completedAtUtc,sampleVerdict,evidencePath}={}){
 const next=checked(state),end=ms(completedAtUtc),a=next.slots.flatMap(s=>s.attempts).find(a=>a.run_id===runId);
 if(!a||a.status!=='STARTED'||end===null||end<ms(a.actual_started_at_utc)||typeof sampleVerdict?.status!=='string'||typeof sampleVerdict?.workflow_may_report_success!=='boolean'||typeof evidencePath!=='string'||!/^research\/feeds\/\d{4}-\d{2}-\d{2}\/\d+\/capture-completion-verdict\.json$/.test(evidencePath))throw Error('INVALID_CAPTURE_SLOT_COMPLETION');
 a.actual_completed_at_utc=iso(end);a.status=sampleVerdict.workflow_may_report_success?'REQUESTED_SAMPLE_COMPLETED':'PARTIAL_OR_FAILED_SAMPLE';a.sample_status=sampleVerdict.status;a.completion_evidence_path=evidencePath;
 return next;
}
export function summarizeHourlyCaptureDay(state,asOfUtc){
 const next=checked(state),at=ms(asOfUtc);if(at===null)throw Error('INVALID_CAPTURE_SUMMARY_TIME');
 const slots=next.slots.map(s=>{
  const started=s.attempts.filter(a=>ms(a.actual_started_at_utc)<=at),completed=started.filter(a=>a.actual_completed_at_utc&&ms(a.actual_completed_at_utc)<=at);
  const onTime=completed.some(a=>a.status==='REQUESTED_SAMPLE_COMPLETED'&&!a.late_start&&ms(a.actual_completed_at_utc)<ms(s.slot_utc)+hour);
  const status=onTime?'ON_TIME_REQUESTED_SAMPLE_COMPLETED':completed.length?'LATE_OR_PARTIAL_SAMPLE':started.length?'STARTED_NOT_FINALIZED':ms(s.slot_utc)+hour<=at?'NO_RECORDED_CAPTURE':ms(s.slot_utc)<=at?'DUE':'FUTURE';
  return {slot_utc:s.slot_utc,status,attempt_count:started.length};
 });
 return {day_utc:next.day_utc,planned_slots:24,slots,missing_slots:slots.filter(s=>s.status==='NO_RECORDED_CAPTURE').map(s=>s.slot_utc),full_market_coverage_proven:false,actual_gpt_reviews:0};
}
