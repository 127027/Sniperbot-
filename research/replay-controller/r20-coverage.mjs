// Read-only R20 historical replay data coverage audit.
// "No event in the provided dataset" is NOT proof that the historical day was empty.
import {validateDataset,ROLES,blindReadiness} from './engine.mjs';
const time=x=>Date.parse(x);
export function auditReplayCoverage(dataset){
 validateDataset(dataset);
 const rows=dataset.ticks.map((at,i)=>{
  const previous=i?time(dataset.ticks[i-1]):-Infinity;
  const observed=dataset.events.filter(e=>time(e.available_at)>previous&&time(e.available_at)<=time(at)&&e.evidence.verified===true);
  const kinds={POOL:0,SOCIAL:0,MARKET:0,SECURITY:0};
  for(const e of observed)kinds[e.kind]++;
  const confirmedCoverage=dataset.coverage?.days?.[at] || null;
  const independentComplete=confirmedCoverage?.independently_verified===true&&
    typeof confirmedCoverage.source_manifest_hash==='string'&&
    confirmedCoverage.source_manifest_hash.length===64;
  return {
   index:i,at,observed_events:observed.length,by_kind:kinds,
   evidence_complete:independentComplete,
   idle_skip_permitted:false,
   missing_data_is_not_a_negative_market_signal:true,
   source_coverage_status:independentComplete?'ATTESTED_METADATA_ONLY':'UNVERIFIED'
  };
 });
 const counts=rows.reduce((s,row)=>(Object.keys(row.by_kind).forEach(k=>s[k]+=row.by_kind[k]),s),{POOL:0,SOCIAL:0,MARKET:0,SECURITY:0});
 const warning=[];
 if(counts.SOCIAL===0)warning.push('NO_VERIFIED_HISTORICAL_SOCIAL_EVENTS');
 if(counts.MARKET===0)warning.push('NO_EXECUTABLE_HISTORICAL_MARKET_EVENTS');
 if(counts.SECURITY===0)warning.push('NO_HISTORICAL_SECURITY_EVENTS');
 if(dataset.universe?.selection!=='ASOF_COHORT'||dataset.universe?.complete!==true)
  warning.push('NOT_A_NEUTRAL_COMPLETE_HISTORICAL_COHORT');
 if(ROLES.some(r=>dataset.contexts?.[r]?.fresh!==true))
  warning.push('ROLE_CONTEXTS_NOT_INDEPENDENTLY_FRESH');
 return {
  schema:'r20_coverage_audit.v1',
  data_class:dataset.data_class,
  ticks:rows.length,counts,
  no_input_events:rows.filter(r=>r.observed_events===0).length,
  with_input_events:rows.filter(r=>r.observed_events>0).length,
  independently_attested_days:rows.filter(r=>r.evidence_complete).length,
  fast_idle_skip_enabled:false,
  blind_readiness:blindReadiness(dataset),
  warnings:warning,
  rows,
  interpretation:'Missing historical events cannot be silently classified as verified zero-activity days.'
 };
}
