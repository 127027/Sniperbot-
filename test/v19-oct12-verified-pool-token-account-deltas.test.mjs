import test from 'node:test';
import assert from 'node:assert/strict';
import {R29_PINNED_FOUR_OCT12_TRANSACTION_SOURCE_DIGESTS as pins,
 analyzePinnedOriginalPoolOwnerBalanceDeltas,
 comparePoolTwoAssetAccountContinuity}
 from '../src/v19-oct12-verified-pool-token-account-deltas.mjs';

test('exactly 4 historical original V1 RPC raw-body sources are SHA-256 pinned',()=>{
 assert.equal(pins.length,4);
 assert.deepEqual(pins.map(x=>x.scan),[3,3,19,19]);
 assert.equal(new Set(pins.map(x=>x.file)).size,4);
 assert.equal(new Set(pins.map(x=>x.sha256)).size,4);
 assert.ok(pins.every(x=>/^[0-9a-f]{64}$/.test(x.sha256)));
});
test('post-event forged source cannot be parsed as 2026-10-12 original chain movement',()=>{
 for(let i=0;i<4;i++){
  assert.throws(()=>analyzePinnedOriginalPoolOwnerBalanceDeltas({
   index:i,sourceRaw:JSON.stringify({version:1,meta:{preTokenBalances:[],
    postTokenBalances:[]},blockTime:1791770393})}),
   /NOT_PINNED_ORIGINAL_SOLANA_TX_RAW_RESPONSE/);
 }
});
test('no alternate run-id or negative index can forge a proof',()=>{
 assert.throws(()=>analyzePinnedOriginalPoolOwnerBalanceDeltas({
  index:2,sourceRunId:'future-untrusted',sourceRaw:'{}'}),
  /NOT_PINNED_ORIGINAL_SOLANA_TX_RAW_RESPONSE/);
 assert.throws(()=>analyzePinnedOriginalPoolOwnerBalanceDeltas({
  index:4,sourceRaw:'{}'}),
  /NOT_PINNED_ORIGINAL_SOLANA_TX_RAW_RESPONSE/);
});

test('same slot, exact SOL and mint post/pre account states establish only accounting continuity',()=>{
 const basic={
  schema:1,kind:'R29_V19_ORIGINAL_OCT12_POOL_OWNER_TOKEN_ACCOUNT_DELTA',
  pool:'8TgpUYKfnG2UM43rFQMV9v3XRiciAqqDSp8BgXSBcq7P',
  mint:'28FFbG2j5d5XGvyuLSdDixAgQnmN4YDZqmSVbbzJpump',
  slot:456137491,rpc_reported_block_time_utc:'2026-10-12T17:59:59.000Z',
  pool_native_sol_account_index:4,
  observed_pool_native_sol_pre_lamports:'21484666527',
  observed_pool_native_sol_post_lamports:'20991859003',
  source_sha256:'1'.repeat(64),
  pool_owned_token_delta_rows:[{account_index:10,
   token_mint:'28FFbG2j5d5XGvyuLSdDixAgQnmN4YDZqmSVbbzJpump',
   decimals:6,pre_raw_mint_token_balance:'556906078913231',
   post_raw_mint_token_balance:'563088068852294'}]
 };
 const after=structuredClone(basic);
 after.source_sha256='2'.repeat(64);
 after.observed_pool_native_sol_pre_lamports='20991859003';
 after.observed_pool_native_sol_post_lamports='20443008433';
 after.pool_owned_token_delta_rows[0].pre_raw_mint_token_balance='563088068852294';
 after.pool_owned_token_delta_rows[0].post_raw_mint_token_balance='570117490685141';
 const result=comparePoolTwoAssetAccountContinuity({earlier:basic,later:after});
 assert.equal(result.matched,true);
 assert.equal(result.identical_native_sol_account_state,true);
 assert.equal(result.identical_owned_mint_token_account_state,true);
 assert.equal(result.code,'SAME_SLOT_EXACT_NATIVE_SOL_AND_MINT_ACCOUNT_POST_PRE_LINK');
 assert.equal(result.verified_full_pool_reserves,false);
 assert.equal(result.verified_trade_execution,false);
 assert.equal(result.verified_historical_quote,false);
 assert.equal(result.can_authorize_dot3,false);
 assert.equal(result.does_not_prove_no_intervening_zero_effect_transactions,true);
 const reverse=comparePoolTwoAssetAccountContinuity({earlier:after,later:basic});
 assert.equal(reverse.matched,false);
 assert.equal(reverse.code,'ONE_OR_BOTH_ASSET_ACCOUNT_STATES_DIFFER');
});
test('pool continuation proof is fail-closed on different slots, indices or native/account balances',()=>{
 const f={
  kind:'R29_V19_ORIGINAL_OCT12_POOL_OWNER_TOKEN_ACCOUNT_DELTA',
  pool:'pool',mint:'mint',slot:200,rpc_reported_block_time_utc:'2026-10-12T01:59:59.000Z',
  source_sha256:'1'.repeat(64),pool_native_sol_account_index:4,
  observed_pool_native_sol_post_lamports:'100',
  pool_owned_token_delta_rows:[{account_index:10,
   token_mint:'mint',decimals:6,post_raw_mint_token_balance:'200'}]
 };
 const g={...f,source_sha256:'2'.repeat(64),
  observed_pool_native_sol_pre_lamports:'100',
  pool_owned_token_delta_rows:[{account_index:10,token_mint:'mint',
   decimals:6,pre_raw_mint_token_balance:'200'}]};
 assert.equal(comparePoolTwoAssetAccountContinuity({earlier:f,later:g}).matched,true);
 assert.equal(comparePoolTwoAssetAccountContinuity({earlier:f,later:{...g,slot:201}}).matched,false);
 assert.equal(comparePoolTwoAssetAccountContinuity({earlier:f,later:{...g,pool:'different'}}).matched,false);
 assert.equal(comparePoolTwoAssetAccountContinuity({earlier:f,later:{
  ...g,observed_pool_native_sol_pre_lamports:'99'}}).matched,false);
 assert.equal(comparePoolTwoAssetAccountContinuity({earlier:f,later:{
  ...g,pool_owned_token_delta_rows:[{...g.pool_owned_token_delta_rows[0],
   pre_raw_mint_token_balance:'201'}]}}).matched,false);
 assert.equal(comparePoolTwoAssetAccountContinuity({earlier:f,later:{
  ...g,pool_native_sol_account_index:12}}).matched,false);
});
