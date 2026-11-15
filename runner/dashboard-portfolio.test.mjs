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
