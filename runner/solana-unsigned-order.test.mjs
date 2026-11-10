import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectUnsignedSolanaOrder,previewJupiterUnsignedOrder} from './solana-unsigned-order.mjs';
import {decodeBase58} from './local-solana-vault.mjs';
const wallet='So11111111111111111111111111111111111111112';
const target='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
function unsignedWire(key=wallet,{alreadySigned=false,unsupportedVersion=false}={}){
 const sign=Buffer.alloc(64,alreadySigned?1:0);
 const msg=Buffer.concat([
  Buffer.from([unsupportedVersion?0x81:0x80,1,0,1,2]),
  decodeBase58(key),decodeBase58('ComputeBudget111111111111111111111111111111'),
  Buffer.alloc(32,3),
  Buffer.from([1,1,1,0,1,0x37,0])]);
 return Buffer.concat([Buffer.from([1]),sign,msg]).toString('base64');
}
function provider(base64){
 const calls=[];
 return {calls,fetcher:async(url,params)=>{
  calls.push({url,params});
  return new Response(JSON.stringify({transaction:base64,inAmount:'100000000',
   outAmount:'23000000',router:'metis',requestId:'fake-id'}));
 }};
}
test('unsigned wallet required-signer structure is inspected, not executed',async()=>{
 const valid=unsignedWire();
 const i=inspectUnsignedSolanaOrder({base64:valid,wallet});
 assert.equal(i.transaction_version,'v0');
 assert.equal(i.signer_count,1);
 assert.equal(i.wallet_signer_index,0);
 assert.equal(i.fee_payer_is_wallet,true);
 assert.equal(i.instruction_count,1);
 assert.equal(i.address_table_reference_count,0);
 assert.equal(i.instructions_audited,false);
 assert.equal(i.signing_permitted,false);
 const fake=provider(valid);
 const r=await previewJupiterUnsignedOrder({
  wallet,targetMint:target,amountLamports:'100000000',fetcher:fake.fetcher});
 assert.equal(r.status,'UNSIGNED_TRANSACTION_OBSERVED');
 assert.equal(r.prepared_transaction_present,true);
 assert.equal(r.transaction_sent,false);
 assert.equal(r.transaction_signed,false);
 assert.equal(r.signing_permitted,false);
 assert(!JSON.stringify(r).includes(valid),'do not expose raw transaction via API');
 assert.equal(fake.calls.length,1);
 assert.equal(fake.calls[0].params.method,'GET');
 assert.equal(new URL(fake.calls[0].url).searchParams.get('taker'),wallet);
});
test('forged signer, already signed wallet slot and unsupported Solana v1 fail closed',async()=>{
 for(const bytecode of [
  unsignedWire(target),unsignedWire(wallet,{alreadySigned:true}),
  unsignedWire(wallet,{unsupportedVersion:true})
 ]){
  const r=await previewJupiterUnsignedOrder({
   wallet,targetMint:target,amountLamports:'100000000',
   fetcher:provider(bytecode).fetcher});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.transaction_sent,false);
  assert.equal(r.signing_permitted,undefined);
 }
});
test('quote-only response and provider failure cannot be mistaken for executable order',async()=>{
 const zero=await previewJupiterUnsignedOrder({wallet,targetMint:target,
  amountLamports:'100000000',fetcher:provider(null).fetcher});
 assert.equal(zero.status,'BLOCKED');
 assert.equal(zero.reason,'NO_UNSIGNED_TRANSACTION');
 const refused=await previewJupiterUnsignedOrder({wallet,targetMint:target,
  amountLamports:'100000000',fetcher:async()=>new Response('{}',{status:503})});
 assert.equal(refused.reason,'ORDER_PROVIDER_UNAVAILABLE');
 assert.equal(refused.live_trading_enabled,false);
});
