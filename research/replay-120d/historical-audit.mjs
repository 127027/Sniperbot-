// R29 120-day temporal audit: ONLY source-supported historical outcomes.
// No network access, no private account, no live GitHub trading channel.
// Missing history is DATA_GAP (not NO_TRADE, a zero-P&L, or a GPT call).
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const START='2026-07-20T00:00:00Z';
export const PHASE_B='2026-09-18T00:00:00Z';
export const END_EXCLUSIVE='2026-11-17T00:00:00Z';
export const DEFAULT_CUTOFF='2026-11-16T08:10:00Z';
export const INITIAL_TEST_USDC=5000;
export const EVIDENCE_GATES=Object.freeze([
 'INDEPENDENT_ASOF_POOL_UNIVERSE','INDEPENDENT_ASOF_DEX_MARKET',
 'ASOF_CONTRACT_AND_SELLABILITY','ASOF_ORGANIC_SOCIAL_WALLETS',
 'NEXT_EXECUTABLE_DEX_QUOTE'
]);
export const FREQS=[1,4,12,24];
const ms=s=>Date.parse(s);
const utc=n=>new Date(n).toISOString();
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=p=>JSON.parse(readFileSync(path.join(root,p),'utf8'));
const isUtc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(ms(s));
const unique=a=>new Set(a).size===a.length;

