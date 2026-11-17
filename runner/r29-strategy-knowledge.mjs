// R29 permanent validated strategy knowledge; NOT model training or posthoc blind labels.
// Historical blind frames may read only general lessons validated before the
// virtual trading instant. Tokens, hindsight exemplars and case IDs never enter.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const R29_KNOWLEDGE_SCHEMA='r29_validated_strategy_knowledge.v1';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const R29_KNOWLEDGE_FILE=path.join(ROOT,'research','r29','strategy','validated-knowledge.json');
const ISO=x=>typeof x==='string'&&x.endsWith('Z')&&Number.isFinite(Date.parse(x))&&
 new Date(x).toISOString()===x;
const ID=/^r29_rule_[a-z0-9_-]{8,64}$/;
const SH=/^[a-f0-9]{64}$/;
const TYPES=new Set(['ONCHAIN_FLOW','LIQUIDITY','EARLY_MOMENTUM','ORGANIC_SOCIAL',
 'NARRATIVE','RUG_SECURITY','EXIT_TIMING','NEGATIVE_EVIDENCE']);
const outcomeHint=/0x[a-f0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|https?:\/\/|(?:\b(?:PIERRE|MAMESUKE|DOGE|FTR|DACITY|MAX)\b)/i;
export function loadValidatedR29Knowledge({filename=R29_KNOWLEDGE_FILE,
 asof=new Date().toISOString(),mode='LIVE_PAPER',maxRules=12}={}){
 if(!ISO(asof)||!['LIVE_PAPER','HISTORICAL_ASOF'].includes(mode)||
  !Number.isInteger(maxRules)||maxRules<0||maxRules>20)
  throw Error('R29_KNOWLEDGE_ASOF_ARGUMENTS_INVALID');
 const raw=readFileSync(filename);
 if(raw.length>100000)throw Error('R29_KNOWLEDGE_FILE_OVER_LIMIT');
 const data=JSON.parse(raw.toString('utf8'));
 if(data?.schema!==R29_KNOWLEDGE_SCHEMA||!Array.isArray(data.entries)||
  data.entries.length>500||!ISO(data.created_at_utc))
  throw Error('R29_KNOWLEDGE_SCHEMA_INVALID');
 const selected=[];
 const now=Date.parse(asof);
 const seen=new Set();
 for(const e of data.entries){
  if(!e||typeof e!=='object'||Array.isArray(e)||!ID.test(e.id||'')||
   seen.has(e.id)||!TYPES.has(e.type)||![
    'HYPOTHESIS','DEVELOPMENT_OBSERVATION','INDEPENDENTLY_VALIDATED',
    'REJECTED','INSUFFICIENT_EVIDENCE'].includes(e.status)||
   !ISO(e.last_training_event_utc)||!ISO(e.validated_at_utc)||
   typeof e.general_rule!=='string'||e.general_rule.length<20||
   e.general_rule.length>400||outcomeHint.test(e.general_rule)||
   !Array.isArray(e.independent_holdout_ids)||e.independent_holdout_ids.length>10||
   e.independent_holdout_ids.some(x=>typeof x!=='string'||!/^h[a-z0-9_-]{5,50}$/.test(x))||
   !Array.isArray(e.evidence_sha256)||e.evidence_sha256.length>20||
   e.evidence_sha256.some(x=>!SH.test(x)))
   throw Error('R29_KNOWLEDGE_RECORD_NOT_SAFE_FOR_MODEL');
  seen.add(e.id);
  // Existing historically published winner names/evidence may live only in
  // operator posthoc knowledge, not here. Never call an unvalidated lesson a rule.
  if(e.status!=='INDEPENDENTLY_VALIDATED'||
   new Set(e.independent_holdout_ids).size<2||e.evidence_sha256.length<2||
   Date.parse(e.last_training_event_utc)>now||
   Date.parse(e.validated_at_utc)>now)
   continue;
  selected.push({id:e.id,type:e.type,general_rule:e.general_rule,
   validated_at_utc:e.validated_at_utc,
   distinct_independent_holdouts:new Set(e.independent_holdout_ids).size});
 }
 selected.sort((a,b)=>b.validated_at_utc.localeCompare(a.validated_at_utc)||
  a.id.localeCompare(b.id));
 const included=selected.slice(0,maxRules);
 return {schema:'r29_asof_validated_knowledge_for_model.v1',mode,asof_utc:asof,
  knowledge_file_sha256:createHash('sha256').update(raw).digest('hex'),
  validated_general_rule_count:included.length,
  excluded_unvalidated_or_future_count:data.entries.length-selected.length,
  rules:included,
  note:'Only general independently proven as-of rules; no winner list or historical future data.'};
}
