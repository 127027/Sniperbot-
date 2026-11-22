import test from 'node:test';
import assert from 'node:assert/strict';
import {compareFrozenExitScenarios,EXIT_EXPERIMENT_POLICIES}
 from '../src/v19-exit-counterfactual.mjs';
const frozen='2026-10-11T23:00:00Z',at='2026-10-12T00:00:00Z';
const horizon='2026-10-12T02:00:00Z';
const input=(sequence)=>({entry:{at_utc:at,price_usd:1,liquidity_usd:100000,
 source_path:'research/feeds/real-asof-original.json',source_class:'ORIGINAL_CAPTURE'},
 observations:sequence.map(([time,price,L=100000])=>({
 observed_at_utc:'2026-10-12T'+time+':00Z',price_usd:price,
 liquidity_usd:L,source_class:'ORIGINAL_CAPTURE',
 source_path:'research/observations/'+time+'.json'})),
 policyFrozenAtUtc:frozen,asOfUtc:horizon,horizonMinutes:120});
const variant=(r,s)=>r.variants.find(x=>x.policy===s);
test('D4-03: fixed TP20 can sell earlier than trailing strategy, with per-exit fees and simulated impact',()=>{
 const r=compareFrozenExitScenarios(input([['00:15',1.22],['00:30',1.45],
 ['01:00',1.38],['01:30',1.18],['02:00',1.16]]));
 const base=variant(r,'BASELINE_TP20_SL10');
 const trail=variant(r,'TRAIL_TP20_DD12_SL10');
 const partial=variant(r,'PARTIAL_TP20_TRAIL12_SL10');
 assert.equal(base.exits[0].reason,'FIXED_TAKE_PROFIT_20');
 assert.equal(base.exits[0].observed_price_usd,1.22);
 assert.equal(trail.exits[0].reason,'TRAIL_12_PERCENT_FROM_OBSERVED_PEAK');
 assert.equal(trail.exits[0].observed_price_usd,1.18);
 assert.equal(partial.exits[0].reason,'PARTIAL_AT_20');
 assert.equal(partial.exits.length,2);
 assert.ok(Number.isFinite(base.modeled_realized_pnl_test_usdc));
 assert.ok(Number.isFinite(trail.modeled_realized_pnl_test_usdc));
 assert.ok(r.variants.every(x=>x.actual_paper_fill===false&&x.actual_receipt===null));
 assert.equal(r.trade_authorized,false);
});
test('D4-03: losing path stops consistently, without unrealistic 1-hour return promises',()=>{
 const r=compareFrozenExitScenarios(input([['00:15',.98],['00:30',.84],['02:00',.9]]));
 assert.ok(r.variants.every(x=>x.exits[0]?.reason==='STOP_LOSS_10'));
 assert.ok(r.variants.every(x=>x.modeled_realized_pnl_test_usdc<0));
 assert.ok(r.variants.every(x=>x.closed_in_shadow));
});
test('D4-03: missing horizon or missing liquidity cannot yield a fake PAPER_FILLED or estimated complete PnL',()=>{
 const partial=compareFrozenExitScenarios(input([['00:15',1.21],['00:30',1.15]]));
 const trail=variant(partial,'TRAIL_TP20_DD12_SL10');
 assert.equal(trail.modeled_realized_pnl_test_usdc,null);
 assert.equal(trail.unclosed_quantity>0,true);
 assert.equal(trail.incomplete_pnl_if_position_still_open,true);
 const liquid=compareFrozenExitScenarios(input([['00:15',1.21,100],
   ['00:30',1.4,100],['02:00',1.1,100]]));
 assert.equal(variant(liquid,'BASELINE_TP20_SL10').modeled_realized_pnl_test_usdc,null);
 assert.ok(variant(liquid,'BASELINE_TP20_SL10').blocked.length>0);
});
test('D4-03: explicitly reject post-event winner data, non-original price sources and future observations',()=>{
 assert.throws(()=>compareFrozenExitScenarios({
  ...input([['00:30',1.2]]),
  entry:{...input([]).entry,reported_gain_pct:5000}
 }),/INVALID_FROZEN_EXIT_ENTRY/);
 const r=compareFrozenExitScenarios({...input([['00:30',1.25]]),
  observations:[{observed_at_utc:'2026-10-12T01:00:00Z',
   price_usd:2,liquidity_usd:20000,
   source_class:'POST_EVENT_ORACLE',source_path:'research/winners/x.json'},
   {observed_at_utc:'2026-10-13T00:00:00Z',price_usd:3,
    liquidity_usd:20000,source_path:'research/feeds/future.json',
    source_class:'ORIGINAL_CAPTURE'}]});
 assert.equal(r.rejected_ticks,2);
 assert.equal(r.observed_price_ticks,0);
 assert.ok(r.variants.every(x=>x.modeled_realized_pnl_test_usdc===null));
 assert.throws(()=>compareFrozenExitScenarios({...input([]),
    policyFrozenAtUtc:'2026-10-12T00:01:00Z'}),/INVALID_FROZEN_EXIT_ENTRY/);
});
test('D4-03: policies fixed before prospective evaluation; original baseline remains present',()=>{
 assert.deepEqual(EXIT_EXPERIMENT_POLICIES,[
 'BASELINE_TP20_SL10','TRAIL_TP20_DD12_SL10',
 'PARTIAL_TP20_TRAIL12_SL10','TIME_STOP_60M_TP20_SL10'
 ]);
 assert.equal(compareFrozenExitScenarios(input([])).variants.length,4);
});
