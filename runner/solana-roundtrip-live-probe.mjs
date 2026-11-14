// Optional real public QUOTE checks only. No taker, signing, transfers or /execute.
import {previewSolanaSwapRoundtrip} from './solana-swap-roundtrip.mjs';
const USDC='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
try{
 const result=await previewSolanaSwapRoundtrip({
  targetMint:USDC,amountLamports:'10000000',
  wait:()=>new Promise(resolve=>setTimeout(resolve,2200))});
 console.log('JUPITER_TWO_DIRECTION_QUOTE_READBACK',JSON.stringify({
  status:result.status,reason:result.reason,
  input_lamports:result.input_sol_lamports,
  quote_output_token_atoms:result.intermediate_target_token_atoms,
  reverse_quote_sol_lamports:result.indicative_return_sol_lamports,
  roundtrip_change_bps:result.approximate_roundtrip_change_bps,
  real_trade_executed:result.trade_executed,
  sellability_verified:result.sellability_verified,
  external_payment_completed:result.external_payment_completed,
  buy_router:result.buy_router,sell_router:result.sell_router}));
}catch(e){
 console.log('JUPITER_TWO_DIRECTION_QUOTE_INCONCLUSIVE',
  String(e?.message||'UNAVAILABLE').slice(0,100));
}
