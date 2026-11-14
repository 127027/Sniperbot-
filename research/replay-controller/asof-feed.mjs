// A time-locked, winner-neutral historical source intake for the isolated replay.
// Networkless by design. Input acquisition and evaluator labels belong in separate
// trust domains; this module never searches the web or asks who later won.
// A recorded post timestamp alone is not evidence of its unedited historic content.
import {createHash} from 'node:crypto';
import {ROLES,validateDataset,blindReadiness,initialPortfolio,frame} from './engine.mjs';

export const PEPE_WINDOW={
  start:'2023-03-14T00:00:00Z',
  end:'2023-05-14T23:59:59Z'
};
const hash=s=>createHash('sha256').update(s).digest('hex');
const fields={
  POOL:['chain','token','pool'],
  SOCIAL:['body','authors','interactions'],
  MARKET:['reserve_token','reserve_quote','fee_bps','gas_quote','quote_asset','execution_verified'],
  SECURITY:['buy_allowed','sell_allowed','scope']
};
const allowedProofs=new Set(['ONCHAIN_LEDGER','CONTEMPORANEOUS_ARCHIVE']);
const stamp=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s))?Date.parse(s):NaN;
function check(ok,code){if(!ok)throw Error(code);}
function clone(x){return structuredClone(x);}
export function dayTicks(window=PEPE_WINDOW){
 const start=stamp(window.start),end=stamp(window.end);
 check(Number.isFinite(start)&&Number.isFinite(end)&&start<=end,'INVALID_TIME_WINDOW');
 check(new Date(start).toISOString().endsWith('T00:00:00.000Z')&&
  new Date(end).toISOString().endsWith('T23:59:59.000Z'),'FULL_UTC_DAYS_REQUIRED');
 const result=[];
 const first=Math.floor(start/86400000)*86400000;
 for(let t=first;t<=end;t+=86400000){
  const last=Math.min(end,t+86400000-1000);
  if(last>=start)result.push(new Date(last).toISOString().replace('.000Z','Z'));
 }
 return result;
}
export function hourTicks(window=PEPE_WINDOW){
 const start=stamp(window.start),end=stamp(window.end);
 check(Number.isFinite(start)&&Number.isFinite(end)&&start<=end,'INVALID_TIME_WINDOW');
 const out=[];
 for(let t=start;t<=end;t+=3600000){
  const last=Math.min(end,t+3600000-1000);
  out.push(new Date(last).toISOString().replace('.000Z','Z'));
 }
 return out;
}
function normalizeRecord(s,window,knownIds){
 check(s&&typeof s==='object'&&!Array.isArray(s),'INVALID_RECORD');
 check(typeof s.id==='string'&&/^[a-zA-Z0-9_.:-]{1,120}$/.test(s.id),'INVALID_SOURCE_ID');
 check(!knownIds.has(s.id),'DUPLICATE_SOURCE_ID');
 knownIds.add(s.id);
 check(fields[s.kind],'INVALID_KIND');
 check(typeof s.candidate_id==='string'&&s.candidate_id.length>0,'INVALID_CANDIDATE');
 check(s.proof&&allowedProofs.has(s.proof.method),'INVALID_PROOF_METHOD');
 check(typeof s.proof.original==='string'&&s.proof.original.length>0,'MISSING_ORIGINAL');
 check(typeof s.proof.sha256==='string'&&s.proof.sha256===hash(s.proof.original),'RAW_HASH_MISMATCH');
 check(typeof s.proof.ref==='string'&&s.proof.ref.length>0,'PROOF_REFERENCE_MISSING');
 const occurred=stamp(s.event_at),lower=stamp(window.start),upper=stamp(window.end);
 check(Number.isFinite(occurred),'BAD_EVENT_TIMESTAMP');
 if(occurred<lower)return {blocked:'BEFORE_WINDOW'};
 if(occurred>upper)return {blocked:'AFTER_WINDOW'};
 if(s.proof.verified!==true)return {blocked:'NOT_INDEPENDENTLY_VERIFIED'};
 let available;
 if(s.proof.method==='ONCHAIN_LEDGER'){
  const at=stamp(s.proof.block_time);
  if(!Number.isFinite(at)||at!==occurred)return {blocked:'UNVERIFIED_OR_MISMATCHED_CHAIN_TIME'};
  if(s.proof.historical_ledger_verified!==true)return {blocked:'LEDGER_NOT_VERIFIED'};
  available=at;
 }else{
  const published=stamp(s.proof.published_at),captured=stamp(s.proof.captured_at);
  if(!Number.isFinite(published)||!Number.isFinite(captured)||published<occurred||
   captured<published)return {blocked:'UNPROVEN_PUBLICATION_OR_CAPTURE'};
  // Archive capture is the earliest reproducibly evidenced opportunity to know
  // the content; using publication metadata alone would inject hindsight.
  available=captured;
 }
 if(available>upper)return {blocked:'NOT_EVIDENCED_WITHIN_WINDOW'};
 if(available<lower)return {blocked:'BEFORE_WINDOW'};
 if(s.kind==='MARKET'){
  if(s.proof.method!=='ONCHAIN_LEDGER'||s.proof.historical_pool_state_verified!==true||
   s.proof.historical_execution_quote_verified!==true)
   return {blocked:'MARKET_NOT_EXECUTABLE_ASOF'};
  const v=s.payload||{};
  if(!Number.isFinite(v.reserve_token)||v.reserve_token<=0||
     !Number.isFinite(v.reserve_quote)||v.reserve_quote<=0||
     !Number.isFinite(v.gas_quote)||v.gas_quote<0||
     !Number.isFinite(v.fee_bps)||v.fee_bps<0||
     typeof v.quote_asset!=='string')return {blocked:'INCOMPLETE_HISTORICAL_QUOTE'};
 }
 if(s.kind==='SECURITY'){
  if(s.proof.method!=='ONCHAIN_LEDGER'||s.proof.historical_block_state_verified!==true)
   return {blocked:'HISTORICAL_SECURITY_NOT_VERIFIED'};
 }
 if(s.kind==='SOCIAL'&&s.proof.method!=='CONTEMPORANEOUS_ARCHIVE')
  return {blocked:'SOCIAL_CAPTURE_REQUIRED'};
 const payload={};
 for(const f of fields[s.kind])if(s.payload&&s.payload[f]!==undefined)payload[f]=clone(s.payload[f]);
 if(s.kind==='MARKET')payload.execution_verified=true;
 const event={
  id:s.id,kind:s.kind,candidate_id:s.candidate_id,
  event_at:s.event_at,available_at:new Date(available).toISOString(),
  evidence:{
   type:s.proof.method==='ONCHAIN_LEDGER'?'LEDGER':'ARCHIVE',
   ref:'asof:'+s.id, // Neutral ID only; original URI stays in the private audit.
   verified:true,sha256:s.proof.sha256
  },...payload
 };
 return {event,privateSource:{id:s.id,proof_ref:s.proof.ref,method:s.proof.method,
   provenance_hash:s.proof.sha256,available_at:event.available_at}};
}
export function compileAsOfCorpus(corpus,{resolution='day'}={}){
 check(corpus?.schema==='asof_corpus.v1','INVALID_CORPUS_SCHEMA');
 const window=clone(corpus.window||PEPE_WINDOW);
 const beginning=stamp(window.start),ending=stamp(window.end);
 check(Number.isFinite(beginning)&&Number.isFinite(ending)&&beginning<=ending,'INVALID_TIME_WINDOW');
 check(['day','hour'].includes(resolution),'INVALID_RESOLUTION');
 const ticks=resolution==='day'?dayTicks(window):hourTicks(window);
 const ids=new Set(),events=[],privateSources=[],excluded=[];
 for(const source of corpus.sources||[]){
  const r=normalizeRecord(source,window,ids);
  if(r.blocked)excluded.push({id:source.id,reason:r.blocked});
  else{events.push(r.event);privateSources.push(r.privateSource);}
 }
 events.sort((a,b)=>stamp(a.available_at)-stamp(b.available_at)||a.id.localeCompare(b.id));
 // Never infer coverage from a cherry-picked set. An independent coverage
 // attestation must be supplied and checked outside this compiler.
 const universe={
  selection:corpus.universe?.selection==='ASOF_COHORT'?'ASOF_COHORT':'UNVERIFIED_SELECTION',
  complete:false,
  provenance:corpus.universe?.provenance||'UNVERIFIED',
  selection_policy:corpus.universe?.selection_policy||'NOT_DEFINED'
 };
 const contexts=Object.fromEntries(ROLES.map(r=>[r,{
  fresh:false,target_exposed:true,attestation:null
 }])); // Cannot attest independent agent contexts in a dataset compiler.
 const dataset={
  schema:'isolated_replay.v1',data_class:'HISTORICAL',
  window,ticks,events,universe,contexts
 };
 validateDataset(dataset);
 const audit={
  schema:'asof_ingestion_audit.v1',window,
  resolution,day_count:dayTicks(window).length,ticks:ticks.length,
  total_sources:(corpus.sources||[]).length,accepted_sources:events.length,
  excluded,privateSources,
  blind_readiness:blindReadiness(dataset),
  limitations:[
   'Corpus completeness has NOT been independently attested.',
   'Five independent new model contexts have NOT been authenticated.',
   'Archive date is conservatively treated as content-availability evidence.',
   'No historical trading evidence can be generated from missing sources.',
   'Evaluator identities, later winners, ATH and outcomes are never loaded here.'
  ]
 };
 return {dataset,audit};
}
export function inspectAsOfFrame(dataset,index){
 validateDataset(dataset);
 check(dataset.window&&stamp(dataset.ticks[index])>=stamp(dataset.window.start) &&
  stamp(dataset.ticks[index])<=stamp(dataset.window.end),'FRAME_OUTSIDE_LOCKED_WINDOW');
 // This calls the very same core projection used when a real decision is sealed.
 return frame(dataset,index,initialPortfolio());
}
