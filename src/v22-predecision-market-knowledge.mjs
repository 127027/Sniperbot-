// R29 V2.2: unlimited, point-in-time RESEARCH memory before the first scan.
// The 5h prelude is a scheduled rehearsal, NOT the beginning of market knowledge.
// This never infers provider data, authorizes orders, authenticates sources,
// invokes GPT, reads the network, or uses post-event winner labels.
import {buildAsOfLookback} from './v19-asof-lookback.mjs';
import {classifyAsOfEvidence,asOfMillis} from './v19-asof-evidence.mjs';
import {canonicalChain,tokenValid,poolValid} from './market-evidence.mjs';

const TYPES=Object.freeze(['POOL_DISCOVERY','MARKET_ACTIVITY','NEWS','SOCIAL','RISK_NOTE','HISTORICAL_CONTEXT']);
const sha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const labelFields=['reported_gain_pct','future_winner_label','post_event_rank',
  'future_price_usd','future_outcome','oracle_label','winner_at_end'];
const key=(ch,contract,pool)=>ch+':'+(ch==='solana'?contract:String(contract).toLowerCase())
  +':'+(ch==='solana'?pool:String(pool).toLowerCase());

export function inspectPredecisionKnowledge({
  asOfUtc,snapshots=[],marketKnowledgeEvents=[],warmupStartUtc=null
}={}){
 const now=asOfMillis(asOfUtc);
 const warmup=warmupStartUtc===null?null:asOfMillis(warmupStartUtc);
 if(now===null||(warmupStartUtc!==null&&(warmup===null||warmup>now))
   ||!Array.isArray(snapshots)||!Array.isArray(marketKnowledgeEvents))
  throw Error('INVALID_R29_PREDECISION_KNOWLEDGE_INPUT');
 const lookback=buildAsOfLookback({snapshots,asOfUtc});
 // Capture availability matters: an old *event date* does not mean a
 // market was already known before warmup if its source arrived later.
 const warmupLookback=warmup===null?null:buildAsOfLookback({
   snapshots,asOfUtc:warmupStartUtc});
 const beforeWarmupKeys=new Set(warmupLookback?.markets.map(m=>m.key)||[]);
 const markets=new Map(),excluded={
   invalid_identity_or_type:0,invalid_source_or_time:0,
   future_or_not_yet_available:0,retrospective:0,oracle_or_future_label:0
 };
 let acceptableEvents=0,earlyEvents=0,newSinceWarmup=0;
 const recentDiscoveryPools=new Set();
 const add=(k,source,at,eventType)=> {
   const m=markets.get(k)||{market_key:k,sources:new Set(),kinds:new Set(),
     first_known_at_utc:at,last_known_at_utc:at,knowledge_event_count:0,
     before_warmup_knowledge:false};
   m.sources.add(source);m.kinds.add(eventType);
   if(Date.parse(at)<Date.parse(m.first_known_at_utc))m.first_known_at_utc=at;
   if(Date.parse(at)>Date.parse(m.last_known_at_utc))m.last_known_at_utc=at;
   m.knowledge_event_count++;
   if(warmup!==null&&Date.parse(at)<warmup)m.before_warmup_knowledge=true;
   markets.set(k,m);
 };
 for(const s of marketKnowledgeEvents){
   if(!s||typeof s!=='object'||s.kind!=='R29_MARKET_KNOWLEDGE_EVENT'
     ||!TYPES.includes(s.event_type)){excluded.invalid_identity_or_type++;continue;}
   if(s.source_class==='POST_EVENT_ORACLE'
     ||s.source_class==='RETRO_ASOF_RECONSTRUCTION'
     ||labelFields.some(field=>Object.hasOwn(s,field))){
     if(s.source_class==='RETRO_ASOF_RECONSTRUCTION')excluded.retrospective++;
     else excluded.oracle_or_future_label++;
     continue;
   }
   const chain=canonicalChain(s.chain);
   if(!chain||!tokenValid(chain,s.contract)||!poolValid(chain,s.pool,s.pool_kind)){
     excluded.invalid_identity_or_type++;continue;
   }
   const sourceClass=s.source_class??(s.provenance==='CONTEMPORANEOUS_RECORD'
     ?'ORIGINAL_CAPTURE':s.provenance==='SYNTHETIC_TEST'?'SYNTHETIC_TEST':null);
   if(sourceClass==='ORIGINAL_CAPTURE'&&(!sha(s.source_archive_sha)
     ||s.provenance!=='CONTEMPORANEOUS_RECORD')){
     excluded.invalid_source_or_time++;continue;
   }
   if(sourceClass==='SYNTHETIC_TEST'&&s.provenance!=='SYNTHETIC_TEST'){
     excluded.invalid_source_or_time++;continue;
   }
   // Event time can be much older than the five-hour warmup; the archived
   // bytes and available time MUST nevertheless precede this virtual tick.
   const verdict=classifyAsOfEvidence({
     source_class:sourceClass,provenance:s.provenance,
     event_at_utc:s.event_at_utc,
     archived_at_utc:s.archived_at_utc,
     available_at_utc:s.available_at_utc
   },{asOfUtc});
   if(!['PROVISIONAL_ASOF','SYNTHETIC_REGRESSION_ONLY'].includes(verdict.status)){
     if(verdict.status==='POST_EVENT_ONLY')excluded.oracle_or_future_label++;
     else if(verdict.status==='RETROSPECTIVE_RESEARCH_ONLY')excluded.retrospective++;
     else if(['EVENT_IN_FUTURE','NOT_YET_AVAILABLE_AT_VIRTUAL_TIME'].includes(verdict.reason))
       excluded.future_or_not_yet_available++;
     else excluded.invalid_source_or_time++;
     continue;
   }
   // Event identity is not source authentication. An as-of valid journal is
   // RESEARCH_ONLY even when self-described as ORIGINAL_CAPTURE.
   const avail=s.available_at_utc;
   const k=key(chain,s.contract,s.pool);
   add(k,'EXPLICIT_MARKET_KNOWLEDGE_EVENT',avail,s.event_type);
   if(s.event_type==='POOL_DISCOVERY'&&asOfMillis(avail)>now-3600000)
     recentDiscoveryPools.add(k);
   acceptableEvents++;
   if(warmup!==null&&asOfMillis(avail)<warmup)earlyEvents++;
   else if(warmup!==null)newSinceWarmup++;
 }
 for(const m of lookback.markets){
   // The original lookback key is chain:contract:pool.
   add(m.key,'PAST_QUOTE_FEATURE',m.latest_observed_at_utc,'HISTORICAL_PRICE_FEATURE');
   if(beforeWarmupKeys.has(m.key))
     markets.get(m.key).before_warmup_knowledge=true;
 }
 const all=[...markets.values()].map(m=>({
   market_key:m.market_key,first_known_at_utc:m.first_known_at_utc,
   last_known_at_utc:m.last_known_at_utc,
   source_kinds:[...m.sources].sort(),knowledge_kinds:[...m.kinds].sort(),
   available_records:m.knowledge_event_count,
   before_warmup_knowledge:m.before_warmup_knowledge,
   execution_quote_authorized:false
 })).sort((a,b)=>a.market_key.localeCompare(b.market_key));
 return {schema:1,kind:'R29_V22_PAST_ONLY_PREDECISION_KNOWLEDGE',
   as_of_utc:asOfUtc,warmup_start_utc:warmupStartUtc,
   no_historical_age_cutoff:true,
   available_knowledge_markets:all.length,
   available_knowledge_events:acceptableEvents,
   recently_discovered_pools_last_60m:recentDiscoveryPools.size,
   events_known_before_five_hour_warmup:earlyEvents,
   events_known_during_or_after_warmup:newSinceWarmup,
   markets_with_pre_warmup_knowledge:all.filter(m=>m.before_warmup_knowledge).length,
   past_quote_feature_markets:lookback.market_count,
   past_quote_feature_observations:lookback.observation_count,
   oldest_quote_feature_utc:lookback.oldest_observation_at_utc,
   markets:all,excluded,
   historical_universe_complete:false,
   original_source_bytes_independently_authenticated:false,
   past_knowledge_does_not_grant_fresh_buy_sell_quote:true,
   research_only:true,
   actual_gpt_runs:0,orders_published:0,
   disclaimer:'All available earlier research may be considered, including before five-hour warmup. No feed exists unless supplied. Historical as-of assertions are not independent provider authenticity or executable quotes.'};
}
