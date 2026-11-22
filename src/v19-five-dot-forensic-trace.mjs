// R29: point-in-time five-role forensic trace, for evidence-driven diagnosis.
// Pure validation and aggregation: no API, GPT call, orders, replay or client IO.
// A record is a CLAIM until separately authenticated against original evidence.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
import {asOfMillis} from './v19-asof-evidence.mjs';

export const R29_TRACE_ROLES=Object.freeze([
 'dot-1-tempo','dot-2-discovery','dot-3-risk','dot-4-strategy','dot-5-control'
]);
export const R29_TRACE_ACTIONS=Object.freeze({
 'dot-1-tempo':['CADENCE_4','CADENCE_8','CADENCE_12','CADENCE_24','COVERAGE_ALARM','NO_CHANGE','DATA_GAP'],
 'dot-2-discovery':['DISCOVERED','WATCH','REJECTED','DEFERRED','NOT_FOUND','DATA_GAP'],
 'dot-3-risk':['ELIGIBLE','WATCH','REJECTED','DATA_GAP','RECHECK_REQUESTED'],
 'dot-4-strategy':['BUY','HOLD','SELL','WATCH','NO_TRADE_RISK','NO_TRADE_DATA_GAP'],
 'dot-5-control':['PASS','BLOCKED','DATA_GAP','FIX_REQUIRED','AUDIT_ONLY']
});
const roles=new Set(R29_TRACE_ROLES),ids=/^[A-Za-z0-9_-]{8,120}$/;
const pathRx=/^research\/(?!.*(?:\.\.|\/\/))[A-Za-z0-9_./-]+$/;
const shaRx=/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const setOf=x=>new Set(x).size===x.length;
const iso=x=>asOfMillis(x);
const isStr=x=>typeof x==='string'&&x.trim().length>=12;
const oracleFields=new Set(['reported_gain_pct','future_winner_label','oracle_label',
 'oracle_price','future_price','winner_rank','known_future_outcome',
 'post_event_oracle','target_outcome','label_after_horizon']);
function containsOracle(value,depth=0){
 if(depth>20)return true;
 if(!value||typeof value!=='object')return false;
 if(Array.isArray(value))return value.some(x=>containsOracle(x,depth+1));
 return Object.entries(value).some(([k,v])=>
  oracleFields.has(k.toLowerCase())||containsOracle(v,depth+1));
}
const forbidPath=p=>/(?:^|\/)(?:oracle|evaluation|winners?|reference-manifest|future-labels?)(?:\/|\.|$)/i.test(p);
const closeTo=(a,b)=>a===b;
const check=(code,condition)=>{if(!condition)throw Error(code);};

