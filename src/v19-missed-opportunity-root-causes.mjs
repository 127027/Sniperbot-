// R29 D5-04: auditable root-cause taxonomy; NOT every unbought coin was
// a missed winner. Never infer NO_CASH/NO_FILL/NO_GPT_BUDGET without receipts.
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const REASONS=Object.freeze({
 NOT_FOUND:'Validate neutrally archived Chain/Pool and expand unbiased page coverage',
 TOO_LATE:'Reduce measured chain/page latency; preserve original first-observed timestamp',
 NO_CONTRACT:'Retry exact base-token contract discovery; never buy by symbol',
 NO_QUOTE:'Request independent current quotes and provider timestamps for this exact pool',
 RISK:'Inspect independently authenticated Dot3 risk and sellability evidence',
 NO_GPT_BUDGET:'Rebalance adaptive 4/8/12/24 full-review queue without assuming API calls are GPT',
 NO_CASH:'Respect current confirmed Paper cash and the fixed user entry amount',
 NO_FILL:'Inspect verified order acceptance, price age and client receipt path',
 EARLY_SELL:'Compare precommitted static/partial/trailing exit policies on an unbiased holdout'
});
const accepted=new Set(Object.keys(REASONS));
const allowed=new Set(['DISCOVERY_MISS','LATE_DISCOVERY','CONTRACT_GAP','QUOTE_GAP',
 'RISK_BLOCK','GPT_CAPACITY_BLOCK','CASH_REJECTION','UNFILLED_ORDER','EARLY_EXIT',
 'CLIENT_PAPER_FILL']);
const reasonFrom=Object.freeze({
 DISCOVERY_MISS:'NOT_FOUND',LATE_DISCOVERY:'TOO_LATE',
 CONTRACT_GAP:'NO_CONTRACT',QUOTE_GAP:'NO_QUOTE',RISK_BLOCK:'RISK',
 GPT_CAPACITY_BLOCK:'NO_GPT_BUDGET',CASH_REJECTION:'NO_CASH',
 UNFILLED_ORDER:'NO_FILL',EARLY_EXIT:'EARLY_SELL'
});
export function diagnoseMissedOpportunities({
 population,verifiedEvents=[],asOfUtc
}={}){
 const now=stamp(asOfUtc);
 if(!now||population?.kind!=='R29_V19_NEUTRAL_ALL_OBSERVED_POOL_DENOMINATOR'
 ||!Array.isArray(verifiedEvents)||verifiedEvents.length>10000)
 throw Error('INVALID_CAUSAL_ROOT_CANDIDATES');
 const pools=new Set(population.entries.map(x=>x.legacy_pool_key));
 const events=new Map(),invalid=[];
 for(const [i,e] of verifiedEvents.entries()){
  const t=stamp(e?.available_at_utc);
  if(!pools.has(e?.legacy_pool_key)||!allowed.has(e?.type)
   ||t===null||t>now||e.verified!==true
   ||typeof e.source_path!=='string'||!e.source_path.startsWith('research/')
   ||e.source_class==='POST_EVENT_ORACLE'||e.reported_gain_pct!==undefined
   ||e.future_winner_label!==undefined){
   invalid.push({index:i,reason:'UNVERIFIED_OR_FUTURE_CAUSE_EVENT'});continue;
  }
  if(!events.has(e.legacy_pool_key))events.set(e.legacy_pool_key,[]);
  events.get(e.legacy_pool_key).push(e);
 }
 const rows=[];
 for(const p of population.entries){
  const verified=(events.get(p.legacy_pool_key)||[])
   .sort((a,b)=>a.available_at_utc.localeCompare(b.available_at_utc));
  const filled=verified.some(x=>x.type==='CLIENT_PAPER_FILL');
  const diagnosed=verified.filter(x=>reasonFrom[x.type])
   .map(x=>({reason:reasonFrom[x.type],evidence_path:x.source_path,
    verified_at_utc:x.available_at_utc,classification:'VERIFIED_PROCESS_CAUSE',
    next_action:REASONS[reasonFrom[x.type]]}));
  if(p.identity_status==='NO_VALID_CONTRACT'&&!diagnosed.some(x=>x.reason==='NO_CONTRACT'))
   diagnosed.push({reason:'NO_CONTRACT',classification:'OBSERVED_IDENTITY_GAP',
    evidence_path:null,verified_at_utc:null,next_action:REASONS.NO_CONTRACT});
  if(p.identity_status==='IDENTITY_CONFLICT'&&!diagnosed.some(x=>x.reason==='RISK'))
   diagnosed.push({reason:'RISK',classification:'OBSERVED_IDENTITY_CONFLICT_NOT_VERIFIED_REJECT',
    evidence_path:null,verified_at_utc:null,next_action:REASONS.RISK});
  if(!p.executable_quote_confirmed&&!diagnosed.some(x=>x.reason==='NO_QUOTE'))
   diagnosed.push({reason:'NO_QUOTE',classification:'UNVERIFIED_EXECUTABLE_QUOTE_GAP',
    evidence_path:null,verified_at_utc:null,next_action:REASONS.NO_QUOTE});
  // No winner/loser or opportunity label exists just because a pool has gaps.
  rows.push({legacy_pool_key:p.legacy_pool_key,
   first_archived_source_at_utc:p.first_known_archived_at_utc,
   actual_dot2_first_discovery_at_utc:p.first_actual_dot2_capture_at_utc,
   verified_process_events:verified.length,
   verified_client_paper_fill_seen:filled,
   process_causes:diagnosed,
   top_actionable_gap:diagnosed[0]?.reason??null,
   observed_profitable_opportunity:null,missed_profit_test_usdc:null,
   no_outcome_or_winner_inferred:true});
 }
 const stats={};
 for(const code of Object.keys(REASONS))stats[code]={
  pools_with_any_gap:rows.filter(r=>r.process_causes.some(c=>c.reason===code)).length,
  verified_process_cause_events:rows.reduce((sum,r)=>sum+r.process_causes
   .filter(c=>c.reason===code&&c.classification==='VERIFIED_PROCESS_CAUSE').length,0)};
 return {schema:1,kind:'R29_V19_DOT5_NEUTRAL_MISSED_OPPORTUNITY_TRIAGE',
  as_of_utc:new Date(now).toISOString(),
  neutral_observed_pool_population:rows.length,
  root_cause_taxonomy:Object.keys(REASONS),
  coverage_source:'ACTUAL_ASOF_OBSERVED_POOL_MEMORIES_ONLY',
  per_pool:rows,stats,rejected_unverified_events:invalid,
  observed_missed_winners:null,estimated_missed_pnl_test_usdc:null,
  full_opportunity_counterfactual_verified:false,
  no_future_winner_oracle_used:true,orders_authorized:0};
}
