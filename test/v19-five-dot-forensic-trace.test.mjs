import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFiveDotTraceEntry,buildFiveDotForensicReport,
 R29_TRACE_ROLES} from '../src/v19-five-dot-forensic-trace.mjs';
const start='2026-10-12T00:00:00.000Z',end='2026-10-13T00:00:00.000Z';
const runId='oct12-forensic-protocol';
const coin={chain:'base',contract:'0x'+'a'.repeat(40),
 pool:'0x'+'b'.repeat(40),symbol:'SYN'};
const source={source_class:'SYNTHETIC_TEST',
 path:'research/feeds/2026-10-11/synthetic-pool.json',
 git_blob_sha:'a'.repeat(40),provider:'SYNTHETIC_OFFLINE_FIXTURE',
 event_at_utc:'2026-10-11T23:58:00.000Z',
 captured_at_utc:'2026-10-11T23:59:00.000Z',
 available_at_utc:'2026-10-11T23:59:00.000Z'};
function mk(role,action,number,props={}){
 return {schema:1,kind:'R29_V19_FIVE_DOT_FORENSIC_EVENT',
   event_id:'event-test-'+number,run_id:runId,
   role,phase:'BLIND',at_utc:start,
   activity:'DECISION',scope:'POOL',market:coin,
   action,what_was_done:'Synthetic controlled role audit observation',
   why_this_action:'Documented synthetic evidence and tested control rule',
   alternatives_considered:['WATCH','DATA_GAP'],
   missing_evidence:[],linked_event_ids:[],
   input_refs:[source],execution_origin:'DETERMINISTIC_MODEL',
   ...props};
}
const allRoles=[
 mk('dot-1-tempo','CADENCE_24',1,{scope:'GLOBAL',market:null,
  activity:'REVIEW',execution_origin:'GPT_SELF_REPORTED'}),
 mk('dot-2-discovery','DISCOVERED',2,{linked_event_ids:['event-test-1']}),
 mk('dot-3-risk','DATA_GAP',3,{linked_event_ids:['event-test-2'],
  missing_evidence:['NO_TRUSTED_CHAIN_SELLABILITY']}),
 mk('dot-4-strategy','NO_TRADE_DATA_GAP',4,{linked_event_ids:['event-test-3'],
  missing_evidence:['DOT3_NOT_ELIGIBLE']}),
 mk('dot-5-control','BLOCKED',5,{linked_event_ids:['event-test-4']})
];

test('every Dot records a reason, action, UTC, source and exact pool and creates per-hour/per-pool report',()=>{
 const r=buildFiveDotForensicReport({entries:allRoles,startUtc:start,
  endUtc:end,warmupHours:5,runId});
 assert.equal(r.recorded_event_count,5);
 assert.equal(r.hourly.length,29);
 assert.equal(r.hourly.filter(x=>x.phase==='WARMUP').length,5);
 assert.equal(r.hourly.filter(x=>x.phase==='BLIND').length,24);
 assert.equal(r.hourly[5].hour_start_utc,start);
 assert.equal(r.hourly[5].event_count,5);
 assert.deepEqual(r.per_role.map(x=>x.role),R29_TRACE_ROLES);
 assert.equal(r.missing_roles.length,0);
 assert.equal(r.per_pool.length,1);
 assert.equal(r.per_pool[0].events.length,4);
 assert.equal(r.per_pool[0].events.at(-1).action,'BLOCKED');
 assert.equal(r.per_pool[0].events[0].source_paths[0],source.path);
 assert.equal(r.causal_problems.length,0);
 assert.equal(r.claimed_gpt_reviews,1);
 assert.equal(r.genuine_gpt_reviews_independently_verified,0);
 assert.equal(r.client_fills_independently_verified,0);
 assert.equal(r.can_certify_five_dots_fully_correct,false);
});

test('warmup can observe older history but cannot borrow information from the first test hour',()=>{
 const warm=mk('dot-2-discovery','WATCH',6,{at_utc:'2026-10-11T19:00:00.000Z',
  phase:'WARMUP',input_refs:[],missing_evidence:['EARLIER_ORIGINAL_FEED_MISSING']});
 const valid=inspectFiveDotTraceEntry(warm,{startUtc:start,endUtc:end});
 assert.equal(valid.phase,'WARMUP');
 assert.throws(()=>inspectFiveDotTraceEntry({...warm,phase:'BLIND'},
  {startUtc:start,endUtc:end}),/TRACE_PHASE_MISMATCH/);
 const next=mk('dot-2-discovery','DISCOVERED',7,{
  input_refs:[{...source,event_at_utc:'2026-10-12T01:00:00.000Z'}]});
 assert.throws(()=>inspectFiveDotTraceEntry(next,{startUtc:start,endUtc:end}),
  /TRACE_SOURCE_PROVENANCE_INVALID/);
});

