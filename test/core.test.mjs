import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,settlePaper,Reject,gitBlobSha,rejectPaper} from '../src/core.mjs';
const t=Date.parse('2026-11-21T09:00:00Z');
const coin={chain:'solana',contract:'DemoContract123456',pool:'DemoPool123456',symbol:'DEMO'};
function order(id='order-buy-0001',action='BUY',changes={}) {
 const base={id,mode:'PAPER',action,authority:'dot-4-strategy',
 dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
 reason:'Clear strategy and pool risk documentation',
 created_at:new Date(t).toISOString(),expires_at:new Date(t+80000).toISOString(),
 coin,amount_test_usdc:50,quotes:['providerOne','providerTwo'].map(provider_id=>({
 provider_id,price_usdc:1,liquidity_usdc:20000,observed_at:new Date(t).toISOString(),...coin}))};
 return {...base,...changes};
}
function code(fn) {try{fn();return null}catch(e){assert.ok(e instanceof Reject);return e.code;}}
test('buy, sell and isolated balance',()=>{
 const a=settlePaper(order(),newState(),t+1000);
 assert.equal(a.receipt.status,'PAPER_FILLED');assert.equal(a.state.cash,4950);
 const b=settlePaper(order('order-sell-0001','SELL'),a.state,t+2000);
 assert.equal(b.receipt.status,'PAPER_FILLED');assert.equal(Object.keys(b.state.positions).length,0);
 assert.ok(b.state.cash<5000);assert.equal(newState().cash,5000);
});
test('duplicate order is rejected',()=>{
 const a=settlePaper(order(),newState(),t+1000);
 assert.equal(code(()=>settlePaper(order(),a.state,t+2000)),'ALREADY_PROCESSED');
});
test('stale and divergent evidence rejected',()=>{
 assert.equal(code(()=>settlePaper(order(),newState(),t+91000)),'ORDER_EXPIRED');
 assert.equal(code(()=>settlePaper(order('order-buy-0002','BUY',{quotes:order().quotes.map(q=>({
 ...q,price_usdc:q.provider_id==='providerOne'?1:1.1}))}),newState(),t+1000)),'PRICE_DISAGREEMENT');
});
test('live and wrong authority rejected',()=>{
 assert.equal(code(()=>settlePaper(order('order-buy-0003','BUY',{mode:'LIVE'}),newState(),t+1000)),'LIVE_DISABLED');
 assert.equal(code(()=>settlePaper(order('order-buy-0004','BUY',{authority:'other'}),newState(),t+1000)),'UNAUTHORIZED_STRATEGY');
});
test('missing providers, wrong pool, low liquidity rejected',()=>{
 assert.equal(code(()=>settlePaper(order('order-buy-0005','BUY',{quotes:[order().quotes[0]]}),newState(),t+1000)),'MISSING_QUOTES');
 assert.equal(code(()=>settlePaper(order('order-buy-0006','BUY',{quotes:order().quotes.map((q,i)=>({
 ...q,pool:i?'DifferentPool1234':q.pool}))}),newState(),t+1000)),'QUOTE_POOL_MISMATCH');
 assert.equal(code(()=>settlePaper(order('order-buy-0007','BUY',{quotes:order().quotes.map(q=>({
 ...q,liquidity_usdc:1000}))}),newState(),t+1000)),'LOW_LIQUIDITY');
});
test('rejection is idempotent',()=>{
 const a=rejectPaper({id:'order-bad-0001'},newState(),'STALE_QUOTE','too old',t);
 assert.equal(a.state.processed['order-bad-0001'].status,'PAPER_REJECTED');
 assert.deepEqual(rejectPaper({id:'order-bad-0001'},a.state,'STALE_QUOTE','too old',t).state,a.state);
});
test('git blob SHA exact UTF-8',()=>{
 assert.equal(gitBlobSha('hello\n'),'ce013625030ba8dba906f756967f9e9ca394464a');
});
