// V0.8 experimental execution parity contract.
// The same independent eligibility function is used regardless of PAPER/LIVE.
// Never connect this module to wallets or call it an external validator.
// AMM quotes are deterministic SYNTHETIC fixtures until independently sourced,
// executable route quotes and security attestations exist.
import {portfolioBudget,MIN_PAPER_ENTRY_USDC} from './portfolio-budget.mjs';

export const EXECUTION_MODE=Object.freeze({PAPER:'PAPER',LIVE:'LIVE'});
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const positive=n=>finite(n)&&n>0;
const cents=n=>Math.floor((n+1e-9)*100)/100;
const deny=reason=>({eligible:false,reason,order:null});
function validPool(p,now){
 if(!p||p.source!=='SYNTHETIC_FIXTURE'||!positive(p.reserve_base_usdc)||
  !positive(p.reserve_token)||!Number.isInteger(p.fee_bps)||p.fee_bps<0||
  p.fee_bps>1000||!finite(p.gas_usdc)||p.gas_usdc<0||
  !Number.isFinite(Date.parse(p.observed_at_utc)))return false;
 const age=now-Date.parse(p.observed_at_utc);
 return age>=0&&age<=30000;
}
function quote(pool,side,gross,qty){
 const x=pool.reserve_base_usdc,y=pool.reserve_token,f=1-pool.fee_bps/10000;
 if(side==='BUY'){
  const input=gross-pool.gas_usdc;
  if(!positive(input))return null;
  const effective=input*f,received=y*effective/(x+effective);
  if(!positive(received)||received>=y)return null;
  const ideal=input*y/x;
  return {received_token:received,received_usdc:0,
   modeled_total_cost_usdc:gross,
   price_impact_pct:100*(1-received/ideal),
   pool_fraction_pct:100*received/y};
 }
 const afterFee=qty*f,received=x*afterFee/(y+afterFee)-pool.gas_usdc;
 if(!positive(received))return null;
 const ideal=qty*x/y;
 return {received_token:0,received_usdc:received,
  modeled_total_cost_usdc:pool.gas_usdc,
  price_impact_pct:100*(1-(received+pool.gas_usdc)/ideal),
  pool_fraction_pct:100*qty/y};
}
export function evaluateExecutionIntent({
 mode='PAPER',side,candidate_id,portfolio,amount_usdc,token_qty,pool,
 checks,now=Date.now(),max_price_impact_pct=5,
 live_explicitly_authorized=false
}={}){
 if(![EXECUTION_MODE.PAPER,EXECUTION_MODE.LIVE].includes(mode)||
  !['BUY','SELL'].includes(side))return deny('INVALID_INTENT');
 if(typeof candidate_id!=='string'||!candidate_id.includes(':'))
  return deny('CANDIDATE_ID_REQUIRED');
 if(!portfolio||!checks||typeof checks!=='object')
  return deny('STATE_OR_CHECKS_MISSING');
 if(checks.candidate_id!==candidate_id||
  checks.contract!=='PASS'||checks.liquidity!=='PASS'||
  checks.sellability!=='PASS'||checks.five_role_consensus!==true||
  checks.independent_risk_pass!==true||checks.executable_route_pass!==true)
  return deny('INDEPENDENT_RISK_OR_CONSENSUS_UNAVAILABLE');
 if(!Number.isFinite(Date.parse(checks.checked_at_utc))||
  now-Date.parse(checks.checked_at_utc)<0||
  now-Date.parse(checks.checked_at_utc)>30000)
  return deny('STALE_RISK_EVIDENCE');
 if(!validPool(pool,now)||pool.candidate_id!==candidate_id)
  return deny('EXECUTABLE_QUOTE_ADAPTER_UNAVAILABLE');
 if(!finite(max_price_impact_pct)||max_price_impact_pct<=0||max_price_impact_pct>20)
  return deny('INVALID_IMPACT_LIMIT');
 if(side==='BUY'&&portfolio.entriesEnabled!==true)return deny('ENTRIES_DISABLED');
 const budget=portfolioBudget(portfolio);
 if(!budget.valid)return deny('INVALID_BUDGET');
 if(side==='BUY'&&(!finite(amount_usdc)||amount_usdc<MIN_PAPER_ENTRY_USDC||
  cents(amount_usdc)!==amount_usdc||
  amount_usdc>budget.free_to_allocate_test_usdc))return deny('INSUFFICIENT_BUDGET');
 if(side==='SELL'&&(!positive(token_qty)||!Array.isArray(portfolio.positions)||
  !portfolio.positions.some(p=>p.candidate_id===candidate_id&&p.token_qty>=token_qty)))
  return deny('POSITION_UNAVAILABLE');
 const q=quote(pool,side,amount_usdc,token_qty);
 if(!q)return deny('NO_SELLABLE_OR_BUYABLE_AMOUNT');
 if(q.price_impact_pct>max_price_impact_pct)return deny('PRICE_IMPACT_TOO_HIGH');
 // LIVE is intentionally disabled: there is no approved real wallet/route adapter.
 if(mode==='LIVE')return deny(live_explicitly_authorized?
  'LIVE_EXECUTION_ADAPTER_NOT_IMPLEMENTED':'LIVE_MODE_NOT_AUTHORIZED');
 return {eligible:true,reason:'PAPER_SYNTHETIC_QUOTE_ONLY',
  order:{mode,side,candidate_id,amount_usdc:side==='BUY'?amount_usdc:null,
   token_qty:side==='SELL'?token_qty:null,
   quote:q,source:'SYNTHETIC_FIXTURE',expires_at_utc:new Date(now+30000).toISOString()}};
}
// Isolated paper ledger transition; no network, key, wallet or real order.
export function applyPaperExecution(portfolio,decision,{now=Date.now()}={}){
 if(decision?.eligible!==true||decision.order?.mode!=='PAPER'||
  decision.order?.source!=='SYNTHETIC_FIXTURE'||
  now>Date.parse(decision.order.expires_at_utc))
  throw Error('PAPER_ORDER_NOT_ELIGIBLE_OR_EXPIRED');
 const o=decision.order;
 const positions=Array.isArray(portfolio?.positions)?portfolio.positions:[];
 if(o.side==='BUY'){
  if(positions.some(p=>p.candidate_id===o.candidate_id))
   throw Error('DUPLICATE_POSITION');
  const b=portfolioBudget(portfolio);
  if(!b.valid||o.amount_usdc>b.free_to_allocate_test_usdc||
   o.amount_usdc>(portfolio.cashUsdc??0))throw Error('PAPER_CASH_OR_BUDGET_CHANGED');
  return {...portfolio,cashUsdc:cents(portfolio.cashUsdc-o.amount_usdc),
   positions:[...positions,{candidate_id:o.candidate_id,
    token_qty:o.quote.received_token,amountUsdc:o.amount_usdc,
    synthetic:true,opened_at_utc:new Date(now).toISOString()}]};
 }
 const p=positions.find(p=>p.candidate_id===o.candidate_id);
 if(!p||p.token_qty<o.token_qty||!positive(o.quote.received_usdc))
  throw Error('PAPER_POSITION_CHANGED');
 const rest=p.token_qty-o.token_qty;
 return {...portfolio,cashUsdc:cents((portfolio.cashUsdc??0)+o.quote.received_usdc),
  positions:positions.flatMap(x=>x!==p?[x]:rest>1e-10?[{...p,token_qty:rest}]:[])};
}
