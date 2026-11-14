import test from 'node:test';
import assert from 'node:assert/strict';
import {recentSolanaWalletActivity} from './solana-wallet-activity.mjs';
const wallet='So11111111111111111111111111111111111111112';
const sig='3'.repeat(88);
function response({pre=1000000000,post=1550000000,slot=987654,err=null,
 mismatch=false}={}){
 const calls=[];
 const fetcher=async(url,options)=>{
  const call=JSON.parse(options.body);calls.push(call);
  const result=call.method==='getSignaturesForAddress'?
    [{signature:sig,slot,confirmationStatus:'finalized',blockTime:1762800000,err}]:
    {slot:mismatch?slot-1:slot,
     meta:{preBalances:[pre,100],postBalances:[post,100],err:null},
     transaction:{message:{accountKeys:[{pubkey:wallet},{pubkey:'11111111111111111111111111111111'}]}}};
  return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result}),{status:200});
 };
 return {fetcher,calls};
}
test('actual finalized incoming native SOL is visible but is NEVER a PayPal confirmation',async()=>{
 const f=response();
 const activity=await recentSolanaWalletActivity(wallet,{fetcher:f.fetcher});
 assert.equal(f.calls[0].method,'getSignaturesForAddress');
 assert.equal(f.calls[1].method,'getTransaction');
 assert.equal(f.calls[1].params[1].commitment,'finalized');
 assert.equal(activity.events.length,1);
 assert.equal(activity.events[0].direction,'SOL_BALANCE_INCREASE');
 assert.equal(activity.events[0].sol_lamports_delta,'550000000');
 assert.equal(activity.events[0].is_moonpay_payment_confirmed,false);
 assert.equal(activity.external_provider_payment_proven,false);
 assert.equal(activity.paper_ledger_unchanged,true);
});
test('outgoing SOL delta or unknown finalized transaction never claims deposit',async()=>{
 const negative=await recentSolanaWalletActivity(wallet,{
  fetcher:response({pre:1000000000,post:990000000}).fetcher});
 assert.equal(negative.events[0].direction,'SOL_BALANCE_DECREASE');
 const invalid=await recentSolanaWalletActivity(wallet,{
  fetcher:response({mismatch:true}).fetcher});
 assert.equal(invalid.events[0].direction,'UNVERIFIED');
 assert.equal(invalid.events[0].sol_lamports_delta,null);
 assert.equal(invalid.external_provider_payment_proven,false);
});
test('invalid owner and public RPC outage fail closed',async()=>{
 let calls=0;
 await assert.rejects(recentSolanaWalletActivity('https://bad.invalid',{
  fetcher:async()=>{calls++}}),/INVALID_SOLANA_ADDRESS/);
 assert.equal(calls,0);
 await assert.rejects(recentSolanaWalletActivity(wallet,{fetcher:async()=>new Response('{}',{status:503})}),
  /SOLANA_HISTORY_RPC_UNAVAILABLE/);
});
