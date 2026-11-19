// R29 V5.6 – bounded, durable SCOUT research memory for current and vanished
// pools. Not GPT's strategy, no BUY authority, private state, wallet or prices
// eligible for fills. Last observation time is preserved and never refreshed
// just because a missing coin remains on the watch queue.
import {candidateId} from './research-watchlist.mjs';

export const WATCH_SCHEMA='r29_market_watch_continuity.v1';
const DAY_MS=24*60*60_000,MAX_MEMORY=256,MAX_PUBLIC=24;
const CHAINS=new Set(['solana','base','bsc','eth']);
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const time=t=>typeof t==='string'&&t.endsWith('Z')&&Number.isFinite(Date.parse(t));
const id=c=>{try{return candidateId(c.chain,c.token_address,c.pool_address)===c.candidate_id}catch{return false}};
export const emptyMarketWatch=()=>({schema:WATCH_SCHEMA,paper_only:true,
 actionable:false,records:[]});
function validState(s){
 if(s?.schema!==WATCH_SCHEMA||s.paper_only!==true||s.actionable!==false||
  !Array.isArray(s.records)||s.records.length>MAX_MEMORY)throw Error('R29_WATCH_STATE_INVALID');
 const ids=new Set();
 for(const c of s.records){
  if(!id(c)||ids.has(c.candidate_id)||!time(c.first_seen_at_utc)||
   !time(c.last_seen_at_utc)||
   Date.parse(c.last_seen_at_utc)<Date.parse(c.first_seen_at_utc)||
   !Number.isInteger(c.observation_count)||c.observation_count<1||
   !['PROVIDER_ONLY','CROSS_PROVIDER_IDENTITY'].includes(c.verification)||
   ![c.price_usd,c.liquidity_usd,c.volume_m5_usd].every(x=>x===null||finite(x)))
   throw Error('R29_WATCH_RECORD_INVALID');
  ids.add(c.candidate_id);
 }
 return s;
}
function numericOrNull(n){return finite(n)?n:null}
function toRecord(c,seen,old=null){
 return {
  candidate_id:c.candidate_id,chain:c.chain,
  token_address:c.token_address,pool_address:c.pool_address,
  first_seen_at_utc:old?.first_seen_at_utc||seen,
  last_seen_at_utc:seen,
  observation_count:(old?.observation_count||0)+1,
  verification:c.verification==='CROSS_PROVIDER_IDENTITY'?
   'CROSS_PROVIDER_IDENTITY':old?.verification||'PROVIDER_ONLY',
  price_usd:numericOrNull(c.price_usd),
  liquidity_usd:numericOrNull(c.liquidity_usd),
  volume_m5_usd:numericOrNull(c.volume_m5_usd)
 };
}
function rank(c){
 const verified=c.verification==='CROSS_PROVIDER_IDENTITY'?1:0;
 return [verified,Math.min(c.volume_m5_usd||0,1e9),
  Math.min(c.liquidity_usd||0,1e9)];
}
function sortResearch(a,b){
 const x=rank(a),y=rank(b);
 return y[0]-x[0]||y[1]-x[1]||y[2]-x[2]||
  Date.parse(b.last_seen_at_utc)-Date.parse(a.last_seen_at_utc)||
  a.candidate_id.localeCompare(b.candidate_id);
}
export function updateMarketWatch(state,snapshot,{now=Date.now()}={}){
 validState(state);
 if(!Number.isFinite(now)||snapshot?.schema!=='research_market_snapshot.v1'||
  snapshot.paper_only!==true||snapshot.actionable!==false||
  !time(snapshot.published_at_utc)||Date.parse(snapshot.published_at_utc)>now||
  now-Date.parse(snapshot.published_at_utc)>10*60_000||
  !Array.isArray(snapshot.candidates)||snapshot.candidates.length>96)
  throw Error('R29_WATCH_SOURCE_INVALID');
 const current=new Map(state.records.filter(c=>
  Date.parse(c.last_seen_at_utc)<=now&&
  now-Date.parse(c.last_seen_at_utc)<=DAY_MS).map(c=>[c.candidate_id,c]));
 let admitted=0,refreshed=0,ignored=0;
 const seen=new Set();
 for(const c of snapshot.candidates){
  if(!id(c)||!CHAINS.has(c.chain)||
   !['PROVIDER_ONLY','CROSS_PROVIDER_IDENTITY'].includes(c.verification)||
   !time(c.observed_at_utc)||
   Date.parse(c.observed_at_utc)>now||
   Date.parse(c.observed_at_utc)>Date.parse(snapshot.published_at_utc)||
   Date.parse(snapshot.published_at_utc)-Date.parse(c.observed_at_utc)>5*60_000||
   seen.has(c.candidate_id)){ignored++;continue}
  seen.add(c.candidate_id);
  const old=current.get(c.candidate_id);
  if(old&&Date.parse(c.observed_at_utc)<=Date.parse(old.last_seen_at_utc))
   continue;
  current.set(c.candidate_id,toRecord(c,c.observed_at_utc,old));
  if(old)refreshed++;else admitted++;
 }
 const all=[...current.values()].sort(sortResearch);
 // Bounded storage prevents 2-minute discovery floods from unbounded memory.
 // Dropping a record is explicitly counted, never silently promoted to BUY.
 const records=all.slice(0,MAX_MEMORY);
 return {state:{...state,records},admitted,refreshed,ignored,
  evicted_capacity:Math.max(0,all.length-records.length),
  retained_absent:records.filter(c=>!seen.has(c.candidate_id)).length};
}
export function publicMarketWatch(state,{now=Date.now(),limit=MAX_PUBLIC}={}){
 validState(state);
 if(!Number.isFinite(now)||!Number.isInteger(limit)||limit<0||limit>MAX_PUBLIC)
  throw Error('R29_WATCH_PUBLIC_ARGUMENTS_INVALID');
 return state.records.filter(c=>Date.parse(c.last_seen_at_utc)<=now&&
  now-Date.parse(c.last_seen_at_utc)<=DAY_MS)
  .sort(sortResearch).slice(0,limit).map(c=>({
   candidate_id:c.candidate_id,chain:c.chain,
   token_address:c.token_address,pool_address:c.pool_address,
   first_seen_at_utc:c.first_seen_at_utc,last_seen_at_utc:c.last_seen_at_utc,
   observation_count:c.observation_count,
   verification:c.verification,
   last_indicative_price_usd:c.price_usd,
   last_indicative_liquidity_usd:c.liquidity_usd,
   last_indicative_volume_m5_usd:c.volume_m5_usd,
   source:'LOCAL_SCOUT_OBSERVATIONS',
   research_status:'SCOUT_WATCH_NOT_GPT_DECISION',
   paper_only:true,actionable:false,paper_entry_authorized:false
  }));
}
