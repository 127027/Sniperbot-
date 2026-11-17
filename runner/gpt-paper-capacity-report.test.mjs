import test from 'node:test';
import assert from 'node:assert/strict';
import {computePrivateGptCapacity,validatePrivateGptCapacity} from './gpt-paper-capacity-report.mjs';
const now='2026-11-17T09:00:00Z';
const state=cash=>({cashUsdc:cash,cashEur:0,positions:[],
 maxTrade:5000,portfolioBudgetUsdc:5000,minTrade:50,real_trading_enabled:false});
test('bot can reply 50-4999 without authorizing a coin or an order',()=>{
 const x=computePrivateGptCapacity(state(4999),{observed_at_utc:now});
 assert.equal(x.can_buy,true);
 assert.equal(x.minimum_approved_buy_test_usdc,50);
 assert.equal(x.maximum_approved_buy_test_usdc,4999);
 assert.equal(x.private_authenticated_delivery_only,true);
 assert.equal(x.do_not_publish_public_github,true);
 assert.equal(validatePrivateGptCapacity(x,{asof_utc:'2026-11-17T09:01:00Z',requested_test_usdc:5000}).approved,false);
 assert.equal(validatePrivateGptCapacity(x,{asof_utc:'2026-11-17T09:01:00Z',requested_test_usdc:4999}).approved,true);
});
test('open position reserves, technical risk cap and cash all constrain amount',()=>{
 const s=state(5000);s.positions=[{amountUsdc:340}];
 const x=computePrivateGptCapacity(s,{observed_at_utc:now,technical_max_stake_test_usdc:900});
 assert.equal(x.maximum_approved_buy_test_usdc,900);
 const y=computePrivateGptCapacity(s,{observed_at_utc:now});
 assert.equal(y.maximum_approved_buy_test_usdc,4660);
});
test('EUR is never treated as one-to-one USDC even when FX is allegedly verified',()=>{
 const s=state(100);s.cashEur=4900;
 const x=computePrivateGptCapacity(s,{observed_at_utc:now});
 assert.equal(x.can_buy,false);
 assert.match(x.reason,/EUR_MUST_BE_CONVERTED/);
});
test('low capacity, stale snapshot or live-money context always fail closed',()=>{
 assert.equal(computePrivateGptCapacity(state(49.99),{observed_at_utc:now}).can_buy,false);
 const x=computePrivateGptCapacity(state(5000),{observed_at_utc:now});
 assert.equal(validatePrivateGptCapacity(x,{asof_utc:'2026-11-17T09:05:00Z',requested_test_usdc:100}).approved,false);
 assert.equal(computePrivateGptCapacity({...state(5000),realTradingEnabled:true},{observed_at_utc:now}).can_buy,false);
});
