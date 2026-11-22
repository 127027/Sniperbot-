import test from 'node:test';
import assert from 'node:assert/strict';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';

const date='2026-10-12';
const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40),symbol:'SYNTH'};
const urls=['https://dexscreener.com/base/'+coin.pool,'https://www.geckoterminal.com/base/pools/'+coin.pool];
const synth=(hour,price)=>{
 const time=new Date(Date.parse(date+'T00:00:00Z')+hour*3600000+34*60000).toISOString();
 return {provenance:'SYNTHETIC_TEST',observed_at_utc:time,archived_at_utc:time,
  coin,discovery:{observed_at_utc:time},risk:{status:'ELIGIBLE',observed_at_utc:time},
  quotes:urls.map((source_url,i)=>({...coin,provider_id:'source-'+i,source_url,
   observed_at:time,source_published_at_utc:time,price_usdc:price,liquidity_usdc:20000}))};
};
const input=(snapshots,opts={})=>({schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',date,
 selected_from_future_winner_list:false,activity_observations:[],snapshots,...opts});

test('request without October original contemporaneous snapshots reports DATA_GAP, zero trades',()=>{
 const r=backtestOnRequest({date});
 assert.equal(r.status,'DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE');
 assert.equal(r.model_replay_summary.buys,0);
 assert.equal(r.model_replay_summary.sells,0);
 assert.equal(r.model_replay_summary.fullReviews,4);
 assert.equal(r.confirmed_paper_fills,0);
 assert.equal(r.role_audit.dot5_control.future_winner_labels_used_for_entries,false);
});

test('winner-selected retrospective universe is rejected before simulation',()=>{
 assert.throws(()=>backtestOnRequest({date,manifest:input([],
  {selected_from_future_winner_list:true})}),/UNTRUSTED_OR_HINDSIGHT_UNIVERSE/);
});

test('synthetic BUY then SELL exercises five-role REPORT but not actual GPT or PAPER',()=>{
 const r=backtestOnRequest({date,manifest:input([synth(5,.001),synth(6,.0011),synth(7,.0014)])});
 assert.equal(r.model_replay_summary.buys,1);
 assert.equal(r.model_replay_summary.sells,1);
 assert.equal(r.role_audit.dot2_discovery.synthetic_test_snapshots,3);
 assert.equal(r.historical_proven_trades,0);
 assert.equal(r.historical_gpt_dot_runs,0);
 assert.equal(r.confirmed_paper_orders,0);
 assert.equal(r.confirmed_paper_fills,0);
 assert.equal(r.must_not_report_as_real_gpt_decision_or_historical_pnl,true);
});

test('future archived observation cannot affect 24h decisions',()=>{
 const future=synth(6,.002);
 future.archived_at_utc='2026-10-13T01:00:00Z';
 const r=backtestOnRequest({date,manifest:input([synth(5,.001),future])});
 assert.equal(r.model_replay_summary.buys,0);
 assert.equal(r.role_audit.dot2_discovery.rejected_input_snapshots,1);
 assert.equal(r.role_audit.dot5_control.skipped_inputs[0].reason,'DATE_OR_CAPTURE_CONFLICT');
});

test('explicit diagnostic hourly mode is separate from adaptive regime',()=>{
 const r=backtestOnRequest({date,forceHourlyDiagnostic:true});
 assert.equal(r.mode,'EXPLICIT_FIXED_24_HOURLY_DIAGNOSTIC');
 assert.equal(r.model_replay_summary.fullReviews,24);
 assert.equal(r.historical_proven_trades,0);
});

test('claimed contemporary capture requires an archive digest and never proves authentic issuer alone',()=>{
 const claimed={...synth(4,1),provenance:'CONTEMPORANEOUS_RECORD'};
 const noSha=backtestOnRequest({date,manifest:input([claimed])});
 assert.equal(noSha.accepted_input_count,0);
 const withSha=backtestOnRequest({date,manifest:input([{...claimed,source_archive_sha:'a'.repeat(40)}])});
 assert.equal(withSha.accepted_input_count,1);
 assert.equal(withSha.independent_risk_and_source_authenticity_verified,false);
 assert.equal(withSha.status,'PROVISIONAL_ASOF_SOURCE_AUTHENTICITY_NOT_VERIFIED');
});

test('R29 29h direct-start mode chooses 00:00 without changing older :35 diagnostic mode',()=>{
 const direct=backtestOnRequest({date,firstScanAtStart:true});
 assert.equal(direct.first_scan_at_start_enabled,true);
 assert.equal(direct.first_scan_virtual_utc,'2026-10-12T00:00:00.000Z');
 assert.equal(direct.model_replay_summary.fullReviews,4);
 assert.equal(direct.role_audit.dot4_strategy.timeline[0].at_utc,
  '2026-10-12T00:00:00.000Z');
 assert.equal(direct.on_demand_29h_timeline.ticks[5].at_utc,
  '2026-10-12T00:00:00.000Z');
 assert.equal(direct.confirmed_paper_fills,0);
 const old=backtestOnRequest({date});
 assert.equal(old.first_scan_at_start_enabled,false);
 assert.equal(old.first_scan_virtual_utc,'2026-10-12T00:35:00.000Z');
 assert.equal(old.role_audit.dot4_strategy.timeline[0].at_utc,
  '2026-10-12T00:35:00.000Z');
 assert.equal(old.historical_gpt_dot_runs,0);
 assert.throws(()=>backtestOnRequest({date,firstScanAtStart:'yes'}),
  /INVALID_BACKTEST_DAY_OR_MODE/);
});
