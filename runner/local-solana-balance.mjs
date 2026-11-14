// Solana wallet public readback (mainnet), never a payment acknowledgement.
// getBalance is a live blockchain observation, separate from TEST-USDC ledger.
import {decodeBase58} from './local-solana-vault.mjs';
export const SOLANA_MAINNET_RPC='https://api.mainnet.solana.com';
export async function readSolanaBalance(address,{fetcher=fetch,now=new Date().toISOString()}={}){
 decodeBase58(address);
 if(!Number.isFinite(Date.parse(now)))throw Error('INVALID_BALANCE_CLOCK');
 const reply=await fetcher(SOLANA_MAINNET_RPC,{
  method:'POST',redirect:'error',headers:{'content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',
    params:[address,{commitment:'finalized'}]}),
  signal:AbortSignal.timeout(9000)});
 if(!reply?.ok)throw Error('SOLANA_RPC_UNAVAILABLE');
 const declared=Number(reply.headers?.get?.('content-length')||0);
 if(declared>8192)throw Error('SOLANA_RPC_TOO_LARGE');
 const raw=await reply.text();
 if(Buffer.byteLength(raw,'utf8')>8192)throw Error('SOLANA_RPC_TOO_LARGE');
 const value=JSON.parse(raw);
 if(value?.jsonrpc!=='2.0'||value.id!==1||value.error||
   !Number.isSafeInteger(value.result?.value)||value.result.value<0||
   !Number.isSafeInteger(value.result?.context?.slot))
  throw Error('INVALID_SOLANA_BALANCE_RESPONSE');
 return {schema:'solana_public_wallet_balance.v1',network:'solana-mainnet',
  address,sol_lamports:String(value.result.value),
  sol_balance:(value.result.value/1e9).toFixed(9),finalized_slot:value.result.context.slot,
  checked_at_utc:new Date(now).toISOString(),external_payment_confirmed:false,
  paper_ledger_unchanged:true,signing_enabled:false};
}
