import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chronological120Calendar,asofVisibleEvidence,dueChronologicalScan,validateGptReplayTranscript,validateLearningEvent,validateOfflineFill,build120dSourceLedger} from './chronological-120d-controller.mjs';
const hash='a'.repeat(64);
const iso=(i)=>new Date(Date.UTC(2026,8,18+i)).toISOString().slice(0,10);
const csv=['day_utc,historic_launch_source_sha256,minute_feature_sha256,recorded_full_day_swaps_for_neutral_group',
 ...Array.from({length:60},(_,i)=>[iso(i),i<49?hash:'',i>=6&&i<49?hash:'',i===27?'48_mints_28112_events':''].join(','))].join('\n');
test('120 chronological days: 60 train strictly preceding 60 blind test',()=>{
 const d=chronological120Calendar();
 assert.equal(d.length,120);
 assert.equal(d[0].day_utc,'2026-07-20');
 assert.equal(d[59].day_utc,'2026-09-17');
 assert.equal(d[60].day_utc,'2026-09-18');
 assert.equal(d[119].day_utc,'2026-11-16');
 assert.equal(d[0].remaining_days_before_today,120);
 assert.equal(d[59].remaining_days_before_today,61);
 assert.equal(d[60].remaining_days_before_today,60);
 assert.equal(d[119].remaining_days_before_today,1);
});
test('120-day ledger honestly distinguishes missing training and incomplete holdout',()=>{
 const r=build120dSourceLedger(csv);
 assert.equal(r.days.length,120);
 assert.equal(r.train_days_with_realtime_proven_memecoin_frames,0);
 assert.equal(r.test_days_with_retrospective_minute_frames,43);
 assert.equal(r.actual_gpt_buy_hold_sell_pnl_test_usdc,null);
 assert.equal(r.days[0].trading_pnl,'UNKNOWN');
 assert.equal(r.days[119].trading_pnl,'UNKNOWN');
});
test('real source availability after virtual scan is blocked even with older onchain event',()=>{
 const asof='2026-10-15T12:00:00Z';
 assert.equal(asofVisibleEvidence({event_at_utc:'2026-10-15T11:58:00Z',
 published_at_utc:'2026-11-16T11:59:00Z',was_available_asof_utc:true,
 source_sha256:hash},asof).reason,'SOURCE_NOT_YET_PUBLISHED_AT_DECISION');
 assert.equal(asofVisibleEvidence({event_at_utc:'2026-10-15T11:58:00Z',
 published_at_utc:'2026-10-15T11:59:00Z',was_available_asof_utc:false,
 source_sha256:hash},asof).valid,false);
 assert.equal(asofVisibleEvidence({event_at_utc:'2026-10-15T11:58:00Z',
 published_at_utc:'2026-10-15T11:59:00Z',was_available_asof_utc:true,
 source_sha256:hash},asof).valid,true);
});
test('dynamic frequency can upgrade from 4/day after third scan to hourly',()=>{
 const scans=['2026-10-15T00:00:00Z','2026-10-15T06:00:00Z','2026-10-15T12:00:00Z'];
 assert.equal(dueChronologicalScan({asof_utc:'2026-10-15T13:00:00Z',frequency:4,completed_today:scans}).due,false);
 assert.equal(dueChronologicalScan({asof_utc:'2026-10-15T13:00:00Z',frequency:24,completed_today:scans}).due,true);
 const all=Array.from({length:24},(_,i)=>'2026-10-15T'+String(i).padStart(2,'0')+':00:00Z');
 assert.equal(dueChronologicalScan({asof_utc:'2026-10-15T23:59:00Z',frequency:24,completed_today:all}).due,false);
});
test('no pre-decision experience may be created using tomorrow\'s outcome',()=>{
 const context={at:'2026-10-15T12:00:00Z',phase:'LEARN_ASOF'};
 const event={kind:'OUTCOME',decision_id:'gpt_1',
 original_decision_at_utc:'2026-10-14T12:00:00Z',
 revealed_at_utc:'2026-10-16T12:00:00Z',source_sha256:hash,
 was_attributed_to_prior_decision:true};
 assert.throws(()=>validateLearningEvent(event,context),/FUTURE_OUTCOME/);
 const lesson=validateLearningEvent({...event,revealed_at_utc:'2026-10-15T10:00:00Z'},context);
 assert.equal(lesson.changed_original_decision,false);
 assert.equal(lesson.category,'UNKNOWN');
});
test('only actual GPT replay transcript hash is accepted, not deterministic rule output',()=>{
 const at='2026-10-15T12:00:00Z',dec=[{action:'NO_TRADE',reason:'insufficient source'}];
 const response_text=JSON.stringify(dec);
 const record={kind:'GPT_RETROSPECTIVE_MODEL_TRANSCRIPT',mode:'HISTORICAL_RESEARCH_ONLY',
  response_text,response_sha256:createHash('sha256').update(response_text).digest('hex'),
  virtual_asof_utc:at,model_called_at_utc:'2026-11-17T09:00:00Z',
  original_historical_gpt_execution_claimed:false};
 assert.equal(validateGptReplayTranscript(record,{at,phase:'BLIND_TEST'}).decisions[0].action,'NO_TRADE');
 assert.throws(()=>validateGptReplayTranscript({...record,model_called_at_utc:'2026-10-14T09:00:00Z'},
 {at,phase:'BLIND_TEST'}),/RUNTIME_BACKDATED/);
 assert.throws(()=>validateGptReplayTranscript({...record,kind:'DETERMINISTIC_RULE'},{at,phase:'BLIND_TEST'}),
  /GPT_TRANSCRIPT_REQUIRED/);
});
test('GPT BUY is only a proposal until proof with full costs, cannot overspend free budget',()=>{
 const d={action:'BUY',requested_test_usdc:500,chain:'solana',token_address:'mint',pool_address:'pool123456'};
 assert.deepEqual(validateOfflineFill(d,null,{at:'2026-10-15T12:00:00Z',free_test_usdc:5000}),
  {status:'UNPROVEN',reason:'MISSING_INDEPENDENT_PAPER_FILL',pnl_test_usdc:null});
 assert.equal(validateOfflineFill(d,null,{at:'2026-10-15T12:00:00Z',free_test_usdc:499}).reason,'BOT_FREE_BUDGET_TOO_LOW');
 const p={...d,action:'BUY',status:'PAPER_FILLED',fill_id:'fill-test-only-1',
  historical_reconstruction:true,source_provenance_verified:true,filled_test_usdc:499,
  fee_test_usdc:1.5,slippage_test_usdc:0.1,filled_at_utc:'2026-10-15T12:01:00Z'};
 assert.equal(validateOfflineFill(d,p,{at:'2026-10-15T12:00:00Z',free_test_usdc:500}).reason,
  'ACTUAL_COST_EXCEEDS_FREE_FUNDS');
 assert.equal(validateOfflineFill(d,p,{at:'2026-10-15T12:00:00Z',free_test_usdc:501}).pnl_test_usdc,null);
});
