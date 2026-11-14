// One independent GitHub Actions live quote readback. Does NOT send orders.
import {fetchIndicativeSolanaQuote} from './solana-swap-quote.mjs';
const target='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
try{
 const q=await fetchIndicativeSolanaQuote({outputMint:target,amountLamports:'10000000'});
 console.log('JUPITER_SOL_TO_USDC_LIVE_QUOTE_ONLY_OK',JSON.stringify({
  provider:q.provider,router:q.router,
  input_lamports:q.input_lamports,output_usdc_atoms:q.output_token_atoms,
  fee_bps:q.fee_bps,trade_executed:q.trade_executed,
  token_safety_verified:q.token_safety_verified}));
}catch(e){
 console.log('JUPITER_SOL_TO_USDC_LIVE_QUOTE_INCONCLUSIVE',
  String(e?.message||'UNAVAILABLE').slice(0,100));
}
// Provider uptime is not a deterministic CI unit-test requirement.
