import test from 'node:test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {dayPlan,frequencyFromEvidence,slotsForDay,asofOnly,
 independentlyTradeable,auditHistorical,observeActualArchive,
 EVIDENCE_GATES,DEFAULT_CUTOFF,PHASE_B} from './historical-audit.mjs';
import {runSyntheticMechanics,makeFixtureGithubPaperBridge,
 IS_SYNTHETIC_ONLY} from './mechanics-fixture.mjs';

const day=dayPlan()[70];
const observed=day.day_start_utc;
const validSignal={
 source_id:'TEST_TIME_VERIFIED',observed_at_utc:observed,
 independently_attested:true,unique_buyers:120,new_pools:10,
 minute_volume_change_pct:40
};
const proof=(category,i,at)=>({
 evidence_id:'fixture:'+i,category,event_at_utc:at,
 available_at_utc:at,independent_proof_at_utc:at,
 independent_provenance_verified:true
});

test('exact locked 60+60 Gregorian UTC days; cutoff prevents full Nov 16 leakage',()=>{
 const x=dayPlan();assert.equal(x.length,120);
 assert.equal(x[0].date,'2026-07-20');
 assert.equal(x[59].date,'2026-09-17');
 assert.equal(x[60].date,'2026-09-18');
 assert.equal(x[119].date,'2026-11-16');
 assert.equal(x[59].phase,'A_TRAIN_OBSERVE');
 assert.equal(x[60].day_start_utc,PHASE_B.replace('Z','.000Z'));
 assert.equal(x[60].phase,'B_FROZEN_HOLDOUT');
 assert.equal(x[119].complete_day,false);
 assert.equal(x[119].elapsed_hours,8.167);
 assert.equal(slotsForDay(x[119],24).length,9);
 assert.equal(slotsForDay(x[119],1).length,1);
 assert.throws(()=>dayPlan({cutoff:'2026-11-17T23:59:59Z'}),/CUTOFF/);
});
test('adaptive activity choices use only as-of verified pre-scan facts',()=>{
 assert.equal(frequencyFromEvidence(null,{at:observed}).frequency_per_day,1);
 assert.equal(frequencyFromEvidence({...validSignal,unique_buyers:0,new_pools:0,
  minute_volume_change_pct:0},{at:observed}).frequency_per_day,1);
 assert.equal(frequencyFromEvidence({...validSignal,unique_buyers:25,new_pools:2,
  minute_volume_change_pct:8},{at:observed}).frequency_per_day,4);
 assert.equal(frequencyFromEvidence(validSignal,{at:observed}).frequency_per_day,12);
 assert.equal(frequencyFromEvidence({...validSignal,unique_buyers:310},
  {at:observed}).frequency_per_day,24);
 assert.equal(frequencyFromEvidence({...validSignal,
  observed_at_utc:new Date(Date.parse(observed)+3600000).toISOString()},
  {at:observed}).frequency_per_day,1);
 assert.equal(frequencyFromEvidence({...validSignal,independently_attested:false},
  {at:observed}).frequency_per_day,1);
 for(const freq of [1,4,12,24]){
  assert.equal(slotsForDay(day,freq).length,freq);
  assert(slotsForDay(day,freq).every(s=>Date.parse(s)<Date.parse(day.day_end_exclusive_utc)));
 }
});
test('source availability AND external independent proof must precede simulated clock',()=>{
 const at='2026-10-01T12:00:00Z',future='2026-10-01T18:00:00Z';
 const evid=EVIDENCE_GATES.map((name,i)=>proof(name,i,at));
 assert.equal(independentlyTradeable(evid,at),true);
 assert.equal(asofOnly([...evid,{...proof('NEXT_EXECUTABLE_DEX_QUOTE',9,future)}],at).length,5);
 assert.equal(independentlyTradeable([...evid.slice(0,4),
  {...evid[4],independent_proof_at_utc:future}],at),false);
 assert.equal(independentlyTradeable([...evid.slice(0,4),
  {...evid[4],available_at_utc:future}],at),false);
 assert.equal(independentlyTradeable([...evid.slice(0,4),
  {...evid[4],independent_provenance_verified:false}],at),false);
 assert.throws(()=>independentlyTradeable([...evid,evid[0]],at),/DUPLICATE_EVIDENCE/);
});
test('actual 120d available source audit refuses fictional 120d historical trades',()=>{
 const a=auditHistorical();
 assert.equal(a.schema,'sniper_r29_120d_historical_audit.v1');
 assert.equal(a.period.train_days,60);
 assert.equal(a.period.holdout_days,60);
 assert.equal(a.daily.length,120);
 assert.equal(a.historical_verified_complete_scans,0);
 assert.equal(a.historical_model_calls_simulated_as_real,0);
 assert.equal(a.historical_gpt_pnl_test_usdc,null);
 assert.equal(a.hypothetical_buy_count,null);
 assert.equal(a.historical_gpt_buy_fills_verified,0);
 assert.equal(a.historical_gpt_sell_fills_verified,0);
 assert.equal(a.actual_archived_decisions,9);
 assert.equal(a.actual_archived_no_trade,9);
 assert.equal(a.period_days_with_actual_archives,2);
 assert.equal(a.daily[0].status,'DATA_GAP_NO_FULL_ASOF_COHORT');
 assert.equal(a.daily[119].archived_actual_gpt_decisions.length,5);
 assert.equal(a.daily[119].fallback_diagnostic_slot_count,1);
 assert.equal(a.source_coverage[1].complete_cex_symbols,12);
 assert.equal(a.user_paper_account_untouched,true);
 assert.equal(observeActualArchive({cutoff:DEFAULT_CUTOFF}).length,9);
});
test('isolated 120d synthetic exercise: 1/4/12/24 scans, BUY/HOLD/SELL, loss-stop and GitHub archive+receipt',()=>{
 const r=runSyntheticMechanics();
 assert.equal(IS_SYNTHETIC_ONLY,true);
 assert.equal(r.days,120);
 assert.equal(r.maximum_frequency_per_day,24);
 assert.equal(r.simulated_scan_count,171);
 assert.equal(r.scans_by_phase.train,74);
 assert.equal(r.scans_by_phase.holdout,97);
 assert.equal(r.actions.BUY,2);
 assert.equal(r.actions.HOLD,3);
 assert.equal(r.actions.SELL,1);
 assert.equal(r.actions.WATCH,20);
 assert.equal(r.actions.NO_TRADE,145);
 assert.equal(r.actions.LOCAL_GUARD_SELL,1);
 assert.equal(r.synthetic_buy_count,2);
 assert.equal(r.closed_synthetic_trade_count,2);
 assert.equal(r.paper_fills.filter(x=>x.source==='LOCAL_GUARD_FIXTURE').length,1);
 assert.equal(r.open_positions,0);
 assert.equal(r.cash_test_usdc,5003.8906);
 assert.equal(r.closed_pnl_test_usdc,3.8906);
 assert.equal(r.paper_receipt_count,171);
 assert.equal(r.github_archive_count,171);
 assert.equal(r.fully_generated_gpt_model_calls,0);
 assert.equal(r.reported_real_market_trades,0);
 assert.equal(r.no_actual_github_writes,true);
 assert.equal(r.no_wallet_access,true);
 assert.equal(r.daily[64].planned_frequency_per_day,12);
 assert.equal(r.daily[77].planned_frequency_per_day,24);
 assert.equal(r.daily[81].planned_frequency_per_day,4);
 assert.equal(r.daily[64].action_counts.SELL,1);
 assert.equal(r.daily[77].action_counts.LOCAL_GUARD_SELL,1);
 assert.equal(r.daily[119].actual_simulated_scans,1);
 assert(r.decision_journal.every(x=>x.source_class==='SYNTHETIC_FIXTURE_ONLY'));
});
test('in-memory GitHub+Paper bridge has neither wallet nor automatic unauthorized BUY',()=>{
 const b=makeFixtureGithubPaperBridge();
 assert.equal(b.archives.size,0);
 assert.equal(b.receipts.size,0);
 assert.equal(b.ledger.initial_test_usdc,5000);
 assert.equal(b.ledger.cash_test_usdc,5000);
 assert.equal(b.ledger.fills.length,0);
 assert.equal(b.getLatestPointer(),null);
});

