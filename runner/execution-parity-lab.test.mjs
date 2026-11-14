import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateExecutionIntent,applyPaperExecution} from './execution-parity-lab.mjs';
const now=Date.parse('2026-11-10T12:00:00Z');
const id='solana:VALIDTOKENEXAMPLE:VALIDPOOLEXAMPLE';
const state=()=>({entriesEnabled:true,minTrade:50,maxTrade:500,portfolioBudgetUsdc:500,
 cashUsdc:500,cashEur:0,positions:[]});
const pool=()=>({source:'SYNTHETIC_FIXTURE',candidate_id:id,
 reserve_base_usdc:100000,reserve_token:10000000,fee_bps:30,
 gas_usdc:0.1,observed_at_utc:new Date(now).toISOString()});
const checks=()=>({candidate_id:id,contract:'PASS',liquidity:'PASS',
 sellability:'PASS',five_role_consensus:true,independent_risk_pass:true,
 executable_route_pass:true,checked_at_utc:new Date(now).toISOString()});
const request=(extra={})=>({mode:'PAPER',side:'BUY',candidate_id:id,
 portfolio:state(),amount_usdc:200,pool:pool(),checks:checks(),now,...extra});
test('paper buy to sell uses same eligibility and realistic constant-product reserve impact with fees',()=>{
 const buy=evaluateExecutionIntent(request());
 assert.equal(buy.eligible,true,buy.reason);
 assert.equal(buy.order.source,'SYNTHETIC_FIXTURE');
 assert(buy.order.quote.received_token>0);
 const first=applyPaperExecution(state(),buy,{now});
 assert.equal(first.cashUsdc,300);
 assert.equal(first.positions.length,1);
 assert.equal(first.positions[0].amountUsdc,200);
 const sell=evaluateExecutionIntent(request({side:'SELL',portfolio:first,amount_usdc:undefined,
 token_qty:first.positions[0].token_qty}));
 assert.equal(sell.eligible,true,sell.reason);
 const closed=applyPaperExecution(first,sell,{now});
 assert.equal(closed.positions.length,0);
 assert(closed.cashUsdc<500,'round trip must lose modeled fees and gas in unchanged synthetic pool');
});
test('real LIVE mode is never executable, even if someone sets an authorization flag',()=>{
 for(const live_explicitly_authorized of [false,true]){
  const result=evaluateExecutionIntent(request({mode:'LIVE',live_explicitly_authorized}));
  assert.equal(result.eligible,false);
  assert.equal(result.order,null);
  assert.match(result.reason,/LIVE_/);
 }
});
test('missing any mandatory independent safety or five-role review fails closed',()=>{
 for(const key of ['contract','liquidity','sellability',
   'five_role_consensus','independent_risk_pass','executable_route_pass']){
  const c=checks();
  c[key]=typeof c[key]==='boolean'?false:'UNKNOWN';
  const result=evaluateExecutionIntent(request({checks:c}));
  assert.equal(result.eligible,false,key);
  assert.equal(result.reason,'INDEPENDENT_RISK_OR_CONSENSUS_UNAVAILABLE');
 }
});
test('stale evidence, indicative quote and excessive price impact fail closed',()=>{
 assert.equal(evaluateExecutionIntent(request({checks:{...checks(),checked_at_utc:new Date(now-31000).toISOString()}})).reason,
  'STALE_RISK_EVIDENCE');
 assert.equal(evaluateExecutionIntent(request({pool:{...pool(),source:'DEX_INDICATIVE'}})).reason,
  'EXECUTABLE_QUOTE_ADAPTER_UNAVAILABLE');
 assert.equal(evaluateExecutionIntent(request({pool:{...pool(),observed_at_utc:new Date(now-31000).toISOString()}})).eligible,false);
 assert.equal(evaluateExecutionIntent(request({pool:{...pool(),reserve_base_usdc:1000},amount_usdc:500})).reason,
  'PRICE_IMPACT_TOO_HIGH');
});
test('same restrictions apply to late, oversize and invalid-budget entry',()=>{
 assert.equal(evaluateExecutionIntent(request({portfolio:{...state(),entriesEnabled:false}})).reason,'ENTRIES_DISABLED');
 assert.equal(evaluateExecutionIntent(request({amount_usdc:501})).reason,'INSUFFICIENT_BUDGET');
 assert.equal(evaluateExecutionIntent(request({amount_usdc:49})).reason,'INSUFFICIENT_BUDGET');
 assert.equal(evaluateExecutionIntent(request({amount_usdc:50.001})).reason,'INSUFFICIENT_BUDGET');
 assert.equal(evaluateExecutionIntent(request({checks:{...checks(),candidate_id:id+'x'}})).eligible,false);
});
test('cannot repeat buy, change budget after approval, or sell without matching position',()=>{
 const buy=evaluateExecutionIntent(request());
 const first=applyPaperExecution(state(),buy,{now});
 assert.throws(()=>applyPaperExecution(first,buy,{now}),/DUPLICATE_POSITION/);
 assert.throws(()=>applyPaperExecution({...state(),cashUsdc:1},buy,{now}),/PAPER_CASH_OR_BUDGET_CHANGED/);
 assert.throws(()=>applyPaperExecution(state(),buy,{now:now+31000}),/EXPIRED/);
 assert.equal(evaluateExecutionIntent(request({side:'SELL',token_qty:100})).reason,'POSITION_UNAVAILABLE');
});
test('bot OFF blocks new entries but allows sell review of an existing position',()=>{
 const buy=evaluateExecutionIntent(request());
 const filled=applyPaperExecution(state(),buy,{now});
 const off={...filled,entriesEnabled:false};
 assert.equal(evaluateExecutionIntent(request({portfolio:off})).reason,'ENTRIES_DISABLED');
 const sell=evaluateExecutionIntent(request({side:'SELL',portfolio:off,token_qty:filled.positions[0].token_qty}));
 assert.equal(sell.eligible,true);
 assert.equal(applyPaperExecution(off,sell,{now}).positions.length,0);
});
