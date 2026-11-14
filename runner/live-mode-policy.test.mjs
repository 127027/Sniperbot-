import test from 'node:test';
import assert from 'node:assert/strict';
import {readLiveTradingGate,requestLiveTradingMode} from './live-mode-policy.mjs';
test('LIVE mode is always OFF and never interprets paper or wallet value as authorization',()=>{
 for(let i=0;i<5;i++){
  const gate=readLiveTradingGate();
  assert.equal(gate.schema,'sniper_live_trading_gate.v1');
  assert.equal(gate.mode,'LOCKED');
  assert.equal(gate.enabled,false);
  assert.equal(gate.can_enable,false);
  assert.equal(gate.wallet_signing_enabled_for_swaps,false);
  assert.equal(gate.agent_auto_execution_enabled,false);
  assert.equal(gate.paypal_checkout_enabled,false);
  assert(Object.isFrozen(gate));
 }
});
test('explicit disable is idempotent, impossible to enable live via this API',()=>{
 assert.equal(requestLiveTradingMode({enabled:false}).enabled,false);
 assert.throws(()=>requestLiveTradingMode({enabled:true}),/LIVE_TRADING_NOT_AVAILABLE/);
 for(const input of [{enabled:1},{enabled:'true'},{enabled:false,force:true},{},null,[],true]){
  assert.throws(()=>requestLiveTradingMode(input),/INVALID_LIVE_MODE_REQUEST/);
 }
});
