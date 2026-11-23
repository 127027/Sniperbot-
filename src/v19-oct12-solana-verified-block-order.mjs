// R29 read-only AFTER-EVENT onchain block ordering. Three slots only.
// Tests actual intra-slot order of two ARIANA pool account snapshots.
// Block membership does not prove data was available to the 18:00 GPT
// scan, an exact 50 USDC swap price, a safe sell route or independent RPC.
import {createHash} from 'node:crypto';
import {asOfMillis} from './v19-asof-evidence.mjs';
export const OCT12_ORIGINAL_BLOCK_TARGETS=Object.freeze([
 Object.freeze({slot:455874036,block_time_unix:1791770393,
  coin:'TANK',scan_at_utc:'2026-10-12T02:00:00.000Z',
  signatures:Object.freeze(['2n4sviEjKgN92fBvzC4VtWwyNuaubx4LNKvV4ZEy7KxnzaHW2rtGNAxmk87uSQR5bQmUwkJ2NybEbLMcYk61av5Y'])}),
 Object.freeze({slot:455874058,block_time_unix:1791770397,
  coin:'TANK',scan_at_utc:'2026-10-12T02:00:00.000Z',
  signatures:Object.freeze(['41sZoq3umQCp4uZvkEQLRxGSS7hYEhk6Ngc5XURMQWwukBMSkj9xu7arKRf1eGPU9n6EAinGGVxxoWbfgMcN69wr'])}),
 Object.freeze({slot:456137491,block_time_unix:1791827999,
  coin:'ARIANA',scan_at_utc:'2026-10-12T18:00:00.000Z',
  signatures:Object.freeze([
   '2T8TSQWC2fvbBBEucHERnGgM5XRQPUuXFLm1KDt5Gr5v7ZX2MhjTyJyCHtAdBQiQ2cLriZyeHAR4qKm2tgcDQ6J2',
   '5m6saeSscqJoK1ece9XwRnEYsd8AMt5tgULgCQVGZ3EKsKQhsWvGDVbzBqZj1YnW8f6MvT2tPwNFC1saMZyKGrtT'])})
]);
const sha=raw=>createHash('sha256').update(raw,'utf8').digest('hex');
const verifiedRequest=r=>r&&r.method==='getBlock'
 &&Array.isArray(r.params)&&r.params.length===2
 &&OCT12_ORIGINAL_BLOCK_TARGETS.some(x=>x.slot===r.params[0])
 &&r.params[1]?.transactionDetails==='signatures'
 &&r.params[1]?.maxSupportedTransactionVersion===1
 &&r.params[1]?.commitment==='finalized';
export function makeR29OriginalSlotOrderRequest(index){
 const t=OCT12_ORIGINAL_BLOCK_TARGETS[index];
 if(!t)throw Error('UNAUTHORIZED_ORIGINAL_SOLANA_SLOT');
 return {jsonrpc:'2.0',id:index+1,method:'getBlock',
  params:[t.slot,{encoding:'json',transactionDetails:'signatures',
   rewards:false,commitment:'finalized',maxSupportedTransactionVersion:1}]};
}
export function auditR29OriginalSlotOrder({index,receipt}={}){
 const t=OCT12_ORIGINAL_BLOCK_TARGETS[index],req=makeR29OriginalSlotOrderRequest(index);
 if(!verifiedRequest(req)||receipt?.url!=='https://api.mainnet.solana.com'
   ||receipt.method!=='POST'
   ||JSON.stringify(receipt.request)!==JSON.stringify(req)
   ||!Number.isInteger(receipt.http_status)
   ||asOfMillis(receipt.captured_at_utc)<=asOfMillis('2026-10-13T00:00:00.000Z')
   ||!(/^[a-f0-9]{64}$/).test(receipt.raw_sha256??'')
   ||typeof receipt.raw_text!=='string'
   ||sha(receipt.raw_text)!==receipt.raw_sha256)
  throw Error('UNTRUSTED_ORIGINAL_SOLANA_BLOCK_RECEIPT');
 const fallback=(code,extra={})=>({
  schema:1,kind:'R29_V19_POSTRUN_SOLANA_BLOCK_ORDER_CHECK',
  target_slot:t.slot,coin:t.coin,code,status:'DATA_GAP',
  raw_http_sha256:receipt.raw_sha256,block_order_proven:false,
  original_gpt_at_scan_available:false,
  historical_trading_quote_or_safety_proven:false,
  trade_authorized:false,...extra});
 if(receipt.http_status!==200)
  return fallback('PUBLIC_RPC_HTTP_UNAVAILABLE',{http_status:receipt.http_status});
 let decoded;
 try{decoded=JSON.parse(receipt.raw_text)}
 catch{return fallback('PUBLIC_RPC_INVALID_JSON')}
 if(decoded?.error!==undefined||decoded?.jsonrpc!=='2.0'
  ||decoded?.id!==req.id)
  return fallback('PUBLIC_RPC_METHOD_ERROR',
   {error_code:Number.isInteger(decoded?.error?.code)?decoded.error.code:null});
 const block=decoded.result;
 if(block===null||!block||!Array.isArray(block.signatures)
   ||!Number.isSafeInteger(block.blockTime)
   ||block.blockTime!==t.block_time_unix
   ||!Number.isSafeInteger(block.parentSlot)
   ||block.parentSlot>=t.slot
   ||!block.signatures.every(x=>typeof x==='string')
   ||new Set(block.signatures).size!==block.signatures.length)
  return fallback('MISSING_OR_INCONSISTENT_ORIGINAL_SLOT_BLOCK_DATA');
 const indices=t.signatures.map(sig=>block.signatures.indexOf(sig));
 const missing=indices.some(i=>i===-1);
 return {schema:1,kind:'R29_V19_POSTRUN_SOLANA_BLOCK_ORDER_CHECK',
  target_slot:t.slot,coin:t.coin,status:missing?'DATA_GAP':'BLOCK_MEMBERSHIP_VERIFIED',
  code:missing?'ORIGINAL_EXPECTED_SIGNATURE_NOT_RETURNED':'EXACT_ORIGINAL_SIGNATURES_IN_SLOT',
  original_block_time_utc:new Date(block.blockTime*1000).toISOString(),
  raw_http_sha256:receipt.raw_sha256,signature_indices:indices,
  original_signatures:t.signatures,
  exact_original_signature_membership:!missing,
  // Balance-state arithmetic may suggest an intra-block order, but
  // RPC order must be checked rather than inferred from blockTime seconds.
  ariana_accounting_order_from_native_sol_and_mint:
   t.coin==='ARIANA'?'INDEX_TX2_BEFORE_TX1':null,
  ariana_order_confirmed_by_slot_sequence:t.coin==='ARIANA'&&!missing
   ?indices[1]<indices[0]:null,
  block_order_proven:!missing,
  original_gpt_at_scan_available:false,
  historical_trading_quote_or_safety_proven:false,
  full_pool_virtual_reserve_state_proven:false,
  client_paper_fill_proven:false,trade_authorized:false};
}
