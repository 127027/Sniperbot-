// Strict risk gate for real-market, VIRTUAL-only R29 paper entries.
// These are policy limits, not profit forecasts or actual executable swaps.
import {portfolioBudget} from './portfolio-budget.mjs';
import {validTokenAddress} from './market.mjs';
import {validatePaperSecurityEvidence} from './live-paper-security.mjs';

const floorCents=n=>Math.floor((n+1e-9)*100)/100;
const numeric=n=>typeof n==='number'&&Number.isFinite(n);
const MAX_SINGLE_SHARE=0.01;
const MAX_TOTAL_SHARE=0.03;
const MAX_RISK_FRACTION=0.0025;
const DEFAULT_STOP_FRACTION=0.1;
const MAX_DAILY_LOSS=0.01;
const MAX_WEEKLY_LOSS=0.025;

export function paperAutoEquity(state,{now=Date.now()}={}){
 if(!state||!Array.isArray(state.positions)||
  !numeric(state.cashEur)||!numeric(state.cashUsdc)||state.cashEur<0||state.cashUsdc<0)
  return null;
 let total=state.cashEur+state.cashUsdc;
 for(const p of state.positions){
  if(!numeric(p.qty)||p.qty<=0||!numeric(p.priceUsd)||p.priceUsd<=0||
   !Number.isFinite(Date.parse(p.markAt))||now-Date.parse(p.markAt)>180000)
   return null; // incomplete mark-to-market must never be treated as safe cash
  total+=p.qty*p.priceUsd*0.99;
 }
 return numeric(total)&&total>0?total:null;
}
export function r29LivePaperEntryGate({state,candidate,quote,security,now=Date.now(),
 risk=state?.paperLiveRisk}={}){
 const result=(status,reason,amount=0,equity=null)=>({
  schema:'r29_live_paper_entry_gate.v1',status,reason,
  allowed:status==='ALLOW_PAPER',amount_test_usdc:amount,
  estimated_equity_test_usdc:equity,
  paper_only:true,live_trading_enabled:false,
  estimated_invalidation_loss_fraction:DEFAULT_STOP_FRACTION
 });
 if(!Number.isFinite(now)||state?.entriesEnabled!==true||
    state?.automaticPaperBuys!==true)return result('BLOCKED','PAPER_AUTOPILOT_NOT_OPTED_IN');
 const b=portfolioBudget(state);
 if(!b.valid)return result('BLOCKED','INVALID_PORTFOLIO_BUDGET');
 const equity=paperAutoEquity(state,{now});
 if(!numeric(equity)||equity<50)return result('BLOCKED','CANNOT_VALUE_EQUITY_FRESHLY');
 if(!['base','eth','bsc'].includes(candidate?.chain)||
  !validTokenAddress(candidate.chain,candidate.token_address)||
  !validTokenAddress(candidate.chain,candidate.pool_address)||
  candidate.candidate_id!==candidate.chain+':'+candidate.token_address+':'+candidate.pool_address)
  return result('BLOCKED','UNSUPPORTED_OR_UNKNOWN_CANDIDATE',0,equity);
 if(!numeric(Date.parse(candidate?.first_local_observed_at_utc))||
  Date.parse(candidate.first_local_observed_at_utc)>now||
  now-Date.parse(candidate.first_local_observed_at_utc)>300000)
  return result('BLOCKED','CANDIDATE_STALE_OR_UNOBSERVED',0,equity);
 if(candidate.source!=='GECKOTERMINAL_NEW_POOLS'||candidate.promotion_biased===true)
  return result('BLOCKED','PROMOTED_POOL_NOT_INDEPENDENT_DISCOVERY',0,equity);
 if(candidate.verification!=='CROSS_PROVIDER_IDENTITY')
  return result('BLOCKED','PAIR_NOT_CROSS_PROVIDER_VERIFIED',0,equity);
 if(!quote||quote.source!=='DEX Screener'||quote.chain!==candidate.chain||
  quote.tokenAddress?.toLowerCase()!==candidate.token_address.toLowerCase()||
  quote.poolAddress?.toLowerCase()!==candidate.pool_address.toLowerCase()||
  !numeric(quote.priceUsd)||quote.priceUsd<=0||
  !numeric(quote.liquidityUsd)||quote.liquidityUsd<50000||
  !numeric(Date.parse(quote.asOf))||Date.parse(quote.asOf)>now||
  now-Date.parse(quote.asOf)>60000||
  !numeric(candidate.price_usd)||candidate.price_usd<=0||
  quote.priceUsd/candidate.price_usd<0.85||
  quote.priceUsd/candidate.price_usd>1.15||
  (numeric(candidate.liquidity_usd)&&quote.liquidityUsd<candidate.liquidity_usd*0.75))
  return result('BLOCKED','INDEPENDENT_MARKET_QUOTE_MISSING',0,equity);
 if(!numeric(quote.volume5mUsd)||quote.volume5mUsd<2000||
  !numeric(quote.buys5m)||!numeric(quote.sells5m)||
  quote.buys5m<20||quote.buys5m<=quote.sells5m*1.5)
  return result('BLOCKED','INSUFFICIENT_PUBLIC_BUY_ACTIVITY',0,equity);
 // Volume/liquidity outlier and deteriorating liquidity often imply manipulation.
 if(quote.volume5mUsd>quote.liquidityUsd*2.0)
  return result('BLOCKED','SUSPICIOUS_VOLUME_TO_LIQUIDITY',0,equity);
 if(!validatePaperSecurityEvidence(security,{chain:candidate.chain,
  token:candidate.token_address,pool:candidate.pool_address,now}))
  return result('BLOCKED','CONTRACT_SECURITY_OR_SELL_SIMULATION_UNVERIFIED',0,equity);
 if(state.positions.some(p=>p.chain===candidate.chain&&
  p.tokenAddress?.toLowerCase()===candidate.token_address.toLowerCase()))
  return result('BLOCKED','POSITION_ALREADY_OPEN',0,equity);
 const occupied=state.positions.reduce((a,p)=>a+p.amountUsdc,0);
 const maxByNominal=equity*MAX_SINGLE_SHARE;
 const remaining=equity*MAX_TOTAL_SHARE-occupied;
 const maxByRisk=equity*MAX_RISK_FRACTION/(DEFAULT_STOP_FRACTION+0.02);
 const maxByLiquidity=quote.liquidityUsd*0.005; // impact proxy; not executable
 const max= floorCents(Math.min(5000,maxByNominal,remaining,
  maxByRisk,maxByLiquidity,b.free_to_allocate_test_usdc));
 if(max<50)return result('BLOCKED','MIN_ORDER_CONFLICTS_WITH_RISK_LIMITS',0,equity);
 // A missing dated trade ledger cannot establish daily and weekly loss limits.
 if(risk?.schema!=='r29_live_paper_risk_v1'||
  !numeric(risk.day_realized_pnl)||!numeric(risk.week_realized_pnl)||
  typeof risk.day_utc!=='string'||typeof risk.week_utc!=='string'||
  !/^\d{4}-\d{2}-\d{2}$/.test(risk.day_utc)||
  !/^\d{4}-W\d{2}$/.test(risk.week_utc))
  return result('BLOCKED','RISK_LOSS_LEDGER_NOT_INITIALIZED',0,equity);
 const date=new Date(now);
 const day=date.toISOString().slice(0,10);
 const isoWeek=((d)=>{const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
  x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));
  const year=x.getUTCFullYear(),first=new Date(Date.UTC(year,0,1));
  return year+'-W'+String(Math.ceil((((x-first)/86400000)+1)/7)).padStart(2,'0');
 })(date);
 const daily=risk.day_utc===day?risk.day_realized_pnl:0;
 const weekly=risk.week_utc===isoWeek?risk.week_realized_pnl:0;
 if(daily<=-equity*MAX_DAILY_LOSS||
  weekly<=-equity*MAX_WEEKLY_LOSS||
  Number.isFinite(state.closedPnl)&&state.closedPnl<=-equity*MAX_WEEKLY_LOSS)
  return result('BLOCKED','DAILY_OR_WEEKLY_LOSS_CIRCUIT_BREAKER',0,equity);
 return result('ALLOW_PAPER','SECURITY_AND_RISK_GATES_PASSED',max,equity);
}
export function newPaperRiskLedger(now=Date.now()){
 const date=new Date(now);
 const d=date.toISOString().slice(0,10);
 const x=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
 x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));
 const year=x.getUTCFullYear(),first=new Date(Date.UTC(year,0,1));
 const week=year+'-W'+String(Math.ceil((((x-first)/86400000)+1)/7)).padStart(2,'0');
 return {schema:'r29_live_paper_risk_v1',day_utc:d,week_utc:week,
  day_realized_pnl:0,week_realized_pnl:0,mode:'PAPER_ONLY'};
}
export function recordLivePaperSellRisk(risk,pnl,{now=Date.now()}={}){
 const active=newPaperRiskLedger(now);
 if(!numeric(pnl)||!risk||risk.schema!==active.schema||
   !numeric(risk.day_realized_pnl)||!numeric(risk.week_realized_pnl))
  throw Error('LIVE_PAPER_RISK_LEDGER_INVALID');
 return {...active,day_realized_pnl:(risk.day_utc===active.day_utc?risk.day_realized_pnl:0)+pnl,
  week_realized_pnl:(risk.week_utc===active.week_utc?risk.week_realized_pnl:0)+pnl};
}
