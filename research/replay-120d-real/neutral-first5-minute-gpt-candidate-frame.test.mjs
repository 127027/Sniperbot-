import test from 'node:test';
import assert from 'node:assert/strict';
import {addAsOfEvent,ASOF} from './neutral-first5-minute-gpt-candidate-frame.mjs';
const at=Date.parse('2026-09-18T00:01:30Z');
const mint='5'.repeat(44),pool='4'.repeat(44),sol='So11111111111111111111111111111111111111112';
const event={
 action:'buy',timestamp:at/1000,localTimestamp:at+200,
 mint,pool,quoteMint:sol,protocol:'PUMPFUN',
 quoteAmount:0.45,tokenAmount:100000,price:0.0000045,
 quoteInPool:44.1,tokensInPool:10000000,
 tradersInvolved:['9'.repeat(44),'8'.repeat(44)]
};
test('valid first 5 minute event gives only early asof metrics',()=>{
 const m=new Map();assert.equal(addAsOfEvent(m,event),true);
 const r=m.get(mint+':'+pool);
 assert.equal(r.observed_buys,1);
 assert.equal(r.observed_sells,0);
 assert.equal(r.observed_unique_buying_wallets.size,2);
 assert.equal(r.buy_quote_volume_original_asset,0.45);
 assert.equal(r.most_recent_trade_price_original_quote,0.0000045);
 assert.equal(r.quote_currency,'SOL');
 assert.equal(r.early_historical_bidirectional_pool_execution_proven,false);
 assert.equal(r.creator_risk_asof_verified,'UNKNOWN');
});
test('reject future published event and bad original capture',()=>{
 const m=new Map();
 assert.throws(()=>addAsOfEvent(m,{...event,localTimestamp:Date.parse('2026-09-18T00:06:01Z')}),/FUTURE/);
 assert.throws(()=>addAsOfEvent(m,{...event,timestamp:Date.parse('2026-09-18T00:06:01Z')/1000}),/FUTURE/);
 assert.throws(()=>addAsOfEvent(m,{...event,localTimestamp:Date.parse('2026-09-17T23:59:59Z')}),/FUTURE/);
 assert.equal(m.size,0);
});
test('sell observed before time window does not prove personal exit route',()=>{
 const m=new Map();
 addAsOfEvent(m,{...event,action:'sell',tradersInvolved:['7'.repeat(44)]});
 const r=m.get(mint+':'+pool);
 assert.equal(r.observed_sells,1);
 assert.equal(r.early_historical_bidirectional_pool_execution_proven,false);
});
test('never silently convert coin/quote-asset to USDC',()=>{
 const m=new Map();
 addAsOfEvent(m,{...event,quoteMint:'7'.repeat(44)});
 const r=m.get(mint+':'+pool);
 assert.equal(r.quote_currency,'OTHER_OR_UNKNOWN');
 assert.equal(r.observed_non_sol_quote,true);
});
