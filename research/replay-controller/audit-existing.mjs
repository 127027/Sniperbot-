// Inspect only public research files; no bot state and no network.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ROLES,blindReadiness,digest} from './engine.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(here,'../pepe-replay-2023');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function auditExisting(){
 const manifest=read(path.join(source,'daily-manifest.json'));
 const hashes=manifest.map(x=>{
  const p=path.resolve(source,x.path.replaceAll('\\','/'));
  if(!p.startsWith(source+path.sep))throw Error('MANIFEST_PATH_ESCAPE');
  return {path:x.path,exists:fs.existsSync(p),matches:fs.existsSync(p)&&sha(fs.readFileSync(p))===x.sha256};
 });
 const ledger=read(path.join(source,'daily-ledger.json'));
 const events=[],ticks=[],states=[];
 for(const row of ledger){
  const rawPath=path.join(source,'daily-raw',row.date+'.json'),r=read(rawPath),s=r.sources;
  const at=row.date+'T23:59:59Z',h=s.header?.result;
  ticks.push(at);
  if(!h||parseInt(h.timestamp,16)*1000>Date.parse(at))throw Error('HISTORICAL_HEADER_CUTOFF');
  states.push({date:row.date,block:parseInt(h.number,16),code_present:s.code?.result!=='0x',reserves_present:typeof s.reserves?.result==='string',owner_present:typeof s.owner?.result==='string',limited_present:typeof s.limited?.result==='string',active_errors:r.errors});
  if(s.code?.result!=='0x'&&s.reserves?.result){
   const timestamp=new Date(parseInt(h.timestamp,16)*1000).toISOString();
   events.push({id:'ledger-pool-'+row.date,kind:'POOL',candidate_id:'ethereum:0x6982508145454ce325ddbe47a25d4ec3d2311933:0xa43fe16908251ee70ef74718545e4fe6c5ccec9f',event_at:timestamp,available_at:timestamp,
    chain:'ethereum',token:'0x6982508145454ce325ddbe47a25d4ec3d2311933',pool:'0xa43fe16908251ee70ef74718545e4fe6c5ccec9f',evidence:{type:'LEDGER',verified:true,ref:'research/pepe-replay-2023/daily-raw/'+row.date+'.json',sha256:sha(fs.readFileSync(rawPath)),limit:'Provider archive reconstruction, not proof of historical observation by a Dot'}});
  }
 }
 const roleStatus=ROLES.map(role=>{
  const root=path.resolve(here,'../dot-workflow/roles',role),c=read(path.join(root,'current.json'));
  const p=path.join(root,'runs',c.run_id+'.json');
  return {role,run_id:c.run_id,status:c.status,own_run_exists:fs.existsSync(p),run_matches_current:fs.existsSync(p)&&digest(read(p))===digest(c),peer_receipts:c.peer_receipts};
 });
 const dataset={schema:'isolated_replay.v1',data_class:'HISTORICAL',universe:{selection:'KNOWN_WINNER',complete:false,provenance:'Targeted historical case selected from winner workbook'},contexts:Object.fromEntries(ROLES.map(r=>[r,{fresh:false,target_exposed:true,attestation:null}])),ticks,events};
 const result={schema:'existing_corpus_audit.v1',manifest_entries:hashes.length,hash_mismatches:hashes.filter(x=>!x.matches),calendar_days:ticks.length,dates_unique:new Set(ticks).size,states,roleStatus,readiness:blindReadiness(dataset),executable_market_events:0,
  missing:['Unselected historical cohort including failed launches','Clean contexts and enforced role input isolation','Historically authenticated social observations/time series','Trade-sized historical execution/exit data, gas and token-specific transfer restrictions','All five actual timestamp-bound decisions'],
  excluded_evaluation_inputs:['dot-reports.json','Ergebnisbericht.md','daily-ledger.json decision column','verified-swaps.json','known winner identities and workbook ATH labels'],
  note:'The daily-ledger is audited as an existing artifact; its fixed NO_BUY decision is not imported as an agent decision. Events expose pool existence only; unknown execution costs are not filled with zero.'};
 return {result,dataset};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {result,dataset}=auditExisting(),out=path.join(here,'reports');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'existing-corpus-audit.json'),JSON.stringify(result,null,2)+'\n');
 fs.writeFileSync(path.join(out,'diagnostic-dataset.json'),JSON.stringify(dataset,null,2)+'\n');
 console.log(JSON.stringify({manifest_entries:result.manifest_entries,hash_mismatches:result.hash_mismatches.length,calendar_days:result.calendar_days,executable_market_events:0,readiness:result.readiness,roles:result.roleStatus.map(r=>({role:r.role,own_run_exists:r.own_run_exists}))},null,2));
}
