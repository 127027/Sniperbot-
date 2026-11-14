import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateUnsignedSolanaOrder} from './solana-unsigned-simulation.mjs';
import {decodeBase58} from './local-solana-vault.mjs';
import {SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';
const wallet='So11111111111111111111111111111111111111112';
const program='ComputeBudget111111111111111111111111111111';
function unsigned(){
 const buf=Buffer.concat([Buffer.from([1]),Buffer.alloc(64),Buffer.from([0x80,1,0,1,2]),
  decodeBase58(wallet),decodeBase58(program),Buffer.alloc(32,42),Buffer.from([1,1,1,0,1,2,0])]);
 return buf.toString('base64');
}
test('Solana unsigned RPC simulation uses no signatures or broadcasting',async()=>{
 let calls=0;
 const fetcher=async(url,options)=>{
  calls++;assert.equal(url,SOLANA_MAINNET_RPC);
  assert.equal(options.method,'POST');
  const payload=JSON.parse(options.body);
  assert.equal(payload.method,'simulateTransaction');
  assert.equal(payload.params[0],unsigned());
  assert.equal(payload.params[1].sigVerify,false);
  assert.equal(payload.params[1].replaceRecentBlockhash,true);
  return new Response(JSON.stringify({jsonrpc:'2.0',id:1,
   result:{context:{slot:999},value:{err:null,fee:5000,unitsConsumed:50000}}}),{status:200});
 };
 const result=await simulateUnsignedSolanaOrder({base64:unsigned(),wallet,fetcher});
 assert.equal(calls,1);
 assert.equal(result.status,'SIMULATED_NO_EXECUTION');
 assert.equal(result.estimated_fee_lamports,'5000');
 assert.equal(result.transaction_signed,false);
 assert.equal(result.execution_performed,false);
 assert.equal(result.wallet_spend_approved,false);
 assert.equal(result.independent_program_audit_passed,false);
});
test('simulation failure does not claim execution or fee confirmation',async()=>{
 const fetcher=async()=>new Response(JSON.stringify({jsonrpc:'2.0',id:1,
  result:{context:{slot:321},value:{err:{InstructionError:[0,'Custom']},fee:5000}}}),{status:200});
 const r=await simulateUnsignedSolanaOrder({base64:unsigned(),wallet,fetcher});
 assert.equal(r.status,'SIMULATED_FAILURE');
 assert.equal(r.execution_performed,false);
 assert.equal(r.simulation_error,'RPC_RETURNED_EXECUTION_ERROR');
});
test('malformed or already-signed transactions rejected before any RPC request',async()=>{
 let requests=0;
 const raw=Buffer.from(unsigned(),'base64');raw[1]=1;
 await assert.rejects(simulateUnsignedSolanaOrder({
  base64:raw.toString('base64'),wallet,fetcher:async()=>{requests++;}}),
  /WALLET_SIGNATURE_ALREADY_PRESENT/);
 assert.equal(requests,0);
});
test('outage and arbitrary RPC reply cannot be mistaken for a valid simulation',async()=>{
 for(const fetcher of [
  async()=>new Response('{}',{status:503}),
  async()=>new Response(JSON.stringify({jsonrpc:'2.0',id:1,
    result:{context:{slot:2},value:{}}}),{status:200})
 ]){
  const r=await simulateUnsignedSolanaOrder({base64:unsigned(),wallet,fetcher});
  assert.equal(r.status,'UNVERIFIED');
  assert.equal(r.execution_performed,false);
 }
});
