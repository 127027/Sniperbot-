// R29 V5.2 – strictly local, read-only, sanitized summary of existing
// 120-second Collector and hourly independent EVM security research.
// Research eligibility is NOT a GPT BUY decision, quote or sellability proof.
const timestamp=(s,now,maxAgeMs)=>{
 if(typeof s!=='string'||!s.endsWith('Z'))return null;
 const t=Date.parse(s);
 return Number.isFinite(t)&&t>0&&t<=now&&now-t<=maxAgeMs?t:null;
};
const integer=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max?n:null;
const REASONS=new Set([
 'NON_EVM_CHAIN','INDEPENDENT_PAIR_IDENTITY_NOT_CONFIRMED',
 'POOL_LIQUIDITY_LT_20000_OR_UNKNOWN','VOLUME_5M_LT_1000_OR_UNKNOWN',
 'VOLUME_EXCEEDS_2X_POOL_LIQUIDITY','NOT_NEUTRAL_GECKOTERMINAL_NEW_POOL',
 'POOL_OR_TOKEN_ADDRESS_IDENTITY_INVALID','POOL_OBSERVATION_STALE_OR_FUTURE',
 'PROMOTION_BIAS_OR_UNKNOWN'
]);
export function summarizeLocalGptFunnel({
 collector=null,security=null,now=Date.now()
}={}){
 if(!Number.isFinite(now))throw Error('R29_V52_FUNNEL_CLOCK_INVALID');
 const marketFresh=collector?.schema==='research_market_collector_status.v1'&&
  collector.paper_only===true&&collector.actionable===false&&
  timestamp(collector.last_check_at_utc,now,10*60000)!==null;
 const securityFresh=security?.schema==='sniper_r29_public_gpt_security_research.v1'&&
  security.mode==='PAPER_RESEARCH_ONLY'&&security.actionable===false&&
  security.authorizes_paper_orders===false&&
  timestamp(security.checked_at_utc,now,2*3600000)!==null;
 const diag=securityFresh?security.selection_diagnostic:null;
 const eligible=diag?.schema==='sniper_r29_security_candidate_diagnostic.v1'?
  integer(diag.potential_research_candidates,96):null;
 const reasonCounts=diag?.first_failure_reason_counts;
 const reasons=reasonCounts&&typeof reasonCounts==='object'&&!Array.isArray(reasonCounts)?
  Object.entries(reasonCounts).filter(([k,n])=>REASONS.has(k)&&
   integer(n,96)!==null).sort((a,b)=>b[1]-a[1]||
   a[0].localeCompare(b[0])).slice(0,5).map(([code,count])=>({code,count})):[];
 const checked=securityFresh?integer(security.candidate_check_count,2):null;
 const raw=securityFresh&&Array.isArray(security.candidates)&&
  security.candidates.length<=2?security.candidates:null;
 const failed=raw?raw.filter(x=>x?.full_gpt_buy_gate_passed===false).length:null;
 return {
  schema:'sniper_r29_v52_local_funnel_observation.v1',
  paper_only:true,actionable:false,real_trading_enabled:false,
  collection_recent:marketFresh,
  last_collector_check_at_utc:marketFresh?collector.last_check_at_utc:null,
  observed_candidate_count:marketFresh?integer(collector.candidate_count,96):null,
  independent_security_research_recent:securityFresh,
  security_checked_at_utc:securityFresh?security.checked_at_utc:null,
  last_security_sample_evm_candidates:securityFresh?
   integer(diag?.evm_market_rows,96):null,
  last_security_sample_research_eligible_evm:eligible,
  last_security_sample_actually_checked:checked,
  last_security_sample_failed_full_trade_proof:failed,
  last_security_sample_missing_reasons:reasons,
  authorized_gpt_buy_count:null,
  complete_buy_sell_execution_quotes_verified:false,
  sample_is_not_exhaustive_market_universe:true,
  confidence:marketFresh&&securityFresh?'TWO_SEPARATE_RECENT_RESEARCH_SNAPSHOTS':
   'INCOMPLETE_OR_STALE_LOCAL_RESEARCH'
 };
}
