import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFinalizedSolanaReceipt} from './solana-finalized-receipt.mjs';
import {encodeBase58} from './local-solana-vault.mjs';
import {SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';
const wallet='So11111111111111111111111111111111111111112';
const mint='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const sig=encodeBase58(Buffer.alloc(64,7));
function proof({success=true,found=true,owner=wallet,changed=true}={}){
 const before={accountIndex:1,mint,owner,uiTokenAmount:{amount:'100',decimals:6}};
 const after={accountIndex:1,mint,owner,uiTokenAmount:{amount:changed?'250':'100',decimals:6}};
 return {
  jsonrpc:'2.0',id:1,result:found?{slot:321,meta:{
   err:success?null:{InstructionError:[0,'Custom']},fee:5000,
   preBalances:[1000000,0],postBalances:[1500000,0],
   preTokenBalances:[before],postTokenBalances:[after]},
  transaction:{signatures:[sig],message:{accountKeys:[
   {pubkey:wallet,signer:true},{pubkey:mint,signer:false}]}}}:null
 };
}
test('finalized verified onchain SOL + SPL deltas are NOT a PayPal receipt or bot trade',async()=>{
 let calls=0;
 const fetcher=async(url,options)=>{
  calls++;assert.equal(url,SOLANA_MAINNET_RPC);
  const r=JSON.parse(options.body);
  assert.equal(r.method,'getTransaction');
  assert.equal(r.params[0],sig);
  assert.equal(r.params[1].commitment,'finalized');
  return new Response(JSON.stringify(proof()));
 };
 const r=await verifyFinalizedSolanaReceipt({wallet,signature:sig,fetcher});
 assert.equal(calls,1);
 assert.equal(r.status,'FINALIZED_ONCHAIN_ONLY');
 assert.equal(r.sol_lamports_delta,'500000');
 assert.deepEqual(r.token_atoms_changes,[{mint,token_atoms_delta:'150'}]);
 assert.equal(r.network_fee_lamports,'5000');
 assert.equal(r.finalized,true);
 assert.equal(r.payment_provider_verified,false);
 assert.equal(r.bot_trade_verified,false);
 assert.equal(r.live_trade_executed_by_bot,false);
});
test('unfinalized or failed transaction never claimed paid',async()=>{
 for(const bad of [proof({found:false}),proof({success:false})]){
  const r=await verifyFinalizedSolanaReceipt({wallet,signature:sig,
   fetcher:async()=>new Response(JSON.stringify(bad))});
  assert.equal(r.status,'UNVERIFIED');
  assert.equal(r.payment_provider_verified,false);
 }
});
test('wrong signature and wallet not in balances must not produce receipt',async()=>{
 const mismatch=proof();
 mismatch.result.transaction.signatures=[encodeBase58(Buffer.alloc(64,3))];
 const r=await verifyFinalizedSolanaReceipt({wallet,signature:sig,
  fetcher:async()=>new Response(JSON.stringify(mismatch))});
 assert.equal(r.status,'UNVERIFIED');
 const badWallet=proof();badWallet.result.transaction.message.accountKeys[0].pubkey=mint;
 const x=await verifyFinalizedSolanaReceipt({wallet,signature:sig,
  fetcher:async()=>new Response(JSON.stringify(badWallet))});
 assert.equal(x.reason,'WALLET_NOT_UNIQUELY_IN_TRANSACTION');
});
test('token ownership mismatches are not counted as wallet assets',async()=>{
 const r=await verifyFinalizedSolanaReceipt({wallet,signature:sig,
  fetcher:async()=>new Response(JSON.stringify(proof({owner:mint})))});
 assert.equal(r.status,'FINALIZED_ONCHAIN_ONLY');
 assert.deepEqual(r.token_atoms_changes,[]);
});
test('signature rejects attacker strings before network',async()=>{
 let requests=0;
 await assert.rejects(verifyFinalizedSolanaReceipt({
  wallet,signature:'https://evil.invalid',fetcher:async()=>{requests++}}),
  /INVALID_TRANSACTION_SIGNATURE/);
 assert.equal(requests,0);
});
