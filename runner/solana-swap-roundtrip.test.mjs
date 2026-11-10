import test from 'node:test';
import assert from 'node:assert/strict';
import {previewSolanaSwapRoundtrip} from './solana-swap-roundtrip.mjs';
import {SOL_MINT} from './solana-swap-quote.mjs';
const target='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
function pair({
 buyAtoms='24000000',sellLamports='99000000',
 failSell=false,tamperSell=false
}={}){
 const urls=[];
 return {urls,fetcher:async(url,options)=>{
  const u=new URL(url);urls.push(u);
  assert.equal(options.method,'GET');
  assert.equal(u.searchParams.has('taker'),false);
  assert.equal(u.searchParams.has('signedTransaction'),false);
  const buy=u.searchParams.get('inputMint')===SOL_MINT;
  if(!buy&&failSell)return new Response('{}',{status:404});
  if(!buy&&tamperSell)return new Response(JSON.stringify({
   transaction:'some transaction',inAmount:buyAtoms,outAmount:sellLamports,
   feeBps:2,router:'metis'}));
  return new Response(JSON.stringify({
   transaction:null,
   inAmount:buy?'100000000':buyAtoms,
   outAmount:buy?buyAtoms:sellLamports,
   feeBps:buy?4:2,router:buy?'jupiterz':'metis'}),{status:200});
 }};
}
test('observed both directions and loss does not become sellability verified',async()=>{
 const mock=pair();let waited=0;
 const r=await previewSolanaSwapRoundtrip({
  targetMint:target,amountLamports:'100000000',fetcher:mock.fetcher,
  now:()=>new Date('2026-11-10T16:00:00Z').toISOString(),wait:async()=>waited++
 });
 assert.equal(waited,1);
 assert.equal(mock.urls.length,2);
 assert.equal(mock.urls[0].searchParams.get('outputMint'),target);
 assert.equal(mock.urls[1].searchParams.get('inputMint'),target);
 assert.equal(mock.urls[1].searchParams.get('amount'),'24000000');
 assert.equal(r.status,'TWO_QUOTES_OBSERVED');
 assert.equal(r.approximate_roundtrip_change_bps,-100);
 assert.equal(r.trade_executed,false);
 assert.equal(r.sellability_verified,false);
 assert.equal(r.contract_safety_verified,false);
 assert.equal(r.actionable,false);
});
test('failed sell quote, forged transaction, malformed amount block safely',async()=>{
 const down=pair({failSell:true});
 const r=await previewSolanaSwapRoundtrip({
  targetMint:target,amountLamports:'100000000',fetcher:down.fetcher});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.reason,'NO_VALID_REVERSE_QUOTE');
 assert.equal(r.sell_quote,null);
 assert.equal(r.trade_executed,false);
 const forged=await previewSolanaSwapRoundtrip({
  targetMint:target,amountLamports:'100000000',fetcher:pair({tamperSell:true}).fetcher});
 assert.equal(forged.reason,'NO_VALID_REVERSE_QUOTE');
 const invalid=await previewSolanaSwapRoundtrip({
  targetMint:target,amountLamports:'-1',fetcher:pair().fetcher});
 assert.equal(invalid.reason,'INVALID_SOL_AMOUNT');
});
test('even two quotes apparently increasing capital cannot authorize a buy',async()=>{
 const r=await previewSolanaSwapRoundtrip({
  targetMint:target,amountLamports:'100000000',
  fetcher:pair({sellLamports:'105000000'}).fetcher});
 assert.equal(r.approximate_roundtrip_change_bps,500);
 assert.equal(r.sellability_verified,false);
 assert.equal(r.live_enabled,false);
 assert.equal(r.trade_executed,false);
});
