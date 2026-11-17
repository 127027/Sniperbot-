import test from 'node:test';
import assert from 'node:assert/strict';
import {ASOF,addAsOfEvent} from './neutral-next20-minute-gpt-candidate-frame.mjs';
const mint='9'.repeat(44),pool='8'.repeat(44);
const event={
 action:'buy',timestamp:Date.parse('2026-09-18T01:05:00Z')/1000,
 localTimestamp:Date.parse('2026-09-18T01:05:00.300Z'),
 mint,pool,quoteMint:'So11111111111111111111111111111111111111112',
 protocol:'PUMPSWAP',tradersInvolved:['7'.repeat(44)],
 quoteAmount:0.2,price:0.00001,quoteInPool:25};
test('next virtual source scan is exactly 01:20, not lookahead',()=>{
 assert.equal(ASOF,'2026-09-18T01:20:00Z');
 const m=new Map();assert.equal(addAsOfEvent(m,event),true);
 assert.equal(m.size,1);
 assert.throws(()=>addAsOfEvent(m,{...event,localTimestamp:Date.parse('2026-09-18T01:20:01Z')}),/FUTURE/);
});
test('early prior-hour 00:05 data cannot be mistakenly relabeled as source 01:20 events',()=>{
 assert.throws(()=>addAsOfEvent(new Map(),{...event,localTimestamp:Date.parse('2026-09-18T00:05:00Z')}),/FUTURE/);
});
