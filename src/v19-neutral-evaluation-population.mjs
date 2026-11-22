// SYS-12: neutral, source-bounded prospective denominator across ALL archived pools.
// History is not a winner-only sample and unknown outcomes cannot be negatives.
// Pure research: no trade authority, external data, or speculative target labels.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const utc=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const key=(chain,pool)=>chain+':'+(chain==='solana'?pool:pool.toLowerCase());
const hasOracle=x=>x&&typeof x==='object'
 &&(Object.hasOwn(x,'reported_gain_pct')||Object.hasOwn(x,'future_winner_label')
 ||Object.hasOwn(x,'post_event_rank')||x.source_class==='POST_EVENT_ORACLE');
export function makeNeutralEvaluationPopulation({memory,asOfUtc}={}){
 const now=utc(asOfUtc);
 if(!now||memory?.kind!=='R29_PERSISTENT_MARKET_MEMORY'
   ||!memory.pools||typeof memory.pools!=='object')throw Error('INVALID_NEUTRAL_EVALUATION_POPULATION');
 const entries=[];
 let futureReferences=0,malformed=0;
 for(const [legacyKey,p] of Object.entries(memory.pools)){
  const chain=canonicalChain(p?.chain),pool=p?.pool,contract=p?.contract;
  if(!chain||!poolValid(chain,pool,p.pool_kind)||key(chain,pool)!==legacyKey
    ||hasOracle(p)){malformed++;continue;}
  const refs=(p.source_refs||[]).filter(r=>{
    const t=utc(r?.observed_at_utc);
    if(!t||t>now){futureReferences++;return false;}
    return typeof r.source_path==='string'&&r.source_path.startsWith('research/');
  });
  if(!refs.length)continue; // zero as-of evidence means not yet known
  const earliest=[...refs].sort((a,b)=>a.observed_at_utc.localeCompare(b.observed_at_utc))[0];
  const actualDot2=refs.filter(r=>r.source_class==='LIVE_DOT2_CAPTURE');
  const recovered=refs.filter(r=>r.source_class==='ARCHIVED_RAW_RECONSTRUCTION'
    ||r.provider==='GECKOTERMINAL_ARCHIVE_RECOVERY'
    ||r.provider==='GECKOTERMINAL_ARCHIVE_REPLAY');
  const contracts=[...new Set([contract,...(p.contract_conflicts||[])]
   .filter(c=>tokenValid(chain,c))
   .map(c=>chain==='solana'?c:c.toLowerCase()))];
  const identity=contracts.length>1?'IDENTITY_CONFLICT':
   contracts.length===0?'NO_VALID_CONTRACT':'IDENTITY_OBSERVED_ONLY';
  const firstReal=actualDot2.length?
    [...actualDot2].sort((a,b)=>a.observed_at_utc.localeCompare(b.observed_at_utc))[0]:null;
  entries.push({
   legacy_pool_key:legacyKey,
   chain,pool,pool_kind:p.pool_kind||null,
   token_contract_identity_key:contracts.length===1?chain+'|TOKEN|'+contracts[0]:null,
   first_known_archived_at_utc:earliest.observed_at_utc,
   first_actual_dot2_capture_at_utc:firstReal?.first_processed_by_dot2_at_utc||null,
   reconstructed_from_archive:recovered.length>0,
   original_source_ref_count:refs.length,
   source_paths:refs.map(r=>r.source_path),
   observed_contract_count:contracts.length,
   identity_status:identity,
   eligible_for_evaluation_as_observed_pool:true,
   safety_pass_confirmed:false,
   executable_quote_confirmed:false,
   paper_trade_confirmed:false,
   outcome_label:'NOT_EVALUATED',
   confirmed_positive_outcome:null,
   confirmed_negative_outcome:null,
   forecast_decision:null,
   paper_order_receipt:null,
   failure_reason:identity==='NO_VALID_CONTRACT'?'NO_CONTRACT':
      identity==='IDENTITY_CONFLICT'?'CONTRACT_CONFLICT':'EVIDENCE_NOT_EVALUATED',
   historical_win_or_loss_not_imputed:true
  });
 }
 entries.sort((a,b)=>a.legacy_pool_key.localeCompare(b.legacy_pool_key));
 const count=Object.fromEntries(['solana','base','ethereum','bsc','robinhood','cronos']
  .map(c=>[c,entries.filter(x=>x.chain===c).length]));
 const missing=entries.filter(x=>x.identity_status!=='IDENTITY_OBSERVED_ONLY');
 return {
  schema:1,kind:'R29_V19_NEUTRAL_ALL_OBSERVED_POOL_DENOMINATOR',
  as_of_utc:now,source_scope:'PERSISTED_ASOF_POOL_MEMORIES_ONLY_NOT_ALL_MARKET',
  population_size:entries.length,by_chain:count,
  not_eligible_due_to_identity:missing.length,
  evaluable_outcomes_with_independent_labels:0,
  outcomes_not_evaluated:entries.length,
  confirmed_positive_outcomes:0,
  confirmed_negative_outcomes:0,
  false_positive_rate:null,false_negative_rate:null,precision:null,recall:null,
  denominator_status:'OUTCOME_DENOMINATOR_NOT_ESTABLISHED',
  asof_future_refs_excluded:futureReferences,malformed_or_oracle_rows_rejected:malformed,
  winners_list_used_for_discovery:false,postevent_labels_used_for_selection:false,
  discovered_pool_universe_complete:false,
  source_refs_do_not_prove_historical_gpt_detection:true,
  entries,trade_authorized:false,orders_created:0
 };
}
export function evaluateLabeledPopulation({population,labels=[],decisions=[],
 asOfUtc}={}){
 const now=utc(asOfUtc);
 if(population?.kind!=='R29_V19_NEUTRAL_ALL_OBSERVED_POOL_DENOMINATOR'||!now
   ||!Array.isArray(labels)||!Array.isArray(decisions))
  throw Error('INVALID_OUTCOME_EVALUATION');
 const expected=new Set(population.entries.map(x=>x.legacy_pool_key));
 const byLabel=new Map(),byDecision=new Map();
 for(const l of labels){
  if(!expected.has(l?.legacy_pool_key)||hasOracle(l)
    ||!['POSITIVE','NEGATIVE'].includes(l?.label)
    ||!utc(l.label_available_at_utc)||l.label_available_at_utc>now
    ||l.evidence_authenticated!==true
    ||typeof l.evidence_path!=='string'||!l.evidence_path.startsWith('research/')
    ||byLabel.has(l.legacy_pool_key))
   throw Error('UNVERIFIED_OR_DUPLICATE_OUTCOME_LABEL');
  byLabel.set(l.legacy_pool_key,l);
 }
 for(const d of decisions){
  if(!expected.has(d?.legacy_pool_key)
   ||!['POSITIVE_SIGNAL','NO_SIGNAL'].includes(d?.signal)
   ||!utc(d.available_at_utc)||d.available_at_utc>now
   ||typeof d.source_path!=='string'||!d.source_path.startsWith('research/')
   ||d.decision_verified!==true||byDecision.has(d.legacy_pool_key))
   throw Error('UNVERIFIED_OR_DUPLICATE_DECISION');
  byDecision.set(d.legacy_pool_key,d);
 }
 let tp=0,fp=0,tn=0,fn=0;
 const evaluated=[];
 for(const entry of population.entries){
  const label=byLabel.get(entry.legacy_pool_key),d=byDecision.get(entry.legacy_pool_key);
  if(!label||!d){evaluated.push({legacy_pool_key:entry.legacy_pool_key,status:'NOT_EVALUATED'});continue;}
  // No hindsight: a decision must have existed BEFORE the outcome label.
  if(d.available_at_utc>label.label_available_at_utc)
    throw Error('LOOKAHEAD_DECISION_AFTER_OUTCOME_LABEL');
  const positive=label.label==='POSITIVE',signaled=d.signal==='POSITIVE_SIGNAL';
  const outcome=positive?(signaled?'TP':'FN'):(signaled?'FP':'TN');
  ({TP:()=>tp++,FP:()=>fp++,TN:()=>tn++,FN:()=>fn++})[outcome]();
  evaluated.push({legacy_pool_key:entry.legacy_pool_key,status:outcome});
 }
 const counted=tp+fp+tn+fn,total=population.entries.length,all=counted===total&&total>0;
 const ratio=(n,d)=>d?n/d:null;
 return {schema:1,kind:'R29_V19_SOURCE_GATED_OUTCOME_EVALUATION',
  as_of_utc:now,population_size:total,evaluated_count:counted,
  not_evaluated_count:total-counted,confusion:{TP:tp,FP:fp,TN:tn,FN:fn},
  metrics_are_population_complete:all,
  // Do not advertise recall/FPR as market-level facts from a selected subset.
  recall:all?ratio(tp,tp+fn):null,
  false_positive_rate:all?ratio(fp,fp+tn):null,
  precision:all?ratio(tp,tp+fp):null,
  missing_or_incomplete_denominator:!all,
  winner_oracle_in_research_inputs:false,
  labels_never_used_to_backdate_detection:true,
  evaluated,orders_authorized:0};
}
