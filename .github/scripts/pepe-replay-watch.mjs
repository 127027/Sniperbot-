// Eight-hour, 15-minute GitHub Actions monitor for the isolated PEPE DIAGNOSTIC.
// No network access, trading APIs, wallets, signing, live signals, or paper account writes.
// The only automatic repair is sealing five independently stored matching decisions.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const roles=['scout','social','onchain','security','qa'];
const begin='2026-11-14T08:35:00Z',end='2026-11-14T16:35:00Z';
const base='research/replay-controller',session='watch-20261114-diagnostic';
const branch='codex/dots-pepe-replay-20261113';
const p=(cwd,s)=>path.join(cwd,s);
const read=x=>JSON.parse(fs.readFileSync(x,'utf8'));
const exists=x=>fs.existsSync(x);
const put=(x,o)=>{fs.mkdirSync(path.dirname(x),{recursive:true});fs.writeFileSync(x,JSON.stringify(o,null,2)+'\n');};
const pad=x=>String(x).padStart(5,'0');
const frameDir=i=>base+'/bridge/'+(i===0?'diagnostic-first-frame':'diagnostic-frames/'+pad(i));
const msg=e=>String(e?.message||e);
const atNow=()=>new Date().toISOString();

async function inspect(cwd,out,at=atNow()){
 const oldFile=p(cwd,base+'/monitor/status.json');
 const old=exists(oldFile)?read(oldFile):null;
 const active=Date.parse(at)>=Date.parse(begin)&&Date.parse(at)<Date.parse(end);
 const s={schema:'pepe_replay_watch.v1',mode:'DIAGNOSTIC_ONLY',branch,
  checked_at:at,window_start:begin,window_end:end,active,
  previous_frame:old?.frame_index||0,frame_index:old?.frame_index||0,
  total_frames:62,role_runs:{},role_states:{},votes:{},blockers:[],fixes:[],
  trade_count:0,real_bot_orders:0,blind_success:false,independent_authorship_verified:false};
 if(!active){s.status='OUTSIDE_WINDOW';put(p(out,base+'/monitor/status.json'),s);return s;}
 for(const r of roles){
  const f=p(cwd,'research/dot-workflow/roles/'+r+'/current.json');
  const v=exists(f)?read(f):null;
  s.role_runs[r]=v?.run_id||null;s.role_states[r]=v?.status||'NO_STATE';
 }
 try{
  const ctrl=await import(pathToFileURL(p(cwd,base+'/controller.mjs')).href);
  const eng=await import(pathToFileURL(p(cwd,base+'/engine.mjs')).href);
  const data=read(p(cwd,base+'/reports/diagnostic-dataset.json'));
  const runRoot=p(cwd,base+'/runs/'+session);
  if(!exists(runRoot+'/meta.json')){
   ctrl.initialize(session,data,{},'DIAGNOSTIC');
   s.fixes.push({action:'INITIALIZED_DIAGNOSTIC',frame:0});
  }
  let current=ctrl.load(session);
  if(current.meta.mode!=='DIAGNOSTIC'||current.dataset.universe?.selection!=='KNOWN_WINNER')
   throw Error('WRONG_TEST_MODE');
  for(let count=0;count<8&&current.index<data.ticks.length;count++){
   const i=current.index,info=ctrl.nextFrame(session);
   const frame=read(info.input_path);
   const publicInput=p(cwd,frameDir(i)+'/input.json');
   if(!exists(publicInput)){
    put(publicInput,frame);
    s.fixes.push({action:'PUBLISHED_NEXT_INPUT',frame:i});
   }else{
    const other=read(publicInput);
    if(other.index!==frame.index||other.at!==frame.at||other.input_hash!==frame.input_hash)
     throw Error('PUBLIC_FRAME_MISMATCH_AT_'+i);
   }
   const votes=[],missing=[];
   for(const r of roles){
    const x=p(cwd,frameDir(i)+'/decisions/'+r+'.json');
    if(!exists(x)){missing.push(r);s.votes[r]='MISSING';continue;}
    const v=read(x);
    if(v.role!==r||v.index!==frame.index||v.at!==frame.at||v.input_hash!==frame.input_hash)
     throw Error('INVALID_FRAME_VOTE_'+r+'_'+i);
    s.votes[r]='PRESENT';
    votes.push(v);
   }
   if(missing.length){
    s.blockers.push({frame:i,code:'MISSING_ROLE_VOTES',roles:missing});
    break;
   }
   eng.validateDecisions(frame,votes); // Five actual opinions, no invented data.
   fs.mkdirSync(info.decision_directory,{recursive:true});
   for(const v of votes)put(info.decision_directory+'/'+v.role+'.json',v);
   ctrl.advance(session);
   s.fixes.push({action:'SEALED_REAL_FIVE_VOTES',frame:i});
   current=ctrl.load(session);
   if(current.index<data.ticks.length){
    const next=read(ctrl.nextFrame(session).input_path);
    put(p(cwd,frameDir(current.index)+'/input.json'),next);
    s.fixes.push({action:'PUBLISHED_NEXT_INPUT',frame:current.index});
   }
  }
  current=ctrl.load(session);
  s.frame_index=current.index;
  s.trade_count=current.portfolio.trades.length;
  s.positions=Object.keys(current.portfolio.positions||{}).length;
  s.last_frame_advance_at=s.frame_index>(old?.frame_index||0)?at:(old?.last_frame_advance_at||at);
  s.stalled_minutes=Math.floor(Math.max(0,(Date.parse(at)-Date.parse(s.last_frame_advance_at))/60000));
  s.status=s.frame_index===data.ticks.length?'DIAGNOSTIC_COMPLETE_NOT_BLIND':
   s.frame_index>(old?.frame_index||0)?'FRAME_ADVANCED':
   s.stalled_minutes>=30?'STALLED':'AWAITING_ROLE_VOTES';
  if(s.stalled_minutes>=30)s.blockers.push({
   frame:s.frame_index,code:'STALLED_OVER_30_MINUTES',
   repair:'Look up blocked role, historical data access, or missing bridge vote. NEVER auto-generate a vote.'
  });
 }catch(e){s.status='CONTROLLER_ERROR';s.blockers.push({code:'CONTROLLER_ERROR',detail:msg(e)});}
 s.change_log=[...(old?.change_log||[]),...s.fixes.map(x=>({...x,at})),
   ...s.blockers.map(x=>({...x,at}))].slice(-150);
 put(oldFile,s);
 const paths=[base+'/monitor/status.json',base+'/runs/'+session,base+'/bridge/diagnostic-frames'];
 for(const rel of paths){
  const src=p(cwd,rel),dst=p(out,rel);
  if(!exists(src))continue;
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.cpSync(src,dst,{recursive:true,force:true});
 }
 return s;
}
function apply(cwd,out){
 const source=p(out,base+'/monitor/status.json');
 if(!exists(source))throw Error('NO_REPORT');
 const s=read(source);
 if(s.schema!=='pepe_replay_watch.v1'||s.mode!=='DIAGNOSTIC_ONLY'||s.branch!==branch||
  !s.active||Date.parse(s.checked_at)<Date.parse(begin)||Date.parse(s.checked_at)>=Date.parse(end))
  throw Error('INVALID_OR_EXPIRED_REPORT');
 const paths=[base+'/monitor/status.json',base+'/runs/'+session,base+'/bridge/diagnostic-frames'];
 const applied=[];
 for(const rel of paths){
  const src=p(out,rel),dst=p(cwd,rel);
  if(!exists(src))continue;
  fs.mkdirSync(path.dirname(dst),{recursive:true});
  fs.cpSync(src,dst,{recursive:true,force:true,filter:f=>{
   if(fs.lstatSync(f).isSymbolicLink())throw Error('SYMLINK_NOT_ALLOWED');
   if(!fs.statSync(f).isDirectory()&&!f.endsWith('.json'))throw Error('NON_JSON_OUTPUT');
   return true;
  }});
  applied.push(rel);
 }
 return {status:s.status,frame_index:s.frame_index,applied};
}
const [cmd,where='watched',output='watch-out']=process.argv.slice(2);
if(cmd==='inspect'){
 inspect(path.resolve(where),path.resolve(output)).then(x=>console.log(JSON.stringify(x,null,2)))
  .catch(e=>{console.error(msg(e));process.exitCode=1;});
}else if(cmd==='apply'){
 try{console.log(JSON.stringify(apply(path.resolve(where),path.resolve(output)),null,2));}
 catch(e){console.error(msg(e));process.exitCode=1;}
}else{console.error('Usage: node pepe-replay-watch.mjs inspect|apply watched watch-out');process.exitCode=1;}
