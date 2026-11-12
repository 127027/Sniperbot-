import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from './core.mjs';
import {suggestPaperAllocation,assessStagnation} from './paper-lifecycle-policy.mjs';
const h=3600000;
const t=Date.parse('2026-11-12T08:00:00.000Z');
function s(){return {...freshState(),cashUsdc:450,minTrade:50,maxTrade:500,
 portfolioBudgetUsdc:500,positions:[{id:'first',amountUsdc:50}]}}
const opts={liquidityUsd:200000,riskApproved:true,sellRouteVerified:true};
test('50 invested + 450 available => 100% proposal is 450, NOT 500',()=>{
 const r=suggestPaperAllocation({state:s(),percent:100,...opts});
 assert.equal(r.status,'ADVISORY_ONLY');assert.equal(r.amount_test_usdc,450);
 assert.equal(r.free_before_test_usdc,450);
});
test('50% available is 225; zero or unverified safety never allocates',()=>{
 assert.equal(suggestPaperAllocation({state:s(),percent:50,...opts}).amount_test_usdc,225);
 for(const percent of [-1,101,NaN,0])
   assert.equal(suggestPaperAllocation({state:s(),percent,...opts}).amount_test_usdc,0);
 assert.equal(suggestPaperAllocation({state:s(),percent:100,liquidityUsd:200000}).status,'BLOCKED');
});
test('pool capacity and budget independently cap proposed allocation',()=>{
 assert.equal(suggestPaperAllocation({state:s(),percent:100,liquidityUsd:20000,
 riskApproved:true,sellRouteVerified:true}).amount_test_usdc,100);
 assert.equal(suggestPaperAllocation({state:s(),percent:100,liquidityUsd:2000,
 riskApproved:true,sellRouteVerified:true}).status,'BLOCKED');
});
function pos(opened=t-96*h){return {openedAt:new Date(opened).toISOString(),entryPriceUsd:.0001}}
function observations(last=t){return [
 {at:new Date(last-30*h).toISOString(),priceUsd:.0001,uniqueBuyers:40,independentBuyersVerified:true,sellRouteVerified:true},
 {at:new Date(last-12*h).toISOString(),priceUsd:.000101,uniqueBuyers:38,independentBuyersVerified:true,sellRouteVerified:true},
 {at:new Date(last).toISOString(),priceUsd:.000099,uniqueBuyers:36,independentBuyersVerified:true,sellRouteVerified:true}
]}
test('stagnant position yields advisory review, NOT a sale',()=>{
 const r=assessStagnation({position:pos(),observations:observations(),now:t});
 assert.equal(r.status,'EXIT_REVIEW');assert.equal(r.actionable,false);
});
test('timer alone and stale or missing data cannot auto-exit',()=>{
 assert.equal(assessStagnation({position:pos(t-12*h),observations:observations(),now:t}).status,'HOLD_REVIEW');
 assert.equal(assessStagnation({position:pos(),observations:null,now:t}).status,'HOLD_REVIEW');
 assert.equal(assessStagnation({position:pos(),observations:observations(t-10*h),now:t}).reason,'LATEST_PRICE_OR_ROUTE_STALE');
 const missing=observations();missing[1].sellRouteVerified=false;
 assert.equal(assessStagnation({position:pos(),observations:missing,now:t}).status,'HOLD_REVIEW');
});
test('price growth or newly accelerating buyer activity blocks idle exit',()=>{
 const run=observations();run[2].priceUsd=.0002;
 assert.equal(assessStagnation({position:pos(),observations:run,now:t}).reason,'PRICE_ACCELERATION_NOT_STAGNANT');
 const buyers=observations();buyers[2].uniqueBuyers=100;
 assert.equal(assessStagnation({position:pos(),observations:buyers,now:t}).reason,'BUYER_ACCELERATION_PRESENT');
});
