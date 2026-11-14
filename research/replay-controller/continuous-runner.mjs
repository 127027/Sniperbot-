// R20 continuous historical replay. Independent four-role fanout, then QA,
// then an immutable five-role barrier, then ONLY the next chronological frame.
// Offline runner; never invokes the live bot, wallets or the paper account.
// A model provider must be independently provisioned: these files do NOT create
// real GPT/Dot workers and their votes are not independently authenticated.
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {ROLES,digest,validateDataset,validateDecisions} from './engine.mjs';
import {createSession,publishCurrentFrame,advanceCurrentFrame} from './temporal-session.mjs';
import {load,runPath,summary} from './controller.mjs';
import {ephemeralRoleTask} from './role-task.mjs';

const firstRoles=ROLES.filter(role=>role!=='qa');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const pad=i=>String(i).padStart(5,'0');
const framePath=(publicRoot,i)=>path.join(publicRoot,'frames',pad(i));
const safeMsg=e=>String(e?.message||e).slice(0,250);
const writeOnce=(file,v)=>{
 fs.mkdirSync(path.dirname(file),{recursive:true});
 if(fs.existsSync(file)){
  const old=json(file);
  if(digest(old)!==digest(v))throw Error('ROLE_VOTE_IMMUTABILITY_VIOLATION');
  return;
 }
 fs.writeFileSync(file,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
};
const now=()=>new Date().toISOString();
function withDeadline(invoke,timeoutMs){
 const abort=new AbortController();
 let timeout;
 return Promise.race([
  Promise.resolve().then(()=>invoke(abort.signal)),
  new Promise((_,reject)=>{
   timeout=setTimeout(()=>{
    abort.abort();
    reject(Error('ROLE_ADAPTER_TIMEOUT_'+timeoutMs+'MS'));
   },timeoutMs);
  })
 ]).finally(()=>clearTimeout(timeout));
}
function asVote(x,role,frame){
 if(!x||typeof x!=='object')throw Error('ROLE_RESPONSE_NOT_OBJECT:'+role);
 if(x.role!==role||x.index!==frame.index||x.at!==frame.at||
    x.input_hash!==frame.input_hash)throw Error('ROLE_RESPONSE_STALE_OR_WRONG:'+role);
 if(!Array.isArray(x.reviews)||!Array.isArray(x.orders)||
    typeof x.run_id!=='string'||!x.run_id)throw Error('ROLE_RESPONSE_SCHEMA:'+role);
 return structuredClone(x);
}
function publicRoleFile(publicRoot,frame,role){
 return path.join(framePath(publicRoot,frame.index),'decisions',role+'.json');
}
function verifyExisting(publicRoot,frame,role){
 const filename=publicRoleFile(publicRoot,frame,role);
 return fs.existsSync(filename)?asVote(json(filename),role,frame):null;
}
async function roleDecision({role,frame,peerVotes,invokeRole,publicRoot,timeoutMs,label}){
 const existing=verifyExisting(publicRoot,frame,role);
 if(existing)return {vote:existing,cached:true,elapsed_ms:0};
 const roleTask=ephemeralRoleTask(role,frame);
 // Task contains the single frame ONLY. QA additionally gets four same-frame
 // peer votes, not the entire private dataset or any future price labels.
 const started=performance.now();
 const answer=await withDeadline(
  signal=>invokeRole(role,roleTask,{
   current_peer_votes:role==='qa'?structuredClone(peerVotes):[],
   source:'OFFLINE_PUBLIC_FRAME_ONLY',
   provider_label:label,
   signal
  }),timeoutMs);
 const vote=asVote(answer,role,frame);
 // Validate before storing even a partial phase result. A lone role cannot
 // submit orders; reviews must cite an event visible at this point in time.
 const placeholders=ROLES.filter(r=>r!==role).map(r=>({
  role:r,run_id:'internal-validation-only-'+r+'-'+frame.index,
  index:frame.index,at:frame.at,input_hash:frame.input_hash,
  reviews:[],orders:[]
 }));
 validateDecisions(frame,[vote,...placeholders]);
 writeOnce(publicRoleFile(publicRoot,frame,role),vote);
 return {vote,cached:false,elapsed_ms:Math.round(performance.now()-started)};
}
export async function runContinuousReplay(opts){
 const {
  sessionName,dataset,publicRoot,invokeRole,
  mode='DIAGNOSTIC',providerLabel='EXTERNAL_UNATTESTED',
  maxFrames=10000,roleTimeoutMs=30000,onFrame,
  failFast=false,allowKnownWinnerDiagnostic=false
 }=opts||{};
 if(!sessionName||!publicRoot||typeof invokeRole!=='function')throw Error('RUNNER_CONFIG_MISSING');
 if(!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>10000)throw Error('INVALID_FRAME_LIMIT');
 if(!Number.isInteger(roleTimeoutMs)||roleTimeoutMs<1||roleTimeoutMs>600000)throw Error('INVALID_ROLE_TIMEOUT');
 if(mode!=='DIAGNOSTIC'&&mode!=='BLIND')throw Error('INVALID_RUNNER_MODE');
 if(providerLabel==='SYNTHETIC_FIXTURE'&&dataset?.data_class!=='SYNTHETIC')
  throw Error('FIXTURE_ROLE_PROVIDER_FORBIDDEN_ON_HISTORICAL_DATA');
 validateDataset(dataset);
 const root=runPath(sessionName);
 if(!fs.existsSync(path.join(root,'meta.json')))createSession(sessionName,dataset,mode,{allowKnownWinnerDiagnostic});
 else{
  const old=load(sessionName);
  if(old.meta.mode!==mode||digest(old.dataset)!==digest(dataset))
   throw Error('EXISTING_SESSION_MISMATCH');
 }
 const start=performance.now(),journal=[];
 let exit='FRAME_LIMIT_REACHED',blocker=null;
 for(let n=0;n<maxFrames;n++){
  let s=load(sessionName);
  if(s.index===s.dataset.ticks.length){exit='COMPLETE';break;}
  const current=publishCurrentFrame(sessionName,publicRoot);
  const f=json(current.input_path);
  const record={frame:f.index,at:f.at,event_count:f.events.length,
   roles:{},actions:0,completed:false};
  try{
   // Four independent observational roles are invoked concurrently;
   // each receives the identical, time-gated view.
   const phase=await Promise.allSettled(firstRoles.map(role=>
    roleDecision({role,frame:f,peerVotes:[],invokeRole,publicRoot,
     timeoutMs:roleTimeoutMs,label:providerLabel})
   ));
   const errors=[];
   for(let i=0;i<firstRoles.length;i++){
    const role=firstRoles[i],item=phase[i];
    if(item.status==='fulfilled')record.roles[role]={
     ms:item.value.elapsed_ms,cached:item.value.cached,
     reviews:item.value.vote.reviews.length
    };
    else errors.push({role,code:safeMsg(item.reason)});
   }
   if(errors.length)throw Error('PEER_ROLE_FAILURE:'+JSON.stringify(errors));
   const peers=firstRoles.map(role=>verifyExisting(publicRoot,f,role));
   const q=await roleDecision({role:'qa',frame:f,peerVotes:peers,invokeRole,
    publicRoot,timeoutMs:roleTimeoutMs,label:providerLabel});
   record.roles.qa={ms:q.elapsed_ms,cached:q.cached,reviews:q.vote.reviews.length};
   const votes=[...peers,q.vote];
   validateDecisions(f,votes);
   record.actions=q.vote.orders.length;
   const next=advanceCurrentFrame(sessionName,publicRoot);
   if(next.status!=='DECISIONS_SEALED')throw Error('ADVANCE_FAILED:'+next.status);
   record.completed=true;
   record.next_frame=next.now_at_index;
   record.trade_count=load(sessionName).portfolio.trades.length;
   journal.push(record);
   if(onFrame)await onFrame(structuredClone(record));
  }catch(e){
   record.error=safeMsg(e);journal.push(record);
   blocker={code:'FRAME_EXECUTION_FAILED',index:f.index,at:f.at,
    error:record.error,required_action:'Inspect missing or invalid role adapter decision; never invent a vote.'};
   exit='BLOCKED';
   if(failFast)throw e;
   break;
  }
 }
 const state=load(sessionName);
 if(exit==='FRAME_LIMIT_REACHED'&&state.index===dataset.ticks.length)exit='COMPLETE';
 return {
  schema:'continuous_replay_r20_report.v1',
  status:exit,mode,provider_label:providerLabel,
  data_class:dataset.data_class,
  completed_frames:state.index,total_frames:state.dataset.ticks.length,
  submitted_frame_records:journal.length,
  role_calls:journal.reduce((sum,r)=>sum+
   Object.values(r.roles).filter(x=>x.cached===false).length,0),
  role_latency_ms:Object.fromEntries(ROLES.map(role=>[
   role,journal.reduce((sum,r)=>sum+(r.roles[role]?.ms||0),0)
  ])),
  duration_ms:Math.round(performance.now()-start),
  simulated_trades:state.portfolio.trades.length,
  real_bot_orders:0,real_paper_account_changes:0,
  blind_success:false,independent_role_authorship_verified:false,
  blocker,
  frames:journal,
  caveat:'Synthetic fixture decisions measure orchestration only. External agents must be isolated and source provenance independently checked before any blind claim.',
  generated_at:now()
 };
}
// Deliberately narrow fixture provider: all five test-only responses explicitly
// identify themselves as synthetic and never claim a real GPT research vote.
export async function syntheticFixtureRoleProvider(role,task){
 const f=task.frame;
 return {
  role,run_id:'SYNTHETIC_FIXTURE_'+role+'_'+f.index,
  index:f.index,at:f.at,input_hash:f.input_hash,
  reviews:[],orders:[]
 };
}
