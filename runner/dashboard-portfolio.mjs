// R29 user-facing local-only trading portfolio view model.
// No GitHub fixture balances, backend secrets, real-wallet keys, or live fills.
// All valuations are INDICATIVE. Missing/stale quotes produce null, not zero.
import {portfolioBudget,MIN_GPT_PAPER_ENTRY_USDC,MIN_PAPER_ENTRY_USDC,userCoinStake} from './portfolio-budget.mjs';
import {diagnoseGptPaperInactivity} from './gpt-paper-inactivity.mjs';
import {summarizeLocalGptFunnel} from './gpt-paper-forward-funnel.mjs';
import {localGptForwardView} from './gpt-forward-review-status.mjs';
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
export function paperDashboardView(state,{now=Date.now(),collector=null,security=null,gptForward=null}={}){
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
   gpt_paper_managed:p.gptPaperDecision===true,
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
 const gptSpendable=portfolioBudget(state,{gptSignedPaper:true});
 const replay=state.gptDecisionReplay&&
   typeof state.gptDecisionReplay==='object'&&!Array.isArray(state.gptDecisionReplay)?
   Object.entries(state.gptDecisionReplay)
    .filter(([id,v])=>/^gpt_[a-f0-9]{32}$/.test(id)&&v&&
      typeof v==='object'&&!Array.isArray(v)&&safeTime(v.at_utc))
    .sort((a,b)=>Date.parse(b[1].at_utc)-Date.parse(a[1].at_utc)):[];
 const recentGpt=replay.slice(0,8).map(([decision_id,v])=>({
  decision_id,at_utc:v.at_utc,status:plain(v.status,30),
  reason:plain(v.reason,100),local_receiver_journal_only:true,
  action:['BUY','SELL','WATCH','NO_TRADE','REJECT','HOLD'].includes(v.action)?
   v.action:null,
  chain:['solana','base','bsc','eth'].includes(v.chain)?v.chain:null,
  token_address:plain(v.token_address,100)||null
 }));
 const funnel=summarizeLocalGptFunnel({collector,security,now});
 // Read-only source diagnostics from the recent local collector status.
 // Never treat promotional fallback identities as complete market coverage.
 const coverage=funnel.collection_recent&&Array.isArray(collector?.coverage)?
  collector.coverage.slice(0,16):[];
 const knownStatuses=new Set(['OK','PARTIAL','HTTP_429_RATE_LIMIT',
  'SKIPPED_AFTER_RATE_LIMIT','TIMEOUT','SOURCE_UNAVAILABLE',
  'PROVIDER_RESPONSE_INVALID','NETWORK_ENOTFOUND','NETWORK_EAI_AGAIN',
  'NETWORK_ECONNRESET','NETWORK_ECONNREFUSED','PROMOTED_PROFILES_ONLY',
  'NO_PAIR_IDENTITIES']);
 const sourceProblems=coverage.filter(x=>x&&x.source?.startsWith('GECKOTERMINAL')&&
  x.status!=='OK').map(x=>({
   chain:plain(x.chain,12),source:plain(x.source,32),
   status:knownStatuses.has(x.status)?x.status:/^HTTP_[45][0-9]{2}$/.test(x.status||'')?
    x.status:'SOURCE_INCOMPLETE'
  })).slice(0,8);
 const sourceLoss=coverage.reduce((n,x)=>n+
  (Number.isInteger(x?.omitted_by_research_cap)&&x.omitted_by_research_cap>=0?
   Math.min(2000,x.omitted_by_research_cap):0),0);
 const marketSourceDiagnostic={
  fresh:funnel.collection_recent,
  observed_rows:funnel.collection_recent?funnel.observed_candidate_count:null,
  source_problem_count:sourceProblems.length,
  source_problems:sourceProblems,
  lost_by_per_chain_limit:funnel.collection_recent?sourceLoss:null,
  complete_source_universe:false,
  research_only:true
 };
 // Collector and safety observations are visible as activity, but never
 // labelled GPT decisions. Freshness gates prevent old scans looking live.
 const researchActivity=[
  ...(funnel.collection_recent?[{
   source:'MARKET_COLLECTOR',at_utc:funnel.last_collector_check_at_utc,
   observed_count:funnel.observed_candidate_count,
   security_checks:null,
   paper_trade_executed:false,gpt_decision:false
  }]:[]),
  ...(funnel.independent_security_research_recent?[{
   source:'INDEPENDENT_SECURITY_RESEARCH',
   at_utc:funnel.security_checked_at_utc,
   observed_count:funnel.last_security_sample_research_eligible_evm,
   security_checks:funnel.last_security_sample_actually_checked,
   paper_trade_executed:false,gpt_decision:false
  }]:[])
 ].sort((a,b)=>Date.parse(b.at_utc)-Date.parse(a.at_utc));
 const gptActivity=diagnoseGptPaperInactivity(state,{now});
 const gptLocalPaperFills=gptActivity.local_gpt_paper_buy_fills+
  gptActivity.local_gpt_paper_sell_fills;
 const lastGpt=replay.length?{
  decision_id:replay[0][0],at_utc:replay[0][1].at_utc,
  status:plain(replay[0][1].status,40),
  reason:plain(replay[0][1].reason,100),
  paper_order_was_not_assumed:true
 }:null;
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
  fixed_coin_stake_test_usdc:userCoinStake(state),
  real_coin_stake_setting_usdc:userCoinStake(state,{real:true}),
  maximum_available_for_gpt_paper_buy_test_usdc:gptSpendable.free_to_allocate_test_usdc,
  gpt_paper_amount_selected_by:'USER_DASHBOARD_ONLY',
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
   current_minimum_entry_test_usdc:MIN_PAPER_ENTRY_USDC,
   signed_gpt_minimum_entry_test_usdc:MIN_GPT_PAPER_ENTRY_USDC
  },
  positions,history,
  gpt_paper_last_decision:lastGpt,
  gpt_paper_received_decisions:replay.length,
  gpt_paper_recent_decisions:recentGpt,
  gpt_local_paper_fills:gptLocalPaperFills,
  gpt_local_paper_fills_are_not_model_proven:true,
  gpt_paper_local_activity_diagnostic:gptActivity,
  gpt_paper_research_funnel:funnel,
  gpt_paper_market_source_diagnostic:marketSourceDiagnostic,
  gpt_paper_research_activity:researchActivity,
  gpt_forward_reviews:localGptForwardView(gptForward,{now}),
  pricing_warning:'Nur indikative Positionsbewertung, inklusive 1 % modellierter Ausstiegskosten. Keine ausführbare Sell-Quote und kein garantierter Auszahlungsbetrag.'
 };
}
