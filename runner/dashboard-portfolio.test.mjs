import test from 'node:test';
import assert from 'node:assert/strict';
import {paperDashboardView} from './dashboard-portfolio.mjs';
import {freshState,action,updateCandidates,paperSignal} from './core.mjs';

test('R29 regular paper is the ONLY dashboard balance, fresh account stays unchanged',()=>{
 const base=freshState();
 const funded={...base,cashUsdc:4999.005};
 const view=paperDashboardView(funded);
 assert.equal(view.schema,'sniper_user_paper_dashboard.v1');
 assert.equal(view.account,'REGULAR_PAPER_ACCOUNT');
 assert.equal(view.free_cash_test_usdc,4999.005);
 assert.equal(view.total_estimated_net_equity_test_usdc,4999.005);
 assert.equal(view.open_position_count,0);
 assert.equal(view.estimated_open_pnl_test_usdc,0);
 assert.equal(view.live_trading_enabled,false);
 assert(!JSON.stringify(view).includes('5028.408'),'old isolated R29 ledger must NEVER appear in UI');
 assert.equal(funded.cashUsdc,4999.005);
});
test('net exit PnL and total value account for 1% model fee on regular visible TEST position',()=>{
 let s={...freshState(),cashUsdc:5000,entriesEnabled:true};
 s=updateCandidates(s,[paperSignal()]);
 s=action(s,{type:'BUY',id:'demo:signal-1',amount:50});
 assert.equal(s.cashUsdc,4950);
 assert.equal(s.positions.length,1);
 const p=paperDashboardView(s);
 assert.equal(p.free_cash_test_usdc,4950);
 assert.equal(p.open_position_count,1);
 assert.equal(p.positions[0].quote_status,'SYNTHETIC');
 assert.equal(p.positions[0].estimated_net_exit_test_usdc,49.005);
 assert.equal(p.positions[0].estimated_pnl_test_usdc,-0.995);
 assert.equal(p.positions[0].estimated_pnl_pct,-1.99);
 assert.equal(p.estimated_open_pnl_test_usdc,-0.995);
 assert.equal(p.total_estimated_net_equity_test_usdc,4999.005);
 assert.equal(p.history[0].title,'TEST-KAUF');
 assert.equal(s.positions.length,1,'view calculation must not mutate account');
});
test('stale/missing/future quotes cannot fabricate net exit, PnL or complete equity',()=>{
 let s={...freshState(),cashUsdc:4950,entriesEnabled:true,
  positions:[{id:'a',name:'Example',symbol:'X',chain:'solana',tokenAddress:'a',
   openedAt:new Date().toISOString(),markAt:new Date(Date.now()-3600000).toISOString(),
   priceUsd:1e8,qty:1,amountUsdc:50,entryPriceUsd:0.1,isDemo:false}]};
 const v=paperDashboardView(s);
 assert.equal(v.open_position_count,1);
 assert.equal(v.positions[0].quote_status,'STALE');
 assert.equal(v.positions[0].current_usdc,null);
 assert.equal(v.positions[0].estimated_pnl_test_usdc,null);
 assert.equal(v.estimated_open_pnl_test_usdc,null);
 assert.equal(v.total_estimated_net_equity_test_usdc,null);
 assert.equal(v.free_cash_test_usdc,4950);
 s.positions[0].markAt=new Date(Date.now()+600000).toISOString();
 assert.equal(paperDashboardView(s).positions[0].quote_status,'STALE');
 s.positions[0].markAt=null;
 assert.equal(paperDashboardView(s).positions[0].quote_status,'STALE');
});
test('multiple positions total net exit and aggregate PnL, mixed virtual cash only 1:1 TEST',()=>{
 const at=new Date().toISOString();
 const state={...freshState(),cashUsdc:200,cashEur:20,portfolioBudgetUsdc:500,
  positions:[{id:'a',symbol:'A',chain:'solana',amountUsdc:100,
   priceUsd:2,entryPriceUsd:2,qty:49.5,markAt:at,openedAt:at},
   {id:'b',symbol:'B',chain:'base',amountUsdc:50,
    priceUsd:1,entryPriceUsd:1,qty:49.5,markAt:at,openedAt:at}]};
 const p=paperDashboardView(state);
 assert.equal(p.free_cash_test_usdc,220);
 assert.equal(p.positions.length,2);
 assert.equal(p.estimated_open_pnl_test_usdc,-2.985);
 assert.equal(p.total_estimated_net_equity_test_usdc,367.015);
 assert.equal(p.portfolio_budget.total_reserved_test_usdc,150);
 assert.equal(p.portfolio_budget.free_to_allocate_test_usdc,220);
});
test('reject invalid paper data instead of showing false zeros and never expose secrets',()=>{
 assert.throws(()=>paperDashboardView({...freshState(),cashUsdc:NaN}),/DASHBOARD_PAPER_STATE_INVALID/);
 assert.throws(()=>paperDashboardView({...freshState(),positions:null}),/DASHBOARD_PAPER_STATE_INVALID/);
 const s={...freshState(),githubToken:'SECRET',walletSeed:'DO_NOT_SHOW'};
 const out=paperDashboardView(s);
 const txt=JSON.stringify(out);
 assert(!txt.includes('SECRET'));
 assert(!txt.includes('walletSeed'));
 assert.equal(out.currency,'TEST-USDC');
});


