// R25 read-only project and evidence bottleneck monitor. Executes without LLM, keys, wallets.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const read=p=>fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;
const roles=['scout','social','onchain','security','qa'];
export function observeR25(repoRoot,{checkedAt=new Date().toISOString()}={}){
 const base=path.join(repoRoot,'research','replay-controller');
 const old=read(path.join(base,'monitor','r20-progress.json'));
 const neutral=read(path.join(base,'temporal-public','status.json'));
 const sources=read(path.join(base,'monitor','r25-sources.json'));
 const roleState={},issues=[];
 for(const role of roles){
   const dir=path.join(repoRoot,'research','r25','roles',role);
   const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(x=>/\.(json|md)$/.test(x)): [];
   const current=read(path.join(repoRoot,'research','dot-workflow','roles',role,'current.json'));
   roleState[role]={research_batches:files.length,last_report_status:current?.status||'UNKNOWN',
     last_report_run_id:current?.run_id||null};
 }
 const lastOld=Date.parse(old?.checked_at||'');
 const minutesOld=Number.isFinite(lastOld)?Math.max(0,Math.floor((Date.parse(checkedAt)-lastOld)/60000)):null;
 if(old?.mode==='DIAGNOSTIC_ONLY'&&!old?.blind_success)issues.push({
  code:'OLD_R20_NOT_BLIND_RESULT',severity:'INFO',
  detail:'Known-winner diagnostic, cannot be claimed as PEPE detection'});
 if(old?.completed_frames!==undefined&&old.completed_frames<old.total_frames&&
   old?.simulated_trades===0)issues.push({
  code:'R20_NO_SIMULATED_TRADES',severity:'INFO',
  detail:'Do not accelerate empty days instead of collecting real evidence'});
 if(minutesOld!==null&&minutesOld>45)issues.push({
  code:'R20_PROGRESS_STALE',severity:'WARNING',age_minutes:minutesOld});
 if(neutral?.mode==='NOT_STARTED')issues.push({
  code:'NEUTRAL_BLINDTEST_NOT_STARTED',severity:'BLOCKING_VALIDATION'});
 if(!sources?.uniswap_2023?.complete_requested_window)issues.push({
  code:'2023_CANDIDATE_SOURCE_INCOMPLETE',severity:'BLOCKING_DISCOVERY',
  detail:'March-May neutral Uniswap history is incomplete and should not be interpreted as full replay'});
 if(!sources?.uniswap_2023?.historical_asof_verified)issues.push({
  code:'2023_ASOF_ATTESTATION_MISSING',severity:'BLOCKING_BLINDTEST'});
 if(!sources?.r24_solana?.launch_candidates||sources.r24_solana.launch_candidates<50)issues.push({
  code:'SOLANA_NEUTRAL_CANDIDATE_SOURCE_NOT_ATTESTED',severity:'WARNING'});
 const ownResearch=Object.values(roleState).reduce((s,x)=>s+x.research_batches,0);
 if(!ownResearch)issues.push({code:'NO_R25_INDEPENDENT_ROLE_REPORTS_YET',
  severity:'ACTIONABLE',detail:'Existing hourly research tasks must publish own verified evidence batches'});
 const result={
  schema:'r25_progress_monitor.v1',mode:'READ_ONLY_NO_MODEL_CALLS',
  checked_at:checkedAt,
  r20_diagnostic:{completed_frames:old?.completed_frames??null,total_frames:old?.total_frames??null,
   simulated_trades:old?.simulated_trades??0,age_minutes:minutesOld,missing_roles:old?.missing_roles??[]},
  r25_sources:sources??null,r25_role_research:roleState,
  r25_independent_reports:ownResearch,neutral_test:neutral?.mode||'UNKNOWN',
  real_orders:0,real_wallet_actions:0,
  blockers:issues,
  source_priority:'GET_COMPLETE_CONTEMPORANEOUS_2023_COHORT_AND_ASOF_QUOTES_NOT_BLANK_R20_FRAMES',
  schedule_note:'GitHub Actions cron */15 is best effort; runs may be delayed or skipped.',
  never_assume_repaired:true
 };
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
   const [root='.',out]=process.argv.slice(2);
   const result=observeR25(path.resolve(root));
   if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
     fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');}
   console.log(JSON.stringify({r20:result.r20_diagnostic, r25_reports:result.r25_independent_reports,
     sources:result.r25_sources, blockers:result.blockers,orders:0},null,2));
 }catch(e){console.error('R25_WATCH_ERROR:'+e.message);process.exitCode=1;}
}