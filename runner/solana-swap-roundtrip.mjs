// Read-only buy + reverse sell quote for a new SPL token. Two quotes
// are only market indications, NOT proof the token can be sold for real.
import {fetchIndicativeSolanaRoute,SOL_MINT} from './solana-swap-quote.mjs';
const MAX_SLIPPAGE_BPS=1000;
const MAX_INPUT=100000000000n;
const failure=(reason,detail=null)=>({
 schema:'solana_swap_roundtrip_preview.v1',
 paper_only:false,live_enabled:false,actionable:false,
 status:'BLOCKED',reason,details:detail,
 buy_quote:null,sell_quote:null,trade_executed:false,
 buy_transaction_signed:false,sell_transaction_signed:false,
 sellability_verified:false,contract_safety_verified:false,
 external_payment_completed:false});
export async function previewSolanaSwapRoundtrip({
 targetMint,amountLamports,fetcher=fetch,wait=async()=>{},
 now=()=>new Date().toISOString()
}={}){
 const amount=typeof amountLamports==='string'&&/^[1-9][0-9]{0,19}$/.test(amountLamports)?
  BigInt(amountLamports):0n;
 if(amount<10000n||amount>MAX_INPUT)
  return failure('INVALID_SOL_AMOUNT');
 let buy;
 try{
  buy=await fetchIndicativeSolanaRoute({
   inputMint:SOL_MINT,outputMint:targetMint,amountAtoms:amountLamports,
   fetcher,now:now()});
 }catch(e){return failure('NO_VALID_BUY_QUOTE',String(e?.message||'UNAVAILABLE').slice(0,70))}
 if(buy?.input_atoms!==amountLamports||buy.status!=='QUOTE_ONLY'||
  buy.trade_executed!==false||buy.real_swap_enabled!==false||
  buy.transaction_signed!==false)
  return failure('BUY_QUOTE_INCONSISTENT');
 // Public Jupiter keyless quota ~0.5 requests/sec. Caller explicitly spaces requests.
 try{await wait()}catch{return failure('QUOTE_DELAY_INTERRUPTED')}
 let sell;
 try{
  sell=await fetchIndicativeSolanaRoute({
   inputMint:targetMint,outputMint:SOL_MINT,amountAtoms:buy.output_atoms,
   fetcher,now:now()});
 }catch(e){return failure('NO_VALID_REVERSE_QUOTE',String(e?.message||'UNAVAILABLE').slice(0,70))}
 if(sell.input_atoms!==buy.output_atoms||sell.output_mint!==SOL_MINT||
  sell.input_mint!==targetMint||sell.status!=='QUOTE_ONLY'||
  sell.transaction_signed!==false||sell.trade_executed!==false)
  return failure('REVERSE_QUOTE_INCONSISTENT');
 const returned=BigInt(sell.output_atoms);
 const delta=returned-amount;
 const deltaBps=Number(delta*10000n/amount);
 return {
  schema:'solana_swap_roundtrip_preview.v1',paper_only:false,
  live_enabled:false,actionable:false,status:'TWO_QUOTES_OBSERVED',
  input_sol_lamports:amountLamports,
  intermediate_target_token_atoms:buy.output_atoms,
  indicative_return_sol_lamports:sell.output_atoms,
  approximate_roundtrip_change_bps:deltaBps,
  input_mint:SOL_MINT,target_mint:targetMint,
  buy_router:buy.router,sell_router:sell.router,
  buy_quote_checked_at_utc:buy.observed_at_utc,
  sell_quote_checked_at_utc:sell.observed_at_utc,
  buy_fee_bps:buy.fee_bps,sell_fee_bps:sell.fee_bps,
  buy_transaction_signed:false,sell_transaction_signed:false,
  trade_executed:false,sellability_verified:false,
  contract_safety_verified:false,external_payment_completed:false,
  warning:'Zwei nicht ausführbare Momentaufnahmen: Preise/Fees ändern sich. Keine Aussage über HoneyPot, Token-Sicherheit oder echten Verkauf.',
  buy_quote:{provider:buy.provider,status:'QUOTE_ONLY'},
  sell_quote:{provider:sell.provider,status:'QUOTE_ONLY'}
 };
}