test('retroactively collected data may explain a gap but cannot certify historical BUY or risk eligibility',()=>{
 const after={...source,source_class:'RETRO_ASOF_RECONSTRUCTION',
  captured_at_utc:'2026-11-22T12:00:00.000Z',
  available_at_utc:'2026-11-22T12:00:00.000Z'};
 const research=mk('dot-2-discovery','WATCH',8,{input_refs:[after]});
 assert.equal(inspectFiveDotTraceEntry(research,{startUtc:start,endUtc:end})
  .retrospective_research_only_count,1);
 for(const [role,action] of [['dot-4-strategy','BUY'],['dot-4-strategy','SELL'],
   ['dot-3-risk','ELIGIBLE']]){
  assert.throws(()=>inspectFiveDotTraceEntry(
   mk(role,action,9,{input_refs:[after]}),{startUtc:start,endUtc:end}),
   /TRACE_RETRO_RESEARCH_NOT_EXECUTION_PROOF/);
 }
});

test('future original capture, oracle winner labels and name-only BUY fail closed',()=>{
 const future=mk('dot-2-discovery','DISCOVERED',10,{
  input_refs:[{...source,available_at_utc:'2026-10-12T04:00:00.000Z'}]});
 assert.throws(()=>inspectFiveDotTraceEntry(future,{startUtc:start,endUtc:end}),
  /TRACE_SOURCE_NOT_YET_KNOWABLE/);
 const oracle=mk('dot-4-strategy','WATCH',11,{reported_gain_pct:50327});
 assert.throws(()=>inspectFiveDotTraceEntry(oracle,{startUtc:start,endUtc:end}),
  /TRACE_NO_FUTURE_ORACLE_KEYS/);
 const nameOnly=mk('dot-4-strategy','BUY',12,{scope:'GLOBAL',market:null});
 assert.throws(()=>inspectFiveDotTraceEntry(nameOnly,{startUtc:start,endUtc:end}),
  /TRACE_STRATEGY_POOL_REQUIRED/);
 const noData=mk('dot-3-risk','DATA_GAP',13,{input_refs:[],missing_evidence:[]});
 assert.throws(()=>inspectFiveDotTraceEntry(noData,{startUtc:start,endUtc:end}),
  /TRACE_NO_SOURCE_AND_NO_DATA_GAP_EXPLANATION/);
});

test('unverified GPT and client-fill claims never self-authorize a report',()=>{
 const record=mk('dot-4-strategy','WATCH',14,{execution_origin:'GPT_SELF_REPORTED'});
 const a=inspectFiveDotTraceEntry(record,{startUtc:start,endUtc:end});
 assert.equal(a.gpt_execution_independently_verified,false);
 for(const property of ['verified_gpt_execution','verified_client_fill','trade_authorized']){
  assert.throws(()=>inspectFiveDotTraceEntry({...record,[property]:true},
   {startUtc:start,endUtc:end}),/TRACE_CLAIM_CANNOT_SELF_CERTIFY/);
 }
});

test('missing/future/cross-pool dependencies and silent roles appear as trace gaps, not success',()=>{
 const late=mk('dot-3-risk','WATCH',15,{at_utc:'2026-10-12T02:00:00.000Z'});
 const early=mk('dot-4-strategy','WATCH',16,{at_utc:start,
  linked_event_ids:['event-test-15','event-missing-9999']});
 const cross=mk('dot-2-discovery','DISCOVERED',17,{
  market:{...coin,pool:'0x'+'c'.repeat(40)},
  linked_event_ids:['event-test-16']});
 const r=buildFiveDotForensicReport({entries:[early,late,cross],
  startUtc:start,endUtc:end,runId});
 assert.ok(r.causal_problems.some(x=>x.code==='MISSING_CAUSAL_EVENT'));
 assert.ok(r.causal_problems.some(x=>x.code==='FUTURE_CAUSAL_DEPENDENCY'));
 assert.ok(r.causal_problems.some(x=>x.code==='DIFFERENT_POOL_DEPENDENCY'));
 assert.ok(r.missing_roles.includes('dot-1-tempo'));
 assert.equal(r.trace_coverage_only_not_market_coverage,true);
});

