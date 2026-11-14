import test from 'node:test';
import assert from 'node:assert/strict';
import {assessWalletSolSpend,DEFAULT_SOL_FEE_RESERVE_LAMPORTS} from './solana-wallet-spend-preflight.mjs';
const wallet='So11111111111111111111111111111111111111112';
const balance=lamports=>({
 address:wallet,network:'solana-mainnet',sol_lamports:lamports,finalized_slot:123,
 external_payment_confirmed:false,paper_ledger_unchanged:true});
test('funded real SOL allows ONLY unsigned preview and never permits actual swap',()=>{
 const result=assessWalletSolSpend({balance:balance('155000000'),
  amountLamports:'100000000'});
 assert.equal(result.status,'FUNDED_FOR_ORDER_PREVIEW_ONLY');
 assert.equal(result.unsigned_order_request_allowed,true);
 assert.equal(result.fee_reserve_lamports,DEFAULT_SOL_FEE_RESERVE_LAMPORTS);
 assert.equal(result.live_trade_permitted,false);
 assert.equal(result.signing_permitted,false);
 assert.equal(result.network_fee_verified,false);
});
test('no spend from paper ledger or unconfirmed external payment claim',()=>{
 for(const bad of [
  {cashUsdc:1000},
  {...balance('100000000'),paper_ledger_unchanged:false},
  {...balance('100000000'),external_payment_confirmed:true},
  {...balance('100000000'),finalized_slot:null}
 ]){
  const r=assessWalletSolSpend({balance:bad,amountLamports:'10000000'});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.unsigned_order_request_allowed,false);
 }
});
test('not enough real SOL after fee buffer, exact boundary, max and invalid inputs',()=>{
 const fail=assessWalletSolSpend({balance:balance('104999999'),amountLamports:'100000000'});
 assert.equal(fail.reason,'INSUFFICIENT_FINALIZED_SOL_AFTER_FEE_RESERVE');
 const equality=assessWalletSolSpend({balance:balance('105000000'),amountLamports:'100000000'});
 assert.equal(equality.unsigned_order_request_allowed,true);
 assert.equal(assessWalletSolSpend({
  balance:balance('20000000000'),amountLamports:'15000000000'}).reason,'USER_CONFIGURED_PREVIEW_CAP_EXCEEDED');
 for(const input of ['-1','1e9','0.1','0','100.000000','NaN']){
  assert.equal(assessWalletSolSpend({balance:balance('2000000000'),
   amountLamports:input}).reason,'INVALID_AMOUNT_OR_RESERVE');
 }
});
