import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchIndicativeSolanaQuote,SOL_MINT,JUPITER_V2_ORDER} from './solana-swap-quote.mjs';
const target='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
test('quote-only Jupiter V2 sees exact target mint and amount; never places order',async()=>{
 const fetcher=async(url,opts)=>{
  const u=new URL(url);
  assert.equal(u.origin,new URL(JUPITER_V2_ORDER).origin);
  assert.equal(u.pathname,'/swap/v2/order');
  assert.equal(opts.method,'GET');
  assert.equal(u.searchParams.get('inputMint'),SOL_MINT);
  assert.equal(u.searchParams.get('outputMint'),target);
  assert.equal(u.searchParams.get('amount'),'100000000');
  assert.equal(u.searchParams.has('taker'),false);
  return new Response(JSON.stringify({transaction:null,inAmount:'100000000',
   outAmount:'23120000',feeBps:2,router:'metis'}),{status:200});
 };
 const quote=await fetchIndicativeSolanaQuote({outputMint:target,
  amountLamports:'100000000',fetcher});
 assert.equal(quote.output_token_atoms,'23120000');
 assert.equal(quote.trade_executed,false);
 assert.equal(quote.transaction_signed,false);
 assert.equal(quote.token_safety_verified,false);
 assert.equal(quote.sellability_verified,false);
});
test('different mint, invalid amount, API failure, tampered response and injected signing data rejected',async()=>{
 let called=0;
 const fetcher=async()=>{called++;return new Response(JSON.stringify({
  transaction:'SIGNED?!',inAmount:'100000000',outAmount:'23120000',feeBps:2,
  router:'metis'}),{status:200})};
 await assert.rejects(fetchIndicativeSolanaQuote({outputMint:target,amountLamports:'100000000',fetcher}),
 /UNEXPECTED_TRANSACTION_IN_QUOTE/);
 await assert.rejects(fetchIndicativeSolanaQuote({outputMint:SOL_MINT,amountLamports:'100000000',fetcher}),
 /OUTPUT_TOKEN_MUST_DIFFER/);
 await assert.rejects(fetchIndicativeSolanaQuote({outputMint:'https://hostile.example',amountLamports:'100000000',fetcher}),
 /INVALID_SOLANA_ADDRESS/);
 await assert.rejects(fetchIndicativeSolanaQuote({outputMint:target,amountLamports:'1.0000',fetcher}),
 /INVALID_SOL_SWAP_AMOUNT/);
 assert.equal(called,1);
});
