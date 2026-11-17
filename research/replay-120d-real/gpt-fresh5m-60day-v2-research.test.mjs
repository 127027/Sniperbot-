import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFreshCandidate} from './gpt-fresh5m-60day-v2-research.mjs';
const mint='7xWcYfVmBwXx1vHZgN5MrdYNX3gzJ35frhqRJoGbdqyo';
const f={mint,mayhem:false,quote_asset:'sol',quote_is_sol:true,
 f_n_buys:100,f_rep_n:40,f_rep_rug:0.05,f_dev_share:0.01,f_insider_share:0.01,
 flag_creator_sold:false,flag_bundle_dumped:false,
 flag_serial_rugger_creator:false,flag_pool_drained:false,
 flag_curve_closed_low:false,flag_migrate_below_grad:false};
test('fresh non-mayhem positive early signals are still WATCH, never order',()=>{
 const x=evaluateFreshCandidate({asof_features:f,age_at_scan_s:100});
 assert.equal(x.status,'WATCH_NEEDS_INDEPENDENT_POOL_PROOF');
 assert.ok(x.score>=80);
 assert.ok(x.virtual_stress_usdc_not_order>=50);
});
test('autonomous curve trading mode vetoes regardless of score',()=>{
 const x=evaluateFreshCandidate({asof_features:{...f,mayhem:true},age_at_scan_s:100});
 assert.equal(x.status,'RISK_REJECT');
 assert.match(x.reason,/MAYHEM/);
});
test('unverified SOL quote or late as-of data fail closed',()=>{
 const x=evaluateFreshCandidate({asof_features:{...f,quote_asset:null},age_at_scan_s:100});
 assert.equal(x.status,'DATA_GAP');
 assert.equal(evaluateFreshCandidate({asof_features:f,age_at_scan_s:350}).status,'RISK_REJECT');
});
test('creator sold wins over strong buying',()=>{
 const x=evaluateFreshCandidate({asof_features:{...f,flag_creator_sold:true},age_at_scan_s:100});
 assert.equal(x.status,'RISK_REJECT');
});
