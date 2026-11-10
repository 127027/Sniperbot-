// Jupiter Swap V2 public quote-only route. NO signing, no execution, no orders.
// An indicative quote is not evidence the new token is safe or sellable.
import {decodeBase58} from './local-solana-vault.mjs';
export const SOL_MINT='So11111111111111111111111111111111111111112';
export const JUPITER_V2_ORDER='https://api.jup.ag/swap/v2/order';
const UINT=/^[1-9][0-9]{0,19}$/;
export async function fetchIndicativeSolanaQuote({outputMint,amountLamports,
 fetcher=fetch,now=new Date().toISOString()}={}){
 decodeBase58(outputMint);
 if(outputMint===SOL_MINT)throw Error('OUTPUT_TOKEN_MUST_DIFFER_FROM_SOL');
 if(typeof amountLamports!=='string'||!UINT.test(amountLamports)||
  BigInt(amountLamports)<10000n||BigInt(amountLamports)>100000000000n)
  throw Error('INVALID_SOL_SWAP_AMOUNT');
 if(!Number.isFinite(Date.parse(now)))throw Error('INVALID_QUOTE_TIME');
 const url=new URL(JUPITER_V2_ORDER);
 url.searchParams.set('inputMint',SOL_MINT);
 url.searchParams.set('outputMint',outputMint);
 url.searchParams.set('amount',amountLamports);
 const response=await fetcher(url.toString(),{
  method:'GET',redirect:'error',headers:{accept:'application/json'},
  signal:AbortSignal.timeout(10000)});
 if(!response?.ok)throw Error('JUPITER_QUOTE_UNAVAILABLE');
 if(Number(response.headers?.get?.('content-length')||0)>65536)
  throw Error('JUPITER_QUOTE_TOO_LARGE');
 const body=await response.text();
 if(Buffer.byteLength(body,'utf8')>65536)throw Error('JUPITER_QUOTE_TOO_LARGE');
 const j=JSON.parse(body);
 if(j?.transaction!==null&&j?.transaction!==undefined)
  throw Error('UNEXPECTED_TRANSACTION_IN_QUOTE');
 if(typeof j.inAmount!=='string'||j.inAmount!==amountLamports||
  typeof j.outAmount!=='string'||!UINT.test(j.outAmount)||
  !Number.isInteger(j.feeBps)||j.feeBps<0||j.feeBps>1000||
  typeof j.router!=='string'||!['metis','jupiterz','dflow','okx'].includes(j.router))
  throw Error('INVALID_JUPITER_QUOTE');
 return {schema:'indicative_solana_swap_quote.v1',
  status:'QUOTE_ONLY',network:'solana-mainnet',
  input_mint:SOL_MINT,output_mint:outputMint,
  input_lamports:amountLamports,output_token_atoms:j.outAmount,
  provider:'JUPITER_SWAP_V2',router:j.router,fee_bps:j.feeBps,
  observed_at_utc:new Date(now).toISOString(),
  quote_expires_after_seconds:15, // local advisory TTL, not a Jupiter price guarantee.
  trade_executed:false,transaction_signed:false,
  real_swap_enabled:false,token_safety_verified:false,
  sellability_verified:false,
  message:'Echte Anbieter-Kursauskunft, keine ausführbare Order oder Verkaufbarkeitsgarantie.'};
}
