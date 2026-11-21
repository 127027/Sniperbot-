import test from 'node:test';
import assert from 'node:assert/strict';
import {replayHistoricalDay} from '../src/historical-replay.mjs';
const day='2026-10-12';
test('one day contains 24 wakes per Dot and four 6h full reviews',()=>{
 const r=replayHistoricalDay({date:day,point_in_time_decisions:[]});
 assert.equal(r.roles_wakes,120);
 assert.deepEqual(r.reviews.map(x=>x.at_utc),['2026-10-12T00:35:00.000Z','2026-10-12T06:35:00.000Z','2026-10-12T12:35:00.000Z','2026-10-12T18:35:00.000Z']);
 assert.equal(r.ending_cash_test_usdc,5000);
 assert.equal(r.synthetic_replay_fills,0);
});
test('later publication is never a valid contemporaneous source',()=>{
 const now='2026-10-12T00:35:00.000Z',contract='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',pool='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
 const coin={chain:'base',contract,pool,symbol:'DUMMY'};
 const urls=['https://www.geckoterminal.com/base/pools/'+pool,'https://dexscreener.com/base/'+pool];
 const order={id:'synthetic-order-0001',mode:'PAPER',action:'BUY',authority:'dot-4-strategy',dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],reason:'Synthetic replay test order and no live market claim',coin,amount_test_usdc:50,quote_quality:'INDICATIVE_WEB_ONLY',created_at:now,expires_at:'2026-10-12T00:39:00.000Z',quotes:urls.map((source_url,i)=>({...coin,provider_id:'site-'+i,source_url,observed_at:'2026-10-12T00:34:00.000Z',price_usdc:.001,liquidity_usdc:20000}))};
 const e=urls.map(source_url=>({pool,source_url,observed_at_utc:'2026-10-12T00:34:00.000Z',source_published_at_utc:'2026-10-13T00:00:00.000Z'}));
 const bad=replayHistoricalDay({date:day,point_in_time_decisions:[{issued_at_utc:now,order,evidence:e}]});
 assert.equal(bad.synthetic_replay_fills,0);
 assert.equal(bad.synthetic_replay_executions[0].status,'BLOCKED_NO_POINT_IN_TIME_EVIDENCE');
});
test('completely synthetic BUY then SELL demonstrates isolated engine, never real fill',()=>{
 const pool='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',coin={chain:'base',contract:'0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',pool,symbol:'DUMMY'};
 const urls=['https://www.geckoterminal.com/base/pools/'+pool,'https://dexscreener.com/base/'+pool];
 const make=(at,action,price,id)=>{
  const tick=Date.parse(at),before=new Date(tick-60000).toISOString(),pub=new Date(tick-30000).toISOString();
  return {issued_at_utc:at,order:{id,mode:'PAPER',action,authority:'dot-4-strategy',dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],reason:'Fully synthetic price sources supplied only to isolated unit test',coin,amount_test_usdc:action==='BUY'?50:null,quote_quality:'INDICATIVE_WEB_ONLY',created_at:at,expires_at:new Date(tick+180000).toISOString(),quotes:urls.map((source_url,i)=>({...coin,provider_id:'source-'+i,source_url,observed_at:before,price_usdc:price,liquidity_usdc:20000}))},evidence:urls.map(source_url=>({source_url,pool,observed_at_utc:before,source_published_at_utc:pub}))};
 };
 const r=replayHistoricalDay({date:day,point_in_time_decisions:[make('2026-10-12T00:35:00.000Z','BUY',.001,'synthetic-buy-0001'),make('2026-10-12T06:35:00.000Z','SELL',.002,'synthetic-sell-0001')]});
 assert.equal(r.synthetic_replay_fills,2);
 assert.equal(r.executed_real_dot_orders,0);
 assert.equal(r.real_client_receipts,0);
 assert.equal(r.open_replay_positions,0);
 assert.ok(r.ending_cash_test_usdc>5000);
});
test('invalid date and target cannot be silently normalized',()=>{
 assert.throws(()=>replayHistoricalDay({date:'2026-10-12',reviewTarget:5}),/INVALID_REVIEW_TARGET/);
 assert.throws(()=>replayHistoricalDay({date:'2026/10/12'}),/INVALID_REPLAY_DATE/);
});
