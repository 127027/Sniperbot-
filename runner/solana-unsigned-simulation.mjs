// Public Solana RPC simulation of an ALREADY STRUCTURALLY PARSED, UNSIGNED order.
// No wallet secret, no signature verification, no sendTransaction/execute.
// "Simulation succeeded" NEVER implies token safety, profitable price or sellability.
import {auditUnsignedSolanaWire} from './solana-wire-audit.mjs';
import {SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';

const fail=(reason)=>({schema:'solana_unsigned_simulation.v1',
 status:'UNVERIFIED',reason,execution_performed:false,transaction_signed:false,
 wallet_spend_approved:false,independent_program_audit_passed:false});
export async function simulateUnsignedSolanaOrder({base64,wallet,fetcher=fetch}={}){
 // This also ensures the user's wallet has NOT signed the transaction.
 auditUnsignedSolanaWire({base64,wallet});
 let response;
 try{
  response=await fetcher(SOLANA_MAINNET_RPC,{
   method:'POST',redirect:'error',
   headers:{'content-type':'application/json','accept':'application/json'},
   body:JSON.stringify({jsonrpc:'2.0',id:1,method:'simulateTransaction',
    params:[base64,{encoding:'base64',commitment:'confirmed',
     sigVerify:false,replaceRecentBlockhash:true,innerInstructions:true}]}),
   signal:AbortSignal.timeout(11000)});
  if(!response?.ok)return fail('SOLANA_SIMULATION_RPC_UNAVAILABLE');
  if(Number(response.headers?.get?.('content-length')||0)>262144)
   return fail('SIMULATION_RESULT_TOO_LARGE');
  const raw=await response.text();
  if(Buffer.byteLength(raw,'utf8')>262144)return fail('SIMULATION_RESULT_TOO_LARGE');
  const result=JSON.parse(raw);
  if(result?.jsonrpc!=='2.0'||result?.id!==1||result.error||
     !Number.isSafeInteger(result.result?.context?.slot))
   return fail('INVALID_SIMULATION_RPC_RESPONSE');
  const value=result.result?.value;
  if(!value||!Object.hasOwn(value,'err'))
   return fail('MISSING_SIMULATION_OUTCOME');
  const success=value.err===null;
  const fee=Number.isSafeInteger(value.fee)&&value.fee>=0?String(value.fee):null;
  const units=Number.isSafeInteger(value.unitsConsumed)&&value.unitsConsumed>=0?
   value.unitsConsumed:null;
  return {schema:'solana_unsigned_simulation.v1',
   status:success?'SIMULATED_NO_EXECUTION':'SIMULATED_FAILURE',
   rpc_slot:result.result.context.slot,estimated_fee_lamports:fee,
   compute_units_observed:units,simulation_error:success?null:'RPC_RETURNED_EXECUTION_ERROR',
   execution_performed:false,transaction_signed:false,
   wallet_spend_approved:false,independent_program_audit_passed:false,
   blockhash_replaced_for_simulation:true,
   message:'Ergebnis gilt nur für eine unsigned RPC-Simulation. Keine Blockchain-Buchung und kein tatsächlicher Verkauf.'};
 }catch{return fail('SOLANA_SIMULATION_UNAVAILABLE')}
}
