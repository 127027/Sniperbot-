// STRICT AS-OF intake for independent Memecoin-Dot historical training.
// Input-only, no network, order publishing, side effects or known winning coins.
import {createHash} from 'node:crypto';
export const RESULT = Object.freeze({
 STRICT:'STRICT_ASOF_INPUT',PROVISIONAL:'PROVISIONAL_RESEARCH_LEAD',
 FUTURE:'FUTURE_BLOCKED',INVALID:'INVALID_RECORD',
 METADATA:'PUBLICATION_METADATA_NOT_ORIGINAL_BYTES',
 HINDSIGHT:'HINDSIGHT_PRICE_FOR_EVALUATION_ONLY',
 LEDGER:'RECONSTRUCTED_LEDGER_EVENT_DISCOVERY_NOT_PROVEN',
});
const isUtc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,19)===s.slice(0,19);
const millis=s=>Date.parse(s);
const hash=s=>createHash('sha256').update(s).digest('hex');
const validUrl=s=>typeof s==='string'&&/^https:\/\//.test(s);
const SOURCE_TYPES=new Set(['NEWS_ORIGINAL','SOCIAL_ORIGINAL','ONCHAIN_TX','VENUE_ANNOUNCEMENT','MARKET_TRADE']);
export function classifyHistoricalSource(source,cutoff){
 if(!isUtc(cutoff)||!source||typeof source!=='object'||!SOURCE_TYPES.has(source.kind)||
  !isUtc(source.event_at_utc)||!isUtc(source.available_from_utc)||
  !validUrl(source.url)||typeof source.id!=='string'||source.id.length<3)
   return {grade:RESULT.INVALID,reason:'INVALID_SOURCE_SCHEMA'};
 if(millis(source.event_at_utc)>millis(cutoff)||
    millis(source.available_from_utc)>millis(cutoff))
   return {grade:RESULT.FUTURE,reason:'SOURCE_NOT_PUBLIC_BY_SIMULATED_CUTOFF'};
 if(millis(source.available_from_utc)<millis(source.event_at_utc))
   return {grade:RESULT.INVALID,reason:'AVAILABLE_BEFORE_ORIGINAL_EVENT'};
 if(source.hindsight_label===true||
    source.method==='RETROSPECTIVE_DAILY_OHLC')
   return {grade:RESULT.HINDSIGHT,reason:'RETROSPECTIVE_CANDLE_NOT_CONTEMPORANEOUS_TRADE'};
 if(source.proof_type==='CONTEMPORARY_SITE_DATE_ONLY')
   return {grade:RESULT.METADATA,reason:'2024_DATE_ON_MUTABLE_2026_WEBPAGE'};
 if(source.proof_type==='PROVISIONAL_PLATFORM_DATE')
   return {grade:RESULT.PROVISIONAL,reason:'POST_MAY_BE_EDITED_AFTER_PUBLICATION'};
 if(source.proof_type==='VERIFIED_2024_ARCHIVE'){
  if(!isUtc(source.capture_at_utc)||millis(source.capture_at_utc)>millis(cutoff)||
      millis(source.capture_at_utc)!==millis(source.available_from_utc)||
      !validUrl(source.archive_url)||!/^https:\/\/web\.archive\.org\/web\/\d{14}\//.test(source.archive_url)||
      source.archive_url.slice('https://web.archive.org/web/'.length,'https://web.archive.org/web/'.length+14)!==source.capture_at_utc.replace(/[-:TZ]/g,'').slice(0,14)||
      source.archived_original_bytes_verified!==true||
      typeof source.original_bytes!=='string'||source.original_bytes.length===0||
      source.original_sha256!==hash(source.original_bytes))
   return {grade:RESULT.INVALID,reason:'ARCHIVE_PROOF_INCOMPLETE'};
  if(source.kind==='MARKET_TRADE')
   return {grade:RESULT.PROVISIONAL,reason:'ARCHIVED_PRICE_PAGE_NOT_EXECUTABLE_POOL_QUOTE'};
  return {grade:RESULT.STRICT,reason:'ARCHIVED_ORIGINAL_BY_CUTOFF'};
 }
 if(source.proof_type==='VERIFIED_ORIGINAL_CHAIN_TX'){
  if(source.kind!=='ONCHAIN_TX'||!isUtc(source.block_at_utc)||
    millis(source.block_at_utc)!==millis(source.event_at_utc)||
    !Number.isSafeInteger(source.block_slot)||source.block_slot<0||
    typeof source.tx_signature!=='string'||source.tx_signature.length<18||
    source.historical_tx_verified!==true||source.historical_state_replayed!==true||
    !validUrl(source.explorer_url)||source.independent_slot_confirmation!==true)
   return {grade:RESULT.INVALID,reason:'LEDGER_REPLAY_PROOF_INCOMPLETE'};
  // Historical ledger fact reconstructed in 2026 is not proof that a Dot discovered it in 2024.
  return {grade:RESULT.LEDGER,reason:'IMMUTABLE_TX_AT_BLOCK_TIME_BUT_DISCOVERY_NEEDS_2024_FEED_PROOF'};
 }
 return {grade:RESULT.INVALID,reason:'UNRECOGNIZED_PROOF_TYPE'};
}
export function buildDayPackets(records,{start_utc,end_utc}){
 if(!isUtc(start_utc)||!isUtc(end_utc)||millis(end_utc)<millis(start_utc)||
   !Array.isArray(records)||records.length>100000)throw Error('INVALID_HISTORICAL_WINDOW_OR_RECORDS');
 const packets=[],sources=new Set(),byDay=new Map();
 for(const s of records){
  if(!s||sources.has(s.id))throw Error('DUPLICATE_OR_INVALID_SOURCE_ID');
  sources.add(s.id);
  if(!isUtc(s.available_from_utc))throw Error('UNVERIFIED_SOURCE_PUBLIC_TIME');
  const date=s.available_from_utc.slice(0,10);
  if(!byDay.has(date))byDay.set(date,[]);
  byDay.get(date).push(s);
 }
 let prev=null;
 for(let t=Date.parse(start_utc.slice(0,10)+'T00:00:00Z');
     t<=Date.parse(end_utc.slice(0,10)+'T00:00:00Z');t+=86400000){
  const date=new Date(t).toISOString().slice(0,10);
  const cutoff=date===end_utc.slice(0,10)?end_utc:date+'T23:59:59Z';
  const incoming=(byDay.get(date)||[]).filter(s=>millis(s.available_from_utc)<=millis(cutoff));
  const classified=incoming.map(s=>({source_id:s.id,kind:s.kind,
    reported_at_utc:s.available_from_utc,...classifyHistoricalSource(s,cutoff)}));
  const permitted=classified.filter(x=>x.grade===RESULT.STRICT);
  const chain=classified.filter(x=>x.grade===RESULT.LEDGER);
  const metadata=classified.filter(x=>[RESULT.METADATA,RESULT.PROVISIONAL].includes(x.grade));
  packets.push({date_utc:date,cutoff_utc:cutoff,
   original_archived_inputs:permitted,verified_reconstructed_ledger:chain,
   unverified_research_leads:metadata,
   blocked:classified.filter(x=>[RESULT.FUTURE,RESULT.INVALID,RESULT.HINDSIGHT].includes(x.grade)),
   historic_real_dot_detected:false,qualified_buy_orders:0});
  if(prev!==null&&date<=prev)throw Error('DAYS_NOT_CHRONOLOGICAL');
  prev=date;
 }
 return {schema:'sniper_r12_historical_source_packets.v1',simulation_only:true,
  original_verified_feed_complete:false,known_winner_lists_in_input:false,
  days:packets.length,packets,
  status:'SOURCE_GRADE_DIAGNOSTIC_NOT_FIVE_DOT_BLIND_REPLAY'};
}
