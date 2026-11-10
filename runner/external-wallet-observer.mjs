// Read-only observation of a SEPARATE user-controlled Solana wallet, such as
// Phantom. This must never import keys, authorize a bot trade or alter paper cash.
import {decodeBase58} from './local-solana-vault.mjs';
import {readSolanaBalance} from './local-solana-balance.mjs';
import {readSolanaOwnedTokens} from './solana-owned-tokens.mjs';

export async function observeExternalSolanaWallet(address,{
 fetcher=fetch,now=new Date().toISOString()
}={}){
 decodeBase58(address);
 if(!Number.isFinite(Date.parse(now)))throw Error('INVALID_OBSERVATION_TIME');
 const [sol,tokens]=await Promise.all([
  readSolanaBalance(address,{fetcher,now}),
  readSolanaOwnedTokens(address,{fetcher,now})
 ]);
 if(sol.address!==address||tokens.owner_address!==address||
  sol.network!=='solana-mainnet'||tokens.network!=='solana-mainnet'||
  sol.external_payment_confirmed!==false||
  tokens.external_payment_confirmed!==false||
  !Number.isSafeInteger(sol.finalized_slot)||
  !Number.isSafeInteger(tokens.finalized_slot))
  throw Error('EXTERNAL_WALLET_DATA_MISMATCH');
 return {
  schema:'external_watch_only_solana_summary.v1',
  mode:'EXTERNAL_WALLET_WATCH_ONLY',address,
  chain:'solana-mainnet',wallet_private_key_access:false,
  wallet_owned_by_bot:false,bot_wallet_unmodified:true,
  observed_sol_lamports:sol.sol_lamports,
  observed_sol_balance:sol.sol_balance,
  observed_tokens:tokens.tokens.map(t=>({
   mint:t.mint,program_id:t.program_id,amount_raw:t.amount_raw,
   decimals:t.decimals,display_amount:t.ui_amount,
   frozen:t.account_state==='frozen'
  })),
  observed_at_utc:new Date(now).toISOString(),
  sol_finalized_slot:sol.finalized_slot,
  token_finalized_slot:tokens.finalized_slot,
  provider_payment_confirmed:false,
  swap_executed_by_bot:false,
  signing_enabled:false,
  live_swap_enabled:false,paper_ledger_unchanged:true,
  message:'Externe Wallet wird nur beobachtet. Eine PayPal-Zahlung oder ein Swap in Phantom/Jupiter ist keine Bot-Ausführung.'
 };
}
