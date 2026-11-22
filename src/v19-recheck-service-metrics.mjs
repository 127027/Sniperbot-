// Dot2 V1.9: actual queue-service measurements, never fabricated provider timing.
// A checked request does not imply matched quote, risk approval or PAPER execution.
import {canonicalChain,poolValid} from './market-evidence.mjs';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const key=(c,p)=>c+':'+(c==='solana'?p:String(p).toLowerCase());
const pct=(a,b)=>b>0?Math.round((a/b)*10000)/100:null;
const quantile=(values,q)=>{if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 const rank=Math.max(0,Math.ceil(sorted.length*q)-1);
 return Math.round(sorted[rank]*100)/100;
};
export function summarizeRecheckService({plan,attempts=[],asOfUtc,hotSlaMinutes=10}={}){
 const now=ms(asOfUtc);
 if(plan?.kind!=='R29_V19_HOT_FAIR_RISK_RECHECK_PLAN'||now===null
   ||!Array.isArray(attempts)||!Number.isFinite(hotSlaMinutes)||hotSlaMinutes<=0)
   throw Error('INVALID_V19_RECHECK_SERVICE_INPUT');
 const selected=new Map();
 for(const c of plan.selected||[]){
   const chain=canonicalChain(c.chain);
   if(chain&&poolValid(chain,c.pool,c.pool_kind))selected.set(key(chain,c.pool),c);
 }
 const metrics={HOT_CURRENT_CAPTURE:[],PERSISTENT_FAIR_RECHECK:[],EVIDENCE_REPAIR:[]},
  unknown=[],pending=new Set(selected.keys()),repairOutcomes={};
 let checked=0,matched=0,failures=0;
 for(const a of attempts){
   const chain=canonicalChain(a?.chain),k=chain&&poolValid(chain,a?.pool,a?.pool_kind)?key(chain,a.pool):null;
   if(!k||!selected.has(k)||!pending.has(k))continue;
   pending.delete(k);
   const original=selected.get(k),checkedAt=ms(a.checked_at_utc);
   if(checkedAt===null||checkedAt>now){
     unknown.push({key:k,reason:'CHECK_TIME_UNKNOWN_OR_FUTURE'});continue;
   }
   checked++;
   if(original.queue==='EVIDENCE_REPAIR'){
     const status=typeof a.status==='string'&&a.status?a.status:'UNKNOWN';
     repairOutcomes[status]=(repairOutcomes[status]||0)+1;
   }
   if(a.status==='TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY')matched++;
   if(/ERROR|429|MISMATCH|NO_MATCH|LOW_LIQUIDITY|MISSING_GECKO_COMPARISON_PRICE|PRICE_DISAGREEMENT/i.test(a.status||''))failures++;
   const reference=ms(original.observed_at_utc??original.last_seen_at_utc);
   if(reference===null||reference>checkedAt){
     unknown.push({key:k,reason:'SOURCE_TIME_NOT_PROVEN'});continue;
   }
   metrics[original.queue]?.push((checkedAt-reference)/60000);
 }
 const hot=metrics.HOT_CURRENT_CAPTURE,fair=metrics.PERSISTENT_FAIR_RECHECK,
  repair=metrics.EVIDENCE_REPAIR;
 const repairAttempted=Object.values(repairOutcomes).reduce((a,b)=>a+b,0);
 return {schema:1,kind:'R29_V19_HOT_FAIR_SERVICE_METRICS',as_of_utc:asOfUtc,
   selected_for_recheck:selected.size,
   attempted_rechecks:checked,still_pending:selected.size-checked,
   source_time_unknown:unknown,matched_two_domain_quotes:matched,reported_risk_blocks_or_errors:failures,
   hot_checked_with_time:hot.length,fair_checked_with_time:fair.length,
   repair_attempted:repairAttempted,
   repair_checked_with_time:repair.length,
   repair_status_counts:repairOutcomes,
   repair_indicative_quotes:repairOutcomes.TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY||0,
   repair_unmatched_identity:repairOutcomes.NO_MATCHING_CHAIN_POOL_BASE_TOKEN||0,
   hot_p50_wait_minutes:quantile(hot,0.5),hot_p95_wait_minutes:quantile(hot,0.95),
   fair_p50_wait_minutes:quantile(fair,0.5),fair_p95_wait_minutes:quantile(fair,0.95),
   repair_p50_wait_minutes:quantile(repair,0.5),
   repair_p95_wait_minutes:quantile(repair,0.95),
   hot_sla_minutes:hotSlaMinutes,
   hot_sla_met_pct:pct(hot.filter(x=>x<=hotSlaMinutes).length,hot.length),
   deferred_new_candidates:plan.deferred_new_pool_count,
   actual_api_calls_claimed_from_attempts:attempts.length,
   selection_does_not_delete_deferred_candidates:true,
   trade_authorized:false,actual_paper_fills:0,
   note:'Queue latency statistics are null until a matched observed/check timestamp pair exists.'};
}
