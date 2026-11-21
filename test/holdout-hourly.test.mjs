import test from 'node:test';
import assert from 'node:assert/strict';
import {replay24HourlyScans} from '../src/holdout-hourly.mjs';
const date='2026-11-15';
const pool='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const token='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
test('actual specified holdout runs all 24 hourly decision scans, not four',()=>{
 const r=replay24HourlyScans({date});
 assert.equal(r.decision_scan_count,24);
 assert.equal(r.actual_full_reviews,24);
 assert.equal(r.scan_results[0].scan_started_at_utc,'2026-11-15T00:00:00.000Z');
 assert.equal(r.scan_results[0].dot4_decision_at_utc,'2026-11-15T00:35:00.000Z');
 assert.equal(r.scan_results[23].scan_started_at_utc,'2026-11-15T23:00:00.000Z');
 assert.equal(r.scan_results[23].dot4_decision_at_utc,'2026-11-15T23:35:00.000Z');
 assert.equal(r.strategy_buys,0);assert.equal(r.strategy_sells,0);
 assert.equal(r.discovered_candidate_count,0);
 assert.equal(r.ending_test_usdc_without_trade_evidence,5000);
 assert.ok(r.scan_results.every(x=>x.data_status==='DATA_GAP_NO_CONTEMPORANEOUS_MARKET_EVIDENCE'));
});
test('a retrospectively published high gainer can never enter intraday discovery input',()=>{
 const c={chain:'base',pool,symbol:'FUTURE_WINNER',contract:token,
  provenance:'RETROSPECTIVE_DAY_END',source_archive_sha:'a'.repeat(40),
  observed_at_utc:'2026-11-15T01:00:00Z',archived_at_utc:'2026-11-16T00:01:00Z',
  source_published_at_utc:'2026-11-16T00:01:00Z',
  source_url:'https://www.geckoterminal.com/base/pools/'+pool};
 const r=replay24HourlyScans({date,archivedCandidates:[c]});
 assert.equal(r.discovered_candidate_count,0);
 assert.equal(r.strategy_buys,0);
 assert.ok(r.excluded_evidence_counts.RETROSPECTIVE_NOT_A_SCAN_INPUT>0);
});
test('authentic-shaped discovery first appears only after original record was available',()=>{
 const c={chain:'base',pool,symbol:'FOO',contract:token,
  provenance:'CONTEMPORANEOUS_RECORD',source_archive_sha:'a'.repeat(40),
  observed_at_utc:'2026-11-15T04:12:00Z',archived_at_utc:'2026-11-15T04:13:00Z',
  source_published_at_utc:'2026-11-15T04:12:00Z',
  source_url:'https://www.geckoterminal.com/base/pools/'+pool};
 const r=replay24HourlyScans({date,archivedCandidates:[c]});
 assert.equal(r.scan_results[3].eligible_cumulative_discoveries,0);
 assert.equal(r.scan_results[4].newly_verified_discoveries,1);
 assert.equal(r.strategy_buys,0); // one source / no independent dated quote pair
});
test('source not archived until after day is never re-dated',()=>{
 const c={chain:'base',pool,symbol:'BAR',contract:token,
  provenance:'CONTEMPORANEOUS_RECORD',source_archive_sha:'a'.repeat(40),
  observed_at_utc:'2026-11-15T04:12:00Z',archived_at_utc:'2026-11-16T02:00:00Z',
  source_published_at_utc:'2026-11-15T04:12:00Z',
  source_url:'https://www.geckoterminal.com/base/pools/'+pool};
 const r=replay24HourlyScans({date,archivedCandidates:[c]});
 assert.equal(r.discovered_candidate_count,0);assert.equal(r.strategy_buys,0);
 assert.ok(r.excluded_evidence_counts.FUTURE_EVIDENCE>0);
});
test('synthetic price series cannot be promoted to real historical performance',()=>{
 const r=replay24HourlyScans({date,archivedSnapshots:[{provenance:'SYNTHETIC_TEST'}]});
 assert.equal(r.archived_contemporaneous_eligible_snapshot_inputs,0);
 assert.equal(r.archived_synthetic_snapshots_ignored,1);
 assert.equal(r.strategy_buys,0);assert.equal(r.historical_pnl_verified,false);
});
