// Chronological interval controller for isolated research. No network or live orders.
// The existing evidence/ledger gates remain authoritative. This is not a GPT scheduler.
import {createHash} from 'node:crypto';
import {inspectPreparedMarket,beginPreparedSession,commitPreparedScan} from './r29-prepared-session.mjs';
import {settleRetrospectivePending} from './r29-retrospective-execution.mjs';
const H=3600000,DAY=24*H,ms=x=>typeof x==='string'?Date.parse(x):NaN,iso=x=>new Date(x).toISOString();
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const valid=x=>Number.isFinite(x);
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const roles=['TEMPO','DISCOVERY','RISK','STRATEGY','QA'];
export function openIntervalSession({preparation,sessionId}={}){
 const {session,preflight}=beginPreparedSession({preparation,sessionId});
 if(!session)return {session:null,preflight};
 const at=ms(session.start_utc);
 return {preflight,session:{...session,kind:'R29_INTERVAL_RESEARCH_SESSION',end_exclusive_utc:iso(at+DAY),interval_start_utc:iso(at),interval_end_utc:iso(at+H),cursor_utc:iso(at),initial_preparation:structuredClone(preparation),interval_history:[],checkpoints:[],coverage_gaps:[],review_count:0}};
}
function guard(s,at,{allowEnd=false}={}){
 const t=ms(at);
 if(s?.kind!=='R29_INTERVAL_RESEARCH_SESSION'||!valid(t)||t<ms(s.cursor_utc)||t<ms(s.interval_start_utc)||t>ms(s.interval_end_utc)||(!allowEnd&&t===ms(s.interval_end_utc))||ms(s.interval_start_utc)>=ms(s.end_exclusive_utc))throw Error('INTERVAL_CLOCK_OUT_OF_ORDER');
 return t;
}
// Every decision uses data that were available at the decision time, not hour end.
// A missing source may be recorded as a gap, never fabricated into a complete input.
export function recordIntervalGap(s,{atUtc,source,reason}={}){
 guard(s,atUtc);if(typeof source!=='string'||!source.trim()||typeof reason!=='string'||!reason.trim())throw Error('INVALID_GAP');
 const next=structuredClone(s);next.cursor_utc=iso(ms(atUtc));next.coverage_gaps.push({at_utc:next.cursor_utc,source,reason});return next;
}
// Reuse the original evidence and execution gates at an arbitrary decision instant.
// A full review can recur inside an hour. Partial role activity is logged outside this
// controller and cannot be promoted to a complete five-role decision.
export function intervalDecisionInput(s,preparation){
 const at=guard(s,preparation.tickUtc);
 const p=inspectPreparedMarket(preparation);
 if(p.status!=='READY_FOR_DECLARED_SCOPE'||p.source_scope!==s.source_scope)throw Error('DECISION_EVIDENCE_NOT_READY');
 if(s.review_count===0&&(at!==ms(s.start_utc)||p.preparation_sha256!==s.preparation_sha256))throw Error('FIRST_REVIEW_NOT_PREPARED_AT_START');
 if(s.scan_history.length&&at<=ms(s.scan_history.at(-1).tick_utc))throw Error('DUPLICATE_OR_BACKDATED_REVIEW');
 // Keep the original source scope immutable; a review cannot silently drop providers.
 if(JSON.stringify([...preparation.requiredSources].sort())!==JSON.stringify([...s.initial_preparation.requiredSources].sort()))throw Error('SOURCE_SCOPE_SHRINK');
 const payload={tick_utc:preparation.tickUtc,preparation_sha256:p.preparation_sha256,candidates:structuredClone(preparation.candidates),portfolio:structuredClone(s.ledger),required_decision_mints:[...new Set([...preparation.candidates.map(c=>c.mint),...Object.keys(s.ledger.positions),...Object.keys(s.ledger.pending)])].sort()};
 return {...payload,input_sha256:sha(payload)};
}
export function commitIntervalDecision({session:s,preparation,roleReviews,decisions}={}){
 const input=intervalDecisionInput(s,preparation);
 // Bind actual decision evidence bytes, not just mint and timestamp, to the frozen
 // candidate. The historical risk/quote verifier still decides whether a model fill is permitted.
 for(const d of decisions||[]){
  if(d.action==='BUY'){
   const c=preparation.candidates.find(c=>c.mint===d.mint);
   if(!digest(c?.entry_input_sha256)||sha(d.entryInput)!==c.entry_input_sha256)throw Error('ENTRY_INPUT_NOT_BOUND_TO_PREPARATION');
  }
  if(d.action==='SELL'){
   const c=preparation.candidates.find(c=>c.mint===d.mint);
   if(!digest(c?.exit_input_sha256)||sha(d.exitInput)!==c.exit_input_sha256)throw Error('EXIT_INPUT_NOT_BOUND_TO_PREPARATION');
  }
 }
 // The prior full-review coordinator shares exactly this hash schema and ledger.
 const compat={...structuredClone(s),kind:'R29_PREPARED_RESEARCH_SESSION',next_tick_utc:preparation.tickUtc};
 const updated=commitPreparedScan({session:compat,preparation,roleReviews,decisions});
 return {...s,ledger:updated.ledger,scan_history:updated.scan_history,cursor_utc:iso(ms(input.tick_utc)),review_count:s.review_count+1};
}
export function settleIntervalSignal(s,input){
 guard(s,input.tickUtc);
 if(ms(input.tickUtc)<=ms(s.ledger.pending[input.mint]?.signal_at_utc))throw Error('FILL_NOT_AFTER_SIGNAL');
 const r=settleRetrospectivePending(s.ledger,input);
 return {session:{...s,ledger:r.ledger,cursor_utc:iso(ms(input.tickUtc))},event:r.event};
}
// Close only at the exact boundary. Lack of evidence does not turn into a successful scan.
// Pending orders and positions continue, no budget reset; next interval owns boundary events.
export function closeWorkInterval(s,{atUtc,coverageStatus,coverageSha256,reason}={}){
 const at=guard(s,atUtc,{allowEnd:true});
 if(at!==ms(s.interval_end_utc)||!['DECLARED_SCOPE_VERIFIED','DATA_GAP'].includes(coverageStatus)||!digest(coverageSha256)||typeof reason!=='string'||!reason.trim())throw Error('INVALID_INTERVAL_CLOSE');
 const reviews=s.scan_history.filter(r=>ms(r.tick_utc)>=ms(s.interval_start_utc)&&ms(r.tick_utc)<at);
 const gaps=s.coverage_gaps.filter(r=>ms(r.at_utc)>=ms(s.interval_start_utc)&&ms(r.at_utc)<at);
 const status=coverageStatus==='DECLARED_SCOPE_VERIFIED'&&reviews.length>0&&gaps.length===0?'REVIEWED_DECLARED_SCOPE':'INCOMPLETE_OR_DATA_GAP';
 const row={start_utc:s.interval_start_utc,end_exclusive_utc:iso(at),status,coverage_sha256:coverageSha256,reason,review_count:reviews.length,gap_count:gaps.length,ledger_sha256:sha(s.ledger),cash_micro:s.ledger.cash_micro,positions:Object.keys(s.ledger.positions).length,pending:Object.keys(s.ledger.pending).length,actual_gpt_runtime_verified:false};
 return {...structuredClone(s),cursor_utc:iso(at),interval_start_utc:iso(at),interval_end_utc:iso(at+H),interval_history:[...s.interval_history,row],finished:at===ms(s.end_exclusive_utc)};
}
// Diagnostic visibility only. No candidate classification, simulated buys, or return estimates.
export function compareVisibilityCadence({minutes,startUtc,endUtc,stepMinutes=5}={}){
 const start=ms(startUtc),end=ms(endUtc),step=stepMinutes*60000;
 if(!valid(start)||!valid(end)||end<=start||start%H||end%H||!Number.isInteger(stepMinutes)||stepMinutes<1||60%stepMinutes)throw Error('INVALID_COMPARISON_WINDOW');
 const known=new Map();
 for(const m of minutes){
  const last=ms(m.last_capture_utc),first=ms(m.first_capture_utc),minute=ms(m.minute_utc);
  if(!valid(last)||!valid(first)||!valid(minute)||first<minute||last<first||last>=minute+60000||typeof m.mint!=='string'||!m.mint)throw Error('INVALID_MINUTE_SOURCE');
  // Whole minute record becomes available only AFTER its end and finality delay.
  const avail=Math.max(last+60000,minute+120000)+1;
  if(first<start||avail>=end)continue;
  const previous=known.get(m.mint);if(previous===undefined||avail<previous)known.set(m.mint,avail);
 }
 const rows=[...known].map(([mint,at])=>{
  const hourly=start+Math.ceil((at-start)/H)*H,frequent=start+Math.ceil((at-start)/step)*step;
  return {mint,available_at_utc:iso(at),hourly_review_at_utc:iso(hourly),interval_review_at_utc:iso(frequent),visibility_gain_seconds:(hourly-frequent)/1000};
 });
 const gains=rows.map(r=>r.visibility_gain_seconds).sort((a,b)=>a-b);
 return {kind:'R29_VISIBILITY_CADENCE_DIAGNOSTIC',start_utc:iso(start),end_exclusive_utc:iso(end),step_minutes:stepMinutes,observed_mints:rows.length,earlier_review_opportunities:rows.filter(r=>r.visibility_gain_seconds>0).length,mean_gain_seconds:gains.length?gains.reduce((s,x)=>s+x,0)/gains.length:null,median_gain_seconds:gains.length?(gains[Math.floor((gains.length-1)/2)]+gains[Math.floor(gains.length/2)])/2:null,max_gain_seconds:gains.at(-1)??null,not_new_launches:true,actual_gpt_reviews:0,trade_count:0,pnl:null,rows};
}
