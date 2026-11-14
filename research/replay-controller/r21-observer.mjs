// R21 read-only 15-minute watchdog for the historical PEPE diagnostic and
// separately staged neutral cohort. No repair guesswork, model votes or trades.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROLES,validateDecisions,settle,frame} from './engine.mjs';
import {load} from './controller.mjs';
const read=x=>JSON.parse(fs.readFileSync(x,'utf8'));
const exists=x=>fs.existsSync(x);
const pad=i=>String(i).padStart(5,'0');
function err(e){return String(e?.message||e).slice(0,300);}
export function observeR21(root,{at=new Date().toISOString()}={}){
 const base=path.join(root,'research','replay-controller');
 const monitor=path.join(base,'monitor');
 const neutralFile=path.join(base,'temporal-public','status.json');
 const neutral=exists(neutralFile)?read(neutralFile):{mode:'UNKNOWN'};
 const recentFile=path.join(monitor,'r20-progress.json');
 const recent=exists(recentFile)?read(recentFile):null;
 const legacyFile=path.join(monitor,'status.json');
 const legacy=exists(legacyFile)?read(legacyFile):null;
 const runPath=path.join(base,'runs','watch-20261114-diagnostic','meta.json');
 const result={
  schema:'r21_progress_observation.v1',
  checked_utc:at,
  mode:'READ_ONLY_MONITOR',
  latest_r20_commit_time:recent?.checked_at||null,
  latest_legacy_commit_time:legacy?.checked_at||null,
  diagnostic:{completed_frames:0,total_frames:62,current_frame:null,
   votes:{},missing_roles:[],invalid_roles:[],actual_simulated_trades:0},
  neutral:{mode:neutral.mode||'UNKNOWN',frames:neutral.public_frame_count||0,
   blockers:neutral.blockers||[]},
  bottlenecks:[],recommendations:[],
  real_bot_orders:0,real_paper_account_changes:0,
  independent_agent_authorship_verified:false
 };
 if(neutral.mode==='NOT_STARTED')result.bottlenecks.push({
  code:'NEUTRAL_CORPUS_NOT_READY',
  detail:'Missing independent historical multi-coin cohort, provenance, executable quotes, isolated agent connector',
  severity:'BLOCKING_REAL_BLIND_TEST'
 });
 if(recent?.checked_at){
  const elapsed=Math.floor((Date.parse(at)-Date.parse(recent.checked_at))/60000);
  if(Number.isFinite(elapsed)&&elapsed>30)result.bottlenecks.push({
   code:'DIAGNOSTIC_PROGRESS_OLDER_THAN_30_MIN',elapsed_minutes:elapsed,
   severity:'WARNING'
  });
 }
 if(!exists(runPath)){
  result.bottlenecks.push({code:'DIAGNOSTIC_RUN_MISSING',severity:'BLOCKING_DIAGNOSTIC'});
  return result;
 }
 let state;
 try{state=load('watch-20261114-diagnostic');}
 catch(e){
  result.bottlenecks.push({code:'CORRUPTED_OR_UNREADABLE_REPLAY_RUN',
   detail:err(e),severity:'BLOCKING_DIAGNOSTIC'});
  return result;
 }
 result.diagnostic.completed_frames=state.index;
 result.diagnostic.total_frames=state.dataset.ticks.length;
 result.diagnostic.current_frame=state.index<state.dataset.ticks.length?state.index:null;
 result.diagnostic.actual_simulated_trades=state.portfolio.trades.length;
 if(state.index===state.dataset.ticks.length)return result;
 const nextPortfolio=settle(state.portfolio,state.dataset,state.dataset.ticks[state.index]);
 const f=frame(state.dataset,state.index,nextPortfolio);
 const publicDir=path.join(base,'bridge',
  state.index===0?'diagnostic-first-frame':'diagnostic-frames/'+pad(state.index));
 const publicInput=path.join(publicDir,'input.json');
 if(!exists(publicInput))result.bottlenecks.push({
  code:'CURRENT_FRAME_NOT_PUBLISHED',index:state.index,severity:'BLOCKING_DIAGNOSTIC'
 });
 else{
  const written=read(publicInput);
  if(written.input_hash!==f.input_hash||written.at!==f.at||written.index!==f.index)
   result.bottlenecks.push({
    code:'PUBLISHED_FRAME_MISMATCH',index:state.index,severity:'BLOCKING_DIAGNOSTIC'
   });
 }
 const decisions=[];
 for(const role of ROLES){
  const file=path.join(publicDir,'decisions',role+'.json');
  if(!exists(file)){
   result.diagnostic.votes[role]='MISSING';
   result.diagnostic.missing_roles.push(role);
  }else{
   try{
    const v=read(file);
    if(v.role!==role||v.index!==f.index||v.at!==f.at||v.input_hash!==f.input_hash)
     throw Error('ROLE_INPUT_MISMATCH');
    decisions.push(v);result.diagnostic.votes[role]='PRESENT_AND_FRAME_MATCHED';
   }catch(e){
    result.diagnostic.votes[role]='INVALID';
    result.diagnostic.invalid_roles.push({role,error:err(e)});
   }
  }
  const current=path.join(root,'research','dot-workflow','roles',role,'current.json');
  if(exists(current)){
   const v=read(current);
   result.diagnostic.votes[role+'_last_run']=v.run_id||null;
   result.diagnostic.votes[role+'_status']=v.status||null;
  }
 }
 if(result.diagnostic.invalid_roles.length)result.bottlenecks.push({
  code:'INVALID_ROLE_VOTES',invalid:result.diagnostic.invalid_roles,
  severity:'BLOCKING_DIAGNOSTIC'
 });
 if(result.diagnostic.missing_roles.length)result.bottlenecks.push({
  code:'MISSING_ROLE_VOTES',missing:result.diagnostic.missing_roles,
  severity:'BLOCKING_DIAGNOSTIC',
  recommended_fix:'The named roles must write their OWN genuine current-frame decisions. No synthetic historical vote replacement.'
 });
 if(!result.diagnostic.invalid_roles.length&&!result.diagnostic.missing_roles.length){
  try{
   validateDecisions(f,decisions);
   result.diagnostic.all_five_valid=true;
   result.bottlenecks.push({
    code:'FIVE_VOTES_READY_CONTROLLER_NOT_ADVANCED',
    index:state.index,severity:'ACTIONABLE',
    recommended_fix:'Check R20 instant replay workflow permissions, branch trigger and run logs. No hourly agent waiting is required.'
   });
  }catch(e){
   result.bottlenecks.push({code:'FIVE_ROLE_POLICY_REJECTED',
    detail:err(e),severity:'BLOCKING_DIAGNOSTIC'});
  }
 }
 result.recommendations.push(
  'Prioritize any missing current-frame roles before unrelated token or archive research.',
  'Verify per-push R20 controller advancement when five roles are present.',
  'Do not interpret an empty frame as evidence of no social, market or security activity.',
  'Before running 50+ independent cases, provide timestamp-audited neutral cohorts and a verified actual role executor.'
 );
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [repoRoot='.',output]=process.argv.slice(2);
  const result=observeR21(path.resolve(repoRoot));
  const serialized=JSON.stringify(result,null,2)+'\n';
  if(output){
   fs.mkdirSync(path.dirname(output),{recursive:true});
   fs.writeFileSync(output,serialized);
  }
  console.log(serialized);
 }catch(e){console.error(err(e));process.exitCode=1;}
}
