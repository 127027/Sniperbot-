// Strict anti-lookahead readiness checks for future historical meme-launch replay.
// The owner's 2013-2026 workbook contains selected launches, ATH and some
// before/after prices, but not uniformly timestamped chain/pool identifiers,
// full failed-launch cohorts or archived AS-OF source evidence. No score from
// that workbook is a valid retrospective detection hit without the missing data.
import {candidateId} from './research-watchlist.mjs';

const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const time=s=>typeof s==='string'?Date.parse(s):NaN;
export function auditHistoricalReplayCase(row,{now=Date.now()}={}){
 const reasons=[];
 if(!row||typeof row!=='object')throw Error('REPLAY_CASE_REQUIRED');
 let id=null;
 try{id=candidateId(row.chain,row.token_address,row.pool_address)}catch{
  reasons.push('MISSING_VERIFIED_CHAIN_TOKEN_POOL');
 }
 if(id&&row.candidate_id!==id)reasons.push('IDENTITY_COLLISION');
 const launch=time(row.pool_created_at_utc),pump=time(row.first_breakout_at_utc);
 if(!Number.isFinite(launch)||!Number.isFinite(pump)||pump<=launch||pump>now)
  reasons.push('MISSING_EVENT_TIME_SEQUENCE');
 if(!positive(row.reference_entry_price_usd)||!positive(row.peak_within_window_usd))
  reasons.push('NO_PRE_EVENT_PRICE_AND_WINDOWED_PEAK');
 if(!Array.isArray(row.pre_event_evidence)||!row.pre_event_evidence.length)
  reasons.push('NO_ARCHIVED_PRE_HYPE_EVIDENCE');
 if(row.complete_launch_cohort!==true)reasons.push('SURVIVORSHIP_BIAS_NO_COMPLETE_COHORT');
 if(row.independent_sources_verified!==true)reasons.push('NO_INDEPENDENT_SOURCE_PROOF');
 if(row.sellable_quote_at_entry!==true)reasons.push('NO_REALISTIC_ENTRY_AND_SELL_CAPACITY');
 const eligible=Array.isArray(row.pre_event_evidence)?row.pre_event_evidence.filter(e=>{
  const published=time(e?.public_at_utc),observed=time(e?.captured_at_utc);
  return typeof e?.source_url==='string'&&/^https:\/\/[^\s@/]+/.test(e.source_url)&&
   Number.isFinite(published)&&Number.isFinite(observed)&&
   Number.isFinite(launch)&&Number.isFinite(pump)&&
   launch<=published&&published<=observed&&observed<pump&&
   e.independently_verified===true;
 }):[];
 if(Array.isArray(row.pre_event_evidence)&&row.pre_event_evidence.length>0&&!eligible.length)
  reasons.push('NO_INDEPENDENTLY_DATED_PRE_BREAKOUT_TRIGGER');
 const ready=reasons.length===0;
 return {candidate_id:id,case_label:typeof row.label==='string'?row.label.slice(0,90):'',
  status:ready?'REPLAY_READY_NOT_PROOF_OF_PREDICTION':'UNTESTABLE_MISSING_DATA',
  independent_triggers_before_breakout:eligible.length,
  blocking_reasons:reasons,
  hypothetical_price_multiple:ready?
    Math.round(row.peak_within_window_usd/row.reference_entry_price_usd*100)/100:null,
  breakout_hit_before_move:null,
  profitable_exit_verified:false,paper_only:true,actionable:false};
}
export function auditHistoricalReplayCases(rows,{now=Date.now()}={}){
 if(!Array.isArray(rows)||rows.length>10000)throw Error('INVALID_REPLAY_CASE_BATCH');
 const items=rows.map(r=>auditHistoricalReplayCase(r,{now}));
 return {schema:'historical_replay_readiness.v1',paper_only:true,actionable:false,
  total:items.length,ready:items.filter(r=>r.status==='REPLAY_READY_NOT_PROOF_OF_PREDICTION').length,
  untestable:items.filter(r=>r.status==='UNTESTABLE_MISSING_DATA').length,items,
  warning:'Readiness only, not a genuine historical trading replay or a profitable-prediction score. Actual replay requires archived as-of news, onchain, social, failures and executable historical liquidity.'};
}
