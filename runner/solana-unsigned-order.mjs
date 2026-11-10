// Structural inspection of Jupiter's unsigned wallet-targeted Solana order.
// Never exposes raw transaction, signs, sends or certifies swap safety.
import {decodeBase58} from './local-solana-vault.mjs';
import {SOL_MINT,JUPITER_V2_ORDER} from './solana-swap-quote.mjs';
import {auditUnsignedSolanaWire} from './solana-wire-audit.mjs';
const UINT=/^[1-9][0-9]{0,19}$/;
const fail=reason=>({schema:'jupiter_unsigned_order_preflight.v1',
 status:'BLOCKED',reason,prepared_transaction_present:false,
 transaction_signed:false,transaction_sent:false,live_trading_enabled:false,
 contract_safety_verified:false,sellability_verified:false});
export function inspectUnsignedSolanaOrder({base64,wallet}={}){
 const audit=auditUnsignedSolanaWire({base64,wallet});
 return {schema:'unsigned_solana_order_inspection.v2',
  transaction_version:audit.message_version,
  signer_count:audit.required_signatures,
  static_account_key_count:audit.static_account_count,
  wallet_signer_index:audit.wallet_signer_index,
  fee_payer_is_wallet:audit.fee_payer_is_wallet,
  recent_blockhash_freshness:audit.recent_blockhash_freshness,
  instruction_count:audit.instruction_count,
  program_ids:audit.program_ids,
  address_table_reference_count:audit.address_table_references.length,
  unresolved_dynamic_accounts:audit.loaded_account_count,
  prepared_transaction_present:true,transaction_signed:false,
  signing_permitted:false,instructions_audited:false,
  security_status:audit.security_status,
  message:'Vollständiges Wire-Format decodiert. Programme, Instruktionsfolgen, ALTs, Limits und Empfänger NICHT freigegeben.'};
}
export async function previewJupiterUnsignedOrder({
 wallet,targetMint,amountLamports,fetcher=fetch,now=new Date().toISOString()
}={}){
 decodeBase58(wallet);decodeBase58(targetMint);
 if(targetMint===SOL_MINT)return fail('SAME_ASSET');
 if(typeof amountLamports!=='string'||!UINT.test(amountLamports)||
  BigInt(amountLamports)<10000n||BigInt(amountLamports)>100000000000n)
  return fail('INVALID_SOL_AMOUNT');
 const at=Date.parse(now);
 if(!Number.isFinite(at))throw Error('INVALID_ORDER_CLOCK');
 const url=new URL(JUPITER_V2_ORDER);
 url.searchParams.set('inputMint',SOL_MINT);
 url.searchParams.set('outputMint',targetMint);
 url.searchParams.set('amount',amountLamports);
 url.searchParams.set('taker',wallet);
 try{
  const res=await fetcher(url.toString(),{method:'GET',redirect:'error',
   headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if(!res?.ok||Number(res.headers?.get?.('content-length')||0)>65536)
   return fail('ORDER_PROVIDER_UNAVAILABLE');
  const raw=await res.text();
  if(Buffer.byteLength(raw,'utf8')>65536)return fail('ORDER_RESPONSE_TOO_LARGE');
  const data=JSON.parse(raw);
  if(!data?.transaction)return fail('NO_UNSIGNED_TRANSACTION');
  if(data.inAmount!==amountLamports||typeof data.outAmount!=='string'||
   !UINT.test(data.outAmount)||!['metis','jupiterz','dflow','okx'].includes(data.router))
   return fail('ORDER_AMOUNT_OR_ROUTE_MISMATCH');
  const inspection=inspectUnsignedSolanaOrder({base64:data.transaction,wallet});
  return {schema:'jupiter_unsigned_order_preflight.v1',
   status:'UNSIGNED_TRANSACTION_OBSERVED',wallet_address:wallet,
   target_mint:targetMint,amount_lamports:amountLamports,
   expected_target_atoms:data.outAmount,router:data.router,
   checked_at_utc:new Date(at).toISOString(),inspection,
   prepared_transaction_present:true,transaction_signed:false,
   transaction_sent:false,live_trading_enabled:false,
   contract_safety_verified:false,sellability_verified:false,
   signing_permitted:false};
 }catch(e){return fail('ORDER_UNVERIFIED_'+String(e?.message||'UNKNOWN').slice(0,45))}
}