test('diagnostic window is end-exclusive and duplicate event IDs cannot inflate role reviews',()=>{
 const endEvent=mk('dot-1-tempo','CADENCE_4',18,{
  at_utc:end,scope:'GLOBAL',market:null});
 assert.throws(()=>inspectFiveDotTraceEntry(endEvent,{startUtc:start,endUtc:end}),
  /TRACE_INVALID_ID_ROLE_OR_TIME/);
 assert.throws(()=>buildFiveDotForensicReport({entries:[allRoles[0],allRoles[0]],
  startUtc:start,endUtc:end,runId}),/TRACE_DUPLICATE_EVENT_ID/);
});

test('a positive BUY/SELL/ELIGIBLE claim needs at least one on-time source and no unresolved safety gap',()=>{
 for(const [role,action] of [['dot-4-strategy','BUY'],['dot-4-strategy','SELL'],
  ['dot-3-risk','ELIGIBLE']]){
  const noSource=mk(role,action,21,{input_refs:[],
    missing_evidence:['NO_VERIFIED_PRICE']});
  assert.throws(()=>inspectFiveDotTraceEntry(noSource,
    {startUtc:start,endUtc:end}),/TRACE_POSITIVE_ACTION_REQUIRES_COMPLETE_INPUTS/);
  const unresolved=mk(role,action,22,{missing_evidence:['SELLABILITY_NOT_VERIFIED']});
  assert.throws(()=>inspectFiveDotTraceEntry(unresolved,
    {startUtc:start,endUtc:end}),/TRACE_POSITIVE_ACTION_REQUIRES_COMPLETE_INPUTS/);
  const valid=mk(role,action,23);
  assert.equal(inspectFiveDotTraceEntry(valid,{startUtc:start,endUtc:end}).action,action);
 }
 const badRisk=mk('dot-3-risk','ELIGIBLE',24,{scope:'GLOBAL',market:null});
 assert.throws(()=>inspectFiveDotTraceEntry(badRisk,
   {startUtc:start,endUtc:end}),/TRACE_STRATEGY_POOL_REQUIRED/);
});
test('retroactively sourced discovery cannot be described as actually discovered during blind hour',()=>{
 const after={...source,source_class:'RETRO_ASOF_RECONSTRUCTION',
  captured_at_utc:'2026-11-22T12:00:00.000Z',
  available_at_utc:'2026-11-22T12:00:00.000Z'};
 assert.throws(()=>inspectFiveDotTraceEntry(
  mk('dot-2-discovery','DISCOVERED',25,{input_refs:[after]}),
  {startUtc:start,endUtc:end}),/TRACE_RETRO_RESEARCH_NOT_EXECUTION_PROOF/);
 assert.equal(inspectFiveDotTraceEntry(
  mk('dot-2-discovery','WATCH',26,{input_refs:[after]}),
  {startUtc:start,endUtc:end}).retrospective_research_only_count,1);
});
test('source event/capture/availability order must be chronologically possible',()=>{
 const a=mk('dot-2-discovery','WATCH',27,{input_refs:[{
  ...source,captured_at_utc:'2026-11-22T12:00:00.000Z'}]});
 assert.throws(()=>inspectFiveDotTraceEntry(a,{startUtc:start,endUtc:end}),
  /TRACE_SOURCE_PROVENANCE_INVALID/);
 const b=mk('dot-2-discovery','WATCH',28,{input_refs:[{
  ...source,event_at_utc:'2026-11-11T23:59:30.000Z'}]});
 assert.throws(()=>inspectFiveDotTraceEntry(b,{startUtc:start,endUtc:end}),
  /TRACE_SOURCE_PROVENANCE_INVALID/);
});

test('known post-event training and backtest report paths cannot launder oracle into input trace',()=>{
 const paths=['research/backtests/2026-10-12/report.json',
  'research/training/2026-10-12/frozen-v11/oct12-candles-0.json',
  'research/evaluation/2026-10-12/outcome.json',
  'research/backtest-inputs/2026-10-12/trick.json'];
 for(const path of paths){
  const entry=mk('dot-2-discovery','WATCH',30,{
   input_refs:[{...source,path}]});
  assert.throws(()=>inspectFiveDotTraceEntry(entry,
   {startUtc:start,endUtc:end}),/TRACE_SOURCE_PROVENANCE_INVALID/,path);
 }
});
