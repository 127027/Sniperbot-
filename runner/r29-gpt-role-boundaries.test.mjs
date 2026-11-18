import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,applyExits,action} from './core.mjs';

test('V4.3: generic global stop never substitutes for GPT-authored policy',()=>{
 const at=new Date().toISOString();
 const pos={id:'gpt-test',chain:'base',tokenAddress:'0x'+'a'.repeat(40),
  poolAddress:'0x'+'b'.repeat(40),symbol:'GPT',isDemo:false,
  gptPaperDecision:true,exitMode:'GPT_GUARD',entryPriceUsd:1,
  priceUsd:.7,highWaterPrice:1,qty:50,amountUsdc:50,
  markAt:at,openedAt:at};
 const state={...freshState(),cashUsdc:4950,positions:[pos],
  stopLoss:10,takeProfit:15};
 const after=applyExits(state);
 assert.equal(after.positions.length,1);
 assert.equal(after.cashUsdc,4950);
 assert.equal(after.closedPnl,0);
 assert.equal(after.positions[0].quoteStatus,'GPT_POSITION_EXIT_POLICY_NOT_AUTHORIZED');
 const edited=action(state,{type:'SET_EXITS',profit:10,loss:5,mode:'AUTO'});
 assert.equal(edited.positions[0].exitMode,'GPT_GUARD');
 assert.equal(applyExits(edited).positions.length,1);
});

test('V4.3: legacy non-GPT AUTO exit retains old behavior',()=>{
 const at=new Date().toISOString();
 const pos={id:'legacy-test',chain:'base',tokenAddress:'0x'+'a'.repeat(40),
  poolAddress:'0x'+'b'.repeat(40),symbol:'LEGACY',isDemo:false,
  exitMode:'AUTO',entryPriceUsd:1,priceUsd:1.25,highWaterPrice:1.25,
  qty:49.5,amountUsdc:50,markAt:at,openedAt:at};
 const state={...freshState(),cashUsdc:4950,positions:[pos]};
 const after=applyExits(state);
 assert.equal(after.positions.length,0);
 assert(after.closedPnl>0);
});
