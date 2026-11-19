import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState} from './core.mjs';
import {
 makePrivateGptSizeOffer,validateGptSizeChoice,validateGptSizeRequest,
 publicGptSizeStatus,SIZE_REQUEST_SCHEMA,SIZE_CHOICE_SCHEMA
} from './gpt-paper-size-negotiation.mjs';
const at='2026-11-17T17:00:00.000Z',now=Date.parse(at);
const mint='9'.repeat(44),pool='8'.repeat(44);
const state=(cash=4999)=>({...freshState(),cashUsdc:cash,cashEur:0,
 portfolioBudgetUsdc:5000,positions:[],minTrade:50,maxTrade:5000,
 entriesEnabled:true,gptPaperFollow:true});
const request=(time=at)=>({
 schema:SIZE_REQUEST_SCHEMA,mode:'PAPER_ONLY',strategy:'GPT_ONLY',
 request_id:'gpt_'+'a'.repeat(32),action:'REQUEST_BUY_CAPACITY',
 chain:'solana',token_address:mint,pool_address:pool,
 created_at_utc:time,source_review_sha256:'b'.repeat(64),
 real_trading_enabled:false});
const choice=(offer,amount,time='2026-11-17T17:01:00.000Z')=>({
 schema:SIZE_CHOICE_SCHEMA,mode:'PAPER_ONLY',strategy:'GPT_ONLY',
 request_id:offer.request_id,offer_sha256:offer.offer_sha256,
 amount_test_usdc:amount,created_at_utc:time,real_trading_enabled:false});
test('private owner Paper budget allows GPT to choose its stake without the old 1% veto',()=>{
 const before=state(),original=JSON.stringify(before);
 const offer=makePrivateGptSizeOffer(request(),before,{now});
 assert.equal(offer.available_paper_cash_test_usdc,4999);
 assert.equal(offer.min_stake_test_usdc,5);
 assert.equal(offer.max_stake_test_usdc,4999);
 assert.equal(offer.bot_does_not_choose_stake,true);
 assert.equal(offer.do_not_publish_public_github,true);
 const chosen=validateGptSizeChoice(choice(offer,25),offer,before,{
  now:Date.parse('2026-11-17T17:01:00Z')});
 assert.equal(chosen.approved,true);
 assert.equal(chosen.approved_amount_test_usdc,25);
 assert.equal(chosen.paper_order_created,false);
 assert.equal(JSON.stringify(before),original);
});
test('GPT cannot spend 5000 from 4999, cannot re-use an expired offer or forged hash',()=>{
 const s=state(),offer=makePrivateGptSizeOffer(request(),s,{now});
 const atT=Date.parse('2026-11-17T17:01:00Z');
 assert.equal(validateGptSizeChoice(choice(offer,5000),offer,s,{now:atT}).approved,false);
 assert.equal(validateGptSizeChoice(choice(offer,250),offer,state(80),{now:atT}).approved,false);
 assert.equal(validateGptSizeChoice(choice(offer,25),offer,s,{now:now+121000}).approved,false);
 assert.equal(validateGptSizeChoice(choice({...offer,offer_sha256:'f'.repeat(64)},25),
  offer,s,{now:atT}).approved,false);
 assert.throws(()=>validateGptSizeRequest(request('2026-11-17T15:00:00Z'),{now}),/INVALID_OR_STALE/);
 assert.equal(validateGptSizeChoice(choice(offer,4.99),offer,s,{now:atT}).approved,false);
 assert.equal(validateGptSizeChoice(choice(offer,250),offer,s,{now:atT}).approved,true);
});
test('public GitHub metadata never contains cash, max investment or private offer fields',()=>{
 const offer=makePrivateGptSizeOffer(request(),state(),{now});
 const publicPart=publicGptSizeStatus(offer);
 const json=JSON.stringify(publicPart);
 assert.equal(publicPart.numeric_account_balance_published,false);
 assert.equal(publicPart.numeric_private_capacity_published,false);
 assert.equal(publicPart.private_offer_hash_published,false);
 assert.equal(Object.hasOwn(publicPart,'offer_sha256'),false);
 assert.equal(publicPart.paper_order_created,false);
 for(const forbidden of ['4999','max_stake_test_usdc','available_paper_cash_test_usdc',
  'min_stake_test_usdc','portfolioBudgetUsdc','cashUsdc'])
  assert(!json.includes(forbidden));
});
test('open paper commitments and real-money mode fail closed',()=>{
 const s=state();s.positions=[{amountUsdc:4300}];
 const offer=makePrivateGptSizeOffer(request(),s,{now});
 assert.equal(offer.can_buy,false,'Old position without fresh mark must fail safely');
 assert.equal(offer.max_stake_test_usdc,0);
 const off=makePrivateGptSizeOffer(request(),{...state(),realTradingEnabled:true},{now});
 assert.equal(off.can_buy,false);
 assert.equal(off.max_stake_test_usdc,0);
});
