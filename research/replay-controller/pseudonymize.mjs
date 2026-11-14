// Pseudonymize an entire cohort BEFORE any model receives a frame.
// This only mitigates learned identity recognition; it is not blind-test attestation.
// Keep the returned privateMapping outside every role-accessible directory.
import {validateDataset} from './engine.mjs';
const escapeRegex=s=>[...s].map(c=>'\\.^$*+?()[]{}|'.includes(c)?'\\'+c:c).join('');
export function pseudonymizeCohort(dataset,aliasManifest){
 validateDataset(dataset);
 if(!dataset.window||dataset.universe?.selection!=='ASOF_COHORT')
  throw Error('PSEUDONYMIZE_ONLY_NEUTRAL_HISTORICAL_COHORT');
 if(aliasManifest?.schema!=='source_alias_manifest.v1'||!Array.isArray(aliasManifest.candidates))
  throw Error('INVALID_ALIAS_MANIFEST');
 const ids=[...new Set(dataset.events.map(x=>x.candidate_id))].sort();
 const lookup=new Map(),privateCandidates=[];
 for(const [i,id]of ids.entries()){
  const item=aliasManifest.candidates.find(c=>c.candidate_id===id);
  if(!item||!Array.isArray(item.aliases)||item.aliases.length===0)
   throw Error('MISSING_CANDIDATE_ALIASES:'+id);
  if(item.aliases.some(a=>typeof a!=='string'||a.length<2))
   throw Error('INVALID_ALIAS_ENTRY:'+id);
  const masked_id='candidate_'+String(i+1).padStart(5,'0');
  lookup.set(id,{masked_id,aliases:[...new Set([id,...item.aliases])].sort((a,b)=>b.length-a.length)});
  privateCandidates.push({candidate_id:id,masked_id,aliases:item.aliases});
 }
 const masked=structuredClone(dataset);
 for(const e of masked.events){
  const entry=lookup.get(e.candidate_id);
  e.candidate_id=entry.masked_id;
  if(e.kind==='POOL'){
   e.token='token_'+entry.masked_id;
   e.pool='pool_'+entry.masked_id;
  }
  if(e.kind==='SOCIAL'&&typeof e.body==='string'){
   let body=e.body;
   for(const alias of entry.aliases)
    body=body.replace(new RegExp(escapeRegex(alias),'gi'),'['+entry.masked_id+']');
   e.body=body;
  }
 }
 masked.blinding={
  identities_pseudonymized:true,
  pretraining_leakage_reviewed:false,
  independent_attestation:null
 };
 validateDataset(masked);
 return {
  dataset:masked,
  privateMapping:{schema:'private_candidate_keyring.v1',candidates:privateCandidates},
  audit:{masked_candidates:ids.length,pretraining_leakage_reviewed:false,
   blind_certified:false,
   warning:'An external reviewer must check unlisted aliases, memes and recognizable narratives before any true blind claim.'}
 };
}
