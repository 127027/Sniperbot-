import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,action,paperSignal} from './core.mjs';
import {portfolioBudget,allocatePortfolioPaper,isWithinPortfolioBudget,MIN_PAPER_ENTRY_USDC} from './portfolio-budget.mjs';

function setup({cash=5000,preferred=50,budget=5000}={}){
 let s={...freshState(),cashUsdc:cash,entriesEnabled:true};
 return action(s,{type:'SET_RANGE',min:preferred,max:budget});
}
function buyNew(s,amount,i){
 const p=paperSignal();
 const c={...p,id:'demo:new-'+i,tokenAddress:'mint-'+i,poolAddress:'pool-'+i,
   asOf:new Date().toISOString()};
 return action({...s,candidates:[c]}, {type:'BUY',id:c.id,amount});
}
test('50–5000 means 5000 TOTAL exposure: up to 100 distinct 50 USDC slots',()=>{
 let s=setup();
 for(let i=0;i<100;i++){
  const prev=s;
  s=buyNew(s,50,i);
  assert.equal(s.positions.length,i+1,'each valid coin has a different exact identity');
  assert.equal(portfolioBudget(s).reserved_test_usdc,(i+1)*50);
 }
 assert.equal(s.cashUsdc,0);
 assert.equal(portfolioBudget(s).free_to_allocate_test_usdc,0);
 const next=buyNew(s,50,'101');
 assert.equal(next.positions.length,100,'no purchase after budget exhausts');
});
test('5000 budget may be 2x2500 or 1x5000, never 2500+2500+50',()=>{
 let s=setup();
 s=buyNew(s,2500,'a');s=buyNew(s,2500,'b');
 assert.equal(s.positions.length,2);
 assert.equal(buyNew(s,50,'c').positions.length,2);
 let all=buyNew(setup(),5000,'all');
 assert.equal(all.positions.length,1);assert.equal(portfolioBudget(all).free_to_allocate_test_usdc,0);
});
test('200–300 means 300 total, 200 preferred, 50 flexible minimum; 50+50+200 allowed',()=>{
 let s=setup({preferred:200,budget:300,cash:5000});
 assert.equal(portfolioBudget(s).preferred_test_usdc,200);
 for(const [a,i] of [[50,'a'],[50,'b'],[200,'c']])s=buyNew(s,a,i);
 assert.deepEqual(s.positions.map(p=>p.amountUsdc),[200,50,50]);
 assert.equal(portfolioBudget(s).reserved_test_usdc,300);
 assert.equal(portfolioBudget(s).free_to_allocate_test_usdc,0);
 assert.equal(s.cashUsdc,4700,'physical paper balance is not the same as total investment cap');
 assert.equal(buyNew(s,50,'d').positions.length,3);
 let two=buyNew(setup({preferred:200,budget:300}),200,'one');
 two=buyNew(two,200,'two');
 assert.equal(two.positions.length,1,'200+200 does not fit 300 total');
 let x=buyNew(setup({preferred:200,budget:300}),100,'x');
 assert.equal(x.positions.length,1,'100 allowed despite preferred 200');
});
test('50 min is separate from preferred entry; no invalid pennies, NaN or implicit unlimited funding',()=>{
 let s=setup({preferred:200,budget:300});
 assert.equal(MIN_PAPER_ENTRY_USDC,50);
 assert.equal(allocatePortfolioPaper({state:s,intent:'EXPLORATORY'}),200);
 assert.equal(allocatePortfolioPaper({state:s,intent:'TARGET',targetUsdc:50}),50);
 assert.equal(allocatePortfolioPaper({state:s,intent:'TARGET',targetUsdc:125}),125);
 assert.equal(allocatePortfolioPaper({state:s,intent:'HIGH_CONVICTION'}),300);
 assert.equal(allocatePortfolioPaper({state:s,intent:'HIGH_CONVICTION',capacity:180}),180);
 assert.equal(allocatePortfolioPaper({state:s,intent:'TARGET',targetUsdc:49}),0);
 assert.equal(isWithinPortfolioBudget(s,NaN),false);
 assert.equal(isWithinPortfolioBudget(s,49.99),false);
 assert.equal(isWithinPortfolioBudget(s,100.005),false);
});
test('reduced budget never liquidates existing positions, but blocks every new entry until affordable',()=>{
 let s=setup({budget:5000});
 s=buyNew(s,500,'one');
 s=action(s,{type:'SET_RANGE',min:200,max:300});
 assert.equal(s.positions.length,1,'never silently force-sell an existing paper holding');
 assert.equal(portfolioBudget(s).free_to_allocate_test_usdc,0);
 assert.equal(buyNew(s,50,'two').positions.length,1);
 const sold=action(s,{type:'SELL',id:s.positions[0].id});
 assert.equal(sold.positions.length,0);
 assert.equal(portfolioBudget(sold).free_to_allocate_test_usdc,300);
 assert.equal(buyNew(sold,100,'three').positions.length,1);
});
test('legacy saved settings without explicit V0.6 budget use previous upper bound as conservative cap',()=>{
 let s={...freshState(),cashUsdc:5000,minTrade:200,maxTrade:300,portfolioBudgetUsdc:undefined,entriesEnabled:true};
 assert.equal(portfolioBudget(s).cap_test_usdc,300);
 assert.equal(buyNew(s,50,'legacy').positions[0].amountUsdc,50);
 const after=buyNew(s,350,'too-much');
 assert.equal(after.positions.length,0);
});
