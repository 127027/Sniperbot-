import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {auditOfflineReplayLedger} from '../src/v19-offline-replay-ledger-audit.mjs';

const date='2026-10-12',sourcePath='research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json';
const load=async()=>JSON.parse(await readFile(sourcePath,'utf8'));

test('QA-04: real 29h timeline, synthetic Buy/Sell, modeled receipt chain and exactly balanced isolated cash',async()=>{
 const manifest=await load();
 const report=backtestOnRequest({date,manifest});
 const audit=auditOfflineReplayLedger({report});
 assert.equal(report.on_demand_29h_timeline.hourly_ticks,29);
 assert.equal(report.on_demand_29h_timeline.ticks.filter(t=>
  t.phase==='WARMUP_RESEARCH_NO_TRADING').length,5);
 assert.equal(report.on_demand_29h_timeline.ticks.filter(t=>
  t.phase==='PAPER_DECISION_WINDOW').length,24);
 assert.equal(report.on_demand_29h_timeline.begin_utc,'2026-10-11T19:00:00.000Z');
 assert.equal(report.on_demand_29h_timeline.end_utc,'2026-10-13T00:00:00.000Z');
 assert.equal(report.model_replay_summary.buys,1);
 assert.equal(report.model_replay_summary.sells,1);
 assert.equal(report.model_open_positions,0);
 assert.equal(report.isolated_model_receipts.length,2);
 assert.deepEqual(report.isolated_model_receipts.map(x=>x.action),['BUY','SELL']);
 assert.deepEqual(report.isolated_model_receipts.map(x=>x.status),
  ['MODELED_FILL_NOT_CLIENT','MODELED_FILL_NOT_CLIENT']);
 assert.equal(report.isolated_model_trade_history[1].position_source_order_id,
  report.isolated_model_receipts[0].id);
 assert.equal(audit.status,'MODEL_CASH_AND_LOTS_RECONCILED');
 assert.equal(audit.modeled_buys,1);
 assert.equal(audit.modeled_sells,1);
 assert.equal(audit.model_receipt_count,2);
 assert.equal(audit.modeled_cash_end_test_usdc,report.model_ending_cash_test_usdc);
 assert.ok(audit.modeled_realized_pnl_test_usdc>0);
 assert.equal(report.status,'DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE');
 assert.equal(report.confirmed_paper_fills,0);
 assert.equal(report.historical_proven_trades,0);
 assert.equal(report.historical_gpt_dot_runs,0);
 assert.equal(audit.client_paper_fills,0);
 assert.equal(audit.published_orders,0);
});
test('QA-04: zero-source October 29h replay remains 24 data gaps, 0 model receipts, 0 real trades',()=>{
 const report=backtestOnRequest({date});
 const audit=auditOfflineReplayLedger({report});
 assert.equal(report.model_replay_summary.dataGap,24);
 assert.equal(report.model_replay_summary.buys,0);
 assert.equal(report.isolated_model_receipts.length,0);
 assert.equal(audit.model_receipt_count,0);
 assert.equal(audit.modeled_cash_end_test_usdc,5000);
 assert.equal(report.model_ending_cash_test_usdc,5000);
 assert.equal(report.status,'DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE');
});
test('QA-04: removing a receipt or falsifying an ending balance fails closed',async()=>{
 const manifest=await load();
 const original=backtestOnRequest({date,manifest});
 for(const modified of [
  {...original,isolated_model_receipts:original.isolated_model_receipts.slice(1)},
  {...original,model_ending_cash_test_usdc:4500},
  {...original,confirmed_paper_fills:1},
  {...original,isolated_model_receipts:original.isolated_model_receipts.map((r,i)=>
    i===0?{...r,verified_client_fill:true}:r)},
  {...original,isolated_model_trade_history:original.isolated_model_trade_history.map((t,i)=>
    i===1?{...t,position_source_order_id:'forged'}:t)}
 ])assert.throws(()=>auditOfflineReplayLedger({report:modified}),/INVALID_ISOLATED_MODEL_LEDGER/);
});
test('QA-04: future-dated synthetic quote blocks BUY and no phantom receipts are invented',async()=>{
 const x=await load();
 const s=x.snapshots.find(r=>r.observed_at_utc==='2026-10-12T06:34:00.000Z');
 s.archived_at_utc='2026-10-13T04:00:00.000Z';
 const report=backtestOnRequest({date,manifest:x});
 assert.equal(report.model_replay_summary.buys,0);
 assert.equal(report.model_replay_summary.sells,0);
 assert.equal(report.isolated_model_receipts.length,0);
 assert.equal(auditOfflineReplayLedger({report}).model_receipt_count,0);
 assert.ok(report.role_audit.dot5_control.skipped_inputs.some(x=>
   x.reason==='DATE_OR_CAPTURE_CONFLICT'));
});
test('QA-04: the isolated CLI must audit before writing research, and never publish model fills',async()=>{
 const cli=await readFile('scripts/v18-backtest-on-demand.mjs','utf8');
 assert.ok(cli.indexOf('const isolatedLedgerAudit=auditOfflineReplayLedger')>
  cli.indexOf('const report=backtestOnRequest'));
 assert.ok(cli.indexOf('const isolatedLedgerAudit=auditOfflineReplayLedger')<
  cli.indexOf('await writeFile(target'));
 assert.match(cli,/ONLY_PROBE_ARTIFACTS_DIRECTORY|OUTSIDE_PROBE_ARTIFACTS_DIRECTORY/);
 assert.doesNotMatch(cli,/writeFile\(['"]signals\//);
});
