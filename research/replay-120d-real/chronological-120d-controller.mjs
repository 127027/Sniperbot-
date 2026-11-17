// R29 GPT-driven 120-day chronological walk-forward controller.
// This module NEVER chooses tokens, forecasts prices, issues wallet orders or
// simulates prices. It schedules externally authored GPT decisions and checks
// evidence. Synthetic unit fixtures are NOT historical trading performance.
import {createHash} from 'node:crypto';
export const TRAIN_START='2026-07-20', HOLDOUT_START='2026-09-18';
export const END_EXCLUSIVE='2026-11-17', START_CASH_TEST_USDC=5000;
const HOUR=3600000, DAY=24*HOUR;
const ALLOWED=new Set([1,4,12,24]);
const sha=x=>createHash('sha256').update(x).digest('hex');
function ensure(x,reason){if(!x)throw Error(reason)}
function ms(x){
 ensure(typeof x==='string'&&x.endsWith('Z')&&Number.isFinite(Date.parse(x)),'INVALID_UTC_TIME');
 return Date.parse(x);
}
const date=x=>new Date(x).toISOString().slice(0,10);
export function chronological120Calendar(){
 const start=Date.parse(TRAIN_START+'T00:00:00Z');
 const days=Array.from({length:120},(_,i)=>{
  const day=date(start+i*DAY);
  return {day_utc:day,index_from_oldest:i+1,
   remaining_days_before_today:120-i,
   phase:i<60?'LEARN_ASOF':'BLIND_TEST',
   starts_at_utc:day+'T00:00:00Z'};
 });
 ensure(days[59].day_utc==='2026-09-17'&&days[60].day_utc===HOLDOUT_START&&
  days[119].day_utc==='2026-11-16','INVALID_120DAY_CALENDAR');
 return days;
}
export function asofVisibleEvidence(e,at){
 const t=ms(at);
 if(!e||typeof e!=='object'||Array.isArray(e))return {valid:false,reason:'SOURCE_MISSING'};
 if(typeof e.source_sha256!=='string'||!/^[a-f0-9]{64}$/i.test(e.source_sha256))
  return {valid:false,reason:'SOURCE_HASH_NOT_PROVEN'};
 const event=ms(e.event_at_utc);
 if(event>t)return {valid:false,reason:'FUTURE_EVENT'};
 if(e.was_available_asof_utc!==true)
  return {valid:false,reason:'RETROSPECTIVE_CAPTURE_NOT_PROVEN_REALTIME'};
 if(typeof e.published_at_utc!=='string')
  return {valid:false,reason:'SOURCE_PUBLICATION_TIME_UNKNOWN'};
 if(ms(e.published_at_utc)>t||ms(e.published_at_utc)<event)
  return {valid:false,reason:'SOURCE_NOT_YET_PUBLISHED_AT_DECISION'};
 return {valid:true,reason:'VERIFIED_ASOF_EVENT_AND_PUBLICATION'};
}
export function dueChronologicalScan({asof_utc,frequency,completed_today=[]}){
 const now=ms(asof_utc),day=date(now);
 ensure(ALLOWED.has(frequency),'INVALID_SCAN_TIER');
 ensure(Array.isArray(completed_today),'INVALID_SCAN_HISTORY');
 const ordered=[...completed_today].sort((a,b)=>ms(a)-ms(b));
 ensure(ordered.length<=24&&ordered.every(t=>date(ms(t))===day&&ms(t)<=now),'INVALID_COMPLETED_SCAN_CLOCK');
 ensure(ordered.every((t,i)=>i===0||ms(t)-ms(ordered[i-1])>=HOUR),'TOO_MANY_FULL_SCANS_PER_HOUR');
 if(ordered.length>=24)return {due:false,reason:'MAX_24_FULL_SCANS'};
 // Frequency is a plan, NOT a lifetime cap: upgrading 4->24 may still
 // allow further scans after the 4th one, provided 1h has elapsed.
 if(ordered.length===0)return {due:true,reason:'FIRST_DAILY_FULL_SCAN'};
 const gap=now-ms(ordered.at(-1)),required=DAY/frequency;
 if(gap<HOUR)return {due:false,reason:'MIN_ONE_HOUR_GAP'};
 if(gap<required)return {due:false,reason:'CURRENT_TIER_INTERVAL_NOT_REACHED'};
 return {due:true,reason:'FREQUENCY_REEVALUATED_ASOF'};
}
export function validateGptReplayTranscript(r,{at,phase}){
 ensure(r?.kind==='GPT_RETROSPECTIVE_MODEL_TRANSCRIPT'&&r.mode==='HISTORICAL_RESEARCH_ONLY',
  'ACTUAL_GPT_TRANSCRIPT_REQUIRED');
 ensure(typeof r.response_text==='string'&&r.response_text.length>0&&
  r.response_sha256===sha(r.response_text),'GPT_TRANSCRIPT_SHA_MISMATCH');
 ensure(ms(r.model_called_at_utc)>=ms(at),'RETRO_MODEL_RUNTIME_BACKDATED');
 ensure(r.virtual_asof_utc===at&&r.original_historical_gpt_execution_claimed===false,
  'HISTORICAL_GPT_EXECUTION_MISREPRESENTED');
 let decisions;
 try{decisions=JSON.parse(r.response_text)}catch{throw Error('INVALID_MODEL_TRANSCRIPT_JSON')}
 ensure(Array.isArray(decisions)&&decisions.length>0,'DECISION_LIST_REQUIRED');
 const actions=new Set(['BUY','HOLD','SELL','WATCH','NO_TRADE']);
 for(const d of decisions){
  ensure(actions.has(d.action),'UNSUPPORTED_GPT_ACTION');
  if(d.action==='BUY'){
   ensure(phase==='BLIND_TEST','TRAINING_BUY_NOT_ALLOWED_IN_TRAINING_PHASE');
   ensure(Number.isFinite(d.requested_test_usdc)&&d.requested_test_usdc>=50&&
    d.requested_test_usdc<=5000,'GPT_RESEARCH_STAKE_INVALID');
   ensure(typeof d.chain==='string'&&typeof d.token_address==='string'&&
    typeof d.pool_address==='string'&&d.pool_address.length>5,
    'UNPINNED_CHAIN_TOKEN_POOL');
  }
 }
 return {decisions,actual_model_run:r.model_called_at_utc,transcript_sha256:r.response_sha256};
}
export function validateOfflineFill(decision,proof,{at,free_test_usdc}){
 ensure(['BUY','SELL'].includes(decision?.action),'EXECUTION_ACTION_REQUIRED');
 ensure(typeof free_test_usdc==='number'&&Number.isFinite(free_test_usdc)&&free_test_usdc>=0,'INVALID_FREE_PAPER_CAPACITY');
 const funds=decision.action==='BUY'?decision.requested_test_usdc:null;
 if(decision.action==='BUY'&&funds>free_test_usdc)
  return {status:'BLOCKED',reason:'BOT_FREE_BUDGET_TOO_LOW',pnl_test_usdc:null};
 if(!proof||proof.status!=='PAPER_FILLED')
  return {status:'UNPROVEN',reason:'MISSING_INDEPENDENT_PAPER_FILL',pnl_test_usdc:null};
 if(proof.historical_reconstruction===true&&proof.source_provenance_verified!==true)
  return {status:'UNPROVEN',reason:'HISTORICAL_SOURCE_NOT_VERIFIED',pnl_test_usdc:null};
 const id=d=>[d.chain,d.token_address,d.pool_address].join(':');
 if(id(proof)!==id(decision)||proof.action!==decision.action||
  typeof proof.fill_id!=='string'||proof.fill_id.length<8)
  return {status:'UNPROVEN',reason:'FILL_IDENTITY_MISMATCH',pnl_test_usdc:null};
 if(!Number.isFinite(proof.filled_test_usdc)||proof.filled_test_usdc<=0||
   !Number.isFinite(proof.fee_test_usdc)||proof.fee_test_usdc<0||
   !Number.isFinite(proof.slippage_test_usdc)||proof.slippage_test_usdc<0||
   ms(proof.filled_at_utc)<ms(at))
  return {status:'UNPROVEN',reason:'FILL_COST_OR_TIME_INVALID',pnl_test_usdc:null};
 if(decision.action==='BUY'&&proof.filled_test_usdc+proof.fee_test_usdc+
  proof.slippage_test_usdc>free_test_usdc)
  return {status:'BLOCKED',reason:'ACTUAL_COST_EXCEEDS_FREE_FUNDS',pnl_test_usdc:null};
 // No implicit profit. A closed PnL requires matched entry+exit lots in
 // a separate verified portfolio ledger.
 return {status:'RECONSTRUCTED_PAPER_FILLED_ONLY',reason:'QUOTE_PROOF_ACCEPTED_NO_PNL_IMPLIED',
  filled_test_usdc:proof.filled_test_usdc,fees_test_usdc:proof.fee_test_usdc,
  slippage_test_usdc:proof.slippage_test_usdc,pnl_test_usdc:null};
}
export function validateLearningEvent(e,{at,previous=[],phase}){
 ensure(['LEARN_ASOF','BLIND_TEST'].includes(phase),'INVALID_PHASE');
 ensure(e?.kind==='OUTCOME'&&typeof e.decision_id==='string','OUTCOME_EVENT_REQUIRED');
 const t=ms(at),reveal=ms(e.revealed_at_utc),original=ms(e.original_decision_at_utc);
 ensure(original<=reveal&&reveal<=t,'FUTURE_OUTCOME_LEAK');
 ensure(e.was_attributed_to_prior_decision===true,'UNATTRIBUTED_OUTCOME');
 ensure(typeof e.source_sha256==='string'&&/^[a-f0-9]{64}$/i.test(e.source_sha256),
  'OUTCOME_SOURCE_HASH_REQUIRED');
 ensure(Array.isArray(previous)&&!previous.some(p=>p.decision_id===e.decision_id&&
  p.revealed_at_utc===e.revealed_at_utc),'DUPLICATE_LESSON');
 return {kind:'EXPERIENCE',decision_id:e.decision_id,source_sha256:e.source_sha256,
  revealed_at_utc:e.revealed_at_utc,available_only_after_utc:e.revealed_at_utc,
  category:e.category||'UNKNOWN',
  changed_original_decision:false,may_not_retroactively_tune_prior_holdout:true};
}
export function build120dSourceLedger(matrixCsv,launch120Csv){
 ensure(typeof launch120Csv==='string'&&launch120Csv.trim(),'REQUIRE_120_DAY_NEUTRAL_LAUNCH_MATRIX');
 const [lhead,...llines]=launch120Csv.trim().split(/\\r?\\n/),lcols=lhead.split(',');
 ensure(['date','phase','captured_launch_count','raw_parquet_sha256'].every(x=>lcols.includes(x)),
  'MISSING_120_DAY_LAUNCH_COLUMNS');
 const launches=new Map();
 for(const line of llines){
  const cells=line.split(',');
  ensure(cells.length===lcols.length,'MALFORMED_120_DAY_LAUNCH_ROW');
  const row=Object.fromEntries(lcols.map((k,i)=>[k,cells[i]]));
  ensure(!launches.has(row.date),'DUPLICATE_120_DAY_LAUNCH_DATE');
  launches.set(row.date,row);
 }
 ensure(launches.size===120,'EXPECTED_120_DAY_LAUNCH_MATRIX');
 const [header,...lines]=matrixCsv.trim().split(/\r?\n/),cols=header.split(',');
 ensure(['day_utc','minute_feature_sha256','historic_launch_source_sha256',
  'recorded_full_day_swaps_for_neutral_group'].every(x=>cols.includes(x)),
  'MISSING_HOLDOUT_MATRIX_FIELDS');
 const rows=new Map();
 for(const line of lines){
  const fields=line.split(',');
  ensure(fields.length===cols.length,'INVALID_HOLDOUT_ROW');
  const r=Object.fromEntries(cols.map((k,i)=>[k,fields[i]]));
  ensure(!rows.has(r.day_utc),'DUPLICATE_HOLDOUT_DAY');rows.set(r.day_utc,r);
 }
 ensure(rows.size===60,'EXPECTED_60_HOLDOUT_DAYS');
 const days=chronological120Calendar().map(d=>{
  const l=launches.get(d.day_utc);
  ensure(l&&l.phase===(d.phase==='LEARN_ASOF'?'TRAIN_60_DAYS':'HOLDOUT_60_DAYS'),
   'MISALIGNED_120_DAY_LAUNCH_MATRIX');
  const launchProof=/^[a-f0-9]{64}$/i.test(l.raw_parquet_sha256)&&
   Number.isSafeInteger(Number(l.captured_launch_count))&&Number(l.captured_launch_count)>0;
  if(d.phase==='LEARN_ASOF')return {...d,
   launch_event_available:launchProof?'RETROSPECTIVE_LAUNCH_IDENTITIES_ONLY':'DATA_GAP',
   launch_source_sha256:launchProof?l.raw_parquet_sha256:null,
   memecoin_minute_frames:'DATA_GAP',dex_costed_quotes:'DATA_GAP',
   gpt_decisions:'NOT_EVIDENCED',trading_pnl:'UNKNOWN',
   remark:'TRAINING_LAUNCHES_ARE_HISTORICAL_EVENTS_NOT_REALTIME_DECISIONS'};
  const r=rows.get(d.day_utc);ensure(r,'HOLDOUT_DAY_MISSING');
  ensure(Boolean(r.historic_launch_source_sha256)===launchProof,
   'HOLDOUT_LAUNCH_COVERAGE_DISAGREES_WITH_NEUTRAL_120D_MATRIX');
  return {...d,launch_event_available:r.historic_launch_source_sha256?'RETROSPECTIVE_EVENT_ARCHIVED':'DATA_GAP',
   memecoin_minute_frames:r.minute_feature_sha256?'RETROSPECTIVE_FEATURE_ARCHIVED_NOT_REALTIME_PROVEN':'DATA_GAP',
   dex_costed_quotes:r.recorded_full_day_swaps_for_neutral_group?'THIRD_PARTY_TRADES_NOT_EXECUTABLE_QUOTES':'DATA_GAP',
   gpt_decisions:'NOT_EVIDENCED',trading_pnl:'UNKNOWN'};
 });
 return {schema:'r29_120d_walkforward_asof_readiness.v1',
  days,train_days:60,test_days:60,
  train_days_with_retro_launch_identities:days.filter(x=>x.phase==='LEARN_ASOF'&&x.launch_event_available.startsWith('RETROSPECTIVE')).length,
  train_days_with_realtime_proven_memecoin_frames:0,
  test_days_with_retrospective_minute_frames:days.filter(x=>x.phase==='BLIND_TEST'&&x.memecoin_minute_frames.startsWith('RETROSPECTIVE')).length,
  actual_gpt_decision_walkforward_complete:false,
  actual_gpt_buy_hold_sell_pnl_test_usdc:null,
  note:'120-day timeline constructed from the 60-day holdout matrix; training includes SHA-audited retrospective launch identities only. The chronologic engine requires actual time-available evidence and GPT transcripts.'};
}
