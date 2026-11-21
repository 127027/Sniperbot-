import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseCadence} from '../src/cadence.mjs';
import {inspectOrder,newState,Reject} from '../src/core.mjs';
test('volume decline is a valid market measurement, not an INVALID_METRICS failure',()=>{
 const x=chooseCadence({dataAvailable:true,newPools:0,eligible:0,openPositions:0,volumeChangePct:-25,consecutiveQuietChecks:0},24);
 assert.equal(x.target,24);assert.equal(x.reason,'DOWNSHIFT_NEEDS_CONFIRMATION');
 assert.equal(chooseCadence({dataAvailable:true,newPools:0,eligible:0,openPositions:0,volumeChangePct:-25,consecutiveQuietChecks:2},24).target,4);
});
test('invalid negative count still rejected',()=>assert.throws(()=>chooseCadence({dataAvailable:true,newPools:-1},4),/INVALID_METRICS/));
test('paper order cannot be given a far-future expiry',()=>{
 const at=Date.parse('2026-11-21T10:00:00Z');
 const coin={chain:'base',contract:'0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',pool:'0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',symbol:'DEMO'};
 const order={id:'demo-order-001',mode:'PAPER',action:'BUY',authority:'dot-4-strategy',
 dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],reason:'Isolated expiry check only',coin,amount_test_usdc:50,
 created_at:new Date(at).toISOString(),expires_at:new Date(at+3600000).toISOString(),
 quotes:[{...coin,provider_id:'A',price_usdc:.001,liquidity_usdc:20000,observed_at:new Date(at).toISOString()},{...coin,provider_id:'B',price_usdc:.001,liquidity_usdc:20000,observed_at:new Date(at).toISOString()}]};
 assert.throws(()=>inspectOrder(order,newState(),at+1000),e=>e instanceof Reject&&e.code==='ORDER_TTL_TOO_LONG');
});
