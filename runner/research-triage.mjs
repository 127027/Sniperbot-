// Pure research-only candidate triage: never issues orders or mutates a wallet.
// Upstream collectors must verify original source bytes/chain identity; this
// queue prevents old market snapshots and repeated watchlist entries from
// crowding out fresh narrative or pool discoveries.
const HOUR=3600_000;
const ms=x=>typeof x==='string'?Date.parse(x):NaN;
const str=x=>typeof x==='string'&&x.trim().length>0;
function stamp(x){const n=ms(x);return Number.isFinite(n)?n:null}
export function marketFeedFreshness(publishedAt,now,{maxAgeMs=45*60_000}={}){
 const p=stamp(publishedAt),n=stamp(now);
 if(n===null||!Number.isFinite(maxAgeMs)||maxAgeMs<0)throw Error('INVALID_FRESHNESS_INPUT');
 if(p===null)return {fresh:false,reason:'NO_VALID_TIMESTAMP',age_minutes:null};
 if(p>n)return {fresh:false,reason:'FUTURE_TIMESTAMP',age_minutes:null};
 const age=Math.round((n-p)/60_000);
 return {fresh:n-p<=maxAgeMs,reason:n-p<=maxAgeMs?'FRESH':'STALE',age_minutes:age};
}
export function classifyResearchLead(input={},now){
 // These are upstream verified *research flags*, never independently
 // verified by this function. Do not confuse a passed flag with evidence.
 if(input.original_event_verified!==true&&input.pool_identity_verified!==true)
  return 'UNVERIFIED_SOURCE';
 if(input.pool_identity_verified!==true)return 'NARRATIVE_WATCH';
 if(input.security_verified!==true||input.sell_quote_verified!==true)
  return 'TOKEN_IDENTIFIED';
 const quote=stamp(input.quote_observed_at_utc),time=stamp(now);
 if(quote===null||time===null||quote>time||time-quote>90_000)
  return 'RISK_REVIEW';
 return 'BOT_REVIEW_CANDIDATE_RESEARCH_ONLY';
}
function leadKey(v){
 if(v.kind==='NARRATIVE'&&str(v.event_id))return 'n:'+v.event_id;
 if(v.kind==='TOKEN'&&str(v.chain)&&str(v.token_address)&&str(v.pool_address))
  return 't:'+v.chain+':'+v.token_address+':'+v.pool_address;
 return null;
}
function sanitizeFresh(leads,nowMs){
 const seen=new Map(),rejected=[];
 for(const v of leads){
  const key=leadKey(v),seenAt=stamp(v?.observed_at_utc);
  if(!key||seenAt===null||seenAt>nowMs||nowMs-seenAt>24*HOUR){
   rejected.push({key:key||null,reason:'MISSING_ID_OR_INVALID_OR_STALE_TIME'});continue;
  }
  if(!Array.isArray(v.source_urls)||v.source_urls.length===0||
     !v.source_urls.some(u=>typeof u==='string'&&/^https:\/\/[^@ \t\n]+/.test(u))){
   rejected.push({key,reason:'NO_PRIMARY_SOURCE_URL'});continue;
  }
  const previous=seen.get(key);
  if(!previous||ms(previous.observed_at_utc)>seenAt)seen.set(key,v);
 }
 return {unique:[...seen.entries()].map(([key,v])=>({...v,key})),rejected};
}
export function planResearchRound({newLeads=[],dueWatchlist=[],marketSnapshotPublishedAt=null,now,
  maxNew=5,maxRechecks=5}={}){
 const n=stamp(now);
 if(n===null||!Array.isArray(newLeads)||!Array.isArray(dueWatchlist)||
  !Number.isInteger(maxNew)||maxNew<0||maxNew>20||
  !Number.isInteger(maxRechecks)||maxRechecks<0||maxRechecks>20)
   throw Error('INVALID_RESEARCH_ROUND');
 const feed=marketFeedFreshness(marketSnapshotPublishedAt,now);
 const {unique,rejected}=sanitizeFresh(newLeads,n);
 const priority={TOKEN:0,NARRATIVE:1};
 const fresh=unique.sort((a,b)=>(priority[a.kind]??2)-(priority[b.kind]??2)||
  ms(b.observed_at_utc)-ms(a.observed_at_utc)||a.key.localeCompare(b.key));
 // Reserve room for up to two pre-token narratives even when many pool leads exist.
 const narrative=fresh.filter(x=>x.kind==='NARRATIVE');
 const token=fresh.filter(x=>x.kind==='TOKEN');
 const reserved=Math.min(2,maxNew,narrative.length);
 const picked=[...narrative.slice(0,reserved),...token.slice(0,maxNew-reserved)];
 if(picked.length<maxNew)for(const x of fresh){
  if(picked.length>=maxNew)break;
  if(!picked.some(p=>p.key===x.key))picked.push(x);
 }
 const selected=picked.map(x=>({
   key:x.key,kind:x.kind,observed_at_utc:x.observed_at_utc,
   stage:classifyResearchLead(x,now),source_urls:x.source_urls.slice(0,5),
   // A narrative without a contract is kept as a valid early-warning stage.
   actionable:false}));
 const rechecks=dueWatchlist
  .filter(v=>str(v.candidate_id)&&str(v.next_check_not_before_utc)&&
    stamp(v.next_check_not_before_utc)!==null&&stamp(v.next_check_not_before_utc)<=n)
  .sort((a,b)=>((a.priority==='HIGH'?0:1)-(b.priority==='HIGH'?0:1))||
    ms(a.next_check_not_before_utc)-ms(b.next_check_not_before_utc))
  .filter((v,i,arr)=>arr.findIndex(x=>x.candidate_id===v.candidate_id)===i)
  .slice(0,maxRechecks).map(v=>({candidate_id:v.candidate_id,priority:v.priority,
   reason:'DUE_RECHECK_NOT_A_FRESH_SIGNAL',actionable:false}));
 return {schema:'sniper_research_triage.v1',paper_only:true,actionable:false,
   feed,source_rejection_count:rejected.length,rejected,
   new_candidates:selected,old_watchlist_rechecks:rechecks,
   dropped_fresh_leads_due_to_limit:Math.max(0,fresh.length-maxNew),
   note:'Research leads are not orders; this module does not verify claims, tokens or sell quotes.'};
}
