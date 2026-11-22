import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFrozenOctoberTraining} from '../src/v18-frozen-reference.mjs';

test('manual October training archive reproduces all four strategies with unchanged 6 source pools',async()=>{
 const r=await auditFrozenOctoberTraining({date:'2026-10-12'});
 assert.equal(r.pool_count,6);
 assert.equal(r.original_pool_link_hints,8);
 assert.equal(r.original_october_dot_discovery_verified,false);
 assert.equal(r.original_october_sellability_verified,false);
 assert.equal(r.real_paper_fills,0);
 assert.equal(r.model_input_selection_uses_hindsight,true);
 assert.equal(r.training_not_independent_holdout,true);
 assert.equal(r.models.exploratory.buys,18);
 assert.equal(r.models.conservative.sells,11);
 assert.equal(r.models.volatility_guard.buys,8);
 assert.equal(r.models.guarded_reentry.buys,6);
 assert.equal(r.models.guarded_reentry.sells,6);
 assert.ok(Math.abs(r.models.guarded_reentry.realized_model_pnl_test_usdc-(-5.296654415497276))<1e-7);
 assert.ok(r.models.guarded_reentry.realized_model_pnl_test_usdc
  >r.models.volatility_guard.realized_model_pnl_test_usdc);
 assert.equal(r.models.guarded_reentry.trade_events.filter(x=>x.action==='SELL_EXPERIMENT').length,6);
});
test('selected October training archive cannot be passed off as a different blind day',async()=>{
 await assert.rejects(auditFrozenOctoberTraining({date:'2026-10-13'}),/FROZEN_REFERENCE_ONLY/);
});
