import test from 'node:test';
import assert from 'node:assert/strict';
import {computePrivateGptCapacity,validatePrivateGptCapacity} from './gpt-paper-capacity-report.mjs';
const now='2026-11-17T09:00:00Z';
const state=cash=>({cashUsdc:cash,cashEur:0,positions:[],
 maxTrade:5000,portfolioBudgetUsdc:5000,minTrade:50,real_trading_enabled:false});
test('private GPT offer respects owner-selected Paper portfolio cap and cash, not 1% equity',()=>{
 const x=computePrivateGptCapacity(state(4999),{observed_at_utc:now});
 assert.equal(x.can_buy,true);
 assert.equal(x.minimum_approved_buy_test_usdc,5);
 assert.equal(x.maximum_approved_buy_test_usdc,4999);
 assert.equal(x.private_authenticated_delivery_only,true);
 assert.equal(x.do_not_publish_public_github,true);
 assert.equal(validatePrivateGptCapacity(x,{asof_utc:'2026-11-17T09:01:00Z',requested_test_usdc:5000}).approved,false);
 assert.equal(validatePrivateGptCapacity(x,{asof_utc:'2026-11-17T09:01:00Z',requested_test_usdc:250}).approved,true);
 assert.equal(validatePrivateGptCapacity(x,{asof_utc:'2026-11-17T09:01:00Z',requested_test_usdc:49.99}).approved,true);
});
test('open position reserves, technical risk cap and cash all constrain amount',()=>{
 const s=state(5000);s.positions=[{amountUsdc:340}];
 const x=computePrivateGptCapacity(s,{observed_at_utc:now,technical_max_stake_test_usdc:900});
 assert.equal(x.can_buy,false,'Position without fresh mark cannot inflate approved spending');
 const y=computePrivateGptCapacity(s,{observed_at_utc:now});
 assert.equal(y.can_buy,false);
});
test('EUR is never treated as one-to-one USDC even when FX is allegedly verified',()=>{
 const s=state(100);s.cashEur=4900;
 const x=computePrivateGptCapacity(s,{observed_at_utc:now});
 assert.equal(x.can_buy,false);
 assert.match(x.reason,/EUR_MUST_BE_CONVERTED/);
});
test('low capacity, stale snapshot or live-money context always fail closed',()=>{
 assert.equal(computePrivateGptCapacity(state(4.99),{observed_at_utc:now}).can_buy,false);
 assert.equal(computePrivateGptCapacity(state(4999.01),{observed_at_utc:now}).maximum_approved_buy_test_usdc,4999.01);
 const x=computePrivateGptCapacity(state(5000),{observed_at_utc:now});
 assert.equal(validatePrivateGptCapacity(x,{asof_utc:'2026-11-17T09:05:00Z',requested_test_usdc:100}).approved,false);
 assert.equal(computePrivateGptCapacity({...state(5000),realTradingEnabled:true},{observed_at_utc:now}).can_buy,false);
});

test('V5.5 private GPT offer honors owner reserve and fresh valuation, not old 1%/3% veto',()=>{
 const base=state(4870);
 base.positions=[{amountUsdc:130,qty:130,priceUsd:1,markAt:now}];
 const x=computePrivateGptCapacity(base,{observed_at_utc:now});
 assert.equal(x.can_buy,true);
 assert.equal(x.maximum_approved_buy_test_usdc,4870,
  'virtual available cash and owner total exposure budget bound a GPT stake');
 assert.equal(validatePrivateGptCapacity(x,{asof_utc:now,
  requested_test_usdc:25}).approved,true);
 assert.equal(validatePrivateGptCapacity(x,{asof_utc:now,
  requested_test_usdc:15}).approved,true);
 const full=state(4855);
 full.positions=[{amountUsdc:145,qty:145,priceUsd:1,markAt:now}];
 const blocked=computePrivateGptCapacity(full,{observed_at_utc:now});
 assert.equal(blocked.can_buy,true,'owner Paper budget still has unreserved cash');
 assert.equal(blocked.maximum_approved_buy_test_usdc,4855);
});


test('V5.7 signed GPT Paper uses actual free cash, not retired total cap',()=>{
 const s=state(5000);s.portfolioBudgetUsdc=200;
 const x=computePrivateGptCapacity(s,{observed_at_utc:now});
 assert.equal(x.maximum_approved_buy_test_usdc,5000);
 assert.equal(x.configured_coin_stake_test_usdc,50);
 const position=state(4980);position.portfolioBudgetUsdc=200;
 position.positions=[{amountUsdc:20,qty:20,priceUsd:1,markAt:now}];
 assert.equal(computePrivateGptCapacity(position,{observed_at_utc:now}).maximum_approved_buy_test_usdc,4980);
 assert.equal(computePrivateGptCapacity(s,{observed_at_utc:now,
  technical_max_stake_test_usdc:80}).maximum_approved_buy_test_usdc,80);
 const less=state(100);less.paperCoinStakeUsdc=250;
 assert.equal(computePrivateGptCapacity(less,{observed_at_utc:now}).maximum_approved_buy_test_usdc,100);
 assert.equal(computePrivateGptCapacity(less,{observed_at_utc:now}).configured_coin_stake_test_usdc,250);
});
