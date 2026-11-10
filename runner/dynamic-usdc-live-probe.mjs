// One real read-only Jupiter quote with USDC as the INPUT, not SOL.
// Demonstrates token-agnostic routing direction. No wallet, no signing, no swaps.
import {SOL_MINT,fetchIndicativeSolanaRoute} from './solana-swap-quote.mjs';
const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
try{
 const q=await fetchIndicativeSolanaRoute({
  inputMint:USDC,outputMint:SOL_MINT,amountAtoms:'50000000'});
 console.log('DYNAMIC_50_USDC_TO_SOL_LIVE_QUOTE_ONLY',JSON.stringify({
  observed_at_utc:q.observed_at_utc,
  input_asset:q.input_mint,input_atoms:q.input_atoms,
  output_asset:q.output_mint,indicative_output_atoms:q.output_atoms,
  router:q.router,trade_executed:q.trade_executed,
  transaction_signed:q.transaction_signed,
  token_safety_verified:q.token_safety_verified
 }));
}catch(e){
 console.log('DYNAMIC_50_USDC_QUOTE_INCONCLUSIVE',
  String(e?.message||'PROVIDER_UNAVAILABLE').slice(0,100));
}
// Provider uptime and keyless quotas are NOT deterministic test prerequisites.
