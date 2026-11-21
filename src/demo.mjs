// Offline synthetic test. NEVER writes GitHub or live user paper state.
import { newState, settlePaper } from './core.mjs';
const now=Date.now(),coin={chain:'solana',contract:'DemoContract123456',pool:'DemoPool123456',symbol:'DEMO'};
function order(id,action,price) {
 return {id,mode:'PAPER',action,authority:'dot-4-strategy',
 dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
 reason:'Offline synthetic integration demonstration only',
 created_at:new Date(now).toISOString(),expires_at:new Date(now+60000).toISOString(),coin,
 ...(action==='BUY'?{amount_test_usdc:50}:{}),
 quotes:['source-A','source-B'].map(provider_id=>({provider_id,observed_at:new Date(now).toISOString(),
 price_usdc:price,liquidity_usdc:25000,...coin}))};
}
let state=newState();
for(const o of [order('demo-buy-0001','BUY',0.01),order('demo-sell-0001','SELL',0.012)]) {
 const result=settlePaper(o,state,now);state=result.state;console.log(JSON.stringify(result.receipt,null,2));
}
console.log('DEMO ONLY: no live data, no GitHub signal, no actual account change',state.cash);