test('last confirmed GPT decision is visible on local UI without counting a NO_TRADE as a fill',()=>{
 const state={...freshState(),cashUsdc:4999,gptDecisionReplay:{
  ['gpt_'+'1'.repeat(32)]:{
   archive_sha256:'a'.repeat(64),status:'NO_TRADE',
   reason:'GPT_RESEARCH_NO_ORDER',at_utc:'2026-11-17T15:00:00.000Z'},
  ['gpt_'+'2'.repeat(32)]:{
   archive_sha256:'b'.repeat(64),status:'BLOCKED',
   reason:'GPT_FRESH_PRIVATE_PAPER_CAPACITY_REJECTED',
   at_utc:'2026-11-17T16:00:00.000Z'}}};
 const before=JSON.stringify(state);
 const view=paperDashboardView(state);
 assert.equal(view.free_cash_test_usdc,4999);
 assert.equal(view.gpt_paper_received_decisions,2);
 assert.equal(view.gpt_paper_last_decision.status,'BLOCKED');
 assert.equal(view.gpt_paper_last_decision.paper_order_was_not_assumed,true);
 assert.equal(view.open_position_count,0);
 assert.equal(JSON.stringify(state),before);
});
test('actual opened GPT-managed paper position is tagged; ordinary position is not',()=>{
 const s={...freshState(),cashUsdc:4900,positions:[
  {id:'gpt-position',chain:'solana',symbol:'EX',name:'Example',
   amountUsdc:50,qty:10,priceUsd:5,entryPriceUsd:5,
   gptPaperDecision:true,openedAt:'2026-11-17T15:00:00Z',
   markAt:'2026-11-17T15:01:00Z'},
  {id:'regular-position',chain:'solana',symbol:'REG',name:'Regular',
   amountUsdc:50,qty:10,priceUsd:5,entryPriceUsd:5,
   gptPaperDecision:false,openedAt:'2026-11-17T15:00:00Z',
   markAt:'2026-11-17T15:01:00Z'}]};
 const v=paperDashboardView(s,{now:Date.parse('2026-11-17T15:01:30Z')});
 assert.equal(v.positions[0].gpt_paper_managed,true);
 assert.equal(v.positions[1].gpt_paper_managed,false);
 assert.equal(v.positions[0].invested_test_usdc,50);
});

test('R29 V4.8 UI separates real locally received GPT decision journal and actual GPT Paper fills',()=>{
 const s={...freshState(),cashUsdc:4999.01,
  gptPaperFollow:true,entriesEnabled:false,
  gptDecisionReplay:{
   ['gpt_'+'a'.repeat(32)]:{at_utc:'2026-11-18T16:21:09.742Z',status:'NO_TRADE',reason:'GPT_RESEARCH_NO_ORDER'}
  },
  agentOrderReceipts:[{command_source:'GPT_GITHUB_LOCAL',status:'BLOCKED'},
   {command_source:'SIGNED_LOCAL_ADAPTER',status:'PAPER_FILLED'},
   {command_source:'GPT_GITHUB_LOCAL',status:'PAPER_FILLED',action:'BUY',
    synthetic_test:false,real_trade_executed:false,
    received_at_utc:'2026-11-18T16:22:00.000Z'},
   {command_source:'GPT_GITHUB_POLICY_EXIT',status:'PAPER_FILLED',action:'SELL',
    synthetic_test:false,real_trade_executed:false,
    received_at_utc:'2026-11-18T16:24:00.000Z',
    closed_pnl_test_usdc:0}]};
 const view=paperDashboardView(s,{now:Date.parse('2026-11-18T16:30:00Z')});
 assert.equal(view.gpt_paper_received_decisions,1);
 assert.equal(view.gpt_paper_recent_decisions.length,1);
 assert.equal(view.gpt_paper_recent_decisions[0].status,'NO_TRADE');
 assert.equal(view.gpt_local_paper_fills,2);
 assert.equal(view.gpt_local_paper_fills_are_not_model_proven,true);
 assert.equal(view.portfolio_budget.current_minimum_entry_test_usdc,50);
 assert.equal(view.portfolio_budget.signed_gpt_minimum_entry_test_usdc,5);
 assert.equal(view.bot_enabled,false);
});

