import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,action} from './core.mjs';
import {readLiveTradingGate} from './live-mode-policy.mjs';
import {buildPrivateDualAccountBotState,inspectDualAccountSignal} from './gpt-private-bot-state.mjs';
import {makePrivateGptSizeOffer,validateGptSizeChoice} from './gpt-paper-size-negotiation.mjs';
const now=Date.parse('2026-11-18T18:00:00.000Z');
const iso=n=>new Date(n).toISOString();
const paper=()=>({...freshState(),minTrade:75,maxTrade:3400,
 portfolioBudgetUsdc:3400,cashUsdc:5000,cashEur:0,
 entriesEnabled:true,gptPaperFollow:true});
const realFixture={schema:'sniper_real_wallet_overview.v1',
 network:'solana-mainnet',live_trading_enabled:false,
 real_fill_history_verified:false,usdc_display:'100.00',
 wallet_address:'SECRET_WALLET_ADDRESS_SHOULD_NOT_LEAK',
 real_open_positions:null};
const snap=(p,opts={})=>buildPrivateDualAccountBotState({
 paperState:p,liveGate:readLiveTradingGate(),realWalletOverview:realFixture,
 now,...opts
});
const proof=(before,after,amount)=>inspectDualAccountSignal({
 action:'BUY',sourceState:before,currentState:after,
 paperAmountTestUsdc:amount,realAmountUsdc:20,now:now+1000
});
test('V4.9 private dual-state is versioned separately; no tabs, wallet address, or public GitHub delivery',()=>{
 const s=snap(paper());
 assert.equal(s.schema,'sniper_r29_private_dual_account_state.v1');
 assert.equal(s.private_authenticated_localhost_only,true);
 assert.equal(s.remote_gpt_delivery_verified,false);
 assert.equal(s.must_not_publish_to_public_github,true);
 assert.equal(s.paper.preferred_entry_test_usdc,50);
 assert.equal(s.paper.user_total_open_exposure_limit_test_usdc,5000);
 assert.equal(s.paper.available_virtual_balance_test_usdc,5000);
 assert.equal(s.paper.remaining_user_exposure_test_usdc,5000);
 assert.equal(s.paper.available_for_new_buy_test_usdc,5000);
 assert.equal(s.real.actual_verified_wallet_usdc,100);
 assert.equal(s.real.preferred_entry_usdc,null);
 assert.equal(s.real.user_total_open_exposure_limit_usdc,null);
 assert.equal(s.real.open_position_count,null);
 assert.equal(s.real.available_for_new_buy_usdc,null);
 assert.equal(s.real.execution_enabled,false);
 assert.equal(s.real.live_gate_locked,true);
 assert(!JSON.stringify(s).includes('SECRET_WALLET_ADDRESS_SHOULD_NOT_LEAK'));
 assert(!JSON.stringify(s).includes('public_key'));
});
test('V5.7 distinct Paper and Real user-fixed coin settings independently change private revisions',()=>{
 const a=paper(),before=snap(a);
 const paperChanged=action(a,{type:'SET_COIN_STAKE',account:'PAPER',amount:80});
 const x=snap(paperChanged);
 assert.equal(x.paper.preferred_entry_test_usdc,80);
 assert.equal(x.paper.owner_fixed_coin_stake_test_usdc,80);
 assert.equal(x.paper.available_for_new_buy_test_usdc,5000);
 assert.notEqual(x.paper.local_state_revision,before.paper.local_state_revision);
 assert.equal(x.real.local_state_revision,before.real.local_state_revision);
 assert.equal(proof(before,x,80).paper.reason,'PAPER_STATE_CHANGED_REQUIRE_FRESH_GPT_DECISION');
 assert.equal(proof(x,x,80).paper.allowed,true);
 const realChanged=action(paperChanged,{type:'SET_COIN_STAKE',account:'REAL',amount:125});
 const y=snap(realChanged);
 assert.equal(y.real.user_fixed_coin_stake_setting_usdc,125);
 assert.notEqual(y.real.local_state_revision,x.real.local_state_revision);
 assert.equal(y.paper.local_state_revision,x.paper.local_state_revision);
 assert.equal(y.real.execution_enabled,false);
 assert.equal(y.real.available_to_execute,false);
 assert.equal(proof(x,y,80).real.reason,'REAL_STATE_CHANGED_REQUIRE_FRESH_GPT_DECISION');
});
test('V4.9 real settings synthetic fixtures are independent and LIVE remains locked; no real transaction',()=>{
 const current=paper();
 const first=snap(current,{realSettings:{preferred_entry_usdc:20,
  total_open_exposure_limit_usdc:100}});
 const next=snap(current,{realSettings:{preferred_entry_usdc:35,
  total_open_exposure_limit_usdc:20}});
 assert.equal(next.real.preferred_entry_usdc,35);
 assert.equal(next.real.user_total_open_exposure_limit_usdc,20);
 assert.equal(next.paper.local_state_revision,first.paper.local_state_revision);
 assert.notEqual(next.real.local_state_revision,first.real.local_state_revision);
 assert.equal(proof(first,next,25).paper.allowed,true);
 assert.equal(proof(first,next,25).real.reason,'REAL_STATE_CHANGED_REQUIRE_FRESH_GPT_DECISION');
 assert.equal(proof(next,next,25).real.reason,'LIVE_TRADING_LOCKED');
 assert.equal(proof(next,next,25).real.transaction_sent,false);
});
test('V4.9 independently account-bound positions and stale expiry cannot authorize live trading',()=>{
 const p=paper();
 const pos={id:'paper-p1',chain:'base',tokenAddress:'0x'+'a'.repeat(40),
  poolAddress:'0x'+'b'.repeat(40),amountUsdc:40,qty:2000,
  priceUsd:.02,markAt:iso(now),entryPriceUsd:.02};
 const occupied={...p,cashUsdc:4960,positions:[pos]};
 const s=snap(occupied);
 assert.equal(s.paper.reserved_open_cost_test_usdc,40);
 assert.equal(s.paper.remaining_user_exposure_test_usdc,4960);
 assert.equal(s.paper.open_position_count,1);
 assert.equal(s.real.open_position_count,null);
 const sold={...occupied,cashUsdc:4990,positions:[]};
 const newer=snap(sold);
 assert.notEqual(s.paper.local_state_revision,newer.paper.local_state_revision);
 const sell=inspectDualAccountSignal({action:'SELL',
  sourceState:s,currentState:s,paperPositionId:'paper-p1',
  realPositionId:'paper-p1',now:now+1000});
 assert.equal(sell.paper.allowed,true);
 assert.equal(sell.paper.still_requires_signed_gpt_exit,true);
 assert.equal(sell.real.allowed,false);
 const after=inspectDualAccountSignal({action:'BUY',sourceState:s,currentState:s,
  paperAmountTestUsdc:25,now:now+121000});
 assert.equal(after.paper.reason,'SOURCE_STATE_INVALID_OR_EXPIRED');
});
test('V4.9 a verified wallet balance is unknown without trustworthy local chain evidence',()=>{
 const x=buildPrivateDualAccountBotState({paperState:paper(),
  liveGate:readLiveTradingGate(),now});
 assert.equal(x.real.actual_verified_wallet_usdc,null);
 assert.equal(x.real.trading_settings_proven_persisted,false);
 assert.equal(x.real.available_to_execute,false);
});
test('V4.9 existing authenticated private GPT size offer ties choice to Paper settings revision',()=>{
 const p=paper();
 const req={schema:'sniper_r29_gpt_size_request.v1',mode:'PAPER_ONLY',
  strategy:'GPT_ONLY',request_id:'gpt_'+'e'.repeat(32),
  action:'REQUEST_BUY_CAPACITY',chain:'base',
  token_address:'0x'+'a'.repeat(40),pool_address:'0x'+'b'.repeat(40),
  created_at_utc:iso(now-2000),source_review_sha256:'a'.repeat(64),
  real_trading_enabled:false};
 const offer=makePrivateGptSizeOffer(req,p,{now});
 assert.equal(offer.private_authenticated_delivery_only,true);
 assert.match(offer.local_paper_state_revision,/^[a-f0-9]{64}$/);
 assert.equal(offer.available_paper_cash_test_usdc,5000);
 const choice={schema:'sniper_r29_gpt_size_choice.v1',mode:'PAPER_ONLY',
  strategy:'GPT_ONLY',request_id:req.request_id,
  offer_sha256:offer.offer_sha256,amount_test_usdc:25,
  created_at_utc:iso(now+1000),real_trading_enabled:false};
 const unchanged=validateGptSizeChoice(choice,offer,p,{now:now+1000});
 assert.equal(unchanged.approved,true);
 const changed=action(p,{type:'SET_COIN_STAKE',account:'PAPER',amount:80});
 const rejected=validateGptSizeChoice(choice,offer,changed,{now:now+1000});
 assert.equal(rejected.approved,false);
 assert.equal(rejected.reason,'GPT_PRIVATE_PAPER_STATE_CHANGED_REVIEW_AGAIN');
 assert.equal(changed.positions.length,0);
 assert.equal(p.positions.length,0);
});

test('V5.7 private state reports actually spendable Paper cash rather than old 1%-3% policy',()=>{
 const p=paper();p.cashUsdc=4870;
 p.positions=[{id:'paper:occupied130',chain:'base',tokenAddress:'0x'+'a'.repeat(40),
  poolAddress:'0x'+'b'.repeat(40),amountUsdc:130,qty:130,
  priceUsd:1,markAt:iso(now)}];
 const s=snap(p);
 assert.equal(s.paper.preferred_entry_test_usdc,50);
 assert.equal(s.paper.user_total_open_exposure_limit_test_usdc,5000);
 assert.equal(s.paper.reserved_open_cost_test_usdc,130);
 assert.equal(s.paper.remaining_user_exposure_test_usdc,4870);
 assert.equal(s.paper.technical_single_share_cap,null);
 assert.equal(s.paper.technical_total_share_cap,null);
 assert.equal(s.paper.available_for_new_buy_test_usdc,4870);
 assert.equal(proof(s,s,50).paper.allowed,true);
 assert.equal(s.real.execution_enabled,false);
});
