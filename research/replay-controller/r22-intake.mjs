import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateDataset,blindReadiness,digest} from './engine.mjs';
import {compileAsOfCorpus} from './asof-feed.mjs';
export function auditDataset(dataset){
 validateDataset(dataset);
 const kinds=['POOL','MARKET','SOCIAL','SECURITY'];
 const candidates=[...new Set(dataset.events.map(e=>e.candidate_id))];
 return {schema:'r22_source_coverage.v1',dataset_hash:digest(dataset),frames:dataset.ticks.length,
  selection:dataset.universe?.selection,counts:Object.fromEntries(kinds.map(k=>[k,dataset.events.filter(e=>e.kind===k).length])),
  candidates:candidates.map(id=>({candidate_id:id,counts:Object.fromEntries(kinds.map(k=>[k,dataset.events.filter(e=>e.kind===k&&e.candidate_id===id).length])),
   missing:kinds.filter(k=>!dataset.events.some(e=>e.kind===k&&e.candidate_id===id&&e.evidence.verified===true))})),
  readiness:blindReadiness(dataset),independent_provenance_verified:false,
  note:'Counts are coverage, not proof of executable trades or unbiased selection. No missing data is synthesized.'};
}
export function intake(corpus){const result=compileAsOfCorpus(corpus);return {...result,coverage:auditDataset(result.dataset)};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command,input,output]=process.argv.slice(2);
 try {
  const data=JSON.parse(fs.readFileSync(input,'utf8'));
  const result=command==='intake'?intake(data):command==='audit'?auditDataset(data):null;
  if(!result||!output)throw Error('Usage: audit|intake INPUT OUTPUT');
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 }catch{console.error('INTAKE_FAILED: inspect schema, timestamps, proofs and output path');process.exitCode=1;}
}
