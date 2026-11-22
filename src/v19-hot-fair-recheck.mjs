// Dot2 V1.9: prioritize ALL current as-of candidates, reserve service for fair backlog.
// A research rank is NOT a BUY signal and never uses a later winner list.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const id=(chain,pool)=>chain+':'+(chain==='solana'?pool:String(pool).toLowerCase());
const amount=x=>typeof x==='number'&&Number.isFinite(x)&&x>0?x:null;
const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const forbidden=x=>x&&typeof x==='object'&&
 ('future_winner_label' in x||'reported_gain_pct' in x||'post_event_rank' in x
 ||x.source_class==='POST_EVENT_ORACLE');
const valid=x=>{const chain=canonicalChain(x?.chain);return chain&&poolValid(chain,x?.pool,x?.pool_kind);};
function quickAsOfScore(c,now){
 const chain=canonicalChain(c.chain);
 const age=time(c.pool_created_at_utc);
 const recent=age!==null&&age<=now&&now-age<=86400000;
 const volume=amount(c.volume_24h_usd),liquidity=amount(c.liquidity_usd);
 const score=(tokenValid(chain,c.contract)?12:5)
   +(liquidity?Math.min(20,Math.log10(liquidity+1)*3):0)
   +(volume?Math.min(20,Math.log10(volume+1)*3):0)
   +(amount(c.observed_price_usd)?3:0)+(recent?3:0);
 return Math.round(score*100)/100;
}
export function planHotFairRechecks({freshCandidates=[],fairCandidates=[],legacyCandidates=[],
 repairCandidates=[],asOfUtc,maxChecks=6,round=0}={}){
 const now=time(asOfUtc);
 if(now===null||!Array.isArray(freshCandidates)||!Array.isArray(fairCandidates)
   ||!Array.isArray(legacyCandidates)||!Array.isArray(repairCandidates)
   ||!Number.isInteger(maxChecks)||maxChecks<0||maxChecks>100
   ||!Number.isInteger(round)||round<0)throw Error('INVALID_V19_RECHECK_PLAN');
 const seenFresh=new Set(),hot=[],excluded=[];
 for(const [index,c] of freshCandidates.entries()){
   if(forbidden(c)){excluded.push({index,reason:'FUTURE_WINNER_FIELDS_FORBIDDEN'});continue;}
   if(!valid(c)){excluded.push({index,reason:'INVALID_CHAIN_OR_POOL'});continue;}
   const observed=time(c.observed_at_utc);
   if(observed===null||observed>now){excluded.push({index,reason:'FUTURE_OR_UNDATED_FRESH_CAPTURE'});continue;}
   const chain=canonicalChain(c.chain),key=id(chain,c.pool);
   if(seenFresh.has(key))continue;
   seenFresh.add(key);
   hot.push({...c,chain,key,queue:'HOT_CURRENT_CAPTURE',
     research_score:quickAsOfScore(c,now)});
 }
 hot.sort((a,b)=>b.research_score-a.research_score||a.key.localeCompare(b.key));
 const known=new Map();
 for(const c of [...fairCandidates,...legacyCandidates]){
   if(forbidden(c)||!valid(c))continue;
   const chain=canonicalChain(c.chain),key=id(chain,c.pool);
   if(!known.has(key))known.set(key,{...c,chain,key,queue:'PERSISTENT_FAIR_RECHECK'});
 }
 const fair=[...known.values()];
 // Repair inputs are from forward-only as-of pricing. They cannot consume
 // slots when already attempted <5 minutes ago (checked by upstream queue).
 const repair=[],repairSeen=new Set();
 for(const c of repairCandidates){
   if(forbidden(c)||!valid(c)||c?.queue!=='EVIDENCE_REPAIR'
      ||c?.trade_authorized!==false||c?.risk_eligible!==false)continue;
   const chain=canonicalChain(c.chain),key=id(chain,c.pool),seen=time(c.observed_at_utc);
   if(seen===null||seen>now||repairSeen.has(key))continue;
   repairSeen.add(key);
   repair.push({...c,chain,key,queue:'EVIDENCE_REPAIR'});
 }
 repair.sort((a,b)=>(b.urgency??0)-(a.urgency??0)
    ||(b.last_capture_age_minutes??0)-(a.last_capture_age_minutes??0)
    ||a.key.localeCompare(b.key));
 // The caller-provided fair queue is already oldest/never-checked first.
 let hotQuota=Math.ceil(maxChecks/2),fairQuota=maxChecks-hotQuota;
 if(!fair.length)hotQuota=maxChecks;
 if(!hot.length)fairQuota=maxChecks;
 // A one-request capacity must alternate across runs if both queues have work.
 if(maxChecks===1&&hot.length&&fair.length&&round%2===1){
   hotQuota=0;fairQuota=1;
 }
 const selected=[],keys=new Set();
 const add=c=>{if(!c||keys.has(c.key)||selected.length>=maxChecks)return false;
   selected.push(c);keys.add(c.key);return true;};
 if(!repair.length){
   // Unchanged two-queue behavior: do not regress existing HOT/FAIR service.
   for(const c of hot.slice(0,hotQuota))add(c);
   for(const c of fair)
     if(selected.filter(x=>x.queue==='PERSISTENT_FAIR_RECHECK').length<fairQuota)add(c);
 }else if(maxChecks===1){
   // With one provider slot, rotate all three real sources across runs.
   const turn=[hot,fair,repair][round%3];
   for(const c of turn)if(add(c))break;
 }else{
   // Keep the existing HOT reservation, so first-sighting memecoins are
   // still checked without needing a second historical price.
   for(const c of hot.slice(0,hotQuota))add(c);
   const remaining=maxChecks-selected.length;
   if(remaining===1&&repair.length&&fair.length){
     const first=round%2===0?fair:repair;
     for(const c of first)if(add(c))break;
   }else if(remaining>1&&repair.length&&fair.length){
     // Guarantee one old FAIR and one recent price-repair when budget allows.
     for(const c of fair)if(add(c))break;
     for(const c of repair)if(add(c))break;
   }
 }
 // Unused quota is reallocated, but not from a fabricated paper order.
 // A pool present in HOT and REPAIR is called once, never twice.
 for(const c of hot)add(c);
 for(const c of fair)add(c);
 for(const c of repair)add(c);
 const unselectedHot=hot.filter(x=>!keys.has(x.key)),unselectedFair=fair.filter(x=>!keys.has(x.key));
 const unselectedRepair=repair.filter(x=>!keys.has(x.key));
 return {schema:1,kind:'R29_V19_HOT_FAIR_RISK_RECHECK_PLAN',as_of_utc:asOfUtc,
   selected,selected_count:selected.length,
   all_new_pool_count:hot.length,all_fair_pool_count:fair.length,
   all_evidence_repair_count:repair.length,
   hot_selected:selected.filter(x=>x.queue==='HOT_CURRENT_CAPTURE').length,
   repair_selected:selected.filter(x=>x.queue==='EVIDENCE_REPAIR').length,
   fair_selected:selected.filter(x=>x.queue==='PERSISTENT_FAIR_RECHECK').length,
   deferred_new_pool_count:unselectedHot.length,
   deferred_new_pool_keys:unselectedHot.map(x=>x.key),
   deferred_fair_pool_count:unselectedFair.length,
   deferred_repair_pool_count:unselectedRepair.length,
   deferred_repair_keys:unselectedRepair.map(x=>x.key),excluded,
   repair_is_proposal_not_fresh_quote:true,
   all_new_pools_remain_in_market_memory:true,
   priority_uses_future_winners:false,trade_authorized:false,paper_orders:0};
}
