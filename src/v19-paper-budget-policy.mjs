// R29 V1.9 D4-07 – ONE budget policy for real PAPER client and isolated ASOF replay.
// Only starting research budget/stake/position cap are configurable. Safety
// parameters (quote freshness, spread, liquidity, fees) remain locked to core.
import {createHash} from 'node:crypto';
import {DEFAULT_POLICY} from './core.mjs';

export const DEFAULT_BUDGET_SETTINGS=Object.freeze({
 schema:1,kind:'R29_V19_SHARED_PAPER_BUDGET',
 initial_test_usdc:5000,stake_per_coin_test_usdc:50,max_open_positions:30
});
export function resolveSharedPaperPolicy(settings=DEFAULT_BUDGET_SETTINGS){
 const s=settings;
 if(!s||typeof s!=='object'||Array.isArray(s)
  ||s.schema!==1||s.kind!=='R29_V19_SHARED_PAPER_BUDGET'
  ||Object.keys(s).some(k=>!['schema','kind','initial_test_usdc',
    'stake_per_coin_test_usdc','max_open_positions'].includes(k))
  ||!Number.isFinite(s.initial_test_usdc)||s.initial_test_usdc<50
  ||s.initial_test_usdc>5000
  ||!Number.isFinite(s.stake_per_coin_test_usdc)||s.stake_per_coin_test_usdc<=0
  ||s.stake_per_coin_test_usdc>s.initial_test_usdc
  ||!Number.isInteger(s.max_open_positions)||s.max_open_positions<1
  ||s.max_open_positions>100)
  throw Error('INVALID_SHARED_PAPER_BUDGET_CONFIG');
 const maxAffordable=Math.floor(s.initial_test_usdc/s.stake_per_coin_test_usdc);
 const policy={...DEFAULT_POLICY,startingBalance:s.initial_test_usdc,
  entryAmount:s.stake_per_coin_test_usdc,
  maxPositions:Math.min(s.max_open_positions,maxAffordable)};
 const id=createHash('sha256').update(JSON.stringify([
  s.initial_test_usdc,s.stake_per_coin_test_usdc,s.max_open_positions]))
  .digest('hex').slice(0,20);
 return {schema:1,kind:'R29_V19_RESOLVED_PAPER_POLICY',
  policy_id:'paper-budget-'+id,
  policy,settings:{...s},live_paper_cash_reset_forbidden:true,
  historical_asof_uses_same_values:true,
  risk_parameters_unchanged:true,real_orders_authorized:false};
}
export function verifyExistingPaperBalancePreserved({state,configuredPolicy}={}){
 if(state?.mode!=='PAPER_ONLY'||typeof state.cash!=='number'
  ||!Number.isFinite(state.cash)||state.cash<0
  ||configuredPolicy?.kind!=='R29_V19_RESOLVED_PAPER_POLICY')
  throw Error('INVALID_EXISTING_PAPER_STATE_FOR_POLICY');
 return {existing_paper_cash_test_usdc:state.cash,
  new_paper_cash_test_usdc:state.cash,
  existing_open_positions:Object.keys(state.positions||{}).length,
  position_mutation_authorized:false,
  reset_allowed:false,
  entry_amount_for_new_prospective_orders:configuredPolicy.policy.entryAmount,
  policy_id:configuredPolicy.policy_id};
}
