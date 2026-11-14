import test from 'node:test';
import assert from 'node:assert/strict';
import {observeExternalSolanaWallet} from './external-wallet-observer.mjs';
import {LEGACY_TOKEN_PROGRAM,TOKEN_2022_PROGRAM} from './solana-mint-risk.mjs';
const addr='So11111111111111111111111111111111111111112';
const usdc='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
test('real public SOL and SPL holdings can be observed without granting trading permissions',async()=>{
 const observed=[];
 const fetcher=async(url,opts)=>{
  assert.equal(opts.method,'POST');const req=JSON.parse(opts.body);
  observed.push(req.method);
  let result;
  if(req.method==='getBalance'){
   result={context:{slot:12345},value:50000000};
  }else{
   assert.equal(req.method,'getTokenAccountsByOwner');
   const owner=req.params[1].programId;
   result={context:{slot:12345},value:owner===LEGACY_TOKEN_PROGRAM?
    [{account:{owner:LEGACY_TOKEN_PROGRAM,data:{program:'spl-token',
     parsed:{type:'account',info:{owner:addr,mint:usdc,
      state:'initialized',tokenAmount:{
       amount:'14000000',decimals:6,uiAmountString:'14'}}}}}}]:[]};
  }
  return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result}));
 };
 const result=await observeExternalSolanaWallet(addr,{fetcher,now:'2026-11-10T16:00:00Z'});
 assert.equal(result.mode,'EXTERNAL_WALLET_WATCH_ONLY');
 assert.equal(result.observed_sol_balance,'0.050000000');
 assert.equal(result.observed_tokens.length,1);
 assert.equal(result.observed_tokens[0].display_amount,'14');
 assert.equal(result.wallet_owned_by_bot,false);
 assert.equal(result.provider_payment_confirmed,false);
 assert.equal(result.swap_executed_by_bot,false);
 assert.equal(result.live_swap_enabled,false);
 assert.equal(result.paper_ledger_unchanged,true);
 assert.deepEqual(observed.sort(),['getBalance','getTokenAccountsByOwner','getTokenAccountsByOwner'].sort());
});
test('invalid address or failed RPC fails instead of reporting zero balance',async()=>{
 let calls=0;
 await assert.rejects(observeExternalSolanaWallet('https://bad.invalid',{
  fetcher:async()=>{calls++}}),/INVALID_SOLANA_ADDRESS/);
 assert.equal(calls,0);
 await assert.rejects(observeExternalSolanaWallet(addr,{
  fetcher:async()=>new Response('{}',{status:502})}),/SOLANA_RPC_UNAVAILABLE/);
});
test('no paper balance, PayPal receipt or bot swap can be inferred',async()=>{
 const fetched=async(url,opts)=>{
  const {method,params}=JSON.parse(opts.body);
  const result=method==='getBalance'?{context:{slot:222},value:0}:
   {context:{slot:222},value:[]};
  return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result}));
 };
 const r=await observeExternalSolanaWallet(addr,{fetcher:fetched});
 assert.equal(r.observed_sol_lamports,'0');
 assert.equal(r.observed_tokens.length,0);
 assert.equal(r.provider_payment_confirmed,false);
 assert.equal(r.swap_executed_by_bot,false);
});
