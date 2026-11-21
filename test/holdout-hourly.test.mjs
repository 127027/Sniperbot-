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

test('pool discovered after Dot2 at :15 cannot count in same hour :35',()=>{
 const record={
 chain:'base',pool,contract:token,symbol:'NEW',provenance:'CONTEMPORANEOUS_RECORD',
 source_archive_sha:'a'.repeat(40),source_url:'https://www.geckoterminal.com/base/pools/'+pool,
 source_published_at_utc:'2026-11-15T00:32:00Z',
 observed_at_utc:'2026-11-15T00:32:00Z',archived_at_utc:'2026-11-15T00:32:00Z'
 };
 const x=replay24HourlyScans({date,archivedCandidates:[record]});
 assert.equal(x.scan_results[0].eligible_cumulative_discoveries,0);
 assert.equal(x.scan_results[1].newly_verified_discoveries,1);
 assert.equal(x.scan_results[1].dot2_cutoff_at_utc,'2026-11-15T01:15:00.000Z');
});
test('a valid-shaped quote without a Dot2 identity cannot bypass risk pipeline',()=>{
 const now='2026-11-15T00:34:00Z';
 const coin={chain:'base',contract:token,pool,symbol:'X'};
 const snapshot={provenance:'CONTEMPORANEOUS_RECORD',source_archive_sha:'a'.repeat(40),
 coin,observed_at_utc:now,archived_at_utc:now,
 discovery:{observed_at_utc:'2026-11-15T00:14:00Z'},
 risk:{status:'ELIGIBLE',observed_at_utc:'2026-11-15T00:24:00Z'},
 quotes:['geckoterminal.com','dexscreener.com'].map((host,i)=>({...coin,provider_id:'provider-'+i,
 source_url:'https://'+host+(i?'/base/':'/base/pools/')+pool,
 observed_at:now,source_published_at_utc:now,price_usdc:.001,liquidity_usdc:20000}))};
 const r=replay24HourlyScans({date,archivedSnapshots:[snapshot]});
 assert.equal(r.archived_contemporaneous_eligible_snapshot_inputs,0);
 assert.equal(r.rejected_snapshot_reasons.NO_DOT2_IDENTITY_BEFORE_15,1);
 assert.equal(r.strategy_buys,0);
});
test('explicit 24-scan diagnostic does not downshift on quiet activity',()=>{
 const at='2026-11-15T00:05:00Z';
 const r=replay24HourlyScans({date,activityObservations:[{
 provenance:'CONTEMPORANEOUS_RECORD',observed_at_utc:at,archived_at_utc:at,
 source_archive_sha:'a'.repeat(40),
 metrics:{dataAvailable:true,newPools:0,eligible:0,volumeChangePct:-20,openPositions:0,consecutiveQuietChecks:2}
 }]});
 assert.equal(r.actual_full_reviews,24);
 assert.ok(r.scan_results.every(s=>s.full_review));
});
