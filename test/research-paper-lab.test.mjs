import test from 'node:test';
import assert from 'node:assert/strict';
import {runResearchPaperLab} from '../src/research-paper-lab.mjs';
const date='2026-11-15';
const c=(t,p,vol=5000)=>({known_no_earlier_than_utc:date+'T'+t+':00Z',close_usd:p,volume_usd:vol});
const pool=(candles,opened='2026-11-15T00:00:00Z')=>({symbol:'SYNTH',chain:'base',pool_created_at_utc:opened,candles});
test('no market observations is a DATA_GAP not fake trading success',()=>{
 const r=runResearchPaperLab({date,pools:[pool([])]});
 assert.equal(r.scans.length,24);assert.equal(r.counts.buys,0);assert.equal(r.counts.sells,0);
 assert.equal(r.verified_historical_paper_orders,0);
});
test('a past candle can trigger entry, future candle cannot, and later close may trigger exit',()=>{
 const r=runResearchPaperLab({date,pools:[pool([c('00:05',1),c('00:30',1.1),
 c('01:30',1.4)])]});
 assert.equal(r.counts.buys,1);assert.equal(r.counts.sells,1);
 assert.equal(r.events[0].at_utc,'2026-11-15T00:35:00.000Z');
 assert.equal(r.events[1].at_utc,'2026-11-15T01:35:00.000Z');
 assert.ok(r.realized_hypothetical_pnl_test_usdc>0);
 assert.equal(r.verified_client_fills,0);
});
test('prevent same-hour entries for pools created after Dot 2 search',()=>{
 const r=runResearchPaperLab({date,pools:[pool([c('00:35',1),c('00:50',1.2),c('01:30',1.4)],'2026-11-15T00:32:00Z')]});
 assert.equal(r.scans[0].decisions[0].reason,'NOT_DISCOVERABLE_BY_DOT2_AT_15');
});
test('extreme momentum is intentionally WATCH, never forced BUY, in conservative preset',()=>{
 const r=runResearchPaperLab({date,preset:'conservative',pools:[pool([c('00:05',1),c('00:30',5)])]});
 assert.equal(r.counts.buys,0);
 assert.equal(r.scans[0].decisions[0].reason,'TOO_EXTREME_MOMENTUM');
});
test('unclosed position does not produce imaginary PnL or fake liquidation',()=>{
 const r=runResearchPaperLab({date,pools:[pool([c('00:05',1),c('00:30',1.1)])]});
 assert.equal(r.counts.buys,1);assert.equal(r.counts.sells,0);
 assert.equal(r.open_positions.length,1);
 assert.equal(r.open_positions[0].market_value_test_usdc,null);
 assert.equal(r.verified_real_profit_test_usdc,null);
});

test('volatility guard rejects a wide known price range while preserving WATCH',()=>{
 const r=runResearchPaperLab({date,preset:'volatility_guard',pools:[pool([
 c('00:05',1),c('00:10',3.2),c('00:20',2),c('00:30',2.2)
 ])]});
 assert.equal(r.counts.buys,0);
 assert.equal(r.scans[0].decisions[0].reason,'HIGH_RECENT_CLOSE_RANGE');
});
test('volatility guard can still buy and sell when recent candles are stable',()=>{
 const r=runResearchPaperLab({date,preset:'volatility_guard',pools:[pool([
 c('00:05',1),c('00:15',1.05),c('00:30',1.2),c('01:30',1.6)
 ])]});
 assert.equal(r.counts.buys,1);assert.equal(r.counts.sells,1);
 assert.equal(r.verified_historical_paper_orders,0);
});

test('unbounded backwards feature access includes a prior-year candle, never a future one',()=>{
 const old={known_no_earlier_than_utc:'2025-01-01T00:05:00Z',close_usd:1,volume_usd:5000};
 const day='2026-11-15';
 const fresh={known_no_earlier_than_utc:day+'T00:30:00Z',close_usd:1.1,volume_usd:5000};
 const future={known_no_earlier_than_utc:day+'T00:45:00Z',close_usd:1000,volume_usd:5000};
 const r=runResearchPaperLab({date:day,pools:[pool([old,fresh,future],'2024-01-01T00:00:00Z')]});
 assert.equal(r.scans[0].history_depth_by_coin[0].available_prior_candles,2);
 assert.equal(r.scans[0].history_depth_by_coin[0].oldest_known_candle_at_utc,'2025-01-01T00:05:00.000Z');
 assert.equal(r.scans[0].history_depth_by_coin[0].elapsed_minutes_from_selected_momentum_base>100000,true);
 assert.equal(r.scans[0].decisions[0].action,'BUY_EXPERIMENT');
});
