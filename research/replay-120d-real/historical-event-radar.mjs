// R29 chronological event-based GPT review requests, NOT BUY/SELL signals.
// Read-only research derived only from vetted neutral, as-of market events.
// No external APIs, wallet access, costed fills, model invocations or scheduler.
export const EVENT_RADAR_SCHEMA='r29_neutral_event_review_triggers.v1';
const types=new Map([
 ['TOKEN_CREATE','TOKEN_CREATED'],
 ['POOL_CREATE','POOL_CREATED'],
 ['MIGRATION','POOL_MIGRATION'],
 ['POOL_LIQUIDITY','LIQUIDITY_EVENT'],
 ['CONTRACT_AUTHORITY','AUTHORITY_EVENT']
]);
const burstTypes=new Map([['DEX_BUY','BUY_TRANSACTION_BURST'],
 ['DEX_SELL','SELL_TRANSACTION_BURST']]);
const t=x=>typeof x==='string'&&x.endsWith('Z')?Date.parse(x):NaN;
const identity=e=>[e.chain,e.token_address,e.pool_address||'UNKNOWN_POOL'].join(':');
const trusted=e=>e?.transaction_finality==='confirmed'?'CONFIRMED_EVENT_ONLY':
 'UNVERIFIED_EVENT_FINALITY';
const gap=e=>e.pool_address===null?
 ['POOL_IDENTITY','EXECUTABLE_BUY_AND_SELL_QUOTES','WALLET_CLUSTERING']:
 ['EXECUTABLE_BUY_AND_SELL_QUOTES','WALLET_CLUSTERING','CONTRACT_SECURITY'];
const alert=(kind,events,at,asof)=>({
 kind,chain:events[0].chain,token_address:events[0].token_address,
 pool_address:events[0].pool_address??null,
 source_event_ids:events.map(e=>e.event_id),
 first_event_at_utc:events[0].event_at_utc,
 first_provider_capture_at_utc:events[0].provider_captured_at_utc,
 observed_latency_ms:Math.max(0,t(events[0].provider_captured_at_utc)-t(events[0].event_at_utc)),
 possible_provider_clock_skew:t(events[0].provider_captured_at_utc)<t(events[0].event_at_utc),
 event_finality:events.every(e=>e.transaction_finality==='confirmed')?
  'CONFIRMED_EVENT_ONLY':'UNVERIFIED_EVENT_FINALITY',
 source_sha256s:[...new Set(events.map(e=>e.source_sha256))],
 review_available_at_utc:at,
 age_at_virtual_scan_ms:t(asof)-t(at),
 review_request:'GPT_EVIDENCE_REVIEW_ONLY',
 independent_buyers_verified:false,
 quoted_execution_proven:false,
 outcome_known:false,
 paper_only:true,actionable:false,missing_checks:gap(events[0])
});
export function compileAsOfEventReviewTriggers(events,{
 virtual_asof_utc,maxTriggers=80,burstSize=5
}={}){
 const asof=t(virtual_asof_utc);
 if(!Number.isFinite(asof)||!Array.isArray(events)||events.length>100000||
  !Number.isInteger(maxTriggers)||maxTriggers<1||maxTriggers>200||
  !Number.isInteger(burstSize)||burstSize<3||burstSize>20)
  throw Error('R29_EVENT_RADAR_INVALID_INPUT');
 const seen=new Set(),ordered=[];
 for(const e of events){
  if(!e||typeof e.event_id!=='string'||!e.event_id||
   typeof e.chain!=='string'||!e.chain||
   typeof e.token_address!=='string'||!e.token_address||
   !Number.isFinite(t(e.event_at_utc))||
   !Number.isFinite(t(e.provider_captured_at_utc))||
   typeof e.source_sha256!=='string'||!/^[a-f0-9]{64}$/i.test(e.source_sha256))
   throw Error('R29_EVENT_RADAR_UNTRUSTED_EVENT');
  if(t(e.event_at_utc)>asof||t(e.provider_captured_at_utc)>asof)
   throw Error('R29_EVENT_RADAR_FUTURE_LEAK');
  if(seen.has(e.event_id))continue;
  seen.add(e.event_id);ordered.push(e);
 }
 // Availability, not blockchain timestamp, determines when GPT could know it.
 ordered.sort((a,b)=>t(a.provider_captured_at_utc)-t(b.provider_captured_at_utc)||
  a.event_id.localeCompare(b.event_id));
 const detected=[],windows=new Map(),recentBurst=new Map();
 for(const e of ordered){
  const at=e.provider_captured_at_utc;
  if(types.has(e.event_type))
   detected.push(alert(types.get(e.event_type),[e],at,virtual_asof_utc));
  if(!burstTypes.has(e.event_type)||!e.pool_address)continue;
  const group=identity(e)+':'+e.event_type;
  const cutoff=t(at)-60000;
  // Distinct transaction hashes are not distinct persons or wallets.
  const prior=(windows.get(group)||[]).filter(x=>t(x.provider_captured_at_utc)>=cutoff);
  const tx=e.transaction_signature||e.event_id;
  if(!prior.some(x=>(x.transaction_signature||x.event_id)===tx))
   prior.push(e);
  windows.set(group,prior.slice(-burstSize));
  if(prior.length>=burstSize&&
   (!recentBurst.has(group)||t(at)-recentBurst.get(group)>=60000)){
   detected.push(alert(burstTypes.get(e.event_type),prior.slice(-burstSize),
     at,virtual_asof_utc));
   recentBurst.set(group,t(at));
  }
 }
 // In chronological order, never reverse-sort toward known profitable outcomes.
 const output=detected.slice(0,maxTriggers);
 return {schema:EVENT_RADAR_SCHEMA,paper_only:true,actionable:false,
  virtual_asof_utc,scanned_event_count:ordered.length,
  detected_trigger_count:detected.length,
  triggers:output,omitted_trigger_count:detected.length-output.length,
  max_trigger_count:maxTriggers,
  no_trade_intents_issued:true,no_gpt_calls_claimed:true,
  real_trading_enabled:false,
  caution:'Captured provider observations only; not proof of unique wallets, finality, sellability, a sub-second feed, or executable fills.'};
}
