import test from 'node:test';
import assert from 'node:assert/strict';
import {USDC, WSOL, routeQuote, roundTrip, fxReference} from './providers.mjs';
function fixture(url, opts) {
  const u = new URL(url);
  assert.equal(opts.method, 'GET');
  assert.equal(u.searchParams.has('taker'), false);
  assert.equal(u.pathname, '/swap/v2/order');
  const a = u.searchParams.get('inputMint'), b = u.searchParams.get('outputMint');
  return {ok:true, json:async()=>({inputMint:a,outputMint:b,inAmount:u.searchParams.get('amount'),
    outAmount:a===USDC?'100000000':'49000000',transaction:null,routePlan:[{swapInfo:{label:'fixture'}}]})};
}
test('quote only roundtrip preserves raw quantity and never grants risk PASS',async()=>{
  const r=await roundTrip(WSOL,'50000000',fixture,async()=>{});
  assert.equal(r.sell.in_raw,r.buy.out_raw);
  assert.equal(r.quoted_roundtrip_delta_usdc_raw,'1000000');
  assert.equal(r.risk,'UNKNOWN');assert.equal(r.sellability,'UNKNOWN');
});
test('reject missing route',async()=>{
  await assert.rejects(routeQuote(USDC,WSOL,'50000000',async(u,o)=>{
    const r=await fixture(u,o);const j=await r.json();j.routePlan=[];return {ok:true,json:async()=>j};
  }),/NO_VALID_QUOTE/);
});
test('reject mismatched identity or transaction',async()=>{
  for(const change of [{outputMint:USDC},{transaction:'unexpected'}]){
    await assert.rejects(routeQuote(USDC,WSOL,'50000000',async(u,o)=>{
      const r=await fixture(u,o);const j={...await r.json(),...change};return {ok:true,json:async()=>j};
    }),/NO_VALID_QUOTE/);
  }
});
test('HTTP failure not classified as unsellable',async()=>{
  await assert.rejects(routeQuote(USDC,WSOL,'50000000',async()=>({ok:false,status:429})),/HTTP 429/);
});
test('FX retains reference day, not live price',async()=>{
  const date=new Date().toISOString().slice(0,10);
  const r=await fxReference(async()=>({ok:true,json:async()=>({base:'EUR',date,rates:{USD:1.1}})}));
  assert.equal(r.reference_date,date);assert.equal(r.status,'DAILY_REFERENCE_NOT_LIVE_FX');
  await assert.rejects(fxReference(async()=>({ok:true,json:async()=>({base:'EUR',date:'2000-01-01',rates:{USD:1.1}})})),/STALE/);
});