test('R29 V5.2 existing UI view reports factual GPT Paper BUYs, SELLs and 72h inactivity without inventing uptime',()=>{
 const current=Date.parse('2026-11-19T08:00:00.000Z'),old=new Date(current-73*3600000).toISOString();
 const s={...freshState(),entriesEnabled:true,gptPaperFollow:true,cashUsdc:5000,
  gptDecisionReplay:{['gpt_'+'b'.repeat(32)]:{
   status:'NO_TRADE',reason:'GPT_RESEARCH_NO_ORDER',at_utc:old}},
  agentOrderReceipts:[]};
 const v=paperDashboardView(s,{now:current}),d=v.gpt_paper_local_activity_diagnostic;
 assert.equal(d.local_gpt_paper_buy_fills,0);
 assert.equal(d.local_gpt_paper_sell_fills,0);
 assert.equal(d.received_gpt_decisions_with_valid_timestamps,1);
 assert.equal(d.primary_local_explanation,'GPT_NO_TRADE_OR_WATCH_ONLY');
 assert.equal(d.review_priority,'72H_LOCAL_NO_BUY_DIAGNOSIS');
 assert.equal(d.continuous_service_availability_verified,false);
 assert.equal(d.retained_journal_complete_for_10_days,false);
 assert.equal(v.gpt_local_paper_fills,0);
 assert.equal(v.live_trading_enabled,false);
 assert.equal(v.free_cash_test_usdc,5000);
});
test('R29 V5.2 dashboard includes only genuine local virtual fill receipts; synthetic fixtures are not trades',()=>{
 const current=Date.parse('2026-11-19T08:00:00Z'),now=new Date(current).toISOString();
 const s={...freshState(),cashUsdc:4970,
  agentOrderReceipts:[
   {command_source:'GPT_GITHUB_LOCAL',action:'BUY',status:'PAPER_FILLED',
    received_at_utc:now,synthetic_test:true},
   {command_source:'GPT_GITHUB_LOCAL',action:'BUY',status:'PAPER_FILLED',
    received_at_utc:now,synthetic_test:false,real_trade_executed:false},
   {command_source:'GPT_GITHUB_POLICY_EXIT',action:'SELL',status:'PAPER_FILLED',
    received_at_utc:now,synthetic_test:false,real_trade_executed:false,
    closed_pnl_test_usdc:5.5},
   {command_source:'SIGNED_LOCAL_ADAPTER',action:'SELL',status:'PAPER_FILLED',
    received_at_utc:now,synthetic_test:false}
  ]};
 const v=paperDashboardView(s,{now:current});
 assert.equal(v.gpt_paper_local_activity_diagnostic.local_gpt_paper_buy_fills,1);
 assert.equal(v.gpt_paper_local_activity_diagnostic.local_gpt_paper_sell_fills,1);
 assert.equal(v.gpt_paper_local_activity_diagnostic.locally_recorded_gpt_paper_sell_pnl_test_usdc,5.5);
 assert.equal(v.gpt_local_paper_fills,2);
 assert.equal(v.gpt_local_paper_fills_are_not_model_proven,true);
 assert.equal(v.realized_pnl_test_usdc,0,
  'arbitrary fixture receipts must not mutate actual regular Paper ledger');
});

