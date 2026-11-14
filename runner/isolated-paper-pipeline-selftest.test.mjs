import test from 'node:test';
import assert from 'node:assert/strict';
import {runIsolatedPaperAgentSelfTest} from './isolated-paper-pipeline-selftest.mjs';
const id='device_'+'a'.repeat(32);
test('a one-click selftest independently signs buy and sell twice with rising and falling prices',()=>{
 const v=runIsolatedPaperAgentSelfTest({deviceId:id,now:Date.now()});
 assert.equal(v.status,'PASSED');
 assert.equal(v.schema,'sniper_paper_pipeline_selftest.v1');
 assert.equal(v.sender,'ISOLATED_LOCAL_TEST_SENDER_NOT_A_REAL_DOT');
 assert.equal(v.signed_buy_and_sell,true);
 assert.equal(v.rising_market.buy_status,'PAPER_FILLED');
 assert.equal(v.rising_market.sell_status,'PAPER_FILLED');
 assert.equal(v.rising_market.pnl_test_usdc,48.01);
 assert(v.falling_market.pnl_test_usdc<0);
 assert.equal(v.falling_market.open_positions,0);
 assert.equal(v.cloud_dot_order_received,false);
 assert.equal(v.cloud_dot_signer_verified,false);
 assert.equal(v.existing_paper_account_changed,false);
 assert.equal(v.existing_wallet_accessed,false);
 assert.equal(v.private_key_saved,false);
 assert.equal(v.remote_payment_or_trade,false);
});
test('invalid target device cannot run diagnostic or introduce a trading publisher',()=>{
 for(const id of [null,'hello','device_'+'X'.repeat(32),
  'device_'+'f'.repeat(31)])
  assert.throws(()=>runIsolatedPaperAgentSelfTest({deviceId:id}),/INVALID_LOCAL_DEVICE/);
});
