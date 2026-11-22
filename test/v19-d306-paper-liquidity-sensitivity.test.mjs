import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEFAULT_POLICY} from '../src/core.mjs';
import {estimatePaperRoundtripFriction,buildLiquiditySensitivityStudy}
 from '../src/v19-paper-liquidity-sensitivity.mjs';
const stamp='2026-11-22T19:00:00.000Z';
const E=i=>'0x'+i.toString(16).padStart(40,'0');
const pool=(i,liquidity)=>({chain:'base',pool:E(i),contract:E(i+80),
 observed_at_utc:stamp,liquidity_usd:liquidity,symbol:'SAME'});
test('D3-06: 50 TEST-USDC against 5000 USD pool satisfies original boundary but incurs spread, impact and fees',()=>{
 const p=estimatePaperRoundtripFriction({liquidityUsd:5000});
 assert.equal(p.entry_amount_test_usdc,50);
 assert.equal(DEFAULT_POLICY.entryAmount,50);
 assert.equal(DEFAULT_POLICY.minLiquidityUsd,5000);
 assert.equal(DEFAULT_POLICY.maxLiquidityUtilizationPct,1);
 assert.equal(p.satisfies_core_min_liquidity,true);
 assert.equal(p.satisfies_core_max_utilization,true);
 assert.equal(p.utilization_pct,1);
 assert.ok(p.model_roundtrip_pnl_test_usdc<0);
 assert.equal(p.trade_authorized,false);
 assert.equal(p.full_buy_eligibility_unverified,true);
});
test('D3-06: less liquidity increases modeled friction; never loosens original risk gates',()=>{
 const values=[2500,5000,10000,20000].map(v=>estimatePaperRoundtripFriction({liquidityUsd:v}));
 assert.equal(values[0].status,'CORE_LIQUIDITY_POLICY_BLOCK');
 assert.ok(values[0].model_roundtrip_pnl_test_usdc<values[1].model_roundtrip_pnl_test_usdc);
 assert.ok(values[1].model_roundtrip_pnl_test_usdc<values[2].model_roundtrip_pnl_test_usdc);
 assert.ok(values[2].model_roundtrip_pnl_test_usdc<values[3].model_roundtrip_pnl_test_usdc);
 assert.ok(values.every(x=>x.trade_authorized===false));
});
test('D3-06: unknown liquidity stays unknown, zero is never treated as eligible',()=>{
 const n=estimatePaperRoundtripFriction({liquidityUsd:null});
 assert.equal(n.status,'UNKNOWN_POOL_LIQUIDITY');
 assert.equal(n.model_roundtrip_pnl_test_usdc,null);
 assert.equal(n.policy_eligible,false);
 assert.equal(estimatePaperRoundtripFriction({liquidityUsd:0}).status,'UNKNOWN_POOL_LIQUIDITY');
});
test('D3-06: all as-of valid pools retained; future and hindsight winner rows rejected',()=>{
 const s=buildLiquiditySensitivityStudy({asOfUtc:stamp,
 candidates:[pool(1,3000),pool(2,12000),
  {...pool(3,15000),observed_at_utc:'2026-11-23T00:00:00Z'},
  {...pool(4,10000),reported_gain_pct:5000}]});
 assert.equal(s.total_raw_candidate_rows,4);
 assert.equal(s.included_pool_rows,2);
 assert.equal(s.excluded_rows,2);
 assert.equal(s.scenarios[0].scenarios.length,4);
 assert.equal(s.observed_false_buy_count,null);
 assert.equal(s.policy_changes_applied,false);
 assert.equal(s.orders_authorized,0);
});
test('D3-06: risk floor and fixed 50 amount remain unchanged in real capture runner',async()=>{
 const runner=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(runner,/buildLiquiditySensitivityStudy\(\{/);
 assert.match(runner,/entryAmountTestUsdc:50/);
 assert.match(runner,/paper-liquidity-sensitivity\.json/);
 assert.match(runner,/applied_policy_changes:false/);
});
