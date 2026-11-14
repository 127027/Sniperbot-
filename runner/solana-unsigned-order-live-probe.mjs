// Optional public Jupiter order-assembly probe using a throwaway public address.
// No private key saved, no provider payment, no signatures or /execute calls.
import {generateKeyPairSync} from 'node:crypto';
import {encodeBase58} from './local-solana-vault.mjs';
import {previewJupiterUnsignedOrder} from './solana-unsigned-order.mjs';
const {publicKey}=generateKeyPairSync('ed25519');
const pub=publicKey.export({format:'der',type:'spki'});
const wallet=encodeBase58(pub.subarray(pub.length-32));
const usdc='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
try{
 const result=await previewJupiterUnsignedOrder({
  wallet,targetMint:usdc,amountLamports:'10000000'});
 console.log('JUPITER_UNSIGNED_WALLET_ORDER_PROBE',JSON.stringify({
  status:result.status,reason:result.reason||null,
  transaction_version:result.inspection?.transaction_version||null,
  wallet_signer_found:result.inspection?.wallet_signer_index!==undefined,
  transaction_signed:result.transaction_signed,transaction_sent:result.transaction_sent,
  signing_permitted:result.signing_permitted||false}));
}catch(e){
 console.log('JUPITER_UNSIGNED_WALLET_ORDER_INCONCLUSIVE',
  String(e?.message||'UNAVAILABLE').slice(0,100));
}
