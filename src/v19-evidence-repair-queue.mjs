// R29 V1.9 D2-04: select genuine timed price-evidence repairs from the
// existing forward-only observation ledger; never from retrospective winners.
// This is a read-only DEX research recheck proposal, not a GPT review or order.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const keyOf=(chain,pool)=>chain+':'+(chain==='solana'?pool:String(pool).toLowerCase());
const repairStatuses=new Set(['WATCH_INSUFFICIENT_REPEATED_EVIDENCE',
 'WATCH_PRICE_OBSERVATION_GAP']);
const oracle=x=>x&&typeof x==='object'&&('future_winner_label' in x
  ||'reported_gain_pct' in x||'post_event_rank' in x
  ||x.source_class==='POST_EVENT_ORACLE');
export function planEvidenceRepairRechecks({ranking,memory,asOfUtc,
 maxCandidates=100,minSpacingMinutes=5,maxAgeMinutes=120}={}){
 const now=stamp(asOfUtc),rankTime=stamp(ranking?.as_of_utc);
 if(now===null||rankTime===null||rankTime>now
  ||ranking?.kind!=='R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING'
  ||!Array.isArray(ranking.candidates)
  ||memory?.kind!=='R29_PERSISTENT_MARKET_MEMORY'
  ||!Number.isInteger(maxCandidates)||maxCandidates<0||maxCandidates>1000
  ||!Number.isInteger(minSpacingMinutes)||minSpacingMinutes<5||minSpacingMinutes>240
  ||!Number.isInteger(maxAgeMinutes)||maxAgeMinutes<minSpacingMinutes||maxAgeMinutes>1440)
  throw Error('INVALID_V19_EVIDENCE_REPAIR_PLAN');
 const candidates=[],skipped={oracle:0,identity:0,not_due:0,
   stale:0,recent_attempt:0,future:0,not_in_memory:0};
 const seen=new Set();
 for(const item of ranking.candidates){
  if(oracle(item)){skipped.oracle++;continue;}
  if(!repairStatuses.has(item?.status))continue;
  const chain=canonicalChain(item.chain);
  if(!chain||!poolValid(chain,item.pool,item.pool_kind)){skipped.identity++;continue;}
  const key=keyOf(chain,item.pool),record=memory.pools?.[key];
  if(!record){skipped.not_in_memory++;continue;}
  if(seen.has(key))continue;
  seen.add(key);
  const last=stamp(item.last_capture_at_utc),
    first=stamp(record.first_seen_at_utc),
    prior=stamp(memory.rechecks?.[key]?.attempt_at_utc);
  if(last===null||first===null||last>now||first>now||(prior!==null&&prior>now)){
   skipped.future++;continue;
  }
  // Previously captured observation must have aged >=5m to be a second,
  // physically separate quote; old watch entries fall back to FAIR.
  const age=(now-last)/60000;
  if(age>maxAgeMinutes){skipped.stale++;continue;}
  if(age<minSpacingMinutes){skipped.not_due++;continue;}
  if(prior!==null&&(now-prior)/60000<minSpacingMinutes){
   skipped.recent_attempt++;continue;
  }
  const contract=tokenValid(chain,item.contract)?item.contract:null;
  // Fixing a prior >4h gap is urgent; other single-sample WATCHs follow.
  const urgency=item.status==='WATCH_PRICE_OBSERVATION_GAP'?2:1;
  candidates.push({key,chain,pool:item.pool,pool_kind:item.pool_kind||null,
   contract,symbol:item.symbol||null,
   queue:'EVIDENCE_REPAIR',repair_reason:item.status,
   last_capture_at_utc:item.last_capture_at_utc,
   last_capture_age_minutes:Math.round(age*100)/100,
   first_seen_at_utc:record.first_seen_at_utc,
   last_recheck_utc:prior===null?null:new Date(prior).toISOString(),
   urgency,observed_at_utc:item.last_capture_at_utc,
   source_as_of_utc:ranking.as_of_utc,
   risk_eligible:false,trade_authorized:false});
 }
 // Unchecked evidence gaps first, then oldest successful/failed attempt.
 // This prevents a single repeatedly failing pool from crowding out all
 // other recent WATCH candidates. Urgency only breaks fair-cursor ties.
 candidates.sort((a,b)=>
   (stamp(a.last_recheck_utc)??-Infinity)-(stamp(b.last_recheck_utc)??-Infinity)
   ||b.urgency-a.urgency
   ||b.last_capture_age_minutes-a.last_capture_age_minutes
   ||a.key.localeCompare(b.key));
 return {schema:1,kind:'R29_V19_ASOF_PRICE_EVIDENCE_REPAIR_QUEUE',
  as_of_utc:asOfUtc,
  all_due_candidates:candidates.length,
  selected:candidates.slice(0,maxCandidates),
  deferred_count:Math.max(0,candidates.length-maxCandidates),
  skipped,
  source_policy:'FORWARD_OBSERVATIONS_ONLY_WITH_EXISTING_MEMORY_IDENTITY',
  no_oracle_winners:true,requires_new_http_capture:true,
  actual_requests:0,actual_gpt_reviews:0,paper_orders_authorized:0};
}
