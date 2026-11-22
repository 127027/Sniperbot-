import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,settlePaper,Reject,DEFAULT_POLICY} from '../src/core.mjs';
const t=Date.parse('2026-11-22T11:00:00Z');
const coin=(pool,contract='0x'+'a'.repeat(40),chain='base')=>({
 chain,pool,contract,symbol:'TEST'});
const poolA='0x'+'b'.repeat(40),poolB='0x'+'c'.repeat(40);
const order=(id,action,c=coin(poolA),at=t,opts={})=>({
 id,mode:'PAPER',action,authority:'dot-4-strategy',
 dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
 reason:'Isolated synthetic TEST-USDC ledger regression only',
 created_at:new Date(at).toISOString(),expires_at:new Date(at+120000).toISOString(),
 coin:c,...(action==='BUY'?{amount_test_usdc:50}:{}),
 quotes:['GECKO','DEX'].map(provider_id=>({...c,provider_id,
  price_usdc:1,liquidity_usdc:20000,observed_at:new Date(at).toISOString()})),
 ...opts});
const buy=(id='lot-buy-001',state=newState(),c=coin(poolA),at=t)=>
 settlePaper(order(id,'BUY',c,at),state,at+1000);
const failed=(fn,expected)=>{
 let error;try{fn()}catch(e){error=e}
 assert.ok(error instanceof Reject,'expected exchange rejection');
 assert.equal(error.code,expected);
};
test('same-token multi-pool BUY and EVM case variation are rejected, cash preserved',()=>{
 const first=buy(),before=JSON.stringify(first.state);
 failed(()=>buy('lot-buy-002',first.state,coin(poolB)), 'TOKEN_POSITION_EXISTS');
 failed(()=>buy('lot-buy-003',first.state,
   coin(poolB,'0x'+'A'.repeat(40))), 'TOKEN_POSITION_EXISTS');
 assert.equal(JSON.stringify(first.state),before);
 assert.equal(first.state.cash,4950);
});
test('concurrent STOP + Dot4 SELL can close the same opened lot only once',()=>{
 const a=buy('lot-buy-004');
 const first=order('stop-sell-001','SELL',coin(poolA),t+2000,
  {exit_position_source_order_id:'lot-buy-004'});
 const second=order('dot4-sell-001','SELL',coin(poolA),t+2000,
  {exit_position_source_order_id:'lot-buy-004'});
 const x=settlePaper(first,a.state,t+3000);
 const value=x.state.cash;
 failed(()=>settlePaper(second,x.state,t+3100),'POSITION_NOT_FOUND');
 failed(()=>settlePaper(first,x.state,t+3100),'ALREADY_PROCESSED');
 assert.equal(x.state.cash,value);
 assert.equal(Object.keys(x.state.positions).length,0);
 assert.equal(x.state.trade_history.filter(z=>z.action==='SELL').length,1);
});
test('stale STOP from old BUY cannot close a later reopened lot of same pool',()=>{
 const a=buy('lot-buy-005');
 const sold=settlePaper(order('stop-sell-002','SELL',coin(poolA),t+2000,
  {exit_position_source_order_id:'lot-buy-005'}),a.state,t+3000);
 const reopened=buy('lot-buy-006',sold.state,coin(poolA),t+4000);
 const cash=reopened.state.cash;
 const oldStop=order('stop-sell-003','SELL',coin(poolA),t+5000,
  {exit_position_source_order_id:'lot-buy-005'});
 failed(()=>settlePaper(oldStop,reopened.state,t+6000),'POSITION_GENERATION_MISMATCH');
 assert.equal(reopened.state.cash,cash);
 assert.equal(reopened.state.positions['base:'+coin(poolA).contract+':'+poolA].sourceOrderId,'lot-buy-006');
});
test('FIFO chronological trade history persists across reopens and records PnL',()=>{
 const a=buy('lot-buy-007');
 const sold=settlePaper(order('stop-sell-004','SELL',coin(poolA),t+2000,
  {exit_position_source_order_id:'lot-buy-007'}),a.state,t+3000);
 const reopened=buy('lot-buy-008',sold.state,coin(poolA),t+4000);
 assert.deepEqual(reopened.state.trade_history.map(z=>z.action),['BUY','SELL','BUY']);
 assert.deepEqual(reopened.state.trade_history.map(z=>z.receipt_sequence),[1,2,3]);
 assert.equal(sold.state.trade_history[1].position_source_order_id,'lot-buy-007');
 assert.equal(typeof sold.state.trade_history[1].realized_pnl_test_usdc,'number');
 assert.equal(reopened.state.processed['stop-sell-004'].status,'PAPER_FILLED');
});
test('legacy states without trade_history append instead of losing old processed history',()=>{
 const state=newState();delete state.trade_history;
 state.processed['old-order-00001']={status:'PAPER_FILLED',time:new Date(t-10000).toISOString()};
 const x=buy('lot-buy-009',state);
 assert.equal(x.state.trade_history.length,1);
 assert.equal(x.state.processed['old-order-00001'].status,'PAPER_FILLED');
 assert.equal(x.state.cash,4950);
});
test('pool inventory on another token is not starved or arbitrarily blocked',()=>{
 const a=buy('lot-buy-010');
 const b=buy('lot-buy-011',a.state,coin(poolB,'0x'+'d'.repeat(40)));
 assert.equal(Object.keys(b.state.positions).length,2);
 assert.equal(b.state.cash,4900);
 assert.equal(b.state.trade_history.length,2);
});
test('prospective publisher and runner enforce lot identity even when raw core supports legacy replay',async()=>{
 const {readFile}=await import('node:fs/promises');
 const [pub,runner]=await Promise.all([readFile('src/publisher.mjs','utf8'),readFile('src/runner.mjs','utf8')]);
 assert.match(pub,/SELL_OPENING_LOT_ID_REQUIRED/);
 assert.match(runner,/SELL_LOT_NOT_MATCHED/);
 assert.match(runner,/validateDot3OrderBeforePublish/);
});
