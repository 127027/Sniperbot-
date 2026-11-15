// R29 user-facing local-only trading portfolio view model.
// No GitHub fixture balances, backend secrets, real-wallet keys, or live fills.
// All valuations are INDICATIVE. Missing/stale quotes produce null, not zero.
import {portfolioBudget} from './portfolio-budget.mjs';
const round8=n=>Math.round((n+Number.EPSILON)*1e8)/1e8;
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const usableMoney=v=>finite(v)&&v>=0;
const safeTime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
const plain=(s,max=150)=>typeof s==='string'?s.slice(0,max):'';
const MAX_QUOTE_AGE_MS=180000;
function quoteStatus(position,now){
 const price=position?.priceUsd,quantity=position?.qty;
 if(!finite(price)||price<=0||!finite(quantity)||quantity<=0)
  return 'UNAVAILABLE';
 const quoteTime=Date.parse(position?.markAt);
 if(!Number.isFinite(quoteTime)||quoteTime>now||now-quoteTime>MAX_QUOTE_AGE_MS)
  return 'STALE';
 return position?.isDemo===true?'SYNTHETIC':'INDICATIVE';
}
export function paperDashboardView(state,{now=Date.now()}={}){
 if(!state||!Array.isArray(state.positions)||!Array.isArray(state.history)||
    !usableMoney(state.cashUsdc)||!usableMoney(state.cashEur)||
    !finite(state.closedPnl)||!Number.isFinite(now))
  throw Error('DASHBOARD_PAPER_STATE_INVALID');
 const cash=round8(state.cashUsdc+state.cashEur);
 const positions=state.positions.map((p,i)=>{
  const status=quoteStatus(p,now),marked=['SYNTHETIC','INDICATIVE'].includes(status);
  const cost=usableMoney(p.amountUsdc)?p.amountUsdc:null;
  const net=marked?round8(p.qty*p.priceUsd*0.99):null;
  const gain=cost!==null&&net!==null?round8(net-cost):null;
  return {
   id:plain(p.id,110),name:plain(p.name||p.symbol||'Coin',90),
   symbol:plain(p.symbol||'—',25),chain:plain(p.chain||'—',35),
   opened_at_utc:safeTime(p.openedAt),
   quote_at_utc:safeTime(p.markAt),
   invested_test_usdc:cost,
   entry_usdc:finite(p.entryPriceUsd)&&p.entryPriceUsd>0?p.entryPriceUsd:null,
   current_usdc:marked?p.priceUsd:null,
   quantity:finite(p.qty)&&p.qty>0?p.qty:null,
   estimated_net_exit_test_usdc:net,
   estimated_pnl_test_usdc:gain,
   estimated_pnl_pct:gain!==null&&cost>0?round8(gain/cost*100):null,
   quote_status:status,
   is_synthetic:p.isDemo===true,
   paper_autopilot:p.paperAutopilot===true,
   paper_only:true
  };
 });
 const count=positions.length;
 const reliable=positions.every(p=>p.estimated_net_exit_test_usdc!==null&&
  p.estimated_pnl_test_usdc!==null);
 const sum=xs=>round8(xs.reduce((a,b)=>a+b,0));
 const netAll=reliable?sum(positions.map(p=>p.estimated_net_exit_test_usdc)):null;
 const openPnl=reliable?sum(positions.map(p=>p.estimated_pnl_test_usdc)):null;
 const budget=portfolioBudget(state);
 const history=state.history.slice(0,40).map(h=>({
  id:plain(h.id,100),at_utc:safeTime(h.at),
  title:plain(h.title,90),detail:plain(h.detail,350)}));
 return {
  schema:'sniper_user_paper_dashboard.v1',
  mode:'PAPER_ONLY',as_of_utc:new Date(now).toISOString(),
  account:'REGULAR_PAPER_ACCOUNT',
  bot_enabled:state.entriesEnabled===true,
  automatic_paper_buys_enabled:false,
  gpt_paper_follow_enabled:state.gptPaperFollow===true,
  gpt_strategy_authoritative:true,
  local_paper_autopilot_available:false,
  live_trading_enabled:false,
  currency:'TEST-USDC',
  free_cash_test_usdc:cash,
  virtual_eur_component_test_only:state.cashEur,
  virtual_usdc_component:state.cashUsdc,
  total_estimated_net_equity_test_usdc:netAll===null?null:round8(cash+netAll),
  open_position_count:count,
  estimated_open_pnl_test_usdc:openPnl,
  realized_pnl_test_usdc:state.closedPnl,
  quote_coverage_complete:reliable,
  portfolio_budget:{
   preferred_entry_test_usdc:finite(state.minTrade)?state.minTrade:null,
   total_exposure_cap_test_usdc:budget.valid?budget.cap_test_usdc:null,
   total_reserved_test_usdc:budget.valid?budget.reserved_test_usdc:null,
   free_to_allocate_test_usdc:budget.free_to_allocate_test_usdc,
   current_minimum_entry_test_usdc:50
  },
  positions,history,
  pricing_warning:'Nur indikative Positionsbewertung, inklusive 1 % modellierter Ausstiegskosten. Keine ausführbare Sell-Quote und kein garantierter Auszahlungsbetrag.'
 };
}
