// Display-only real Solana wallet summary. The public onchain assets are
// never mixed with paper money, never equated with a PayPal deposit, and
// never assigned invented EUR prices or PnL.
const USDC_MINT='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const DECIMAL=/^(0|[1-9][0-9]*)$/;
function decimalAtoms(amount,decimals){
 if(typeof amount!=='string'||!DECIMAL.test(amount)||
  !Number.isInteger(decimals)||decimals<0||decimals>18)
  throw Error('INVALID_TOKEN_DECIMAL_AMOUNT');
 const raw=BigInt(amount);
 const unit=10n**BigInt(decimals);
 const whole=raw/unit,rest=(raw%unit).toString().padStart(decimals,'0');
 return whole+(decimals&&raw%unit?'.'+rest.replace(/0+$/,''):'');
}
export function summarizeRealWallet({wallet,balance,holdings}={}){
 if(wallet?.exists!==true||typeof wallet.address!=='string'||
  balance?.network!=='solana-mainnet'||balance.address!==wallet.address||
  holdings?.network!=='solana-mainnet'||holdings.owner_address!==wallet.address||
  typeof balance.sol_lamports!=='string'||!DECIMAL.test(balance.sol_lamports)||
  !Number.isSafeInteger(balance.finalized_slot)||
  !Number.isSafeInteger(holdings.finalized_slot)||
  !Array.isArray(holdings.tokens))
  throw Error('REAL_WALLET_SNAPSHOT_UNVERIFIED');
 if(holdings.tokens.length>1000)throw Error('TOO_MANY_TOKEN_RECORDS');
 let usdc=0n,count=0;
 for(const t of holdings.tokens){
  if(typeof t.mint!=='string'||typeof t.amount_raw!=='string'||
   !DECIMAL.test(t.amount_raw))throw Error('INVALID_ONCHAIN_TOKEN_RECORD');
  if(t.mint===USDC_MINT){
   if(t.decimals!==6)throw Error('INVALID_USDC_DECIMALS');
   if(t.account_state==='frozen')throw Error('USDC_TOKEN_ACCOUNT_FROZEN');
   usdc+=BigInt(t.amount_raw);
  }
  if(BigInt(t.amount_raw)>0n)count++;
 }
 return {
  schema:'sniper_real_wallet_overview.v1',network:'solana-mainnet',
  wallet_address:wallet.address,
  observed_sol_lamports:balance.sol_lamports,
  sol_display:decimalAtoms(balance.sol_lamports,9),
  observed_usdc_atoms:usdc.toString(),
  usdc_display:decimalAtoms(usdc.toString(),6),
  observed_positive_token_accounts:count,
  sol_finalized_slot:balance.finalized_slot,
  tokens_finalized_slot:holdings.finalized_slot,
  eur_total:null,usd_total:null,
  eur_valuation_status:'NO_VERIFIED_EUR_PRICING',
  real_open_positions:null,real_pnl_eur:null,
  real_fill_history_verified:false,
  paypal_deposit_confirmed:false,paypal_withdrawal_confirmed:false,
  paper_ledger_unchanged:true,live_trading_enabled:false,
  message:'Genuine onchain balances only. EUR valuation, live trade fills and PayPal settlement are not established.'
 };
}
