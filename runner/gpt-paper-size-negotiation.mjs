// GPT asks for the safe TEST-USDC amount. Bot answers *privately* and GPT
// decides an amount; this is NEVER an order or authority to choose a coin.
// This module NEVER publishes account balances into public GitHub.
import {createHash} from 'node:crypto';
import {validTokenAddress} from './market.mjs';
import {computePrivateGptCapacity,validatePrivateGptCapacity} from './gpt-paper-capacity-report.mjs';
import {MIN_GPT_PAPER_ENTRY_USDC} from './portfolio-budget.mjs';
export const SIZE_REQUEST_SCHEMA='sniper_r29_gpt_size_request.v1';
export const SIZE_OFFER_SCHEMA='sniper_r29_private_gpt_size_offer.v1';
export const SIZE_CHOICE_SCHEMA='sniper_r29_gpt_size_choice.v1';
const SHA=/^[a-f0-9]{64}$/;
const RID=/^gpt_[a-f0-9]{32}$/;
const ISO=x=>typeof x==='string'&&x.endsWith('Z')&&Number.isFinite(Date.parse(x));
const cents=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&
  Math.abs(x*100-Math.round(x*100))<1e-5;
const same=(x,fields)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===[...fields].sort().join('|');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function validateGptSizeRequest(request,{now=Date.now()}={}){
 const fields=['schema','mode','strategy','request_id','action','chain',
  'token_address','pool_address','created_at_utc','source_review_sha256',
  'real_trading_enabled'];
 if(!same(request,fields)||request.schema!==SIZE_REQUEST_SCHEMA||
  request.mode!=='PAPER_ONLY'||request.strategy!=='GPT_ONLY'||
  request.action!=='REQUEST_BUY_CAPACITY'||!RID.test(request.request_id||'')||
  !['solana','base','bsc','eth'].includes(request.chain)||
  !validTokenAddress(request.chain,request.token_address)||
  !validTokenAddress(request.chain,request.pool_address)||
  !ISO(request.created_at_utc)||!SHA.test(request.source_review_sha256||'')||
  request.real_trading_enabled!==false||
  !Number.isFinite(now)||
  Date.parse(request.created_at_utc)>now+30000||
  now-Date.parse(request.created_at_utc)>10*60_000)
  throw Error('GPT_SIZE_REQUEST_INVALID_OR_STALE');
 return request;
}
export function makePrivateGptSizeOffer(request,state,{now=Date.now(),
 technical_max_stake_test_usdc=5000}={}){
 validateGptSizeRequest(request,{now});
 const at=new Date(now).toISOString();
 const capacity=computePrivateGptCapacity(state,{
  observed_at_utc:at,technical_max_stake_test_usdc});
 const cash=typeof state?.cashUsdc==='number'&&cents(state.cashUsdc)&&
  state?.cashEur===0?Math.round(state.cashUsdc*100)/100:null;
 const allowed=validatePrivateGptCapacity(capacity,{asof_utc:at});
 const base={schema:SIZE_OFFER_SCHEMA,mode:'PAPER_ONLY',
  strategy:'GPT_ONLY',real_trading_enabled:false,
  request_id:request.request_id,request_sha256:hash(request),
  candidate_id:request.chain+':'+request.token_address+':'+request.pool_address,
  observed_at_utc:at,valid_until_utc:new Date(now+120000).toISOString(),
  available_paper_cash_test_usdc:cash,
  min_stake_test_usdc:allowed.approved?allowed.min_test_usdc:MIN_GPT_PAPER_ENTRY_USDC,
  max_stake_test_usdc:allowed.approved?allowed.max_test_usdc:0,
  can_buy:allowed.approved,
  reason:capacity.reason,
  bot_does_not_choose_stake:true,
  private_authenticated_delivery_only:true,
  do_not_publish_public_github:true,
  original_user_paper_balance_unchanged:true,
  actionable:false,trade_executed:false};
 return {...base,offer_sha256:hash(base)};
}
export function validateGptSizeChoice(choice,offer,state,{now=Date.now(),
 technical_max_stake_test_usdc=5000}={}){
 const fail=reason=>({approved:false,reason,paper_order_created:false});
 const fields=['schema','mode','strategy','request_id','offer_sha256',
  'amount_test_usdc','created_at_utc','real_trading_enabled'];
 if(!same(choice,fields)||choice.schema!==SIZE_CHOICE_SCHEMA||
  choice.mode!=='PAPER_ONLY'||choice.strategy!=='GPT_ONLY'||
  choice.real_trading_enabled!==false||!RID.test(choice.request_id||'')||
  !SHA.test(choice.offer_sha256||'')||!cents(choice.amount_test_usdc)||
  !ISO(choice.created_at_utc)||!Number.isFinite(now)||
  Date.parse(choice.created_at_utc)>now+30000)
  return fail('GPT_STAKE_CHOICE_INVALID');
 if(offer?.schema!==SIZE_OFFER_SCHEMA||
  offer.request_id!==choice.request_id||
  offer.offer_sha256!==choice.offer_sha256||
  hash(Object.fromEntries(Object.entries(offer).filter(([k])=>k!=='offer_sha256')))!==
   offer.offer_sha256)
  return fail('GPT_SIZE_OFFER_HASH_MISMATCH');
 const expiration=Date.parse(offer.valid_until_utc),created=Date.parse(choice.created_at_utc);
 if(!Number.isFinite(expiration)||now>expiration||
  created<Date.parse(offer.observed_at_utc)||created>expiration)
  return fail('GPT_SIZE_OFFER_EXPIRED');
 if(offer.private_authenticated_delivery_only!==true||
  offer.do_not_publish_public_github!==true||
  offer.actionable!==false||offer.trade_executed!==false||
  offer.real_trading_enabled!==false||!offer.can_buy)
  return fail('GPT_SIZE_OFFER_NOT_AUTHORIZED');
 if(choice.amount_test_usdc<MIN_GPT_PAPER_ENTRY_USDC||
  choice.amount_test_usdc>5000||
  choice.amount_test_usdc>offer.max_stake_test_usdc)
  return fail('GPT_STAKE_OVER_OFFER_LIMIT');
 const cap=computePrivateGptCapacity(state,{
  observed_at_utc:new Date(now).toISOString(),technical_max_stake_test_usdc});
 const validated=validatePrivateGptCapacity(cap,{
  asof_utc:new Date(now).toISOString(),
  requested_test_usdc:choice.amount_test_usdc});
 if(!validated.approved)return fail('GPT_STAKE_OVER_CURRENT_PRIVATE_CAPACITY');
 return {approved:true,reason:'GPT_STAKE_WITHIN_FRESH_CAPACITY',
  approved_amount_test_usdc:choice.amount_test_usdc,
  paper_order_created:false,
  still_requires_signed_gpt_decision_and_independent_market_checks:true};
}
export function publicGptSizeStatus(offer){
 if(offer?.schema!==SIZE_OFFER_SCHEMA||offer.actionable!==false||
  offer.private_authenticated_delivery_only!==true||
  offer.real_trading_enabled!==false||!SHA.test(offer.offer_sha256||''))
  throw Error('GPT_SIZE_OFFER_NOT_PUBLIC_SAFE');
 return {schema:'sniper_r29_public_gpt_size_request_status.v1',
  mode:'PAPER_ONLY',real_trading_enabled:false,
  request_id:offer.request_id,
  private_offer_hash_published:false,
  observed_at_utc:offer.observed_at_utc,
  status:offer.can_buy?'PRIVATE_OFFER_AVAILABLE':'PRIVATE_CAPACITY_BLOCKED',
  numeric_account_balance_published:false,
  numeric_private_capacity_published:false,
  actionable:false,paper_order_created:false};
}
