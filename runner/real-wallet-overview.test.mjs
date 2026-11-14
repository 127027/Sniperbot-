import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRealWallet} from './real-wallet-overview.mjs';
const address='So11111111111111111111111111111111111111112';
const usdc='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const snap=()=>({
 wallet:{exists:true,address},
 balance:{network:'solana-mainnet',address,sol_lamports:'123456789',
  finalized_slot:778},
 holdings:{network:'solana-mainnet',owner_address:address,finalized_slot:776,
  tokens:[{mint:usdc,amount_raw:'50000000',decimals:6,account_state:'initialized'},
   {mint:'11111111111111111111111111111111',amount_raw:'7',decimals:9,account_state:'initialized'}]}
});
test('onchain SOL and exactly 50 USDC shown without paper cash, EUR fiction or fake live fills',()=>{
 const r=summarizeRealWallet(snap());
 assert.equal(r.sol_display,'0.123456789');
 assert.equal(r.usdc_display,'50');
 assert.equal(r.observed_usdc_atoms,'50000000');
 assert.equal(r.eur_total,null);
 assert.equal(r.real_pnl_eur,null);
 assert.equal(r.real_open_positions,null);
 assert.equal(r.real_fill_history_verified,false);
 assert.equal(r.paypal_deposit_confirmed,false);
 assert.equal(r.paper_ledger_unchanged,true);
 assert.equal(r.live_trading_enabled,false);
});
test('no wallet, wrong owner, missing chain finality, invalid USDC decimal rejected',()=>{
 const cases=[
  {...snap(),wallet:{exists:false,address}},
  {...snap(),holdings:{...snap().holdings,owner_address:'WRONG'}},
  {...snap(),balance:{...snap().balance,finalized_slot:null}},
  {...snap(),holdings:{...snap().holdings,tokens:[{
   mint:usdc,amount_raw:'50000000',decimals:9,account_state:'initialized'}]}},
  {...snap(),holdings:{...snap().holdings,tokens:[{
   mint:usdc,amount_raw:'50000000',decimals:6,account_state:'frozen'}]}}
 ];
 for(const p of cases)assert.throws(()=>summarizeRealWallet(p));
});
test('multiple genuine USDC accounts aggregate without floating-point rounding',()=>{
 const p=snap();p.holdings.tokens=[
  {mint:usdc,amount_raw:'123456789012345678',decimals:6,account_state:'initialized'},
  {mint:usdc,amount_raw:'1',decimals:6,account_state:'initialized'}
 ];
 const x=summarizeRealWallet(p);
 assert.equal(x.observed_usdc_atoms,'123456789012345679');
 assert.equal(x.usdc_display,'123456789012.345679');
});
