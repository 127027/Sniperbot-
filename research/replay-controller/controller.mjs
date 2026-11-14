import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROLES,digest,validateDataset,blindReadiness,initialPortfolio,frame,settle,decide,portfolioReport} from './engine.mjs';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'runs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function writeOnce(p,value){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
export function runPath(name){if(!/^[a-zA-Z0-9_-]{1,80}$/.test(name))throw Error('INVALID_RUN_NAME');return path.join(ROOT,name);}
export function initialize(name,dataset,config={},mode='BLIND'){
 validateDataset(dataset);const readiness=blindReadiness(dataset);
 if(!['BLIND','DIAGNOSTIC','SYNTHETIC'].includes(mode))throw Error('INVALID_MODE');
 if(mode==='BLIND'&&!readiness.eligible)throw Error('BLIND_TEST_BLOCKED:'+readiness.reasons.join(','));
 if(mode==='SYNTHETIC'&&dataset.data_class!=='SYNTHETIC')throw Error('REAL_DATA_NOT_SYNTHETIC');
 const root=runPath(name);if(fs.existsSync(root))throw Error('RUN_ALREADY_EXISTS');
 const portfolio=initialPortfolio(config);
 writeOnce(path.join(root,'dataset.private.json'),dataset);
 writeOnce(path.join(root,'meta.json'),{schema:'replay_session.v1',mode,dataset_hash:digest(dataset),config:portfolio.config,readiness});
 return nextFrame(name);
}
export function load(name){
 const root=runPath(name),meta=read(path.join(root,'meta.json')),dataset=read(path.join(root,'dataset.private.json'));
 if(digest(dataset)!==meta.dataset_hash)throw Error('DATASET_CHANGED');
 let portfolio=initialPortfolio(meta.config),index=0,previous_hash=null;
 for(;index<dataset.ticks.length;index++){
  const p=path.join(root,'commits',String(index).padStart(5,'0')+'.json');if(!fs.existsSync(p))break;
  const c=read(p),{hash,...body}=c;
  if(hash!==digest(body)||body.previous_hash!==previous_hash||body.index!==index)throw Error('COMMIT_CHAIN_CORRUPT');
  portfolio=settle(portfolio,dataset,dataset.ticks[index]);
  const f=frame(dataset,index,portfolio);
  if(body.frame_hash!==f.input_hash)throw Error('FRAME_REPLAY_MISMATCH');
  portfolio=decide(portfolio,f,body.decisions);
  if(digest(portfolio)!==body.portfolio_hash)throw Error('PORTFOLIO_REPLAY_MISMATCH');
  previous_hash=hash;
 }
 const commits=path.join(root,'commits');
 if(fs.existsSync(commits)&&fs.readdirSync(commits).filter(n=>n.endsWith('.json')).length!==index)throw Error('NONCONTIGUOUS_COMMITS');
 return {root,meta,dataset,portfolio,index,previous_hash};
}
export function nextFrame(name){
 const s=load(name);
 if(s.index===s.dataset.ticks.length)return summary(name);
 const p=settle(s.portfolio,s.dataset,s.dataset.ticks[s.index]);
 const f=frame(s.dataset,s.index,p),dir=path.join(s.root,'frames',String(s.index).padStart(5,'0'));
 const target=path.join(dir,'input.json');
 if(fs.existsSync(target)){if(digest(read(target))!==digest(f))throw Error('FRAME_TAMPERED');}
 else writeOnce(target,f);
 return {status:'WAITING_FOR_FIVE_ROLES',index:s.index,at:f.at,input_hash:f.input_hash,input_path:target,decision_directory:path.join(dir,'decisions'),required_roles:ROLES};
}
export function advance(name){
 const s=load(name);if(s.index===s.dataset.ticks.length)throw Error('ALREADY_COMPLETE');
 const info=nextFrame(name),folder=info.decision_directory;
 const missing=ROLES.filter(role=>!fs.existsSync(path.join(folder,role+'.json')));
 if(missing.length)return {...info,missing_roles:missing};
 const decisions=ROLES.map(role=>read(path.join(folder,role+'.json')));
 const p=settle(s.portfolio,s.dataset,s.dataset.ticks[s.index]);
 const f=frame(s.dataset,s.index,p),updated=decide(p,f,decisions);
 const body={index:s.index,frame_hash:f.input_hash,previous_hash:s.previous_hash,decisions,portfolio_hash:digest(updated)};
 // Seal decisions BEFORE any next-time input becomes visible. Crash recovery replays the sealed record.
 writeOnce(path.join(s.root,'commits',String(s.index).padStart(5,'0')+'.json'),{...body,hash:digest(body)});
 return nextFrame(name);
}
export function summary(name){
 const s=load(name),complete=s.index===s.dataset.ticks.length;
 return {schema:'isolated_replay_report.v1',mode:s.meta.mode,status:complete?'COMPLETE':'WAITING_FOR_ROLES',committed_frames:s.index,total_frames:s.dataset.ticks.length,readiness:s.meta.readiness,
  ...portfolioReport(s.portfolio,s.dataset,s.dataset.ticks[Math.max(0,s.index-1)]),
  blind_success:false,role_authorship_verified:false,
  limits:['Five-role files are validated but not authenticated GPT executions.','Fresh isolated workers and independent provenance audit are required for a blind claim.','Constant-product model excludes unmodelled transfer taxes, MEV and changed market path.','Open final positions are not force-sold; pending final orders are unfilled.']};
}
export function evaluate(name,labels){
 const s=load(name);if(s.index!==s.dataset.ticks.length)throw Error('EVALUATION_BEFORE_DECISIONS_SEALED');
 if(!Array.isArray(labels.outcomes)||labels.dataset_hash!==s.meta.dataset_hash)throw Error('LABEL_DATASET_MISMATCH');
 const report=summary(name),bought=new Set(report.trades.filter(t=>t.action==='BUY').map(t=>t.candidate_id));
 const outcomes=labels.outcomes.map(x=>({candidate_id:x.candidate_id,outcome:x.outcome,first_detected_at:report.first_seen[x.candidate_id]||null,bought:bought.has(x.candidate_id)}));
 const result={...report,outcomes,missed_winners:outcomes.filter(x=>x.outcome==='WINNER'&&!x.bought).map(x=>x.candidate_id),bought_failures:outcomes.filter(x=>x.outcome==='FAILURE'&&x.bought).map(x=>x.candidate_id),labels_used_only_after_sealing:true};
 writeOnce(path.join(s.root,'evaluation.json'),result);return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [command,name,arg,option]=process.argv.slice(2);let result;
  if(command==='init')result=initialize(name,read(arg),{},option||'BLIND');
  else if(command==='next')result=nextFrame(name);
  else if(command==='advance')result=advance(name);
  else if(command==='status')result=summary(name);
  else if(command==='evaluate')result=evaluate(name,read(arg));
  else throw Error('Usage: init NAME DATASET [BLIND|DIAGNOSTIC|SYNTHETIC], next NAME, advance NAME, status NAME, evaluate NAME LABELS');
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
