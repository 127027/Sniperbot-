// R29: Post-decision, read-only comparison of a 24-hour deterministic
// research REPLAY to the 65-row POST_EVENT oracle. No input here can reach
// discovery or Dot4: only a completed isolated replay report is accepted.
// Missing October quotes mean UNKNOWN, not 65 missed profitable trades.
import {canonicalChain} from './market-evidence.mjs';

const hour=(date,i)=>date+'T'+String(i).padStart(2,'0')+':00:00.000Z';
const marketKey=coin=>{
 const chain=canonicalChain(coin?.chain);
 return chain&&typeof coin.pool==='string'
  ?chain+':'+(chain==='solana'?coin.pool:coin.pool.toLowerCase()):null;
};
const picked=action=>({
 action:action.action,symbol:action.coin?.symbol??null,
 chain:canonicalChain(action.coin?.chain),pool:action.coin?.pool??null,
 contract:action.coin?.contract??null,
 reason:action.reason??null,
 provenance:'OFFLINE_MODEL_OUTPUT_NOT_INDEPENDENT_GPT_OR_CLIENT_FILL'
});
export function compare24HourlyScansAfterReplay({replay,oracle}={}){
 const r=replay?.requested_backtest??replay;
 if(r?.schema!==1||r.kind!=='R29_V18_ON_DEMAND_FIVE_ROLE_SHADOW_BACKTEST'
   ||r.date!=='2026-10-12'||r.mode!=='EXPLICIT_FIXED_24_HOURLY_DIAGNOSTIC'
   ||r.first_scan_at_start_enabled!==true
   ||r.on_demand_29h_timeline?.hourly_ticks!==29
   ||r.on_demand_29h_timeline?.warmup_hours!==5
   ||r.on_demand_29h_timeline?.decision_hours!==24
   ||r.confirmed_paper_orders!==0||r.confirmed_paper_fills!==0
   ||r.historical_gpt_dot_runs!==0
   ||!Array.isArray(r.role_audit?.dot4_strategy?.timeline)
   ||r.role_audit.dot4_strategy.timeline.length!==24)
  throw Error('NOT_A_SAFE_EXACT_24_HOURLY_REPLAY_REPORT');
 if(oracle?.schema!==1||oracle?.kind!=='R29_V19_POST_EVENT_WINNER_REFERENCE_REGISTER'
   ||oracle.source_class!=='POST_EVENT_ORACLE'
   ||!Array.isArray(oracle.entries)||oracle.entries.length!==65)
  throw Error('INVALID_POST_DECISION_ORACLE_REGISTER');
 const ticks=r.role_audit.dot4_strategy.timeline;
 const holds=new Map(),buys=new Set();
 const rows=ticks.map((tick,i)=>{
  if(tick.at_utc!==hour(r.date,i)
    ||!Array.isArray(tick.actions)||!Array.isArray(tick.blocked_sources))
    throw Error('BACKTEST_HOURLY_TICK_MISMATCH_OR_MISSING_ACTIONS');
  const bought=[],sold=[],watched=[],rejected=[];
  for(const a of tick.actions){
   const market=marketKey(a.coin);
   if(a.action==='BUY'){
    const x=picked(a);bought.push(x);buys.add(market);
    if(market)holds.set(market,x);
   }else if(a.action==='SELL'){
    sold.push(picked(a));if(market)holds.delete(market);
   }else if(a.action==='BUY_REJECTED'||a.action==='SELL_REJECTED'){
    rejected.push({action:a.action,code:a.code??null});
   }else watched.push(picked(a));
  }
  return {scan:i+1,scan_at_utc:tick.at_utc,
   valid_model_input_pools:tick.eligible_snapshots,
   rejected_source_observations:tick.blocked_sources.length,
   full_algorithmic_review:tick.full_review,
   cadence_setting:tick.target_per_24h,
   scan_result:tick.status,buy:bought,sell:sold,
   hold:[...holds.values()],watch:watched,rejections:rejected,
   historical_coin_selection_status:r.role_audit.dot2_discovery?.original_capture_claims===0
    ?'UNKNOWN_NO_ORIGINAL_OCTOBER_DISCOVERY_AND_QUOTE_UNIVERSE'
    :'PROVISIONAL_UNAUTHENTICATED_OCTOBER_INPUT',
   verified_real_gpt_reviews_this_scan:0,verified_windows_paper_fills_this_scan:0};
 });
 const evaluated=oracle.entries.map(e=>{
  const chain=canonicalChain(e.reported_chain),k=e.pool&&chain
   ?chain+':'+(chain==='solana'?e.pool:e.pool.toLowerCase()):null;
  const matched=k!==null&&buys.has(k);
  return {rank:e.rank,name:e.name,reported_chain:e.reported_chain,
   reported_gain_pct:e.reported_gain_pct,
   pool:e.pool??null,token_contract:e.contract??null,
   reference_identity_status:e.identity_status,
   reported_gain_is_not_an_executable_return:true,
   matched_by_exact_pool_post_decision:matched,
   actual_discoverability_proven:false,actual_sellability_proven:false,
   genuine_blind_recall_scored:false,
   verdict:matched?'MODEL_SELECTED_SAME_POSTHOC_POOL_UNVERIFIED_TRADE'
     :'UNKNOWN_NOT_PROVEN_MISSED_OPPORTUNITY'};
 });
 return {schema:1,kind:'R29_V19_EXPLICIT_24_HOURLY_POST_DECISION_DIAGNOSTIC',
  date:r.date,mode:'ISOLATED_OFFLINE_MODEL_DIAGNOSTIC_NOT_FINAL_BACKTEST',
  warmup_from_utc:r.historical_warmup_start_utc,
  decision_end_exclusive_utc:r.end_utc,
  first_scan_at_utc:rows[0].scan_at_utc,last_scan_at_utc:rows[23].scan_at_utc,
  scan_count:24,scans:rows,
  source_status:r.status,observations_supplied:r.source_input_count,
  observations_accepted:r.accepted_input_count,
  original_october_capture_claims:r.role_audit.dot2_discovery?.original_capture_claims??0,
  model_buys:r.model_replay_summary.buys,model_sells:r.model_replay_summary.sells,
  actual_historical_gpt_dot_reviews:0,actual_windows_paper_fills:0,
  opening_model_test_usdc:r.start_capital_test_usdc,
  stake_per_coin_model_test_usdc:r.amount_per_coin_test_usdc,
  closing_model_cash_test_usdc:r.model_ending_cash_test_usdc,
  winner_reference:{reported_rows:oracle.entries.length,
   rows_with_pool_urls:oracle.entries.filter(e=>!!e.pool).length,
   rows_without_pool_identity:oracle.entries.filter(e=>!e.pool).length,
   all_market_gainers_100pct_total:'UNKNOWN_NOT_COMPLETE_UNIVERSE',
   actual_proven_missed_buy_opportunities:0,
   missed_buy_opportunities_reliably_measureable:false,
   comparison_only_after_simulated_decisions:true,
   entries:evaluated},
  data_gap_is_not_no_opportunity:true,
  high_return_from_future_oracle_is_not_tradeable_24h_return:true,
  security_gate_not_bypassed:true,real_orders_created:0};
}
