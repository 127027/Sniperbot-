import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRetrospectiveNeutral24HourlySource}
 from '../src/v19-retrospective-neutral-source-overlay.mjs';
import {readFile} from 'node:fs/promises';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {compare24HourlyScansAfterReplay}
 from '../src/v19-hourly-scanner-comparison.mjs';

const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const mint=index=>'2'.repeat(30)+alphabet[index%58]+alphabet[Math.floor(index/58)%58];
const utc=ms=>new Date(ms).toISOString();
const day=(date,offset)=>{
 const start=Date.parse(date+'T00:00:00.000Z');
 const frames=Array.from({length:24},(_,i)=>{
  const at=utc(start+(i+1)*3600000);
  const rows=Array.from({length:8},(_,j)=>{
   const address=mint(offset+i*8+j);
   return {observed_at_utc:utc(Date.parse(at)-27000),
    age_at_scan_s:227,asof_features:{
     mint:address,quote_evidence:null,quote_modelled:true,
     flag_pool_drained:true,peak_rs:999999}};
  });
  return {at_utc:at,feature_rows_last_5min:25,
   neutral_fresh_mints_within_5min:11,last_eight_fresh_neutral_mints:rows,
   no_future_outcomes:true,gpt_model_calls:0,
   independent_sellable_buy_sell_quotes:false,paper_trades:null};
 });
 return {schema:'r29_real_43day_fresh_5minute_asof_frames_v2',
  day:date,source_capture_released_after_historical_events:true,
  no_future_labels:true,model_calls:0,paper_fills:0,
  source_raw_parquet_sha256:offset?'b'.repeat(64):'a'.repeat(64),
  source_forbidden_outcome_columns_excluded:['rugged','graduated','peak_rs','outcome_status'],
  frames};
};
const params=()=>({priorDay:day('2026-10-11',0),
 tradingDay:day('2026-10-12',192),
 artifactDownloadedAtUtc:'2026-11-23T07:20:00.000Z'});

test('pinned retrospective archive joins exactly 00 through 23 but never midnight next day',()=>{
 const x=auditRetrospectiveNeutral24HourlySource(params());
 assert.equal(x.hourly_scans,24);
 assert.equal(x.per_hour[0].at_utc,'2026-10-12T00:00:00.000Z');
 assert.equal(x.per_hour[23].at_utc,'2026-10-12T23:00:00.000Z');
 assert.equal(x.retrospective_mint_occurrences_in_24_last5min_windows,264);
 assert.equal(x.retrospective_feature_rows_in_24_last5min_windows,600);
 assert.equal(x.distinct_sample_mints,192);
 assert.equal(x.sampled_mint_occurrences,192);
 assert.equal(x.original_provider_delivered_during_october_independently_verified,false);
 assert.equal(x.original_bidirectional_usdc_quotes_verified,0);
 assert.equal(x.never_eligible_for_entry_or_exit_quotes,true);
});
test('actual observation-to-hour distance is reconstructed rather than trusting source age field',()=>{
 const x=auditRetrospectiveNeutral24HourlySource(params());
 const sample=x.per_hour[0].postrun_neutral_mint_sample[0];
 assert.equal(sample.seconds_before_scan,27);
 assert.equal(x.claimed_age_field_disagrees_with_recomputed_observation_age_count,192);
 assert.equal(x.age_field_not_trusted_for_asof_decisions,true);
});
test('no retrospective risk outcome, fake price, rug or computed source feature can enter model candidate output',()=>{
 const x=auditRetrospectiveNeutral24HourlySource(params());
 const candidate=x.per_hour[0].postrun_neutral_mint_sample[0];
 assert.deepEqual(Object.keys(candidate).sort(),[
  'chain','mint','source_observed_at_utc','seconds_before_scan','exact_pool',
  'tradable_usdc_quote_verified','sellability_original_verified',
  'source_provider_delivered_asof_verified','provenance'].sort());
 assert.equal(candidate.exact_pool,null);
 assert.equal(candidate.tradable_usdc_quote_verified,false);
 assert.equal(candidate.flag_pool_drained,undefined);
 assert.equal(candidate.peak_rs,undefined);
 assert.equal(candidate.quote_modelled,undefined);
});
test('future dated sample and malicious mint are rejected, not silently dropped',()=>{
 const a=params();a.tradingDay.frames[0].last_eight_fresh_neutral_mints[1].observed_at_utc='2026-10-12T02:00:00.000Z';
 assert.throws(()=>auditRetrospectiveNeutral24HourlySource(a),/INVALID_RETRO_MINT_SAMPLE_OR_TIME/);
 const b=params();b.tradingDay.frames[0].last_eight_fresh_neutral_mints[0].asof_features.mint='0xBAD';
 assert.throws(()=>auditRetrospectiveNeutral24HourlySource(b),/INVALID_RETRO_MINT_SAMPLE_OR_TIME/);
});
test('untrusted retrospective status and reordered source hours fail closed',()=>{
 const a=params();a.tradingDay.no_future_labels=false;
 assert.throws(()=>auditRetrospectiveNeutral24HourlySource(a),/INVALID_OR_UNSAFE_RETROSPECTIVE_ARCHIVE_DAY/);
 const b=params();b.tradingDay.frames[0].at_utc='2026-10-12T02:00:00.000Z';
 assert.throws(()=>auditRetrospectiveNeutral24HourlySource(b),/INVALID_RETRO_NEUTRAL_FRAME/);
 const c=params();c.artifactDownloadedAtUtc='2026-10-11T12:00:00.000Z';
 assert.throws(()=>auditRetrospectiveNeutral24HourlySource(c),/RETRO_ARCHIVE_NOT_POST_EVENT/);
});
test('retro overlay is attached only after independently frozen 24 scan trades; no hidden BUY or 65 winners',async()=>{
 const retro=auditRetrospectiveNeutral24HourlySource(params());
 const replay=backtestOnRequest({date:'2026-10-12',
  firstScanAtStart:true,forceHourlyDiagnostic:true});
 const oracle=JSON.parse(await readFile(
  'research/evaluation/2026-10-12/v19-winner-reference-identity-status.json','utf8'));
 const x=compare24HourlyScansAfterReplay({replay,oracle,retrospectiveNeutral:retro});
 assert.equal(x.model_buys,0);
 assert.equal(x.model_sells,0);
 assert.equal(x.scans[0].post_decision_retrospective_source.selected_research_mints.length,8);
 assert.equal(x.scans[0].post_decision_retrospective_source.not_an_executable_quote,true);
 assert.equal(x.post_decision_retrospective_neutral_research.distinct_sample_mints,192);
 assert.equal(x.winner_reference.reported_rows,65);
 assert.equal(x.original_october_capture_claims,0);
 const evil=structuredClone(retro);evil.never_eligible_to_seed_historical_discovery=false;
 assert.throws(()=>compare24HourlyScansAfterReplay({replay,oracle,retrospectiveNeutral:evil}),
  /RETROSPECTIVE_SOURCE_CANNOT_ENTER_MODEL_TRADES/);
});
