import test from 'node:test';
import assert from 'node:assert/strict';
import {readSolanaBalance,SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';
const address='So11111111111111111111111111111111111111112';
test('onchain finalized SOL is never a PayPal receipt or simulated USDC',async()=>{
 let seen=null;
 const fetcher=async(url,opts)=>{
  assert.equal(url,SOLANA_MAINNET_RPC);
  seen=JSON.parse(opts.body);
  return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{
   context:{slot:12345},value:1512000000}}),{status:200});
 };
 const result=await readSolanaBalance(address,{fetcher,now:'2026-11-10T15:00:00Z'});
 assert.equal(seen.method,'getBalance');
 assert.equal(seen.params[1].commitment,'finalized');
 assert.equal(result.sol_balance,'1.512000000');
 assert.equal(result.external_payment_confirmed,false);
 assert.equal(result.paper_ledger_unchanged,true);
});
test('untrusted responses or invalid addresses fail closed',async()=>{
 const invalid=async()=>new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{value:-1,
  context:{slot:1}}}),{status:200});
 await assert.rejects(readSolanaBalance(address,{fetcher:invalid}),/INVALID_SOLANA_BALANCE_RESPONSE/);
 await assert.rejects(readSolanaBalance('attacker.invalid',{fetcher:invalid}),/INVALID_SOLANA_ADDRESS/);
 const unavailable=async()=>new Response('{}',{status:503});
 await assert.rejects(readSolanaBalance(address,{fetcher:unavailable}),/SOLANA_RPC_UNAVAILABLE/);
});
