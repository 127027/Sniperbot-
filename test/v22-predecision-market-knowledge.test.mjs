import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPredecisionKnowledge} from '../src/v22-predecision-market-knowledge.mjs';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
const date='2026-10-12',start='2026-10-12T00:00:00.000Z';
const base={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40)};
const sol={chain:'base',contract:'0x'+'c'.repeat(40),pool:'0x'+'d'.repeat(40)};
const known=(at,coin=base,opts={})=>({
 kind:'R29_MARKET_KNOWLEDGE_EVENT',
 event_type:'HISTORICAL_CONTEXT',source_class:'SYNTHETIC_TEST',
 provenance:'SYNTHETIC_TEST',event_at_utc:at,archived_at_utc:at,
 available_at_utc:at,...coin,...opts
});
const manifest=(events=[],snapshots=[])=>({
 schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',date,
 selected_from_future_winner_list:false,
 snapshots,activity_observations:[],market_knowledge_events:events
});
const quote=(at,price)=>({
 provenance:'SYNTHETIC_TEST',source_class:'SYNTHETIC_TEST',
 observed_at_utc:at,archived_at_utc:at,available_at_utc:at,
 coin:{...base,symbol:'KNOWLEDGE_TEST'},
 discovery:{observed_at_utc:at},risk:{status:'ELIGIBLE',observed_at_utc:at},
 quotes:['https://dexscreener.com/base/'+base.pool,
 'https://www.geckoterminal.com/base/pools/'+base.pool].map((source_url,i)=>({
  ...base,source_url,provider_id:'p'+i,
  observed_at:at,source_published_at_utc:at,
  price_usdc:price,liquidity_usdc:20000
 }))
});
test('at midnight remembers events many weeks before the five-hour warmup but excludes future',()=>{
 const events=[known('2026-09-01T03:00:00.000Z'),
  known('2026-10-11T23:40:00.000Z'),
  known('2026-10-12T00:30:00.000Z',sol)];
 const m=inspectPredecisionKnowledge({asOfUtc:start,
  warmupStartUtc:'2026-10-11T19:00:00.000Z',
  marketKnowledgeEvents:events});
 assert.equal(m.no_historical_age_cutoff,true);
 assert.equal(m.available_knowledge_markets,1);
 assert.equal(m.available_knowledge_events,2);
 assert.equal(m.events_known_before_five_hour_warmup,1);
 assert.equal(m.markets_with_pre_warmup_knowledge,1);
 assert.equal(m.excluded.future_or_not_yet_available,1);
 assert.equal(m.orders_published,0);
 assert.equal(m.original_source_bytes_independently_authenticated,false);
 const later=inspectPredecisionKnowledge({asOfUtc:'2026-10-12T01:00:00.000Z',
  warmupStartUtc:'2026-10-11T19:00:00.000Z',
  marketKnowledgeEvents:events});
 assert.equal(later.available_knowledge_markets,2);
 assert.equal(later.available_knowledge_events,3);
});
test('late reconstructed and post-event winners NEVER enter predecision market knowledge',()=>{
 const rows=[known('2026-10-11T23:00:00.000Z',base,
   {source_class:'RETRO_ASOF_RECONSTRUCTION',
    archived_at_utc:'2026-11-23T19:00:00.000Z',
    available_at_utc:'2026-11-23T19:00:00.000Z'}),
  known('2026-10-11T23:00:00.000Z',base,
    {source_class:'POST_EVENT_ORACLE',reported_gain_pct:50000}),
  known('2026-10-11T23:00:00.000Z',base,
    {future_price_usd:1000})];
 const result=inspectPredecisionKnowledge({
  asOfUtc:start,marketKnowledgeEvents:rows});
 assert.equal(result.available_knowledge_markets,0);
 assert.equal(result.excluded.retrospective,1);
 assert.equal(result.excluded.oracle_or_future_label,2);
});
test('self-claimed ORIGINAL_CAPTURE without original SHA is never even knowledge',()=>{
 const e=known('2026-09-01T12:00:00.000Z',base,
  {source_class:'ORIGINAL_CAPTURE',provenance:'CONTEMPORANEOUS_RECORD'});
 const a=inspectPredecisionKnowledge({asOfUtc:start,marketKnowledgeEvents:[e]});
 assert.equal(a.available_knowledge_events,0);
 assert.equal(a.excluded.invalid_source_or_time,1);
 const b=inspectPredecisionKnowledge({asOfUtc:start,
   marketKnowledgeEvents:[{...e,source_archive_sha:'a'.repeat(40)}]});
 assert.equal(b.available_knowledge_events,1);
 assert.equal(b.original_source_bytes_independently_authenticated,false);
});
test('real 29-hour replay has explicit historical knowledge at midnight even without tradeable quotes',()=>{
 const events=[known('2026-09-09T08:00:00.000Z'),
   known('2026-10-12T00:30:00.000Z',sol)];
 const r=backtestOnRequest({date,manifest:manifest(events),
  firstScanAtStart:true,forceHourlyDiagnostic:true});
 assert.equal(r.historical_warmup_hours,5);
 assert.equal(r.on_demand_29h_timeline.hourly_ticks,29);
 assert.equal(r.on_demand_29h_timeline.ticks[5].at_utc,start);
 assert.equal(r.on_demand_29h_timeline.ticks[5].predecision_market_knowledge_count,1);
 assert.equal(r.on_demand_29h_timeline.ticks[5].markets_known_before_warmup,1);
 assert.equal(r.role_audit.dot4_strategy.timeline[0].predecision_market_knowledge.available_knowledge_markets,1);
 assert.equal(r.role_audit.dot4_strategy.timeline[1].predecision_market_knowledge.available_knowledge_markets,2);
 assert.equal(r.role_audit.dot2_discovery.first_scan_preexisting_knowledge_markets,1);
 assert.equal(r.model_replay_summary.buys,0);
 assert.equal(r.status,'DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE');
 assert.equal(r.confirmed_paper_fills,0);
 assert.equal(r.historical_gpt_dot_runs,0);
});
test('the first decision may BUY immediately with valid pre-midnight momentum and older knowledge',()=>{
 const events=[known('2026-08-01T13:00:00.000Z'),
   known('2026-10-12T01:05:00.000Z',sol)];
 const snapshots=[quote('2026-10-11T23:31:00.000Z',1),
    quote('2026-10-11T23:59:00.000Z',1.10),
    quote('2026-10-12T01:00:00.000Z',1.30)];
 const r=backtestOnRequest({date,manifest:manifest(events,snapshots),
  firstScanAtStart:true,forceHourlyDiagnostic:true});
 const t0=r.role_audit.dot4_strategy.timeline[0];
 assert.equal(t0.at_utc,start);
 assert.equal(t0.predecision_market_knowledge.available_knowledge_markets,1);
 assert.equal(t0.predecision_market_knowledge.markets_with_pre_warmup_knowledge,1);
 assert.ok(t0.actions.some(x=>x.action==='BUY'));
 assert.equal(t0.eligible_snapshots,1);
 assert.equal(r.confirmed_paper_fills,0);
 assert.equal(r.historical_proven_trades,0);
});
test('old research knowledge alone never becomes an executable quote or BUY',()=>{
 const r=backtestOnRequest({date,manifest:manifest([
  known('2026-05-01T00:00:00.000Z'),
  known('2026-09-01T00:00:00.000Z',sol)
 ]),firstScanAtStart:true});
 assert.equal(r.first_scan_prior_knowledge_summary.known_markets,2);
 assert.equal(r.role_audit.dot4_strategy.timeline[0].eligible_snapshots,0);
 assert.equal(r.model_replay_summary.buys,0);
 assert.equal(r.model_ending_cash_test_usdc,5000);
});

