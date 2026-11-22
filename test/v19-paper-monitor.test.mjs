import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPaperMonitoring} from '../src/v19-paper-monitor.mjs';
import {renderDashboard} from '../src/dashboard.mjs';
import {DEFAULT_POLICY,newState} from '../src/core.mjs';

const at='2026-11-22T14:00:00.000Z';
const state=()=>{
 const s=newState();
 s.cash=4975;
 s.positions['base:abc:def']={coin:{chain:'base',
  symbol:'<script>alert(1)</script>',pool:'0x'+'b'.repeat(40),
  contract:'0x'+'a'.repeat(40)},quantity:25,entryPrice:1,
  costTestUsdc:25,openedAt:'2026-11-22T13:45:00.000Z',
  sourceOrderId:'buy-lot-0001'};
 s.processed['buy-lot-0001']={status:'PAPER_FILLED'};
 s.receipts['buy-lot-0001']={published:false,data:{
  id:'buy-lot-0001',action:'BUY',status:'PAPER_FILLED',
  timestamp:'2026-11-22T13:50:00.000Z'}};
 s.receipts['bad-order-0002']={published:true,data:{
  id:'bad-order-0002',status:'PAPER_REJECTED',
  reason_code:'DOT3_AUTH_NOT_VERIFIED',
  timestamp:'2026-11-22T13:55:00.000Z'}};
 return s;
};
test('monitor reports persisted cash, stake, open cost, receipt lag, and reasons',()=>{
 const s=state(),p=projectPaperMonitoring({state:s,policy:DEFAULT_POLICY,nowUtc:at});
 assert.equal(p.cash_test_usdc,4975);
 assert.equal(p.stake_per_coin_test_usdc,50);
 assert.equal(p.max_positions,30);
 assert.equal(p.open_cost_basis_test_usdc,25);
 assert.equal(p.positions.length,1);
 assert.equal(p.pending_receipts_in_last_30,1);
 assert.equal(p.receipts.find(r=>r.id==='buy-lot-0001').delivery_delay_minutes,10);
 assert.equal(p.receipts.find(r=>r.id==='bad-order-0002').reason_code,'DOT3_AUTH_NOT_VERIFIED');
 assert.equal(p.receipts.find(r=>r.id==='bad-order-0002').published,true);
});
test('missing quote age, risk proof, and exit liquidity never generate fake PnL',()=>{
 const p=projectPaperMonitoring({state:state(),nowUtc:at});
 assert.equal(p.positions[0].quote_state,'NO_CAPTURE');
 assert.equal(p.positions[0].capture_age_seconds,null);
 assert.equal(p.positions[0].current_pnl_test_usdc,null);
 assert.equal(p.positions[0].estimated_current_market_value_test_usdc,null);
 assert.equal(p.positions[0].verified_dot3_risk_status,'UNKNOWN_NO_ATTESTED_RISK');
 assert.equal(p.positions[0].actual_sellability_proven,false);
 assert.equal(p.no_real_time_market_feed_claimed,true);
});
test('reported capture age is labeled unverified and does not become an exchange quote',()=>{
 const s=state();
 s.positions['base:abc:def'].last_market_observation={
  captured_at_utc:'2026-11-22T13:59:00.000Z',
  provider_quote_asof_utc:'2026-11-22T13:58:55.000Z'};
 const p=projectPaperMonitoring({state:s,nowUtc:at}).positions[0];
 assert.equal(p.capture_age_seconds,60);
 assert.equal(p.quote_state,'PROVIDER_TIME_REPORTED_UNATTESTED');
 assert.equal(p.quote_is_not_independently_verified,true);
 assert.equal(p.current_pnl_test_usdc,null);
});
test('future quote is not shown as fresh or valid',()=>{
 const s=state();
 s.positions['base:abc:def'].last_market_observation={
  captured_at_utc:'2026-11-22T15:00:00.000Z'};
 const p=projectPaperMonitoring({state:s,nowUtc:at}).positions[0];
 assert.equal(p.capture_age_seconds,null);
 assert.equal(p.quote_state,'FUTURE_CAPTURE_INVALID');
});
test('dashboard escapes untrusted coin data and shows honest data gap and policy',()=>{
 const html=renderDashboard(state(),{policy:DEFAULT_POLICY,nowUtc:at});
 assert.match(html,/PAPER ONLY/);
 assert.match(html,/Einsatz\/Coin/);
 assert.match(html,/50\.00/);
 assert.match(html,/Ausstehend seit 10 min/);
 assert.match(html,/DOT3_AUTH_NOT_VERIFIED/);
 assert.match(html,/Keine verifizierte Dot-3-Prüfung/);
 assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
 assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
test('rendering is pure: no existing cash, receipt or position is mutated',()=>{
 const s=state(),before=JSON.stringify(s);
 renderDashboard(s,{policy:DEFAULT_POLICY,nowUtc:at});
 assert.equal(JSON.stringify(s),before);
 assert.equal(s.cash,4975);
});
test('invalid account mode cannot be mistaken for a read-only PAPER wallet',()=>{
 const s=state();s.mode='LIVE';
 assert.throws(()=>projectPaperMonitoring({state:s,nowUtc:at}),
  /INVALID_PAPER_MONITOR_SOURCE/);
});