test('permanent 120-row historical and synthetic daily CSV agree with replay engine',()=>{
 const folder=path.join(path.dirname(fileURLToPath(import.meta.url)),'results');
 const hist=readFileSync(path.join(folder,'historical-days.csv'),'utf8')
  .trim().split('\n');
 const fixtureCsv=readFileSync(path.join(folder,'synthetic-mechanics-days.csv'),'utf8')
  .trim().split('\n');
 const aud=auditHistorical(),fx=runSyntheticMechanics();
 assert.equal(hist.length,121);
 assert.equal(fixtureCsv.length,121);
 for(let i=0;i<120;i++){
  const a=hist[i+1].split(','),f=fixtureCsv[i+1].split(',');
  const da=aud.daily[i],df=fx.daily[i];
  assert.equal(a[0],da.date);
  assert.equal(a[1],da.phase);
  assert.equal(Number(a[2]),da.archived_actual_gpt_decisions.length);
  assert.equal(Number(a[3]),da.verified_historical_market_scans);
  assert.equal(a[4],'UNKNOWN');
  assert.equal(a[6],da.status);
  assert.equal(f[0],df.date);
  assert.equal(f[1],df.phase);
  assert.equal(Number(f[2]),df.planned_frequency_per_day);
  assert.equal(Number(f[3]),df.actual_simulated_scans);
  for(const [ix,name] of [[4,'BUY'],[5,'HOLD'],[6,'SELL'],[7,'WATCH'],
   [8,'NO_TRADE'],[9,'LOCAL_GUARD_SELL']])
   assert.equal(Number(f[ix]),df.action_counts[name]);
  assert.equal(Number(f[11]),df.cash_after_day_test_usdc);
  assert.equal(f[12],'SYNTHETIC_FIXTURE_ONLY');
 }
});
