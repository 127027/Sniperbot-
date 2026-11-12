import test from 'node:test';
import assert from 'node:assert/strict';
import {runCausalTimeMachine,sourceUsable,dayView} from './dot-causal-timemachine.mjs';
const t1='2024-09-10T12:00:00Z',t2='2024-09-11T10:00:00Z',t3='2024-09-12T10:00:00Z';
const token='synthetic:SAMPLE_MINT_ALPHA:SAMPLE_POOL_ALPHA';
const sample=()=>{
 const source=(id,at)=>({id,event_at_utc:at,available_at_utc:at,grade:'SYNTHETIC_FIXTURE',synthetic_only:true});
 return {mode:'SYNTHETIC_FIXTURE',
  period:{start_utc:'2024-09-10T00:00:00Z',end_utc:'2024-09-12T23:59:59Z'},
  config:{initial_test_usdc:730,max_total_budget_usdc:310,min_trade_usdc:25,max_trade_usdc:200,max_quote_age_minutes:70},
  days:[
   {day_utc:'2024-09-10',sources:[source('s01',t1)],quotes:[],risks:[]},
   {day_utc:'2024-09-11',sources:[source('s02','2024-09-11T09:30:00Z')],
    risks:[{token_key:token,at_utc:'2024-09-11T09:40:00Z',source_id:'s02',status:'PASS'}],
    quotes:[
     {token_key:token,source_id:'s02',side:'BUY',at_utc:'2024-09-11T09:45:00Z',price_usdc:3,max_notional_usdc:190,fee_bps:0,slippage_bps:0},
     {token_key:token,source_id:'s02',side:'SELL',at_utc:'2024-09-11T09:45:00Z',price_usdc:3,max_notional_usdc:500,fee_bps:0,slippage_bps:0}]},
   {day_utc:'2024-09-12',sources:[source('s03','2024-09-12T09:30:00Z')],risks:[],
    quotes:[{token_key:token,source_id:'s03',side:'SELL',at_utc:'2024-09-12T09:45:00Z',price_usdc:4.2,max_notional_usdc:500,fee_bps:0,slippage_bps:0}]}
  ],decisions:[]}
};
test('no fabricated original market data or bot integration in default empty training',()=>{
 const x=sample();x.decisions=[{at_utc:t1,token_key:token,action:'WATCH',evidence_ids:['s01']}];
 const r=runCausalTimeMachine(x);
 assert.equal(r.simulated_fills,0);
 assert.equal(r.cash_test_usdc,730);
 assert.equal(r.real_bot_orders,0);
 assert.equal(r.total_equity_test_usdc,null);
 assert.equal(r.calibration_status,'NOT_CALIBRATED');
});
test('a synthetic buy and a later sell honor time and account conservation',()=>{
 const x=sample();
 x.decisions=[
  {at_utc:t1,token_key:token,action:'WATCH',evidence_ids:['s01']},
  {at_utc:t2,token_key:token,action:'BUY',requested_usdc:93,score_0_100:61,evidence_ids:['s02']},
  {at_utc:t3,token_key:token,action:'SELL',evidence_ids:['s03']}];
 const r=runCausalTimeMachine(x);
 assert.equal(r.simulated_fills,2);
 assert.equal(r.realized_pnl_test_usdc,37.2);
 assert.equal(r.cash_test_usdc,767.2);
 assert.equal(r.open_positions.length,0);
 assert.equal(r.journal[1].calibrated_probability,null);
 assert(r.journal.every(j=>j.bot_delivery===false&&j.non_actionable===true));
});
test('later day quote and risk cannot be used in earlier decision',()=>{
 const x=sample();
 x.decisions=[{at_utc:t1,token_key:token,action:'BUY',requested_usdc:93,evidence_ids:['s01']}];
 assert.equal(runCausalTimeMachine(x).journal[0].status,'BLOCKED_MISSING_FRESH_QUOTE');
 assert.equal(dayView(x,t1).quotes.length,0);
});
test('original-platform date without archive proof cannot authorize a historical buy',()=>{
 const x=sample();x.mode='HISTORICAL_RESEARCH';
 x.days[1].sources[0].grade='PLATFORM_DATE_ONLY';x.days[1].sources[0].synthetic_only=false;
 x.decisions=[{at_utc:t2,token_key:token,action:'BUY',requested_usdc:93,evidence_ids:['s02']}];
 assert.equal(runCausalTimeMachine(x).journal[0].status,'BLOCKED_MISSING_ASOF_EVIDENCE');
 assert.equal(runCausalTimeMachine(x).simulated_fills,0);
});
test('score is not a 95 percent probability and does not dictate position size',()=>{
 const x=sample();
 x.decisions=[{at_utc:t2,token_key:token,action:'BUY',requested_usdc:93,score_0_100:84,
  calibrated_probability:0.84,evidence_ids:['s02']}];
 assert.throws(()=>runCausalTimeMachine(x),/UNSUPPORTED_PROBABILITY_FROM_SCORE/);
 x.decisions[0].calibrated_probability=null;
 assert.equal(runCausalTimeMachine(x).journal[0].amount_usdc,93);
});
test('oversize or insufficient trade budget cannot consume future money',()=>{
 const x=sample();x.decisions=[
  {at_utc:t2,token_key:token,action:'BUY',requested_usdc:250,evidence_ids:['s02']},
  {at_utc:t2,token_key:token,action:'BUY',requested_usdc:93,evidence_ids:['s02']}];
 const r=runCausalTimeMachine(x);
 assert.equal(r.journal[0].status,'BLOCKED_BUDGET_OR_CAPACITY');
 assert.equal(r.journal[1].status,'SIMULATED_FILL');
 assert.equal(r.cash_test_usdc,637);
});
test('existing open positions are never automatically sold at period close',()=>{
 const x=sample();
 x.decisions=[{at_utc:t2,token_key:token,action:'BUY',requested_usdc:93,evidence_ids:['s02']}];
 const r=runCausalTimeMachine(x);
 assert.equal(r.open_positions.length,1);
 assert.equal(r.open_positions[0].valuation_status,'OPEN_NOT_ASSUMED_SELLABLE');
 assert.equal(r.cash_test_usdc,637);
});
test('missing sell depth blocks desired sale, not fictitiously booking profits',()=>{
 const x=sample();x.days[2].quotes[0].max_notional_usdc=2;
 x.decisions=[
  {at_utc:t2,token_key:token,action:'BUY',requested_usdc:93,evidence_ids:['s02']},
  {at_utc:t3,token_key:token,action:'SELL',evidence_ids:['s03']}];
 const r=runCausalTimeMachine(x);
 assert.equal(r.simulated_fills,1);
 assert.equal(r.journal[1].status,'BLOCKED_SELL_CAPACITY');
 assert.equal(r.open_positions.length,1);
 assert.equal(r.realized_pnl_test_usdc,0);
});
test('no BUY without verified historical risk and executable selling route',()=>{
 const x=sample();x.days[1].risks=[];
 x.decisions=[{at_utc:t2,token_key:token,action:'BUY',requested_usdc:93,evidence_ids:['s02']}];
 assert.equal(runCausalTimeMachine(x).journal[0].status,'BLOCKED_RISK_OR_SELLABILITY');
});
test('decision order, source timestamps and malformed days are fail-closed',()=>{
 const x=sample();x.decisions=[
  {at_utc:t2,token_key:token,action:'HOLD',evidence_ids:['s02']},
  {at_utc:t1,token_key:token,action:'HOLD',evidence_ids:['s01']}];
 assert.throws(()=>runCausalTimeMachine(x),/DECISIONS_NOT_CHRONOLOGICAL/);
 const y=sample();y.days.push(structuredClone(y.days[0]));
 assert.throws(()=>runCausalTimeMachine(y),/DUPLICATE_OR_OUTSIDE_DAY/);
});
test('never accept an unaudited synthetic source as a real historical original',()=>{
 const s={id:'s01',event_at_utc:t1,available_at_utc:t1,
  grade:'SYNTHETIC_FIXTURE',synthetic_only:true};
 assert.equal(sourceUsable(s,t1,'SYNTHETIC_FIXTURE'),true);
 assert.equal(sourceUsable(s,t1,'HISTORICAL_RESEARCH'),false);
 assert.equal(sourceUsable(s,'2024-09-10T11:00:00Z','SYNTHETIC_FIXTURE'),false);
});
