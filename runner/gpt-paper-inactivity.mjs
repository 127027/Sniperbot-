// R29 V5.2 – local-only inactivity audit over EXISTING Paper ledger/journal.
// No strategy, order signing, fee assumptions, historical winner list or
// GitHub account publication. Missing retention NEVER proves 24/7 uptime.
const GPT_SOURCES=new Set(['GPT_GITHUB_LOCAL','GPT_GITHUB_POLICY_EXIT']);
const HOUR_MS=3600000;
const goodTime=(s,now)=>{
 if(typeof s!=='string'||!s.endsWith('Z'))return null;
 const n=Date.parse(s);
 return Number.isFinite(n)&&n<=now&&n>0?n:null;
};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const str=(s,max=100)=>typeof s==='string'?s.slice(0,max):'';
function category(s){
 if(/CAPACITY|BUDGET|RISK_CAP|EQUITY|FUNDS|MIN_ORDER|PORTFOLIO/.test(s))return 'PAPER_CAPACITY_OR_RISK_LIMIT';
 if(/SOLANA|UNSUPPORTED|CHAIN/.test(s))return 'CHAIN_SECURITY_NOT_SUPPORTED';
 if(/SECURITY|HONEYPOT|SELLABILITY|CONTRACT|PAIR_|LP_|QUOTE|LIQUIDITY|MARKET/.test(s))return 'SECURITY_OR_MARKET_PROOF_MISSING';
 if(/EXIT_MONITOR|EXIT_POLICY|EXIT_CONTRACT/.test(s))return 'EXIT_PROTECTION_NOT_READY';
 if(/STALE|EXPIRED|CANDIDATE_NOT_IN_LOCAL|SOURCE_NOT_FRESH/.test(s))return 'FRESH_DATA_OR_DELIVERY_GAP';
 if(/DISABLED|NOT_OPTED_IN|FOLLOW/.test(s))return 'PAPER_ENTRIES_OR_GPT_FOLLOW_OFF';
 return 'OTHER_REJECTION';
}
export function diagnoseGptPaperInactivity(state,{now=Date.now()}={}){
 if(!state||!Number.isFinite(now)||!Array.isArray(state.agentOrderReceipts)||
  (state.gptDecisionReplay!==undefined&&
   (typeof state.gptDecisionReplay!=='object'||state.gptDecisionReplay===null||
    Array.isArray(state.gptDecisionReplay))))
  throw Error('R29_V52_LOCAL_PAPER_INACTIVITY_INPUT_INVALID');
 const ledger=state.agentOrderReceipts.filter(r=>r&&
  GPT_SOURCES.has(r.command_source)&&r.synthetic_test!==true&&
  r.real_trade_executed!==true&&r.status==='PAPER_FILLED');
 const buys=ledger.filter(r=>r.action==='BUY'&&r.command_source==='GPT_GITHUB_LOCAL');
 const sells=ledger.filter(r=>r.action==='SELL');
 const times=xs=>xs.map(x=>goodTime(x.received_at_utc,now)).filter(x=>x!==null);
 const logged=Object.entries(state.gptDecisionReplay||{}).filter(([id,x])=>
  /^gpt_[0-9a-f]{32}$/.test(id)&&x&&typeof x==='object'&&
  goodTime(x.at_utc,now)!==null);
 const dates=[...logged.map(([,x])=>goodTime(x.at_utc,now)),...times(ledger)];
 const first=dates.length?dates.reduce((a,b)=>Math.min(a,b),Infinity):null;
 const lastBuyTimes=times(buys),lastSellTimes=times(sells);
 const lastBuy=lastBuyTimes.length?lastBuyTimes.reduce((a,b)=>Math.max(a,b),0):null;
 const lastSell=lastSellTimes.length?lastSellTimes.reduce((a,b)=>Math.max(a,b),0):null;
 const lastActivity=dates.length?dates.reduce((a,b)=>Math.max(a,b),0):null;
 const rejections=new Map();let noTrade=0,blocked=0,rejected=0;
 for(const [,x]of logged){
  if(x.status==='NO_TRADE'||x.status==='WATCH'||x.status==='HOLD')noTrade++;
  if(x.status!=='BLOCKED'&&x.status!=='REJECTED')continue;
  if(x.status==='BLOCKED')blocked++;else rejected++;
  const kind=category(str(x.reason,100).toUpperCase());
  rejections.set(kind,(rejections.get(kind)||0)+1);
 }
 const causes=[...rejections].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
  .slice(0,6).map(([reason,count])=>({reason,count}));
 // Thresholds describe a LOCAL RETAINED EVIDENCE window only.
 // No absence claim is based on missing archived receipts / missed PC uptime.
 const baseline=lastBuy??first;
 const elapsed=baseline===null?null:Math.max(0,Math.floor((now-baseline)/HOUR_MS));
 const windows=[24,72,240].map(hours=>({
  hours,window_elapsed_in_local_evidence:elapsed!==null&&elapsed>=hours,
  no_local_gpt_paper_buy_since_baseline:elapsed!==null&&elapsed>=hours&&
   (lastBuy===null||now-lastBuy>=hours*HOUR_MS),
  complete_history_or_continuous_pc_uptime_proven:false
 }));
 let primary='NOT_ENOUGH_LOCAL_EVIDENCE';
 if(state.entriesEnabled!==true)primary='PAPER_ENTRIES_DISABLED';
 else if(state.gptPaperFollow!==true)primary='GPT_FOLLOW_DISABLED';
 else if(causes.length)primary=causes[0].reason;
 else if(noTrade>0)primary='GPT_NO_TRADE_OR_WATCH_ONLY';
 else if(logged.length)primary='NO_GPT_PAPER_BUY_IN_LOCAL_JOURNAL';
 else primary='NO_RECEIVED_GPT_DECISIONS';
 const firstAlert=windows.filter(x=>x.no_local_gpt_paper_buy_since_baseline).at(-1);
 return {
  schema:'sniper_r29_v52_local_paper_inactivity.v1',
  mode:'PAPER_ONLY',real_trading_enabled:false,local_only:true,
  strategy_authority:'GPT_ONLY',diagnostic_only:true,
  continuous_service_availability_verified:false,
  retained_journal_complete_for_10_days:false,
  public_market_security_proofs_included:false,
  first_local_evidence_at_utc:first===null?null:new Date(first).toISOString(),
  last_local_evidence_at_utc:lastActivity===null?null:new Date(lastActivity).toISOString(),
  last_local_gpt_paper_buy_at_utc:lastBuy===null?null:new Date(lastBuy).toISOString(),
  last_local_gpt_paper_sell_at_utc:lastSell===null?null:new Date(lastSell).toISOString(),
  hours_since_first_local_evidence:lastBuy===null?elapsed:null,
  hours_since_last_local_gpt_paper_buy:lastBuy===null?null:elapsed,
  received_gpt_decisions_with_valid_timestamps:logged.length,
  local_research_decisions:noTrade,local_blocked_decisions:blocked,
  local_rejected_decisions:rejected,
  local_gpt_paper_buy_fills:buys.length,local_gpt_paper_sell_fills:sells.length,
  locally_recorded_gpt_paper_sell_pnl_test_usdc:sells.length&&
   sells.every(r=>finite(r.closed_pnl_test_usdc))?
    Math.round(sells.reduce((a,b)=>a+b.closed_pnl_test_usdc,0)*1e8)/1e8:null,
  model_origin_for_local_fills_independently_attested:false,
  local_receipts_with_missing_or_invalid_time:ledger.length-times(ledger).length,
  observed_inactivity_windows:windows,
  review_priority:firstAlert?firstAlert.hours+'H_LOCAL_NO_BUY_DIAGNOSIS':'OBSERVATION_WINDOW_NOT_ESTABLISHED',
  primary_local_explanation:primary,
  local_blocker_categories:causes
 };
}
