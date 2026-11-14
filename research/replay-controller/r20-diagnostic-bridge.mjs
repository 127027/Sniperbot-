// R20 GitHub-push-triggered diagnostic bridge.
// Executes no models or trades. Advances the existing KNOWN_WINNER diagnostic
// replay only when ALL FIVE genuine files already exist for the current frame.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {ROLES,digest,validateDecisions} from './engine.mjs';
import {load,nextFrame,advance} from './controller.mjs';

const base=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(base,'../..');
const output=path.join(base,'monitor','r20-progress.json');
const legacyOutput=path.join(base,'monitor','status.json');
const name='watch-20261114-diagnostic';
const read=x=>JSON.parse(fs.readFileSync(x,'utf8'));
const write=(x,v)=>{
 fs.mkdirSync(path.dirname(x),{recursive:true});
 fs.writeFileSync(x,JSON.stringify(v,null,2)+'\n');
};
const once=(x,v)=>{
 fs.mkdirSync(path.dirname(x),{recursive:true});
 if(fs.existsSync(x)){
  if(digest(read(x))!==digest(v))throw Error('EXISTING_DIAGNOSTIC_CONTENT_MISMATCH');
 }else fs.writeFileSync(x,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
};
const pad=i=>String(i).padStart(5,'0');
const bridge=i=>path.join(base,'bridge',i===0?'diagnostic-first-frame':'diagnostic-frames/'+pad(i));
export function fastForwardDiagnostic({maxFrames=62}={}){
 if(!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>62)throw Error('INVALID_FRAME_LIMIT');
 const started=performance.now();
 const state=load(name);
 if(state.meta.mode!=='DIAGNOSTIC'||state.dataset.universe?.selection!=='KNOWN_WINNER')
  throw Error('REFUSE_TO_PROMOTE_KNOWN_WINNER_TO_BLIND');
 const before=state.index,steps=[];
 let missing=[],error=null;
 for(let n=0;n<maxFrames;n++){
  const current=load(name);
  if(current.index===current.dataset.ticks.length)break;
  const info=nextFrame(name);
  const frame=read(info.input_path);
  const publicDir=bridge(current.index);
  // Publish ONLY a current time-locked frame.
  once(path.join(publicDir,'input.json'),frame);
  const votes=[];
  missing=[];
  for(const role of ROLES){
   const f=path.join(publicDir,'decisions',role+'.json');
   if(!fs.existsSync(f)){missing.push(role);continue;}
   const v=read(f);
   votes.push(v);
  }
  if(missing.length)break;
  validateDecisions(frame,votes);
  fs.mkdirSync(info.decision_directory,{recursive:true});
  for(const v of votes)once(path.join(info.decision_directory,v.role+'.json'),v);
  const next=advance(name);
  if(next.status!=='WAITING_FOR_FIVE_ROLES'&&next.status!=='COMPLETE')
   throw Error('UNEXPECTED_CONTROLLER_ADVANCE_RESULT:'+next.status);
  steps.push({completed_frame:current.index,at:frame.at,authored_role_votes:5,
   hypothetical_orders:votes.find(v=>v.role==='qa').orders.length});
 }
 const s=load(name);
 const report={
  schema:'r20_diagnostic_bridge_status.v1',
  status:s.index===s.dataset.ticks.length?'DIAGNOSTIC_COMPLETED_NOT_BLIND':
   steps.length?'ADVANCED':'WAITING_FOR_GENUINE_ROLE_FILES',
  mode:'DIAGNOSTIC_ONLY',
  known_winner:true,blind_success:false,verified_historical_research:false,
  previous_frame:before,completed_frames:s.index,total_frames:s.dataset.ticks.length,
  missing_roles:missing,steps,
  duration_ms:Math.round(performance.now()-started),
  simulated_trades:s.portfolio.trades.length,
  real_bot_orders:0,real_paper_account_changes:0,
  checked_at:new Date().toISOString(),
  caveat:'Empty frames and valid files do not prove independent Dot inference. The real neutral blindtest has not started.'
 };
 write(output,report);
 // Compatibility view for legacy Dot prompts: update it from the SAME
 // sealed controller state, never independently decrement the frame index.
 // This prevents a stale 2/62 watch file blocking a 3/62 published input.
 if(fs.existsSync(legacyOutput)){
  const legacy=read(legacyOutput);
  if(legacy.schema==='pepe_replay_watch.v1'){
   legacy.checked_at=report.checked_at;
   legacy.previous_frame=before;
   legacy.frame_index=s.index;
   legacy.total_frames=s.dataset.ticks.length;
   legacy.status=report.status==='DIAGNOSTIC_COMPLETED_NOT_BLIND'?
    'DIAGNOSTIC_COMPLETE':steps.length?'FRAME_ADVANCED':'AWAITING_ROLE_VOTES';
   legacy.trade_count=s.portfolio.trades.length;
   legacy.positions=Object.keys(s.portfolio.positions).length;
   legacy.votes=Object.fromEntries(ROLES.map(r=>[r,missing.includes(r)?'MISSING':'PRESENT']));
   legacy.blockers=missing.length?[{frame:s.index,code:'MISSING_ROLE_VOTES',roles:missing}]:[];
   for(const step of steps){
    legacy.fixes=[...(legacy.fixes||[]),{action:'SEALED_REAL_FIVE_VOTES',frame:step.completed_frame}];
    legacy.change_log=[...(legacy.change_log||[]),
     {action:'SEALED_REAL_FIVE_VOTES',frame:step.completed_frame,at:report.checked_at}];
   }
   if(steps.length)legacy.last_frame_advance_at=report.checked_at;
   legacy.stalled_minutes=legacy.last_frame_advance_at?
    Math.max(0,Math.floor((Date.parse(report.checked_at)-Date.parse(legacy.last_frame_advance_at))/60000)):0;
   write(legacyOutput,legacy);
  }
 }
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(fastForwardDiagnostic(),null,2));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
