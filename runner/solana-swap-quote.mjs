// Jupiter Swap V2 quote-only route in BOTH directions, for arbitrarily new
// token mints. No taker, no signed transaction, no /execute, no purchases.
import {decodeBase58} from './local-solana-vault.mjs';
export const SOL_MINT='So11111111111111111111111111111111111111112';
export const JUPITER_V2_ORDER='https://api.jup.ag/swap/v2/order';
const UINT=/^[1-9][0-9]{0,19}$/;
export async function fetchIndicativeSolanaRoute({
 inputMint,outputMint,amountAtoms,fetcher=fetch,now=new Date().toISOString()
}={}){
 decodeBase58(inputMint);decodeBase58(outputMint);
 if(inputMint===outputMint)throw Error('IDENTICAL_SWAP_ASSETS');
 if(typeof amountAtoms!=='string'||!UINT.test(amountAtoms)||
  BigInt(amountAtoms)>18446744073709551615n||
  (inputMint===SOL_MINT&&(BigInt(amountAtoms)<10000n||BigInt(amountAtoms)>100000000000n)))
  throw Error('INVALID_SWAP_AMOUNT');
 if(!Number.isFinite(Date.parse(now)))throw Error('INVALID_QUOTE_TIME');
 const url=new URL(JUPITER_V2_ORDER);
 url.searchParams.set('inputMint',inputMint);
 url.searchParams.set('outputMint',outputMint);
 url.searchParams.set('amount',amountAtoms);
 // Deliberately NEVER set 'taker', 'payer', 'receiver', requestId or 'signedTransaction'.
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
 if(typeof j.inAmount!=='string'||j.inAmount!==amountAtoms||
  typeof j.outAmount!=='string'||!UINT.test(j.outAmount)||
  !Number.isInteger(j.feeBps)||j.feeBps<0||j.feeBps>1000||
  typeof j.router!=='string'||!['metis','jupiterz','dflow','okx'].includes(j.router))
  throw Error('INVALID_JUPITER_QUOTE');
 return {schema:'indicative_solana_route_quote.v1',
  status:'QUOTE_ONLY',network:'solana-mainnet',
  input_mint:inputMint,output_mint:outputMint,
  input_atoms:amountAtoms,output_atoms:j.outAmount,
  provider:'JUPITER_SWAP_V2',router:j.router,fee_bps:j.feeBps,
  observed_at_utc:new Date(now).toISOString(),
  quote_expires_after_seconds:15,
  trade_executed:false,transaction_signed:false,real_swap_enabled:false,
  token_safety_verified:false,sellability_verified:false,
  message:'Reine Kursauskunft; weder eine sichere Token-Freigabe noch eine ausführbare Order.'};
}
export async function fetchIndicativeSolanaQuote({outputMint,amountLamports,
 fetcher=fetch,now=new Date().toISOString()}={}){
 if(outputMint===SOL_MINT)throw Error('OUTPUT_TOKEN_MUST_DIFFER_FROM_SOL');
 if(typeof amountLamports!=='string'||!UINT.test(amountLamports)||
  BigInt(amountLamports)<10000n||BigInt(amountLamports)>100000000000n)
  throw Error('INVALID_SOL_SWAP_AMOUNT');
 const q=await fetchIndicativeSolanaRoute({
  inputMint:SOL_MINT,outputMint,amountAtoms:amountLamports,fetcher,now});
 return {
  schema:'indicative_solana_swap_quote.v1',status:q.status,network:q.network,
  input_mint:q.input_mint,output_mint:q.output_mint,
  input_lamports:q.input_atoms,output_token_atoms:q.output_atoms,
  provider:q.provider,router:q.router,fee_bps:q.fee_bps,
  observed_at_utc:q.observed_at_utc,
  quote_expires_after_seconds:q.quote_expires_after_seconds,
  trade_executed:false,transaction_signed:false,
  real_swap_enabled:false,token_safety_verified:false,sellability_verified:false,
  message:q.message};
}
