// Bounded, persistent, starvation-resistant research scheduling.
// No score or winner list is allowed to alter the recheck fairness cursor.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const id=(chain,pool)=>chain+':'+(chain==='solana'?pool:String(pool).toLowerCase());
export function fairRecheckPlan(memory,{asOfUtc,maxRechecks=6}={}){
 const now=iso(asOfUtc);
 if(!now||!Number.isInteger(maxRechecks)||maxRechecks<0||maxRechecks>100)throw Error('INVALID_FAIR_SCHEDULER_ARGS');
 if(memory?.kind!=='R29_PERSISTENT_MARKET_MEMORY')throw Error('INVALID_MEMORY_SCHEMA');
 const history=memory.rechecks||{},pools=Object.values(memory.pools||{});
 const candidates=pools.filter(p=>{
   const chain=canonicalChain(p.chain),first=iso(p.first_seen_at_utc);
   return chain&&poolValid(chain,p.pool,p.pool_kind)&&first&&first<=now;
 }).map(p=>{
   const chain=canonicalChain(p.chain),key=id(chain,p.pool);
   const prior=history[key],last=iso(prior?.attempt_at_utc);
   return {key,chain,pool:p.pool,pool_kind:p.pool_kind||null,contract:tokenValid(chain,p.contract)?p.contract:null,
    symbol:p.symbol||null,last_recheck_utc:last,last_seen_at_utc:p.last_seen_at_utc||null,
    first_seen_at_utc:p.first_seen_at_utc,
    previous_recheck_status:prior?.status||'NEVER_ATTEMPTED'};
 });
 // NEVER_ATTEMPTED first, then least recently checked. Old sources do not
 // take priority forever once checked. Across finite memory all are visited.
 candidates.sort((a,b)=>{
  const ap=a.last_recheck_utc?Date.parse(a.last_recheck_utc):-Infinity;
  const bp=b.last_recheck_utc?Date.parse(b.last_recheck_utc):-Infinity;
  return ap-bp||a.key.localeCompare(b.key);
 });
 return {schema:1,kind:'R29_FAIR_RECHECK_PLAN',as_of_utc:now,
  total_known_pools:pools.length,valid_recheck_pools:candidates.length,
  never_checked_count:candidates.filter(x=>!x.last_recheck_utc).length,
  candidates:candidates.slice(0,maxRechecks),
  backlog_count:Math.max(0,candidates.length-maxRechecks),
  due_policy:'NEVER_CHECKED_FIRST_THEN_LEAST_RECENTLY_CHECKED',
  coverage_is_complete:candidates.length<=maxRechecks,
  historical_lookback_cutoff:null,
  orders_authorized:0};
}
export function recordRecheckAttempt(memory,{chain,pool,pool_kind=null,attemptAtUtc,status,sourcePath}={}){
 const c=canonicalChain(chain),at=iso(attemptAtUtc);
 if(memory?.kind!=='R29_PERSISTENT_MARKET_MEMORY'||!poolValid(c,pool,pool_kind)||!at
 ||typeof status!=='string'||!status||typeof sourcePath!=='string'||!sourcePath.startsWith('research/'))
 throw Error('INVALID_RECHECK_ATTEMPT');
 const next=structuredClone(memory);
 next.rechecks??={};
 const key=id(c,pool),prev=next.rechecks[key];
 if(prev?.attempt_at_utc&&Date.parse(at)<Date.parse(prev.attempt_at_utc))
  throw Error('RECHECK_TIME_REGRESSION');
 // A resumed capture can replay the same archived result. Exact replay is a
 // no-op; conflicting results at the same timestamp must not overwrite the
 // cursor or invent an extra provider attempt.
 if(prev?.attempt_at_utc===at){
   if(prev.status===status&&prev.source_path===sourcePath)return next;
   throw Error('CONFLICTING_RECHECK_RECEIPT_AT_SAME_TIME');
 }
 next.rechecks[key]={attempt_at_utc:at,status,source_path:sourcePath,
   attempts:(prev?.attempts||0)+1};
 return next;
}