export function dayPlan({cutoff=DEFAULT_CUTOFF}={}){
 if(!isUtc(cutoff)||ms(cutoff)<ms(PHASE_B)||ms(cutoff)>=ms(END_EXCLUSIVE))
  throw Error('REPLAY_120D_CUTOFF_INVALID');
 const out=[];
 for(let at=ms(START),i=0;at<ms(END_EXCLUSIVE);at+=86400000,i++){
  const phase=at<ms(PHASE_B)?'A_TRAIN_OBSERVE':'B_FROZEN_HOLDOUT';
  const stop=Math.min(at+86400000,ms(cutoff));
  const elapsed=Math.max(0,stop-at);
  out.push({index:i+1,date:utc(at).slice(0,10),phase,
   day_start_utc:utc(at),day_end_exclusive_utc:utc(at+86400000),
   asof_cutoff_exclusive_utc:utc(Math.max(at,stop)),
   elapsed_hours:Math.round(elapsed/3600000*1000)/1000,
   complete_day:elapsed===86400000});
 }
 if(out.length!==120||out.filter(d=>d.phase==='A_TRAIN_OBSERVE').length!==60||
  out.filter(d=>d.phase==='B_FROZEN_HOLDOUT').length!==60)
  throw Error('REPLAY_120D_CALENDAR_BROKEN');
 return out;
}
export function frequencyFromEvidence(e,{at}={}){
 if(!isUtc(at))throw Error('REPLAY_FREQUENCY_CLOCK_INVALID');
 if(!e)return {frequency_per_day:1,evidence_status:'NO_VERIFIED_ACTIVITY_USE_MINIMAL_DIAGNOSTIC_CADENCE'};
 const have=['observed_at_utc','source_id','unique_buyers',
  'new_pools','minute_volume_change_pct'];
 if(have.some(k=>!(k in e))||!isUtc(e.observed_at_utc)||
  ms(e.observed_at_utc)>ms(at)||
  ms(at)-ms(e.observed_at_utc)>6*3600000||
  e.independently_attested!==true||
  !Number.isInteger(e.unique_buyers)||e.unique_buyers<0||
  !Number.isInteger(e.new_pools)||e.new_pools<0||
  !Number.isFinite(e.minute_volume_change_pct)||
  typeof e.source_id!=='string'||!e.source_id)
  return {frequency_per_day:1,evidence_status:'INVALID_OR_FUTURE_ACTIVITY_USE_MINIMAL_DIAGNOSTIC_CADENCE'};
 const score=e.unique_buyers+2*e.new_pools+
  Math.max(0,e.minute_volume_change_pct)/4;
 const frequency=score>=300?24:score>=110?12:score>=30?4:1;
 return {frequency_per_day:frequency,evidence_status:'TIME_VERIFIED_ACTIVITY_SYNTHETIC_OR_EXTERNALLY_ATTESTED',signal_score:score};
}
export function slotsForDay(day,freq){
 if(!FREQS.includes(freq))throw Error('REPLAY_FREQUENCY_INVALID');
 const step=24/freq;
 const start=ms(day.day_start_utc),stop=ms(day.asof_cutoff_exclusive_utc);
 return Array.from({length:freq},(_,i)=>start+i*step*3600000)
  .filter(t=>t<stop).map(utc);
}
export function asofOnly(events,at){
 if(!isUtc(at)||!Array.isArray(events)||events.length>100000)throw Error('REPLAY_ASOF_INPUT_INVALID');
 return events.filter(e=>isUtc(e?.event_at_utc)&&isUtc(e?.available_at_utc)&&
  isUtc(e?.independent_proof_at_utc)&&
  ms(e.event_at_utc)<=ms(e.available_at_utc)&&
  ms(e.available_at_utc)<=ms(at)&&
  ms(e.independent_proof_at_utc)<=ms(at)&&
  e.independent_provenance_verified===true);
}
export function independentlyTradeable(events,at){
 const visible=asofOnly(events,at);
 if(!unique(visible.map(x=>x.evidence_id)))throw Error('REPLAY_DUPLICATE_EVIDENCE_ID');
 return EVIDENCE_GATES.every(tag=>visible.some(x=>x.category===tag));
}
export function archivePaths(){
 return [
 'research/r29/gpt-decisions/2026-11-15/gpt_20261115181100000000000000000000.json',
 'research/r29/gpt-decisions/2026-11-15/gpt_20261115202656515000000000000000.json',
 'research/r29/gpt-decisions/2026-11-15/gpt_6476b4950516ef13b4ddb335aadbe26d.json',
 'research/r29/gpt-decisions/2026-11-15/gpt_f48c5af973df4651892013888fb76609.json',
 'research/r29/gpt-decisions/2026-11-16/gpt_0b1d0fefcf484f6d8f578ba1c7962800.json',
 'research/r29/gpt-decisions/2026-11-16/gpt_20261116044500942000000000000000.json',
 'research/r29/gpt-decisions/2026-11-16/gpt_20261116072434302000000000000000.json',
 'research/r29/gpt-decisions/2026-11-16/gpt_4c4df2bfbbdc7378eb1ebde34ee529dd.json',
 'research/r29/gpt-decisions/2026-11-16/gpt_db791ec8c8b445958199aa99d5a15911.json'
 ];
}
export function observeActualArchive({cutoff=DEFAULT_CUTOFF}={}){
 const rows=archivePaths().map(p=>{
  const d=json(p);
  if(!/^gpt_[0-9a-f]{32}$/.test(d.decision_id)||!p.endsWith(d.decision_id+'.json')||
   !isUtc(d.created_at_utc)||!isUtc(d.source_observed_at_utc)||
   ms(d.source_observed_at_utc)>ms(d.created_at_utc)||
   !['BUY','SELL','WATCH','HOLD','NO_TRADE'].includes(d.action))
    throw Error('REPLAY_ACTUAL_ARCHIVE_INVALID:'+p);
  return {path:p,decision_id:d.decision_id,action:d.action,
   created_at_utc:d.created_at_utc,source_observed_at_utc:d.source_observed_at_utc,
   security_assessment:d.security_assessment,
   record_sha256:createHash('sha256').update(JSON.stringify(d,null,2)+'\n').digest('hex'),
   actual_logged_decision:true,proved_model_identity:false,
   proved_market_fill:false};
 }).filter(r=>ms(r.created_at_utc)<=ms(cutoff));
 return rows.sort((a,b)=>a.created_at_utc.localeCompare(b.created_at_utc));
}
export function auditHistorical({cutoff=DEFAULT_CUTOFF}={}){
 const days=dayPlan({cutoff});
 const r27=json('research/r27/results/summary.json');
 const r30=json('research/r30/results/summary.json');
 const manifest=json('research/r30/results/source-manifest.json');
 const sourceAudit=json('research/replay-controller/reports/r22-source-audit.json');
 const localSnapshot=json('research/market/latest.json');
 const first=json('research/r29/channel/dynamic-research-status.json');
 if(r27.source_probe?.contemporaneous_verified!==0||
  r27.input?.accepted_records!==0||
  r30.full_research_evidence?.some(x=>x.completed_verified_multisource_scans!==0)||
  manifest.source!=='PUBLIC_BINANCE_SPOT_HOURLY_USDT_NOT_ONCHAIN'||
  manifest.cohort_selection!=='13_RETROSPECTIVELY_NAMED_CEX_LISTINGS_NOT_NEW_TOKENS'||
  sourceAudit.independent_provenance_verified!==false||
  localSnapshot.schema!=='research_market_snapshot.v1'||
  localSnapshot.actionable!==false||
  !isUtc(first.first_seen_at_utc))
  throw Error('REPLAY_SOURCE_MANIFEST_CHANGED_REAUDIT_REQUIRED');
 const actual=observeActualArchive({cutoff});
 const byDay=new Map();
 for(const x of actual){
  const date=x.created_at_utc.slice(0,10);
  byDay.set(date,[...(byDay.get(date)||[]),x]);
 }
 const sourceCoverage=[
  {source:'R27_SOURCE_PROBE',path:'research/r27/results/summary.json',
   period:r27.window,status:'ASOF_FULL_MARKET_VERIFICATION_UNAVAILABLE',
   independently_verified_complete_scans:0},
  {source:'R30_RETROSPECTIVE_BINANCE_CEX_HOURLY_PROXY',
   path:'research/r30/results/source-manifest.json',
   period:manifest.period,complete_cex_symbols:Object.values(manifest.symbols).filter(x=>x.status==='COMPLETE').length,
   independently_verified_complete_scans:0,allow_live_buy_signals:false},
  {source:'R22_2023_SINGLE_WINNER_DIAGNOSTIC',
   path:'research/replay-controller/reports/r22-source-audit.json',
   status:'NOT_2026_AND_WINNER_SELECTED',independently_verified_complete_scans:0},
  {source:'R29_LOCAL_SPOT_SNAPSHOT',
   path:'research/market/latest.json',
   observed_at_utc:localSnapshot.published_at_utc,
   status:'SINGLE_READ_ONLY_LOCAL_SNAPSHOT_NO_HISTORIC_SOCIAL_OR_SELLABILITY',
   independently_verified_complete_scans:0},
  {source:'R29_REAL_RESEARCH_START',
   path:'research/r29/channel/dynamic-research-status.json',
   first_seen_at_utc:first.first_seen_at_utc,
   status:'FORWARD_RESEARCH_NOT_120D_HISTORICAL_COVERAGE',
   independently_verified_complete_scans:0}
 ];
 const daily=days.map(d=>{
  const records=byDay.get(d.date)||[];
  // No independent point-in-time multi-source dataset exists for a historic
  // discovery+SELL simulation. Not even one "NO_TRADE" can be invented.
  const slots=slotsForDay(d,1);
  return {...d,
   adaptive_frequency_per_day:null,
   fallback_diagnostic_slots_utc:slots,
   fallback_diagnostic_slot_count:slots.length,
   verified_historical_market_scans:0,
   reconstructed_historical_gpt_model_calls:0,
   executed_backtest_buy_count:null,
   executed_backtest_sell_count:null,
   executed_backtest_hold_count:null,
   executed_backtest_watch_count:null,
   historical_paper_position_count:null,
   historical_pnl_test_usdc:null,
   asof_market_security_social_execution_complete:false,
   authenticated_github_model_identity_proven:false,
   archived_actual_gpt_decisions:records.map(x=>({
     decision_id:x.decision_id,action:x.action,created_at_utc:x.created_at_utc,
     origin:'RECORDED_ON_ACTUAL_DAY_NOT_BACKTEST'})),
   status:d.elapsed_hours>0?'DATA_GAP_NO_FULL_ASOF_COHORT':
    'FUTURE_DAY_EXCLUDED_BY_CUTOFF'};
 });
 return {schema:'sniper_r29_120d_historical_audit.v1',
  cutoff_utc:cutoff,period:{start:START,end_exclusive:END_EXCLUSIVE,
   train_start:START,train_end_exclusive:PHASE_B,
   holdout_start:PHASE_B,holdout_end_exclusive:END_EXCLUSIVE,
   days:120,train_days:60,holdout_days:60},
  mode:'PAPER_RESEARCH_ONLY',real_trading_enabled:false,
  user_paper_account_untouched:true,
  methodology:'STRICT_POINT_IN_TIME_ABSTENTION_IF_EVIDENCE_MISSING',
  source_coverage:sourceCoverage,
  known_actual_github_decisions:actual,
  historical_verified_complete_scans:0,
  historical_model_calls_simulated_as_real:0,
  historical_gpt_buy_fills_verified:0,
  historical_gpt_sell_fills_verified:0,
  historical_gpt_pnl_test_usdc:null,
  hypothetical_buy_count:null,hypothetical_sell_count:null,
  crypto_strategy_was_profitable:null,
  actual_archived_decisions:actual.length,
  actual_archived_no_trade:actual.filter(x=>x.action==='NO_TRADE').length,
  period_days_with_actual_archives:new Set(actual.map(x=>x.created_at_utc.slice(0,10))).size,
  tests_that_can_run:'SYNTHETIC_MECHANICS_ONLY_NOT_HISTORICAL_GPT_BACKTEST',
  daily,
  conclusion:'NO_VALID_120D_GPT_TRADE_BACKTEST_WITHOUT_HISTORIC_ASOF_COINS_SOCIAL_SECURITY_AND_QUOTES'};
}
