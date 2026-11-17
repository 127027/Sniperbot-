// R29 immutable posthoc reference: ONLY offline validation and AFTER-decision scoring.
// Do not import into the blind neutral GPT inputs or live candidate discovery.
export const MEMECOIN_REFERENCES_SCHEMA='sniper_r29_posthoc_memecoin_reference.v1';
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
  new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const groups={
 REPORTED_WALLET_TRANSACTIONS:12,
 REPORTED_MARKET_PRICE_MOVE:16,
 REPORTED_DAILY_PRICE_MOVE:12
};
export function validateUserSuppliedMemecoinReferences(dataset){
 if(dataset?.schema!==MEMECOIN_REFERENCES_SCHEMA||
  dataset.label!=='USER_SUPPLIED_UNVERIFIED'||
  dataset.historical_blindtest_prompt_allowed!==false||
  dataset.source_evidence_status!=='NOT_INDEPENDENTLY_VERIFIED'||
  !date(dataset.record_created_on_utc_date)||
  dataset.source_period?.from!=='2026-09-18'||
  dataset.source_period?.through!=='2026-11-17'||
  dataset.historic_blind_holdout?.through!=='2026-11-16'||
  !Array.isArray(dataset.cases)||dataset.cases.length!==40)
  throw Error('R29_REFERENCE_SCHEMA_OR_LEAKAGE_GATE');
 const counts=Object.fromEntries(Object.keys(groups).map(x=>[x,0]));
 const ids=new Set(),labels=new Set();
 for(const c of dataset.cases){
  if(!c||!Object.hasOwn(groups,c.group)||!/^((wallet|market|daily)_[0-9]{2})$/.test(c.case_id||'')||
   ids.has(c.case_id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>120||
   !(c.ticker===null||(typeof c.ticker==='string'&&c.ticker.length<=32))||
   !date(c.buy_reference_utc_date)||!date(c.sell_reference_utc_date)||
   c.buy_reference_utc_date<'2026-09-18'||
   c.sell_reference_utc_date>'2026-11-17'||
   c.buy_reference_utc_date>c.sell_reference_utc_date||
   !Number.isInteger(c.reported_profit_percent)||c.reported_profit_percent<0||
   c.reported_profit_percent>1_000_000||
   c.chain_verified!==false||c.token_address!==null||
   c.pool_address!==null||!Array.isArray(c.transaction_ids)||
   c.transaction_ids.length!==0||
   c.reported_profit_not_verified!==true||
   c.realisable_pnl_not_proven!==true||
   c.historical_decision_input_permitted!==false||
   !Array.isArray(c.source_urls_verified)||c.source_urls_verified.length!==0)
   throw Error('R29_REFERENCE_UNVERIFIED_CASE_REQUIRED');
  ids.add(c.case_id);counts[c.group]++;
  labels.add(c.name.toLocaleLowerCase('en-US'));
 }
 for(const [k,v] of Object.entries(groups))
  if(counts[k]!==v)throw Error('R29_REFERENCE_GROUP_COUNT_WRONG');
 if(dataset.counts?.reported_rows!==40||
  dataset.counts?.wallet_examples!==12||
  dataset.counts?.market_moves!==16||
  dataset.counts?.daily_moves!==12||
  dataset.counts?.unique_onchain_tokens_verified!==0||
  dataset.counts?.possible_aliases_unresolved!==1)
  throw Error('R29_REFERENCE_40_NOT_INDEPENDENT_COINS');
 const a=dataset.cases.find(c=>c.case_id==='wallet_09');
 const b=dataset.cases.find(c=>c.case_id==='market_16');
 if(a?.name!=='Dacity Coin'||b?.name!=='AudaCity'||
  !a.reported_window_note?.includes('possible_alias')||
  !b.reported_window_note?.includes('possible_alias'))
  throw Error('R29_REFERENCE_UNRESOLVED_ALIAS_NOT_RECORDED');
 const n=dataset.cases.filter(c=>c.sell_reference_utc_date>'2026-11-16').length;
 if(!n)throw Error('R29_REFERENCE_NEXT_DAY_OUTCOME_BOUNDARY_MISSING');
 return {schema:MEMECOIN_REFERENCES_SCHEMA,
  rows:40,by_reported_evidence_type:counts,
  unique_onchain_tokens_verified:0,
  unresolved_alias_groups:1,
  reference_items_extending_beyond_holdout:n,
  data_usable_for_historical_gpt_decisions:false,
  data_usable_for_posthoc_training_evaluation_only:true};
}
export function blockPosthocReferencesInDecisionContext(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('R29_CONTEXT_INVALID');
 const serialized=JSON.stringify(input);
 if(serialized.includes(MEMECOIN_REFERENCES_SCHEMA)||
    serialized.includes('USER_SUPPLIED_40_MEMECOIN_WINNERS_20261117')||
    serialized.includes('USER_SUPPLIED_UNVERIFIED')||
    serialized.includes('posthoc_memecoin_reference'))
   throw Error('R29_HISTORICAL_DECISION_REFERENCES_LEAKAGE_DENIED');
 return input;
}
