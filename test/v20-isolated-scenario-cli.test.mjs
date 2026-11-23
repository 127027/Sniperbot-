import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const execute=(args=[])=>{
 const child=spawnSync(process.execPath,
   ['scripts/v20-isolated-scenario-diagnostic.mjs',...args],
   {encoding:'utf8',timeout:10000});
 assert.equal(child.status,0,child.stderr);
 const line=child.stdout.trim();
 assert.ok(line.startsWith('R29_V20_OFFLINE_DIAGNOSTIC '));
 return JSON.parse(line.slice('R29_V20_OFFLINE_DIAGNOSTIC '.length));
};
test('no October input produces 29h DATA_GAP report with zero published orders',()=>{
 const r=execute();
 assert.equal(r.status,'DATA_GAP_NO_ORIGINAL_OCTOBER_QUOTE_INPUT');
 assert.equal(r.warmup_hours,5);
 assert.equal(r.decision_hours,24);
 assert.equal(r.synthetic_buys,0);
 assert.equal(r.synthetic_sells,0);
 assert.equal(r.real_market_profit_estimate,null);
 assert.equal(r.order_writes,0);
 assert.equal(r.actual_windows_client_fills,0);
 assert.equal(r.original_qa04_approved,false);
 assert.equal(r.internal_synthetic_ledger_audit,'SYNTHETIC_MODEL_LEDGER_RECONCILED_NOT_REAL_FILLS');
});
test('opt-in synthetic fixture runs the isolated portfolio math without trading claims',()=>{
 const r=execute(['--synthetic-fixture']);
 assert.equal(r.status,'SYNTHETIC_MATH_EXERCISED_NOT_OCTOBER_TRADING');
 assert.equal(r.synthetic_buys,1);
 assert.equal(r.synthetic_sells,1);
 assert.ok(r.synthetic_realized_pnl_test_usdc>0);
 assert.equal(r.real_historical_trades_verified,0);
 assert.equal(r.real_market_profit_estimate,null);
 assert.equal(r.no_network_or_client_state_access,true);
});
test('CLI rejects non-fixture production and historical imports',()=>{
 const x=spawnSync(process.execPath,
  ['scripts/v20-isolated-scenario-diagnostic.mjs','--production'],
  {encoding:'utf8',timeout:10000});
 assert.notEqual(x.status,0);
 assert.match(x.stderr,/ALLOWED_ARGS_NONE_OR_SYNTHETIC_FIXTURE_ONLY/);
});