test('Dot1 may jump immediately from 4 to 24 on the first midnight scan with 80+ prior discoveries',()=>{
 const events=Array.from({length:82},(_,i)=>known(
   '2026-10-11T23:59:00.000Z',
   {chain:'base',
    contract:'0x'+(i+1).toString(16).padStart(40,'0'),
    pool:'0x'+(i+101).toString(16).padStart(40,'0')},
   {event_type:'POOL_DISCOVERY'}));
 const r=backtestOnRequest({date,manifest:manifest(events),
   firstScanAtStart:true});
 const t0=r.role_audit.dot4_strategy.timeline[0];
 assert.equal(t0.target_per_24h,24);
 assert.equal(t0.full_review,true);
 assert.equal(t0.asof_discovery_pools_last_60m,82);
 assert.equal(t0.cadence_input_source,'PAST_ONLY_DISCOVERY_EVENTS');
 assert.equal(t0.eligible_snapshots,0);
 assert.equal(t0.actions.length,0);
 assert.equal(r.role_audit.dot4_strategy.timeline[1].target_per_24h,24,
   'No market-wide quiet proof exists to justify downshifting');
 assert.equal(r.confirmed_paper_fills,0);
 assert.equal(r.historical_gpt_dot_runs,0);
});
test('first scan supports intermediate 8 and 12 model-review budgets from new available pool evidence',()=>{
 for(const [count,target] of [[14,8],[40,12]]){
  const events=Array.from({length:count},(_,i)=>known(
   '2026-10-11T23:50:00.000Z',
   {chain:'base',contract:'0x'+(i+1).toString(16).padStart(40,'0'),
    pool:'0x'+(i+101).toString(16).padStart(40,'0')},
   {event_type:'POOL_DISCOVERY'}));
  const r=backtestOnRequest({date,manifest:manifest(events),firstScanAtStart:true});
  assert.equal(r.role_audit.dot4_strategy.timeline[0].target_per_24h,target);
  assert.equal(r.role_audit.dot4_strategy.timeline[0].asof_discovery_pools_last_60m,count);
  assert.equal(r.role_audit.dot2_discovery.first_scan_preexisting_knowledge_events,count);
  assert.equal(r.model_replay_summary.buys,0);
 }
});
test('late indexed discoveries cannot retrospectively accelerate an earlier scan',()=>{
 const arr=Array.from({length:85},(_,i)=>known(
  '2026-10-11T23:45:00.000Z',
  {chain:'base',contract:'0x'+(i+1).toString(16).padStart(40,'0'),
    pool:'0x'+(i+101).toString(16).padStart(40,'0')},
  {event_type:'POOL_DISCOVERY',
   archived_at_utc:'2026-10-12T01:01:00.000Z',
   available_at_utc:'2026-10-12T01:01:00.000Z'}));
 const r=backtestOnRequest({date,manifest:manifest(arr),firstScanAtStart:true});
 assert.equal(r.role_audit.dot4_strategy.timeline[0].target_per_24h,4);
 assert.equal(r.role_audit.dot4_strategy.timeline[1].target_per_24h,4);
 assert.equal(r.role_audit.dot4_strategy.timeline[0].predecision_market_knowledge.available_knowledge_events,0);
});
