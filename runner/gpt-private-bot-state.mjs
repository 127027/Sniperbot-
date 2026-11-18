// R29 V4.9 – local/private, READ-ONLY dual account snapshot.
// This does NOT deliver data to ChatGPT's cloud, create live settings, place
// trades, sign instructions or change the currently locked live executor.
// Public GitHub must NEVER receive this data or any deterministic state hash.
import {createHash} from 'node:crypto';
import {portfolioBudget} from './portfolio-budget.mjs';
import {MAX_SINGLE_SHARE,MAX_TOTAL_SHARE,paperAutoEquity} from './live-paper-risk.mjs';

export const PRIVATE_BOT_STATE_SCHEMA='sniper_r29_private_dual_account_state.v1';
const currency=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const cents=n=>Math.floor((n+1e-8)*100)/100;
const hash=obj=>createHash('sha256').update(JSON.stringify(obj),'utf8').digest('hex');
const timeOk=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const liveLimit=x=>currency(x)&&Math.abs(x*100-Math.round(x*100))<0.00001;

function paperCurrent(state,now){
 const b=portfolioBudget(state);
 const positions=Array.isArray(state?.positions)?state.positions:[];
 const posValid=positions.every(p=>id(p?.id)&&currency(p.amountUsdc)&&p.amountUsdc>0);
 const open=posValid?positions.map(p=>({
  position_id:p.id,chain:p.chain||null,
  token_address:p.tokenAddress||null,pool_address:p.poolAddress||null,
  reserved_cost_test_usdc:cents(p.amountUsdc),
  gpt_managed:p.gptPaperDecision===true
 })).sort((a,b)=>a.position_id.localeCompare(b.position_id)):[];
 const equity=paperAutoEquity(state,{now});
 const cash=currency(state?.cashUsdc)&&currency(state?.cashEur)?
   cents(state.cashUsdc+state.cashEur):null;
 const allowed=b.valid&&posValid&&currency(state?.cashUsdc)&&
  state.cashEur===0&&currency(equity);
 const free=allowed?cents(Math.min(b.free_to_allocate_test_usdc,
  state.cashUsdc,equity*MAX_SINGLE_SHARE,
  Math.max(0,equity*MAX_TOTAL_SHARE-b.reserved_test_usdc))):null;
 const result={
  account:'PAPER',mode:'PAPER_ONLY',execution_enabled:state?.entriesEnabled===true,
  gpt_follow_enabled:state?.gptPaperFollow===true,
  preferred_entry_test_usdc:b.valid?b.preferred_test_usdc:null,
  user_total_open_exposure_limit_test_usdc:b.valid?b.cap_test_usdc:null,
  available_virtual_balance_test_usdc:cash,
  reserved_open_cost_test_usdc:b.valid?b.reserved_test_usdc:null,
  additional_reservations_verified:false,
  open_position_count:posValid?positions.length:null,
  open_positions:posValid?open:null,
  remaining_user_exposure_test_usdc:b.valid?cents(Math.max(0,b.cap_test_usdc-b.reserved_test_usdc)):null,
  available_for_new_buy_test_usdc:free,
  technical_single_share_cap:MAX_SINGLE_SHARE,
  technical_total_share_cap:0.03,
  actual_loss_risk_is_not_nominal_size:true,
  full_private_state_valid:allowed,
  no_private_cloud_delivery_confirmed:true
 };
 return {...result,local_state_revision:hash(result)};
}
function realCurrent({realWalletOverview,realSettings,liveGate}={}){
 // Real trade limits/positions are not implemented in the current Windows
 // Paper store. Never read Paper controls as if they were real controls.
 const settings=realSettings&&typeof realSettings==='object'&&
  liveLimit(realSettings.preferred_entry_usdc)&&
  liveLimit(realSettings.total_open_exposure_limit_usdc)&&
  realSettings.total_open_exposure_limit_usdc>0?
   realSettings:null;
 const verified=realWalletOverview?.schema==='sniper_real_wallet_overview.v1'&&
  realWalletOverview.network==='solana-mainnet'&&
  realWalletOverview.live_trading_enabled===false&&
  realWalletOverview.real_fill_history_verified===false&&
  typeof realWalletOverview.usdc_display==='string'&&
  /^\d+(?:\.\d{1,6})?$/.test(realWalletOverview.usdc_display);
 const available=verified?Number(realWalletOverview.usdc_display):null;
 const isLocked=liveGate?.enabled===false&&liveGate?.can_enable===false&&
  liveGate?.wallet_signing_enabled_for_swaps===false;
 const result={
  account:'REAL',mode:'LIVE_LOCKED',
  execution_enabled:false,live_gate_locked:isLocked,
  selected_in_dashboard_does_not_authorize_trading:true,
  preferred_entry_usdc:settings?settings.preferred_entry_usdc:null,
  user_total_open_exposure_limit_usdc:settings?
   settings.total_open_exposure_limit_usdc:null,
  actual_verified_wallet_usdc:available,
  reserved_open_cost_usdc:null,
  additional_reservations_verified:false,
  open_position_count:null,open_positions:null,
  remaining_user_exposure_usdc:null,
  available_for_new_buy_usdc:null,
  trading_settings_proven_persisted:settings!==null,
  real_fill_ledger_verified:false,
  available_to_execute:false,
  not_a_paper_balance:true
 };
 return {...result,local_state_revision:hash(result)};
}
export function buildPrivateDualAccountBotState({
 paperState,realWalletOverview=null,realSettings=null,liveGate,
 now=Date.now()
}={}){
 if(!Number.isFinite(now)||!paperState||!Array.isArray(paperState.positions))
  throw Error('PRIVATE_DUAL_ACCOUNT_INPUT_INVALID');
 const paper=paperCurrent(paperState,now);
 const real=realCurrent({realWalletOverview,realSettings,liveGate});
 return {
  schema:PRIVATE_BOT_STATE_SCHEMA,
  observed_at_utc:new Date(now).toISOString(),
  valid_until_utc:new Date(now+120000).toISOString(),
  private_authenticated_localhost_only:true,
  must_not_publish_to_public_github:true,
  remote_gpt_delivery_verified:false,
  live_trading_enabled:false,
  paper,real
 };
}
// Stateless account-specific preflight for regression/isolation. This is NOT
// the live order router and cannot approve real crypto execution.
export function inspectDualAccountSignal({
 action,sourceState,currentState,
 paperAmountTestUsdc,realAmountUsdc,
 paperPositionId=null,realPositionId=null,
 now=Date.now()
}={}){
 const block=reason=>({allowed:false,reason,transaction_sent:false});
 const out={schema:'sniper_r29_dual_account_preflight.v1',
  paper:block('NOT_EVALUATED'),real:block('LIVE_TRADING_LOCKED'),
  actual_trade_executed:false,real_trading_enabled:false};
 if(!['BUY','SELL','WATCH','HOLD','NO_TRADE'].includes(action)||
  !sourceState||!currentState||
  sourceState.schema!==PRIVATE_BOT_STATE_SCHEMA||
  currentState.schema!==PRIVATE_BOT_STATE_SCHEMA||
  !Number.isFinite(now)||!timeOk(sourceState.observed_at_utc)||
  !timeOk(sourceState.valid_until_utc)||
  now<Date.parse(sourceState.observed_at_utc)||
  now>Date.parse(sourceState.valid_until_utc))
  return {...out,paper:block('SOURCE_STATE_INVALID_OR_EXPIRED')};
 if(!['BUY','SELL'].includes(action))
  return {...out,paper:block('GPT_NON_EXECUTION_RESEARCH_ACTION'),
   real:block('GPT_NON_EXECUTION_RESEARCH_ACTION')};
 const p=sourceState.paper,q=currentState.paper;
 const r=sourceState.real,s=currentState.real;
 if(action==='BUY'){
  if(p.local_state_revision!==q.local_state_revision)
   out.paper=block('PAPER_STATE_CHANGED_REQUIRE_FRESH_GPT_DECISION');
  else if(!q.execution_enabled||!q.gpt_follow_enabled)
   out.paper=block('PAPER_ENTRIES_OR_GPT_FOLLOW_DISABLED');
  else if(!q.full_private_state_valid||!liveLimit(paperAmountTestUsdc)||
   paperAmountTestUsdc>q.available_for_new_buy_test_usdc)
   out.paper=block('PAPER_CURRENT_BUDGET_OR_RISK_CAP');
  else out.paper={
   allowed:true,reason:'PAPER_BUDGET_PREFLIGHT_ONLY',
   requires_market_security_exit_and_signed_order:true,
   transaction_sent:false};
  if(r.local_state_revision!==s.local_state_revision)
   out.real=block('REAL_STATE_CHANGED_REQUIRE_FRESH_GPT_DECISION');
  else out.real=block('LIVE_TRADING_LOCKED');
 }else{
  out.paper=id(paperPositionId)&&Array.isArray(q.open_positions)&&
   q.open_positions.some(p=>p.position_id===paperPositionId)?
   {allowed:true,reason:'PAPER_OWNED_POSITION_ONLY',
    still_requires_signed_gpt_exit:true,transaction_sent:false}:
   block('PAPER_POSITION_NOT_FOUND');
  out.real=id(realPositionId)&&Array.isArray(s.open_positions)&&
   s.open_positions.some(p=>p.position_id===realPositionId)?
   block('LIVE_TRADING_LOCKED'):block('REAL_POSITION_NOT_VERIFIED');
 }
 return out;
}