export function inspectFiveDotTraceEntry(entry,{startUtc,endUtc,warmupHours=5}={}){
 const start=iso(startUtc),end=iso(endUtc),at=iso(entry?.at_utc);
 check('TRACE_INVALID_WINDOW',start!==null&&end===start+86400000
   &&Number.isInteger(warmupHours)&&warmupHours>=1&&warmupHours<=48);
 check('TRACE_INVALID_ID_ROLE_OR_TIME',entry?.schema===1
  &&entry.kind==='R29_V19_FIVE_DOT_FORENSIC_EVENT'
  &&ids.test(entry.event_id||'')&&ids.test(entry.run_id||'')
  &&roles.has(entry.role)&&at!==null&&at>=start-warmupHours*3600000&&at<end);
 const phase=at<start?'WARMUP':'BLIND';
 check('TRACE_PHASE_MISMATCH',entry.phase===phase);
 check('TRACE_INVALID_ACTIVITY_OR_ACTION',
  ['REVIEW','OBSERVATION','API_REQUEST','HANDOFF','DECISION',
    'POSITION_CHECK','ERROR','AUDIT'].includes(entry.activity)
  &&R29_TRACE_ACTIONS[entry.role].includes(entry.action));
 check('TRACE_MISSING_REASON_OR_RESULT',isStr(entry.what_was_done)
  &&isStr(entry.why_this_action)
  &&Array.isArray(entry.alternatives_considered)
  &&Array.isArray(entry.missing_evidence)
  &&entry.missing_evidence.every(x=>typeof x==='string'&&x.length>0));
 check('TRACE_INVALID_SCOPE',
  ['GLOBAL','CHAIN_PAGE','POOL','POSITION'].includes(entry.scope)
  &&Array.isArray(entry.linked_event_ids)
  &&entry.linked_event_ids.every(x=>ids.test(x))
  &&setOf(entry.linked_event_ids)
  &&entry.linked_event_ids.every(x=>x!==entry.event_id));
 const coin=entry.market??null;
 if(entry.scope==='POOL'||entry.scope==='POSITION'){
  const c=canonicalChain(coin?.chain);
  check('TRACE_EXACT_CHAIN_CONTRACT_POOL_REQUIRED',c!==null
    &&c===coin.chain&&tokenValid(c,coin.contract)
    &&poolValid(c,coin.pool,coin.pool_kind)
    &&(entry.scope!=='POSITION'||entry.role==='dot-4-strategy'
      ||entry.role==='dot-5-control'));
 }else if(entry.scope==='CHAIN_PAGE'){
  check('TRACE_CHAIN_PAGE_IDENTITY_MISSING',!coin
   &&canonicalChain(entry.chain)===entry.chain
   &&Number.isInteger(entry.page)&&entry.page>=1&&entry.page<=1000);
 }else check('TRACE_GLOBAL_MUST_NOT_FABRICATE_POOL',coin===null);
 const requiresPool=entry.role==='dot-4-strategy'
   &&['BUY','SELL','HOLD'].includes(entry.action);
 check('TRACE_STRATEGY_POOL_REQUIRED',!requiresPool||
   ['POOL','POSITION'].includes(entry.scope));
 check('TRACE_NO_FUTURE_ORACLE_KEYS',!containsOracle(entry)
   &&(!('source_class' in entry)||entry.source_class!=='POST_EVENT_ORACLE'));
 check('TRACE_ORIGIN_REQUIRED',
  ['DETERMINISTIC_MODEL','GPT_SELF_REPORTED','PROVIDER_HTTP','MANUAL_RESEARCH']
  .includes(entry.execution_origin));
 check('TRACE_CLAIM_CANNOT_SELF_CERTIFY',entry.verified_gpt_execution!==true
   &&entry.verified_client_fill!==true&&entry.trade_authorized!==true);
 check('TRACE_SOURCE_ARRAY_REQUIRED',Array.isArray(entry.input_refs));
 const seen=new Set();let retro=0;
 for(const source of entry.input_refs){
  check('TRACE_SOURCE_PROVENANCE_INVALID',
   source&&typeof source==='object'
   &&['ORIGINAL_CAPTURE','RETRO_ASOF_RECONSTRUCTION','SYNTHETIC_TEST']
    .includes(source.source_class)
   &&typeof source.path==='string'&&pathRx.test(source.path)
   &&!forbidPath(source.path)
   &&shaRx.test(source.git_blob_sha||source.sha256||'')
   &&typeof source.provider==='string'&&source.provider.length>0
   &&iso(source.event_at_utc)!==null&&iso(source.available_at_utc)!==null
   &&iso(source.captured_at_utc)!==null
   &&iso(source.event_at_utc)<=at);
  check('TRACE_SOURCE_NOT_YET_KNOWABLE',
    source.source_class==='RETRO_ASOF_RECONSTRUCTION'
    ||(iso(source.available_at_utc)<=at&&iso(source.captured_at_utc)<=at));
  if(source.source_class==='RETRO_ASOF_RECONSTRUCTION')retro++;
  check('TRACE_REPEATED_SOURCE_POINTER',!seen.has(source.path));
  seen.add(source.path);
 }
 if(retro>0&&(['BUY','SELL','ELIGIBLE'].includes(entry.action)))
  throw Error('TRACE_RETRO_RESEARCH_NOT_EXECUTION_PROOF');
 if(!entry.input_refs.length&&!entry.missing_evidence.length)
  throw Error('TRACE_NO_SOURCE_AND_NO_DATA_GAP_EXPLANATION');
 if(['DATA_GAP','NO_TRADE_DATA_GAP','DEFERRED'].includes(entry.action)
    &&!entry.missing_evidence.length)
  throw Error('TRACE_UNEXPLAINED_DATA_GAP');
 return {schema:1,kind:'R29_V19_TRACE_ENTRY_VALIDATION',
   event_id:entry.event_id,role:entry.role,phase,
   source_count:entry.input_refs.length,
   retrospective_research_only_count:retro,
   origin:entry.execution_origin,gpt_execution_independently_verified:false,
   client_fill_independently_verified:false,
   action:entry.action,market_key:coin?
    coin.chain+':'+coin.contract+':'+coin.pool:null};
}

