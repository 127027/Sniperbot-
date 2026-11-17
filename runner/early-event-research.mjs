// R29 forward-only early discovery leads for actual GPT RESEARCH.
// A migration, a newly observed pool or a new token is a question to investigate,
// NOT a security approval, tradable quote, prediction or trading instruction.
import {validateFreeStreamLead} from './solana-live-events.mjs';

export const EARLY_RESEARCH_SCHEMA='sniper_r29_early_research_leads.v1';
const HOUR=3600_000,TEN=600_000;
const ID=/^research-alert-[a-f0-9]{32}$/;
const CAND=/^(solana|base|bsc|eth):[^:\s]{4,60}:[^:\s]{4,60}$/;
const ISO=x=>typeof x==='string'&&x.endsWith('Z')&&Number.isFinite(Date.parse(x));
const sourceHosts=new Set(['api.geckoterminal.com','api.dexscreener.com']);
const validLinks=x=>Array.isArray(x)&&x.length>0&&x.length<=5&&
 x.every(s=>{
  if(typeof s!=='string'||s.length>900)return false;
  try{const u=new URL(s);return u.protocol==='https:'&&sourceHosts.has(u.hostname)&&
    !u.username&&!u.password}catch{return false}
 });
function safeFreshEvent(e,snapshot,now,maxAgeMs){
 if(!e||typeof e!=='object'||Array.isArray(e)||
  e.paper_only!==true||e.actionable!==false||
  e.probability_pct!==null||
  e.recommended_action!=='INDEPENDENT_FIVE_ROLE_REVIEW'||
  !ID.test(e.event_id||'')||!ISO(e.observed_at_utc)||
  Date.parse(e.observed_at_utc)>now||now-Date.parse(e.observed_at_utc)>maxAgeMs)
  return false;
 if(e.event_type==='SOLANA_STREAM_NEW_TOKEN'||e.event_type==='SOLANA_STREAM_MIGRATION')
  return validateFreeStreamLead(e,{now,maxAgeMs});
 if(e.event_type!=='NEW_POOL_FIRST_OBSERVED'||!CAND.test(e.candidate_id||'')||
  typeof e.chain!=='string'||!e.candidate_id.startsWith(e.chain+':')||
  e.candidate_id!==e.chain+':'+e.token_address+':'+e.pool_address||
  !ISO(e.pool_created_at_utc)||!validLinks(e.source_urls))return false;
 const age=Date.parse(e.observed_at_utc)-Date.parse(e.pool_created_at_utc);
 if(!Number.isFinite(age)||age<0||age>HOUR||
  age!==e.provider_creation_age_at_observation_ms)return false;
 // A new REST-pool hint only has meaning if its identity is actually present
 // in the current neutral market snapshot, not injected by a stale sideband.
 return snapshot.candidates.some(c=>c.candidate_id===e.candidate_id&&
  c.chain===e.chain&&c.token_address===e.token_address&&
  c.pool_address===e.pool_address&&c.promotion_biased!==true&&
  c.source==='GECKOTERMINAL_NEW_POOLS');
}
export function earlyEventResearchLeads(snapshot,{now=Date.parse(snapshot?.published_at_utc),
 limit=8,maxAgeMs=TEN}={}){
 if(snapshot?.schema!=='research_market_snapshot.v1'||
  snapshot.paper_only!==true||snapshot.actionable!==false||
  !Array.isArray(snapshot.candidates)||snapshot.candidates.length>200||
  (snapshot.research_alerts!==undefined&&
    (!Array.isArray(snapshot.research_alerts)||snapshot.research_alerts.length>24))||
  !Number.isFinite(now)||!ISO(snapshot.published_at_utc)||
  now!==Date.parse(snapshot.published_at_utc)||
  !Number.isInteger(limit)||limit<0||limit>12||
  !Number.isInteger(maxAgeMs)||maxAgeMs<60_000||maxAgeMs>HOUR)
  throw Error('R29_EARLY_UNTRUSTED_MARKET_FRAME');
 const seen=new Set();
 const ranked=[];
 for(const e of snapshot.research_alerts||[]){
  if(!safeFreshEvent(e,snapshot,now,maxAgeMs)||seen.has(e.event_id))continue;
  seen.add(e.event_id);
  const paired=typeof e.candidate_id==='string'&&CAND.test(e.candidate_id)&&
   snapshot.candidates.some(c=>c.candidate_id===e.candidate_id&&
    c.chain===e.chain&&c.token_address===e.token_address&&
    c.pool_address===e.pool_address&&c.promotion_biased!==true);
  ranked.push({
   event_id:e.event_id,event_type:e.event_type,
   chain:e.chain,token_address:e.token_address,
   pool_address:e.pool_address??null,
   candidate_id:paired?e.candidate_id:null,
   observed_at_utc:e.observed_at_utc,
   source_timestamp_quality:e.event_type.startsWith('SOLANA_STREAM_')?
    'LOCAL_RECEIVE_ONLY':'LOCAL_PERIODIC_API_FIRST_SEEN',
   independent_pool_identity_verified:false,
   chain_finality_verified:false,
   buy_sell_quotes_verified:false,
   sellability_verified:false,
   recommended_action:'INDEPENDENT_GPT_RESEARCH_NOT_BUY',
   paper_only:true,actionable:false
  });
 }
 const priority={SOLANA_STREAM_MIGRATION:0,NEW_POOL_FIRST_OBSERVED:1,
  SOLANA_STREAM_NEW_TOKEN:2};
 ranked.sort((a,b)=>priority[a.event_type]-priority[b.event_type]||
  Date.parse(b.observed_at_utc)-Date.parse(a.observed_at_utc)||
  a.event_id.localeCompare(b.event_id));
 return {schema:EARLY_RESEARCH_SCHEMA,paper_only:true,actionable:false,
  as_of_utc:snapshot.published_at_utc,
  observed_event_count:ranked.length,
  omitted_event_count:Math.max(0,ranked.length-limit),
  leads:ranked.slice(0,limit),
  recommendation:'RESEARCH_ONLY_NEVER_AUTO_BUY',
  price_or_profit_prediction:null};
}
