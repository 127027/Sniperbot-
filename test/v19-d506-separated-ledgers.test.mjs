import test from 'node:test';
import assert from 'node:assert/strict';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {buildSeparatedPerformanceLedgers} from '../src/v19-three-ledger-report.mjs';
const date='2026-10-12',zero=Date.parse(date+'T00:00:00Z');
const t=(h)=>new Date(zero+h*3600000+34*60000).toISOString();
const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40),symbol:'MODEL_ONLY'};
const snapshot=(h,price)=>({provenance:'SYNTHETIC_TEST',observed_at_utc:t(h),archived_at_utc:t(h),
 coin,discovery:{observed_at_utc:t(h)},risk:{status:'ELIGIBLE',observed_at_utc:t(h)},
 quotes:['https://www.geckoterminal.com/base/pools/'+coin.pool,
   'https://dexscreener.com/base/'+coin.pool].map((url,i)=>({...coin,source_url:url,
    provider_id:'provider-'+i,observed_at:t(h),source_published_at_utc:t(h),
    price_usdc:price,liquidity_usdc:20000}))});
test('D5-06 24 missing hours are DATA_GAP not flat 0 percent performance',()=>{
 const r=backtestOnRequest({date});
 const l=r.separated_performance_ledgers;
 assert.equal(l.kind,'R29_D5_06_STRICT_THREE_LEDGER_REPORT');
 assert.equal(r.model_replay_summary.dataGap,24);
 assert.equal(l.ledgers.DETERMINISTIC_PAPER_MODEL.return_pct,null);
 assert.equal(l.ledgers.DETERMINISTIC_PAPER_MODEL.realized_model_pnl_test_usdc,null);
 assert.equal(l.ledgers.ORACLE_UPPER_BOUND.pnl_test_usdc,null);
 assert.equal(l.ledgers.AUTHENTICATED_CLIENT_PAPER.realized_pnl_test_usdc,null);
 assert.equal(l.ledgers.AUTHENTICATED_CLIENT_PAPER.confirmed_fills,0);
 assert.equal(l.zero_trades_does_not_imply_zero_return,true);
});
test('D5-06 synthetic 5k/50 BUY+SELL yields only modeled pnl, never client or oracle',()=>{
 const r=backtestOnRequest({date,manifest:{
  schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',date,
  selected_from_future_winner_list:false,
  snapshots:[snapshot(5,.001),snapshot(6,.0011),snapshot(7,.0014)],
  activity_observations:[]
 }});
 const l=r.separated_performance_ledgers.ledgers;
 assert.equal(l.DETERMINISTIC_PAPER_MODEL.buy_count,1);
 assert.equal(l.DETERMINISTIC_PAPER_MODEL.sell_count,1);
 assert.ok(l.DETERMINISTIC_PAPER_MODEL.realized_model_pnl_test_usdc>0);
 assert.equal(l.DETERMINISTIC_PAPER_MODEL.source_authenticity_verified,false);
 assert.equal(l.AUTHENTICATED_CLIENT_PAPER.confirmed_fills,0);
 assert.equal(l.AUTHENTICATED_CLIENT_PAPER.return_pct,null);
 assert.equal(l.ORACLE_UPPER_BOUND.pnl_test_usdc,null);
 assert.equal(r.confirmed_paper_fills,0);
});
test('D5-06 open modeled positions are not incorrectly valued at cash-only return',()=>{
 const r=backtestOnRequest({date,manifest:{
  schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',date,
  selected_from_future_winner_list:false,
  snapshots:[snapshot(5,.001),snapshot(6,.0011)],activity_observations:[]}});
 const modeled=r.separated_performance_ledgers.ledgers.DETERMINISTIC_PAPER_MODEL;
 assert.equal(modeled.open_position_count,1);
 assert.equal(modeled.return_pct,null);
 assert.equal(modeled.realized_model_pnl_test_usdc,null);
});
test('D5-06 fabricated client receipt or future as-of is never accepted by report',()=>{
 const r=backtestOnRequest({date});
 assert.throws(()=>buildSeparatedPerformanceLedgers({
  replayReport:{...r,kind:'BAD',confirmed_paper_fills:20},
  asOfUtc:r.end_utc}),/INVALID_THREE_LEDGER_REPORT/);
 assert.throws(()=>buildSeparatedPerformanceLedgers({
  replayReport:r,asOfUtc:'2026-10-11T00:00:00Z'}),/INVALID_THREE_LEDGER_REPORT/);
});
