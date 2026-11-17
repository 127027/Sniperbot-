// R29 LOCAL-ONLY capacity report for GPT: executor informs, GPT decides.
// Do not publish numeric private paper capacity or account fields on public GitHub.
// Pure read-only; no signing, mutation, transfer, payments or orders.
import {portfolioBudget} from './portfolio-budget.mjs';
const cents=x=>Math.floor((x+1e-8)*100)/100;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const MIN=50,MAX=5000;
export const PRIVATE_SCHEMA='sniper_r29_private_gpt_paper_capacity.v1';
export function computePrivateGptCapacity(state,{observed_at_utc,technical_max_stake_test_usdc=5000,
 forex_conversion_verified=false}={}){
 const base={schema:PRIVATE_SCHEMA,mode:'PAPER_ONLY',real_trading_enabled:false,
  observed_at_utc,minimum_approved_buy_test_usdc:MIN,
  maximum_approved_buy_test_usdc:0,can_buy:false,
  capacity_is_not_strategy_or_order:true,
  private_authenticated_delivery_only:true,do_not_publish_public_github:true};
 const t=Date.parse(observed_at_utc||'');
 if(!Number.isFinite(t)||!observed_at_utc?.endsWith('Z'))
  return {...base,reason:'FRESH_UTC_CAPACITY_SNAPSHOT_REQUIRED'};
 if(!state||state.realTradingEnabled===true||state.real_trading_enabled===true)
  return {...base,reason:'REAL_TRADING_CONTEXT_NOT_ALLOWED'};
 if(finite(state.cashEur)&&state.cashEur>0&&!forex_conversion_verified)
  return {...base,reason:'EUR_TO_USDC_CONVERSION_NOT_PROVEN'};
 if(!finite(technical_max_stake_test_usdc)||technical_max_stake_test_usdc<0||
  technical_max_stake_test_usdc>5000)
  return {...base,reason:'TECHNICAL_RISK_LIMIT_INVALID'};
 const budget=portfolioBudget(state);
 if(!budget.valid)return {...base,reason:'LOCAL_PAPER_BUDGET_UNVERIFIED'};
 const approved=cents(Math.min(MAX,budget.free_to_allocate_test_usdc,
  technical_max_stake_test_usdc));
 if(approved<MIN)return {...base,reason:'PAPER_FREE_CAPACITY_BELOW_50'};
 return {...base,maximum_approved_buy_test_usdc:approved,can_buy:true,
  reason:'CURRENT_LOCAL_PAPER_CAPACITY_REQUIRES_FRESH_EXECUTOR_RECHECK'};
}
export function validatePrivateGptCapacity(capacity,{asof_utc,requested_test_usdc=null}={}){
 const t=Date.parse(asof_utc||''),observed=Date.parse(capacity?.observed_at_utc||'');
 if(!Number.isFinite(t)||!Number.isFinite(observed)||observed>t||
    t-observed>120000||capacity?.schema!==PRIVATE_SCHEMA||
    capacity.mode!=='PAPER_ONLY'||capacity.real_trading_enabled!==false||
    capacity.private_authenticated_delivery_only!==true||
    capacity.do_not_publish_public_github!==true||capacity.can_buy!==true)
  return {approved:false,reason:'FRESH_PRIVATE_EXECUTOR_CAPACITY_REQUIRED'};
 const ceiling=capacity.maximum_approved_buy_test_usdc;
 if(!finite(ceiling)||ceiling<MIN||ceiling>MAX)
  return {approved:false,reason:'INVALID_PRIVATE_CAPACITY_RANGE'};
 if(requested_test_usdc!==null&&
  (!finite(requested_test_usdc)||requested_test_usdc<MIN||
   requested_test_usdc>ceiling||
   Math.abs(requested_test_usdc*100-Math.round(requested_test_usdc*100))>1e-5))
  return {approved:false,reason:'GPT_REQUEST_EXCEEDS_EXECUTOR_CAPACITY'};
 return {approved:true,max_test_usdc:ceiling,min_test_usdc:MIN,
  reason:'CAPACITY_ONLY_NOT_TRADING_AUTHORITY'};
}