test('R29 V5.2 existing Paper dashboard shows sanitized market-to-security funnel without private balances publication',()=>{
 const current=Date.parse('2026-11-19T08:00:00Z'),at=new Date(current).toISOString();
 const collector={schema:'research_market_collector_status.v1',paper_only:true,
  actionable:false,last_check_at_utc:at,candidate_count:56};
 const security={schema:'sniper_r29_public_gpt_security_research.v1',
  mode:'PAPER_RESEARCH_ONLY',actionable:false,authorizes_paper_orders:false,
  checked_at_utc:at,candidate_check_count:2,
  selection_diagnostic:{schema:'sniper_r29_security_candidate_diagnostic.v1',
   evm_market_rows:36,potential_research_candidates:3,
   first_failure_reason_counts:{INDEPENDENT_PAIR_IDENTITY_NOT_CONFIRMED:30}},
  candidates:[{full_gpt_buy_gate_passed:false},{full_gpt_buy_gate_passed:false}]};
 const view=paperDashboardView({...freshState(),cashUsdc:5000},{
  now:current,collector,security});
 assert.equal(view.gpt_paper_research_funnel.observed_candidate_count,56);
 assert.equal(view.gpt_paper_research_funnel.last_security_sample_research_eligible_evm,3);
 assert.equal(view.gpt_paper_research_funnel.last_security_sample_actually_checked,2);
 assert.equal(view.gpt_paper_research_funnel.last_security_sample_failed_full_trade_proof,2);
 assert.equal(view.gpt_local_paper_fills,0);
 assert.equal(view.live_trading_enabled,false);
});

test('V5.8 UI exposes independent actual scan timestamps without claiming GPT decisions or paper buys',()=>{
 const t=Date.parse('2026-11-19T22:30:00Z');
 const collector={schema:'research_market_collector_status.v1',paper_only:true,
  actionable:false,last_check_at_utc:new Date(t-30000).toISOString(),
  candidate_count:63};
 const security={schema:'sniper_r29_public_gpt_security_research.v1',
  mode:'PAPER_RESEARCH_ONLY',actionable:false,authorizes_paper_orders:false,
  checked_at_utc:new Date(t-50000).toISOString(),candidate_check_count:2,
  selection_diagnostic:{schema:'sniper_r29_security_candidate_diagnostic.v1',
   evm_market_rows:28,potential_research_candidates:4,
   first_failure_reason_counts:{}},candidates:[]};
 const state={...freshState(),cashUsdc:5000,gptDecisionReplay:{
  ['gpt_'+'c'.repeat(32)]:{status:'NO_TRADE',
   reason:'GPT_RESEARCH_NO_ORDER',action:'NO_TRADE',
   chain:null,token_address:null,
   at_utc:new Date(t-20000).toISOString()}}};
 const view=paperDashboardView(state,{now:t,collector,security});
 assert.equal(view.gpt_paper_recent_decisions[0].action,'NO_TRADE');
 assert.equal(view.gpt_paper_research_activity.length,2);
 assert.deepEqual(view.gpt_paper_research_activity.map(x=>x.source),
  ['MARKET_COLLECTOR','INDEPENDENT_SECURITY_RESEARCH']);
 assert.equal(view.gpt_paper_research_activity[0].observed_count,63);
 assert.equal(view.gpt_paper_research_activity[1].security_checks,2);
 for(const event of view.gpt_paper_research_activity){
  assert.equal(event.gpt_decision,false);
  assert.equal(event.paper_trade_executed,false);
 }
 assert.equal(view.gpt_local_paper_fills,0);
 assert.equal(view.free_cash_test_usdc,5000);
});
test('V5.8 stale or untrusted research cannot create UI activity or fake a trade',()=>{
 const t=Date.parse('2026-11-19T22:30:00Z');
 const forged={schema:'research_market_collector_status.v1',paper_only:true,
  actionable:true,last_check_at_utc:new Date(t).toISOString(),candidate_count:80};
 const stale={schema:'sniper_r29_public_gpt_security_research.v1',
  mode:'PAPER_RESEARCH_ONLY',actionable:false,authorizes_paper_orders:false,
  checked_at_utc:new Date(t-3*3600000).toISOString(),candidate_check_count:2};
 const view=paperDashboardView({...freshState(),cashUsdc:5000},{
  now:t,collector:forged,security:stale});
 assert.deepEqual(view.gpt_paper_research_activity,[]);
 assert.equal(view.gpt_paper_received_decisions,0);
 assert.equal(view.gpt_local_paper_fills,0);
});
