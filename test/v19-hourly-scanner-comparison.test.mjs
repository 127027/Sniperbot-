import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {compare24HourlyScansAfterReplay}
 from '../src/v19-hourly-scanner-comparison.mjs';

const date='2026-10-12';
const oracle=JSON.parse(await readFile(
 'research/evaluation/2026-10-12/v19-winner-reference-identity-status.json','utf8'));
const replay=()=>backtestOnRequest({date,firstScanAtStart:true,
 forceHourlyDiagnostic:true});
test('user-requested real diagnostic chronology has 24 exact hourly scans and separate 65-row oracle',()=>{
 const report=compare24HourlyScansAfterReplay({replay:replay(),oracle});
 assert.equal(report.scan_count,24);
 assert.equal(report.scans.length,24);
 assert.equal(report.scans[0].scan_at_utc,'2026-10-12T00:00:00.000Z');
 assert.equal(report.scans[1].scan_at_utc,'2026-10-12T01:00:00.000Z');
 assert.equal(report.scans[23].scan_at_utc,'2026-10-12T23:00:00.000Z');
 assert.equal(report.warmup_from_utc,'2026-10-11T19:00:00.000Z');
 assert.equal(report.decision_end_exclusive_utc,'2026-10-13T00:00:00.000Z');
 assert.equal(report.winner_reference.reported_rows,65);
 assert.equal(report.winner_reference.rows_with_pool_urls,8);
 assert.equal(report.winner_reference.rows_without_pool_identity,57);
 assert.equal(report.winner_reference.all_market_gainers_100pct_total,'UNKNOWN_NOT_COMPLETE_UNIVERSE');
 assert.equal(report.real_orders_created,0);
});
test('zero real October sources produces 24 hourly DATA_GAP not 65 fictional missed trades',()=>{
 const result=compare24HourlyScansAfterReplay({replay:replay(),oracle});
 assert.equal(result.original_october_capture_claims,0);
 assert.equal(result.model_buys,0);
 assert.equal(result.model_sells,0);
 assert.equal(result.winner_reference.actual_proven_missed_buy_opportunities,0);
 assert.equal(result.winner_reference.missed_buy_opportunities_reliably_measureable,false);
 assert.ok(result.scans.every(x=>x.buy.length===0&&x.sell.length===0&&
   x.historical_coin_selection_status==='UNKNOWN_NO_ORIGINAL_OCTOBER_DISCOVERY_AND_QUOTE_UNIVERSE'));
 assert.ok(result.winner_reference.entries.every(x=>
   x.verdict==='UNKNOWN_NOT_PROVEN_MISSED_OPPORTUNITY'));
 assert.equal(result.actual_historical_gpt_dot_reviews,0);
 assert.equal(result.actual_windows_paper_fills,0);
});
test('oracle is permitted only as a postdecision registry of recorded reference rows',()=>{
 const bad={...oracle,source_class:'CONTEMPORANEOUS_RECORD'};
 assert.throws(()=>compare24HourlyScansAfterReplay({replay:replay(),oracle:bad}),
  /INVALID_POST_DECISION_ORACLE_REGISTER/);
 const missing={...oracle,entries:oracle.entries.slice(0,64)};
 assert.throws(()=>compare24HourlyScansAfterReplay({replay:replay(),oracle:missing}),
  /INVALID_POST_DECISION_ORACLE_REGISTER/);
});
test('partial scan chronology or legacy offset cannot masquerade as requested 24-hour plan',()=>{
 const r=replay();
 r.role_audit.dot4_strategy.timeline[1].at_utc='2026-10-12T01:35:00.000Z';
 assert.throws(()=>compare24HourlyScansAfterReplay({replay:r,oracle}),
  /BACKTEST_HOURLY_TICK_MISMATCH/);
 const old=backtestOnRequest({date});
 assert.throws(()=>compare24HourlyScansAfterReplay({replay:old,oracle}),
  /NOT_A_SAFE_EXACT_24_HOURLY_REPLAY_REPORT/);
});
test('separate retrospective gains are not treated as realized 50-USDC trade returns',()=>{
 const result=compare24HourlyScansAfterReplay({replay:replay(),oracle});
 const bn=result.winner_reference.entries.find(x=>x.name==='BNBCAT');
 assert.equal(bn.reported_gain_pct,50327);
 assert.equal(bn.reported_gain_is_not_an_executable_return,true);
 assert.equal(bn.matched_by_exact_pool_post_decision,false);
 assert.equal(bn.actual_discoverability_proven,false);
 assert.equal(bn.genuine_blind_recall_scored,false);
});
