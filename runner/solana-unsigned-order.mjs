// Structural inspection of Jupiter's unsigned wallet-targeted Solana order.
// Never exposes raw transaction, signs, sends or certifies swap safety.
import {decodeBase58} from './local-solana-vault.mjs';
import {SOL_MINT,JUPITER_V2_ORDER} from './solana-swap-quote.mjs';
const UINT=/^[1-9][0-9]{0,19}$/;
const fail=reason=>({schema:'jupiter_unsigned_order_preflight.v1',
 status:'BLOCKED',reason,prepared_transaction_present:false,
 transaction_signed:false,transaction_sent:false,live_trading_enabled:false,
 contract_safety_verified:false,sellability_verified:false});
function readVarint(buf,at){
 let n=0,shift=0;
 for(let i=0;i<3;i++){
  if(at+i>=buf.length)throw Error('INVALID_WIRE_LENGTH');
  const b=buf[at+i];n+=(b&127)*2**shift;
  if((b&128)===0)return [n,at+i+1];
  shift+=7;
 }
 throw Error('INVALID_WIRE_VARINT');
}
export function inspectUnsignedSolanaOrder({base64,wallet}={}){
 const signer=decodeBase58(wallet);
 if(typeof base64!=='string'||base64.length<130||base64.length>8192||
   !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))
  throw Error('INVALID_WIRE_BASE64');
 const buf=Buffer.from(base64,'base64');
 if(buf.toString('base64')!==base64||buf.length>4096)throw Error('INVALID_WIRE_BASE64');
 let [numSignatures,at]=readVarint(buf,0);
 if(numSignatures<1||numSignatures>8||at+numSignatures*64>=buf.length)
  throw Error('INVALID_SIGNATURE_COUNT');
 const sigAt=at;at+=numSignatures*64;
 const msg=buf.subarray(at),versioned=(msg[0]&0x80)!==0;
 if(versioned&&msg[0]!==0x80)throw Error('UNSUPPORTED_SOLANA_VERSION');
 const headerAt=versioned?1:0;
 if(msg.length<headerAt+4)throw Error('INVALID_SOLANA_MESSAGE');
 const required=msg[headerAt],readonlySigned=msg[headerAt+1];
 if(required!==numSignatures||readonlySigned>required)throw Error('INVALID_SIGNING_HEADER');
 const [numKeys,keyAt]=readVarint(msg,headerAt+3);
 if(numKeys<required||numKeys>128||keyAt+numKeys*32>msg.length)
  throw Error('INVALID_MESSAGE_KEYS');
 const keys=Array.from({length:numKeys},(_,i)=>msg.subarray(keyAt+i*32,keyAt+(i+1)*32));
 const slots=Array.from({length:required},(_,i)=>i).filter(i=>keys[i].equals(signer));
 if(slots.length!==1)throw Error('WALLET_NOT_REQUIRED_SIGNER');
 const slot=slots[0],sig=buf.subarray(sigAt+slot*64,sigAt+(slot+1)*64);
 if(sig.some(n=>n!==0))throw Error('WALLET_SIGNATURE_ALREADY_PRESENT');
 return {schema:'unsigned_solana_order_inspection.v1',
  transaction_version:versioned?'v0':'legacy',signer_count:required,
  static_account_key_count:numKeys,wallet_signer_index:slot,
  fee_payer_is_wallet:keys[0].equals(signer),
  prepared_transaction_present:true,transaction_signed:false,
  signing_permitted:false,instructions_audited:false,
  message:'Nur strukturelle Prüfung; Programme, Lookup Tables, Slippage und Empfänger nicht auditiert.'};
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
