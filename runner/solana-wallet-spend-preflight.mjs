// Real, finalized SOL balance gate before requesting a Jupiter order.
// Balance existence is NOT permission to sign, spend or execute a trade.
const UINT=/^(0|[1-9][0-9]{0,19})$/;
export const DEFAULT_SOL_FEE_RESERVE_LAMPORTS='5000000'; // 0.005 SOL caution buffer, not fee guarantee
const rejected=(reason,amount=null,balance=null,reserve=null)=>({
 schema:'solana_wallet_spend_preflight.v1',status:'BLOCKED',reason,
 input_lamports:amount,wallet_balance_lamports:balance,fee_reserve_lamports:reserve,
 unsigned_order_request_allowed:false,signing_permitted:false,
 live_trade_permitted:false,network_fee_verified:false,
 risk_verdict:'UNKNOWN'});
export function assessWalletSolSpend({balance,amountLamports,
 reserveLamports=DEFAULT_SOL_FEE_RESERVE_LAMPORTS,maximumLamports='10000000000'}={}){
 const amount=typeof amountLamports==='string'&&UINT.test(amountLamports)?BigInt(amountLamports):null;
 const reserve=typeof reserveLamports==='string'&&UINT.test(reserveLamports)?BigInt(reserveLamports):null;
 const max=typeof maximumLamports==='string'&&UINT.test(maximumLamports)?BigInt(maximumLamports):null;
 const coins=balance?.network==='solana-mainnet'&&balance?.external_payment_confirmed===false&&
  balance?.paper_ledger_unchanged===true&&typeof balance.sol_lamports==='string'&&
  UINT.test(balance.sol_lamports)&&balance.address?BigInt(balance.sol_lamports):null;
 if(amount===null||amount<10000n||reserve===null||reserve<1000000n||max===null||max<=0n)
  return rejected('INVALID_AMOUNT_OR_RESERVE');
 if(coins===null||!Number.isSafeInteger(balance.finalized_slot))
  return rejected('FINALIZED_BALANCE_NOT_VERIFIED',amountLamports);
 if(amount>max)return rejected('USER_CONFIGURED_PREVIEW_CAP_EXCEEDED',amountLamports,balance.sol_lamports,reserveLamports);
 if(coins<amount+reserve)
  return rejected('INSUFFICIENT_FINALIZED_SOL_AFTER_FEE_RESERVE',amountLamports,balance.sol_lamports,reserveLamports);
 return {schema:'solana_wallet_spend_preflight.v1',status:'FUNDED_FOR_ORDER_PREVIEW_ONLY',
  input_lamports:amountLamports,wallet_balance_lamports:balance.sol_lamports,
  fee_reserve_lamports:reserveLamports,maximum_preview_lamports:maximumLamports,
  finalized_slot:balance.finalized_slot,
  unsigned_order_request_allowed:true,
  signing_permitted:false,live_trade_permitted:false,
  network_fee_verified:false,risk_verdict:'UNKNOWN',
  warning:'Nur öffentliche Guthabenprüfung mit konservativem Puffer. Keine Gebührenobergrenze, Freigabe oder Geldbewegung.'};
}
