import test from 'node:test';
import assert from 'node:assert/strict';
import {planDataGapRecovery} from '../src/v19-coverage-recovery.mjs';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';

const at='2026-10-12T00:35:00.000Z';
const sample=(chain,when='2026-10-12T00:34:00.000Z',
  available=true,archived=when)=>({
 chain,provenance:'CONTEMPORANEOUS_RECORD',observed_at_utc:when,
 archived_at_utc:archived,metrics:{dataAvailable:available},
 source_archive_sha:'a'.repeat(40)
});
test('DATA_GAP requests every missed chain without increasing phantom GPT review count',()=>{
 const r=planDataGapRecovery({asOfUtc:at});
 assert.equal(r.network_count,6);assert.equal(r.missing_or_stale_chains,6);
 assert.equal(r.recommended_capture_requests.length,6);
 assert.equal(r.provider_api_requests_performed,0);
 assert.equal(r.actual_gpt_reviews_performed,0);
 assert.equal(r.trading_enabled,false);
});
test('recent as-of original sample covers only the matching chain',()=>{
 const r=planDataGapRecovery({asOfUtc:at,activityObservations:[sample('solana')]});
 assert.equal(r.recently_observed_chains,1);
 assert.equal(r.missing_or_stale_chains,5);
 assert.ok(r.recommended_capture_requests.every(x=>x.chain!=='solana'));
 assert.ok(r.recommended_capture_requests.every(x=>x.status==='RECOMMENDED_NOT_YET_EXECUTED'));
});
test('future arrivals, failed API responses and stale prices are NOT evidence of a calm market',()=>{
 const r=planDataGapRecovery({asOfUtc:at,networks:['solana','base','ethereum'],
  activityObservations:[
   sample('solana','2026-10-12T01:00:00.000Z'),
   sample('base','2026-10-12T00:34:00.000Z',false),
   sample('ethereum','2026-10-11T19:00:00.000Z')
  ]});
 assert.equal(r.missing_or_stale_chains,3);
 assert.equal(r.recently_observed_chains,0);
 assert.ok(r.findings.every(x=>x.market_calm_proven===false));
});
test('bounded API recommendation budget defers work and never invents market observations',()=>{
 const r=planDataGapRecovery({asOfUtc:at,maxRequests:2});
 assert.equal(r.recommended_capture_requests.length,2);
 assert.equal(r.deferred_recovery_requests,4);
 assert.equal(r.provider_api_requests_performed,0);
});
test('24h on-demand backtest includes reasoned Dot1 capture requests, no actual scans or fills',()=>{
 const r=backtestOnRequest({date:'2026-10-12'});
 assert.equal(r.role_audit.dot1_tempo.coverage_recovery_plans.length,24);
 assert.equal(r.role_audit.dot1_tempo.coverage_recovery_plans[0].missing_or_stale_chains,6);
 assert.equal(r.model_replay_summary.fullReviews,4);
 assert.equal(r.confirmed_paper_fills,0);
 assert.equal(r.historical_gpt_dot_runs,0);
});