export function buildFiveDotForensicReport({entries=[],startUtc,endUtc,
 warmupHours=5,runId}={}){
 const start=iso(startUtc),end=iso(endUtc);
 check('TRACE_INVALID_WINDOW',start!==null&&end===start+86400000
  &&Number.isInteger(warmupHours)&&warmupHours>=1&&warmupHours<=48
  &&ids.test(runId||'')&&Array.isArray(entries));
 const records=[],byId=new Map();
 for(const event of entries){
  check('TRACE_RUN_ID_MISMATCH',event?.run_id===runId);
  const proof=inspectFiveDotTraceEntry(event,{startUtc,endUtc,warmupHours});
  check('TRACE_DUPLICATE_EVENT_ID',!byId.has(event.event_id));
  byId.set(event.event_id,{event,proof});
  records.push({event,proof});
 }
 records.sort((a,b)=>iso(a.event.at_utc)-iso(b.event.at_utc)
   ||a.event.event_id.localeCompare(b.event.event_id));
 const problems=[];
 for(const {event} of records){
  for(const id of event.linked_event_ids){
   const parent=byId.get(id)?.event;
   if(!parent){problems.push({event_id:event.event_id,
    code:'MISSING_CAUSAL_EVENT',linked_event_id:id});continue;}
   if(iso(parent.at_utc)>iso(event.at_utc))
    problems.push({event_id:event.event_id,
     code:'FUTURE_CAUSAL_DEPENDENCY',linked_event_id:id});
   if(parent?.market&&event?.market&&
    (parent.market.chain!==event.market.chain
      ||parent.market.contract!==event.market.contract
      ||parent.market.pool!==event.market.pool))
    problems.push({event_id:event.event_id,
      code:'DIFFERENT_POOL_DEPENDENCY',linked_event_id:id});
  }
 }
 const perRole=R29_TRACE_ROLES.map(role=>{
  const own=records.filter(x=>x.event.role===role);
  return {role,recorded_events:own.length,
   claimed_gpt_reviews:own.filter(x=>x.event.activity==='REVIEW'
    &&x.event.execution_origin==='GPT_SELF_REPORTED').length,
   verified_gpt_reviews:0,recorded_data_gaps:own.filter(x=>
    x.event.missing_evidence.length>0).length,
   recorded_decisions:own.filter(x=>x.event.activity==='DECISION').length,
   complete_independent_provenance:false,
   source:'RESEARCH_OR_MODEL_CLAIMS_NOT_AUTHENTICATED_DOT_RUNS'};
 });
 const hourly=[];
 for(let i=0;i<warmupHours+24;i++){
  const t=start-warmupHours*3600000+i*3600000;
  const rows=records.filter(x=>{
   const v=iso(x.event.at_utc);return v>=t&&v<t+3600000;
  });
  hourly.push({hour_start_utc:new Date(t).toISOString(),
   phase:t<start?'WARMUP':'BLIND',event_count:rows.length,
   role_event_counts:Object.fromEntries(R29_TRACE_ROLES.map(role=>[
    role,rows.filter(x=>x.event.role===role).length])),
   role_without_any_trace:R29_TRACE_ROLES.filter(role=>
    !rows.some(x=>x.event.role===role)),
   // Missing a trace is an evidence gap, not proof the role should review hourly.
   hourly_review_required_not_assumed:true,
   recorded_actions:rows.map(x=>({event_id:x.event.event_id,
    role:x.event.role,action:x.event.action,scope:x.event.scope}))});
 }
 const pools=new Map();
 for(const {event,proof} of records){
  if(!proof.market_key)continue;
  const prior=pools.get(proof.market_key)||{
   market_key:proof.market_key,chain:event.market.chain,
   contract:event.market.contract,pool:event.market.pool,
   events:[],review_gaps:[]};
  prior.events.push({at_utc:event.at_utc,role:event.role,
   event_id:event.event_id,activity:event.activity,
   action:event.action,what:event.what_was_done,
   why:event.why_this_action,
   alternatives_considered:event.alternatives_considered,
   source_paths:event.input_refs.map(s=>s.path),
   data_gaps:event.missing_evidence,
   linked_event_ids:event.linked_event_ids,
   verified_gpt_execution:false,verified_paper_fill:false});
  pools.set(proof.market_key,prior);
 }
 const perPool=[...pools.values()].sort((a,b)=>a.market_key.localeCompare(b.market_key));
 const blind=records.filter(x=>x.proof.phase==='BLIND');
 const warmup=records.filter(x=>x.proof.phase==='WARMUP');
 return {schema:1,kind:'R29_V19_FIVE_DOT_FORENSIC_DIAGNOSTIC',
  run_id:runId,begin_utc:new Date(start-warmupHours*3600000).toISOString(),
  start_utc:startUtc,end_utc:endUtc,warmup_hours:warmupHours,
  genuine_gpt_reviews_independently_verified:0,
  claimed_gpt_reviews:perRole.reduce((n,r)=>n+r.claimed_gpt_reviews,0),
  paper_orders_independently_verified:0,client_fills_independently_verified:0,
  recorded_event_count:records.length,warmup_event_count:warmup.length,
  blind_event_count:blind.length,tracked_exact_pools:perPool.length,
  trace_coverage_only_not_market_coverage:true,
  oracle_reference_access_during_blind:false,
  24_hour_oracle_comparison_allowed_only_after_end:true,
  per_role:perRole,hourly,per_pool:perPool,
  causal_problems:problems,
  missing_roles:perRole.filter(r=>r.recorded_events===0).map(r=>r.role),
  can_certify_five_dots_fully_correct:false,
  ready_for_historical_backtest:false,
  note:'These are documented assertions, not independently authenticated GPT runs, provider evidence, trading fills or historical success. No trading/API/backtest is executed.'};
}
