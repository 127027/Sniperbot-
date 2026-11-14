// Orchestrate a strictly chronological, public-frame-only replay of a neutral corpus.
// No web access, agent inference, paper accounts, signed orders or real trading.
// Evaluator labels and raw private corpus must NEVER be passed as the publicRoot.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileAsOfCorpus} from './asof-feed.mjs';
import {ROLES,validateDecisions,digest} from './engine.mjs';
import {initialize,load,nextFrame,advance,summary} from './controller.mjs';
const read=x=>JSON.parse(fs.readFileSync(x,'utf8'));
const once=(file,value)=>{
 fs.mkdirSync(path.dirname(file),{recursive:true});
 if(fs.existsSync(file)){
  if(digest(read(file))!==digest(value))throw Error('IMMUTABLE_PUBLIC_FRAME_MISMATCH');
  return;
 }
 fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
};
const pad=n=>String(n).padStart(5,'0');
export function prepareCorpus(corpus,{resolution='day'}={}){
 const compiled=compileAsOfCorpus(corpus,{resolution});
 // Separate the only public feed (a single time-gated frame) from the private
 // dataset and source-reference audit. No actual sources will be fetched here.
 return {
  private_dataset:compiled.dataset,private_source_audit:compiled.audit,
  ready_for_blind:compiled.audit.blind_readiness.eligible,
  source_count:compiled.dataset.events.length,
  historical_days:compiled.audit.day_count,
  frames:compiled.dataset.ticks.length
 };
}
export function createSession(name,dataset,mode='DIAGNOSTIC',{allowKnownWinnerDiagnostic=false}={}){
 if(!['DIAGNOSTIC','BLIND'].includes(mode))throw Error('INVALID_TEMPORAL_SESSION_MODE');
 if(!(allowKnownWinnerDiagnostic&&mode==='DIAGNOSTIC'&&dataset.universe?.selection==='KNOWN_WINNER')&&
 (dataset.window===undefined||dataset.universe?.selection!=='ASOF_COHORT'))
  throw Error('NEUTRAL_WINDOW_LOCK_REQUIRED');
 // The existing controller blocks BLIND unless its complete as-of cohort,
 // execution evidence, clean-context metadata and other prerequisites pass.
 return initialize(name,dataset,{},mode);
}
export function publishCurrentFrame(name,publicRoot){
 const s=load(name);
 if(!(s.meta.mode==='DIAGNOSTIC'&&s.dataset.universe?.selection==='KNOWN_WINNER')&&
 (s.dataset.window===undefined||s.dataset.universe?.selection!=='ASOF_COHORT'))
  throw Error('NOT_A_NEUTRAL_TEMPORAL_SESSION');
 if(s.index===s.dataset.ticks.length)return {status:'COMPLETE',index:s.index};
 const fInfo=nextFrame(name);
 const f=read(fInfo.input_path);
 const target=path.join(publicRoot,'frames',pad(s.index),'input.json');
 once(target,f);
 return {status:'FRAME_PUBLISHED',index:s.index,at:f.at,
  input_hash:f.input_hash,input_path:target,required_roles:ROLES};
}
export function temporalStatus(name,publicRoot){
 const s=load(name);
 if(s.index===s.dataset.ticks.length)return {...summary(name),missing_roles:[]};
 const info=nextFrame(name),published=path.join(publicRoot,'frames',pad(s.index),'input.json');
 const present=[],missing=[],invalid=[];
 for(const r of ROLES){
  const p=path.join(publicRoot,'frames',pad(s.index),'decisions',r+'.json');
  if(!fs.existsSync(p)){missing.push(r);continue;}
  try{
   const v=read(p);
   if(v.role!==r||v.input_hash!==info.input_hash||v.index!==s.index||v.at!==info.at)
    throw Error('STALE_ROLE_DECISION');
   present.push(r);
  }catch(e){invalid.push({role:r,error:String(e.message)});}
 }
 return {
  mode:s.meta.mode,committed_frames:s.index,total_frames:s.dataset.ticks.length,
  published:fs.existsSync(published),
  votes_present:present,missing_roles:missing,invalid_decisions:invalid,
  can_advance:fs.existsSync(published)&&missing.length===0&&invalid.length===0,
  trades:s.portfolio.trades.length,
  real_paper_orders:0,blind_success:false
 };
}
export function advanceCurrentFrame(name,publicRoot){
 const s=load(name);
 if(s.index===s.dataset.ticks.length)throw Error('REPLAY_COMPLETE');
 const info=nextFrame(name);
 const published=path.join(publicRoot,'frames',pad(s.index),'input.json');
 if(!fs.existsSync(published))throw Error('FRAME_NOT_PUBLISHED');
 const f=read(info.input_path);
 if(digest(read(published))!==digest(f))throw Error('PUBLISHED_FRAME_TAMPERED');
 const decisions=[],missing=[];
 for(const role of ROLES){
  const file=path.join(publicRoot,'frames',pad(s.index),'decisions',role+'.json');
  if(!fs.existsSync(file)){missing.push(role);continue;}
  const d=read(file);
  if(d.role!==role)throw Error('WRONG_ROLE_DECISION');
  decisions.push(d);
 }
 if(missing.length)return {status:'WAITING_FOR_FIVE_GENUINE_ROLE_VOTES',
  index:s.index,missing_roles:missing};
 validateDecisions(f,decisions);
 const dest=info.decision_directory;
 if(!fs.existsSync(dest)){
  const parent=path.dirname(dest);
  fs.mkdirSync(parent,{recursive:true});
  const staged=fs.mkdtempSync(path.join(parent,'.five-vote-'));
  try{
   for(const v of decisions)fs.writeFileSync(path.join(staged,v.role+'.json'),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
   fs.renameSync(staged,dest);
  }catch(e){fs.rmSync(staged,{recursive:true,force:true});throw e;}
 }else{
  for(const v of decisions){
   const file=path.join(dest,v.role+'.json');
   if(!fs.existsSync(file)||digest(read(file))!==digest(v))throw Error('SEALED_ROLE_DECISION_MISMATCH');
  }
 }
 // The next internal frame is calculated, but is NEVER published here.
 const next=advance(name);
 return {status:'DECISIONS_SEALED',completed_frame:s.index,
  now_at_index:s.index+1,next_published:false,
  next_status:next.status,real_paper_orders:0};
}
function cli(){
 const [cmd,...a]=process.argv.slice(2);
 if(cmd==='prepare'){
  const [sourcePath,outDir,resolution='day']=a;
  if(!sourcePath||!outDir)throw Error('Usage: prepare CORPUS_JSON PRIVATE_OUTPUT_DIR [day|hour]');
  const r=prepareCorpus(read(sourcePath),{resolution});
  fs.mkdirSync(outDir,{recursive:true});
  once(path.join(outDir,'dataset.private.json'),r.private_dataset);
  once(path.join(outDir,'audit.private.json'),r.private_source_audit);
  return {status:'PREPARED_PRIVATE_ONLY',frames:r.frames,source_count:r.source_count,
   historical_days:r.historical_days,ready_for_blind:r.ready_for_blind};
 }
 if(cmd==='init'){
  const [name,datasetPath,mode='DIAGNOSTIC']=a;
  return createSession(name,read(datasetPath),mode);
 }
 if(cmd==='publish')return publishCurrentFrame(a[0],a[1]);
 if(cmd==='advance')return advanceCurrentFrame(a[0],a[1]);
 if(cmd==='status')return temporalStatus(a[0],a[1]);
 throw Error('Usage: prepare|init|publish|advance|status. Evaluator is separate.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(cli(),null,2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
