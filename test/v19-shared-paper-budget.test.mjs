import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveSharedPaperPolicy,DEFAULT_BUDGET_SETTINGS,
 verifyExistingPaperBalancePreserved} from '../src/v19-paper-budget-policy.mjs';
import {newState,DEFAULT_POLICY,settlePaper,Reject} from '../src/core.mjs';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';

const configPath='research/config/paper-budget-v19.json';
const saved=()=>readFile(configPath,'utf8').then(JSON.parse);
test('versioned GitHub config resolves to exact original 5000 / 50 / 30 model',async()=>{
 const cfg=await saved(),v=resolveSharedPaperPolicy(cfg);
 assert.deepEqual(cfg,DEFAULT_BUDGET_SETTINGS);
 assert.equal(v.policy.startingBalance,5000);
 assert.equal(v.policy.entryAmount,50);
 assert.equal(v.policy.maxPositions,30);
 assert.equal(v.risk_parameters_unchanged,true);
 assert.equal(v.policy.maxQuoteAgeMs,DEFAULT_POLICY.maxQuoteAgeMs);
});
test('same custom stake and starting money flow through full on-demand replay',()=>{
 const settings={...DEFAULT_BUDGET_SETTINGS,initial_test_usdc:2000,
  stake_per_coin_test_usdc:100,max_open_positions:12};
 const v=resolveSharedPaperPolicy(settings);
 const out=backtestOnRequest({date:'2026-10-12',paperBudgetSettings:settings});
 assert.equal(v.policy.entryAmount,100);
 assert.equal(out.start_capital_test_usdc,2000);
 assert.equal(out.amount_per_coin_test_usdc,100);
 assert.equal(out.max_open_positions,12);
 assert.equal(out.shared_paper_budget_policy_id,v.policy_id);
 assert.equal(out.model_ending_cash_test_usdc,2000);
 assert.equal(out.confirmed_paper_orders,0);
});
test('existing account remains byte-for-byte unchanged when stake config changes',()=>{
 const state=newState();
 state.cash=4999.01;state.positions['example-lot']={
  coin:{chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40)},
  sourceOrderId:'old-order-00001',quantity:20};
 state.receipts['old-order-00001']={published:true,data:{status:'PAPER_FILLED'}};
 const before=JSON.stringify(state);
 const configured=resolveSharedPaperPolicy({...DEFAULT_BUDGET_SETTINGS,
  stake_per_coin_test_usdc:75});
 const proof=verifyExistingPaperBalancePreserved({state,configuredPolicy:configured});
 assert.equal(proof.existing_paper_cash_test_usdc,4999.01);
 assert.equal(proof.new_paper_cash_test_usdc,4999.01);
 assert.equal(proof.entry_amount_for_new_prospective_orders,75);
 assert.equal(JSON.stringify(state),before);
 assert.equal(proof.position_mutation_authorized,false);
});
test('unaffordable max positions get capped, and risk rules cannot be edited by config',()=>{
 const low=resolveSharedPaperPolicy({...DEFAULT_BUDGET_SETTINGS,
  initial_test_usdc:100,stake_per_coin_test_usdc:75,max_open_positions:30});
 assert.equal(low.policy.maxPositions,1);
 assert.equal(low.policy.minLiquidityUsd,DEFAULT_POLICY.minLiquidityUsd);
 assert.throws(()=>resolveSharedPaperPolicy({...DEFAULT_BUDGET_SETTINGS,
  maxQuoteAgeMs:9000000}),/INVALID_SHARED_PAPER_BUDGET_CONFIG/);
});
test('invalid stake, higher-than-budget, unknown version, bad max count blocked',()=>{
 for(const settings of [
  {...DEFAULT_BUDGET_SETTINGS,stake_per_coin_test_usdc:0},
  {...DEFAULT_BUDGET_SETTINGS,stake_per_coin_test_usdc:6000},
  {...DEFAULT_BUDGET_SETTINGS,schema:2},
  {...DEFAULT_BUDGET_SETTINGS,max_open_positions:500},
  {...DEFAULT_BUDGET_SETTINGS,initial_test_usdc:-5}
 ]){
  assert.throws(()=>resolveSharedPaperPolicy(settings),
   /INVALID_SHARED_PAPER_BUDGET_CONFIG/);
 }
});
test('manual backtest script and Windows runner read exact same versioned file',async()=>{
 const [script,runner]=await Promise.all([
  readFile('scripts/v18-backtest-on-demand.mjs','utf8'),
  readFile('src/runner.mjs','utf8')]);
 assert.match(script,/research\/config\/paper-budget-v19\.json/);
 assert.match(runner,/paper-budget-v19\.json/);
 assert.match(runner,/verifyExistingPaperBalancePreserved/);
 assert.match(runner,/settlePaper\(order,state,Date\.now\(\),executionPolicy\)/);
});
