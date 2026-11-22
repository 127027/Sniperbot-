// R29 D1-05: explicit six-chain discovery service + conservative queue telemetry.
// No claim that planned chain slots are successful HTTP requests.
// Optional independent demand hint breaks ties AFTER failed-page and wait fairness.
const CHAINS=['solana','base','ethereum','bsc','robinhood','cronos'];
const date=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const finite=x=>Number.isFinite(x)&&x>=0?x:null;
const pct=(n,d)=>d?Math.round(n/d*10000)/100:null;
const percentile=(xs,q)=>xs.length?[...xs].sort((a,b)=>a-b)[Math.ceil(xs.length*q)-1]:null;
export function chainServiceSignals({memory,coverage,asOfUtc,windowMinutes=60}={}){
 const now=date(asOfUtc);
 if(!now||memory?.kind!=='R29_PERSISTENT_MARKET_MEMORY'
  ||coverage?.kind!=='R29_V19_OFFSET_PAGE_COVERAGE'
  ||!Number.isInteger(windowMinutes)||windowMinutes<5||windowMinutes>1440)
  throw Error('INVALID_CHAIN_SERVICE_SIGNALS');
 const candidateCounts=Object.fromEntries(CHAINS.map(c=>[c,0]));
 const unidentified=Object.fromEntries(CHAINS.map(c=>[c,0]));
 for(const x of Object.values(memory.pools||{})){
  if(!CHAINS.includes(x?.chain))continue;
  const at=date(x.last_seen_at_utc);
  if(at===null||at>now||now-at>windowMinutes*60000)continue;
  candidateCounts[x.chain]++;
  if(!x.contract||x.contract_conflicts?.length)unidentified[x.chain]++;
 }
 const demand={};
 for(const chain of CHAINS){
  const cp=memory.checkpoints?.[chain+':GECKOTERMINAL'];
  const retry=date(cp?.retry_after_utc),last=date(cp?.last_attempt_at_utc);
  const pending=(coverage.chains?.[chain]?.pending_pages||[])
    .filter(n=>Number.isInteger(n)&&n>=1&&n<=1000);
  const minutes=last!==null&&last<=now?(now-last)/60000:null;
  demand[chain]={
   chain,observed_recent_pool_count:candidateCounts[chain],
   recent_identity_gaps:unidentified[chain],pending_page_count:pending.length,
   last_attempt_at_utc:last!==null&&last<=now?new Date(last).toISOString():null,
   minutes_since_last_attempt:minutes===null?null:Math.round(minutes*100)/100,
   cooldown_active:retry!==null&&retry>now,
   backlog_first_pending_at_utc:null,
   backlog_age_minutes:null,
   demand_weight:Math.min(100,
     candidateCounts[chain]*2+unidentified[chain]*3+pending.length*5),
   weight_is_research_priority_not_trade_risk:true
  };
 }
 return {schema:1,kind:'R29_V19_CHAIN_SERVICE_SIGNALS',
  at_utc:new Date(now).toISOString(),window_minutes:windowMinutes,
  demand,unmeasured_backlog_age_is_null:true,orders_authorized:0};
}
export function summarizeChainServiceSla({signals,plan,actualHttpReceipts=[],asOfUtc}={}){
 const now=date(asOfUtc);
 if(!now||signals?.kind!=='R29_V19_CHAIN_SERVICE_SIGNALS'
  ||plan?.kind!=='R29_V19_BOUND_MULTI_CHAIN_PLAN'
  ||!Array.isArray(actualHttpReceipts))throw Error('INVALID_CHAIN_SERVICE_REPORT');
 const tasks=plan.tasks||[],per_chain=[],ages=[];
 for(const chain of CHAINS){
  const x=signals.demand[chain];
  const scheduled=tasks.filter(t=>t.chain===chain).length;
  const gecko=actualHttpReceipts.filter(r=>r.chain===chain&&r.provider==='GECKOTERMINAL');
  const successes=gecko.filter(r=>r.http_status===200).length;
  const attempts=gecko.filter(r=>Number.isInteger(r.http_status)).length;
  if(x.minutes_since_last_attempt!==null&&!x.cooldown_active)
   ages.push(x.minutes_since_last_attempt);
  per_chain.push({...x,scheduled_pages:scheduled,
   actual_http_attempts_in_report:attempts,actual_http200_pages_in_report:successes,
   planned_but_not_http_verified:Math.max(0,scheduled-attempts),
   service_verified_by_real_http:successes>0,
   pending_first_seen_age_minutes:null,
   historical_max_wait_minutes_inferable:false});
 }
 const due=per_chain.filter(x=>!x.cooldown_active);
 const serviced=due.filter(x=>x.scheduled_pages>0);
 return {schema:1,kind:'R29_V19_CHAIN_SERVICE_SLA_REPORT',
  as_of_utc:new Date(now).toISOString(),per_chain,
  due_chain_count:due.length,scheduled_due_chain_count:serviced.length,
  scheduled_due_chain_coverage_pct:pct(serviced.length,due.length),
  verified_http200_chain_count:per_chain.filter(x=>x.actual_http200_pages_in_report>0).length,
  p95_elapsed_minutes_since_last_attempt:percentile(ages,.95),
  max_elapsed_minutes_since_last_attempt:ages.length?Math.max(...ages):null,
  p95_actual_queue_wait_minutes:null,max_backlog_age_minutes:null,
  note:'Elapsed since last chain attempt is NOT age of an individual queued page.',
  incomplete_chain_coverage_is_data_gap:serviced.length<due.length,
  cancelled_or_cooldown_chains_are_not_idle_market:true,
  global_market_coverage_claim:false,trade_authorized:false,orders_authorized:0};
}
