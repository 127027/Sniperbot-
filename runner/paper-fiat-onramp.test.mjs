import test from 'node:test';
import assert from 'node:assert/strict';
import {quotePaperFunding,applyPaperFunding} from './paper-fiat-onramp.mjs';
const now=Date.parse('2026-11-10T12:00:00Z');
const state=()=>({entriesEnabled:false,cashUsdc:0,positions:[],minTrade:50,
 maxTrade:50,portfolioBudgetUsdc:50});
const quote=(extra={})=>quotePaperFunding({eur_amount:50,eur_per_usdc:0.92,
 provider_fee_eur:1,spread_pct:1,network_fee_usdc:0.2,
 rate_observed_at_utc:new Date(now).toISOString(),now,...extra});
test('50 EUR example computes fees and net paper USDC without performing payments',()=>{
 const q=quote();
 assert.equal(q.status,'PAPER_QUOTED');
 assert.equal(q.paper_only,true);
 assert.equal(q.payment_performed,false);
 assert(q.expected_test_usdc>50&&q.expected_test_usdc<54);
 const funded=applyPaperFunding(state(),q,{now});
 assert.equal(funded.cashUsdc,q.expected_test_usdc);
 assert.equal(funded.paperFundingInitialized,true);
 assert.equal(funded.positions.length,0);
 assert.throws(()=>applyPaperFunding(funded,q,{now}),/ALREADY_INITIALIZED/);
});
test('no LIVE or real payment provider transaction is possible',()=>{
 assert.equal(quote({mode:'LIVE'}).reason,'REAL_FUNDS_DISABLED');
 assert.equal(quote({provider:'PAYPAL'}).reason,'REAL_PROVIDER_DISABLED');
 assert.equal(quote({provider:'COINBASE'}).reason,'REAL_PROVIDER_DISABLED');
});
test('outdated rate, excessive fees, invalid spread and expired quote fail closed',()=>{
 assert.equal(quote({rate_observed_at_utc:new Date(now-70000).toISOString()}).reason,'STALE_OR_UNKNOWN_EXCHANGE_RATE');
 assert.equal(quote({provider_fee_eur:50}).reason,'FEES_EXCEED_DEPOSIT');
 assert.equal(quote({spread_pct:101}).reason,'INVALID_FUNDING_PARAMETERS');
 assert.throws(()=>applyPaperFunding(state(),quote(),{now:now+60001}),/QUOTE_INVALID/);
});
test('cannot silently change existing open positions or active paper bot',()=>{
 const q=quote();
 assert.throws(()=>applyPaperFunding({...state(),entriesEnabled:true},q,{now}),/PAUSED_EMPTY/);
 assert.throws(()=>applyPaperFunding({...state(),positions:[{id:'existing'}]},q,{now}),/PAUSED_EMPTY/);
});
