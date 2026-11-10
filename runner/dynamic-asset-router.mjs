// Token-agnostic execution *planning*; never trade, sign, bridge or debit funds.
// Router = chain-specific adapter, NOT one hardcoded token per symbol.
// Solana Jupiter V2 can quote any mint with available liquidity; Ethereum,
// Base and BNB must gain independently verified wallet/DEX/bridge adapters.
import {decodeBase58} from './local-solana-vault.mjs';
import {SOL_MINT,fetchIndicativeSolanaRoute} from './solana-swap-quote.mjs';
import {readSolanaBalance} from './local-solana-balance.mjs';
import {readSolanaOwnedTokens} from './solana-owned-tokens.mjs';
import {SUPPORTED_CHAIN_IDENTITIES,validateChainAsset} from './chain-trade-intent-v2.mjs';

const MIN_GAS_LAMPORTS=5000000n;
const U64=/^[1-9][0-9]{0,19}$/;
function blocked(chain,reason,details=null){
 return {schema:'sniper_dynamic_swap_plan.v1',chain,
  status:'BLOCKED',reason,details,
  token_universe:'DYNAMIC_NO_TICKER_LIST',
  asset_route_verified:false,token_security_verified:false,
  signing_enabled:false,trade_executed:false,
  pay_pal_payment_completed:false,route:null};
}
export async function previewDynamicAssetRoute({
 chain,inputAsset,outputAsset,amountAtoms,minReceiveAtoms='1',
 owner,fetcher=fetch,now=new Date().toISOString()
}={}){
 try{
  if(!Object.hasOwn(SUPPORTED_CHAIN_IDENTITIES,chain))
   return blocked(chain,'UNSUPPORTED_BLOCKCHAIN');
  // Validate contracts *before* any RPC request. Token symbols are never used.
  const input=validateChainAsset(chain,inputAsset);
  const output=validateChainAsset(chain,outputAsset);
  if(input===output)return blocked(chain,'IDENTICAL_ASSETS');
  if(typeof amountAtoms!=='string'||!U64.test(amountAtoms)||
   BigInt(amountAtoms)>18446744073709551615n||
   typeof minReceiveAtoms!=='string'||!U64.test(minReceiveAtoms)||
   BigInt(minReceiveAtoms)>18446744073709551615n)
   return blocked(chain,'INVALID_RAW_ATOM_AMOUNT');
  if(chain!=='solana')return blocked(chain,
   'CHAIN_EXECUTION_ADAPTER_NOT_IMPLEMENTED',
   'Wallet, gas, token approval, DEX route and bridge adapters not yet implemented for '+chain);
  decodeBase58(owner);
  // Actual on-chain funds, not fictitious PayPal EUR or TEST-USDC.
  const sol=await readSolanaBalance(owner,{fetcher,now});
  if(sol.address!==owner||sol.network!=='solana-mainnet'||
   !/^[0-9]+$/.test(sol.sol_lamports)||
   !Number.isSafeInteger(sol.finalized_slot))
   return blocked(chain,'REAL_SOLANA_BALANCE_UNVERIFIED');
  const gas=BigInt(sol.sol_lamports),amount=BigInt(amountAtoms);
  if(gas<MIN_GAS_LAMPORTS)
   return blocked(chain,'INSUFFICIENT_SOL_NETWORK_GAS',
    'Mindestens 0.005 SOL reserve required for a route preview');
  let inputAvailableAtoms,source='NATIVE_SOL';
  if(input===SOL_MINT){
   inputAvailableAtoms=gas.toString();
   if(amount+MIN_GAS_LAMPORTS>gas)
    return blocked(chain,'INSUFFICIENT_SOL_AFTER_GAS_RESERVE');
  }else{
   const balances=await readSolanaOwnedTokens(owner,{fetcher,now});
   if(balances.owner_address!==owner||balances.network!=='solana-mainnet')
    return blocked(chain,'TOKEN_BALANCE_OWNER_MISMATCH');
   const matches=balances.tokens.filter(x=>x.mint===input);
   if(matches.length!==1)
    return blocked(chain,matches.length?'AMBIGUOUS_TOKEN_PROGRAM':'INPUT_TOKEN_NOT_HELD');
   if(matches[0].account_state==='frozen')
    return blocked(chain,'INPUT_TOKEN_ACCOUNT_FROZEN');
   inputAvailableAtoms=matches[0].amount_raw;
   source='SPL_TOKEN_ACCOUNT';
   if(BigInt(inputAvailableAtoms)<amount)
    return blocked(chain,'INSUFFICIENT_INPUT_TOKEN_BALANCE');
  }
  // Provider errors are NEVER replaced with a made-up fallback quote.
  const quote=await fetchIndicativeSolanaRoute({
   inputMint:input,outputMint:output,amountAtoms,fetcher,now});
  if(quote.input_atoms!==amountAtoms||quote.input_mint!==input||
   quote.output_mint!==output||quote.status!=='QUOTE_ONLY'||
   quote.trade_executed!==false||quote.transaction_signed!==false)
   return blocked(chain,'ROUTER_RETURNED_INCONSISTENT_QUOTE');
  if(BigInt(quote.output_atoms)<BigInt(minReceiveAtoms))
   return blocked(chain,'INDICATIVE_OUTPUT_BELOW_MINIMUM',
    {quote_output_atoms:quote.output_atoms,min_receive_atoms:minReceiveAtoms});
  return {schema:'sniper_dynamic_swap_plan.v1',chain,network:'solana-mainnet',
   status:'QUOTE_OBSERVED_NO_TRADE',
   token_universe:'DYNAMIC_NO_TICKER_LIST',
   owner_address:owner,input_mint:input,output_mint:output,
   input_atoms:amountAtoms,input_available_atoms:inputAvailableAtoms,
   input_source:source,indicative_output_atoms:quote.output_atoms,
   min_receive_atoms:minReceiveAtoms,gas_reserve_lamports:String(MIN_GAS_LAMPORTS),
   quote_router:quote.router,quote_observed_at_utc:quote.observed_at_utc,
   quote_expires_after_seconds:quote.quote_expires_after_seconds,
   asset_route_verified:false,token_security_verified:false,
   token_sellability_verified:false,signing_enabled:false,trade_executed:false,
   cross_chain_bridge_available:false,pay_pal_payment_completed:false,
   route:{provider:'JUPITER_V2',type:'ONCHAIN_SAME_CHAIN_QUOTE',
    input_mint:input,output_mint:output,
    requires_manual_or_verified_live_executor:true},
   message:'Echte Quote ohne Coin-Liste. Nur auf Solana und nur zur Vorschau; kein Signieren oder Trade. Gebühren/Slippage und Token-Sicherheit nicht abschließend nachgewiesen.'};
 }catch(e){
  return blocked(chain,'ROUTE_UNAVAILABLE_OR_INVALID',
   String(e?.message||'UNKNOWN').slice(0,100));
 }
}
