// R21 multi-case scheduler for 50+ neutral historical windows.
// No real-money, wallet, runner gateway, or existing paper-account integration.
// Historical evaluator labels must remain unread until all votes of that case
// are sealed. The caller supplies independently provisioned role workers.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest,validateDataset,blindReadiness} from './engine.mjs';
import {runContinuousReplay} from './continuous-runner.mjs';
import {evaluateSealedReplay} from './r21-evaluate.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const check=(condition,code)=>{if(!condition)throw Error(code);};
export const CASE_SPLITS=['DEVELOPMENT','VALIDATION','HOLDOUT'];
export function validateCaseCatalog(catalog){
 check(catalog?.schema==='r21_case_catalog.v1','R21_BAD_CASE_CATALOG_SCHEMA');
 check(Array.isArray(catalog.cases),'R21_CASE_LIST_MISSING');
 check(Number.isInteger(catalog.target_case_count)&&catalog.target_case_count>=50,
  'R21_TARGET_MUST_BE_AT_LEAST_FIFTY');
 const ids=new Set(),datasetPaths=new Set();
 for(const c of catalog.cases){
  check(c&&typeof c.case_id==='string'&&/^case_[0-9]{4,6}$/.test(c.case_id),
   'R21_CASE_ID_MUST_BE_NEUTRAL');
  check(!ids.has(c.case_id),'R21_DUPLICATE_CASE_ID');ids.add(c.case_id);
  check(CASE_SPLITS.includes(c.split),'R21_UNKNOWN_DATA_SPLIT');
  check(typeof c.dataset_path==='string'&&c.dataset_path.length>0,
   'R21_MISSING_PRIVATE_DATASET_PATH');
  check(!datasetPaths.has(c.dataset_path),'R21_REUSED_CASE_DATASET_PATH');
  datasetPaths.add(c.dataset_path);
  check(c.labels_path===undefined||
    (typeof c.labels_path==='string'&&c.labels_path.length>0),
   'R21_BAD_PRIVATE_LABELS_PATH');
  check(c.labels_path!==c.dataset_path,'R21_LABELS_AND_DATASET_PATH_MUST_DIFFER');
  check(['DIAGNOSTIC','BLIND'].includes(c.mode),'R21_BAD_CASE_MODE');
  check(c.enabled===undefined||typeof c.enabled==='boolean','R21_BAD_ENABLED_FLAG');
  if(c.window){
   const start=Date.parse(c.window.start),end=Date.parse(c.window.end);
   check(Number.isFinite(start)&&Number.isFinite(end)&&end>start,'R21_BAD_CASE_WINDOW');
   check(c.window.start.endsWith('T00:00:00Z')&&c.window.end.endsWith('T23:59:59Z'),
    'R21_CASE_WINDOW_NOT_FULL_UTC_DAYS');
   check(end-start+1000===62*86400000,'R21_CASE_WINDOW_NOT_62_DAYS');
  }
 }
 const reserved=catalog.cases.filter(c=>c.window).map(c=>({id:c.case_id,start:Date.parse(c.window.start),end:Date.parse(c.window.end)})).sort((a,b)=>a.start-b.start);
 for(let i=1;i<reserved.length;i++)check(reserved[i].start>reserved[i-1].end,'R21_CASE_WINDOWS_OVERLAP');
 return {
  declared_cases:catalog.cases.length,target_case_count:catalog.target_case_count,
  enabled_cases:catalog.cases.filter(c=>c.enabled!==false).length,
  remaining_to_register:Math.max(0,catalog.target_case_count-catalog.cases.length),
  pending_cohort_data:catalog.cases.filter(c=>c.enabled!==false).length===0
 };
}
export async function runCaseCatalog(catalog,{loadDataset,loadLabels,invokeRole,
  outputDir,maxCases=1000,maxFramesPerCase=10000,providerLabel='UNATTESTED_EXTERNAL'}={}){
 const catalogState=validateCaseCatalog(catalog);
 check(typeof loadDataset==='function','R21_PRIVATE_DATASET_LOADER_REQUIRED');
 check(typeof invokeRole==='function','R21_REAL_ROLE_ADAPTER_NOT_CONNECTED');
 check(Number.isInteger(maxCases)&&maxCases>0,'R21_BAD_CASE_LIMIT');
 check(Number.isInteger(maxFramesPerCase)&&maxFramesPerCase>0,'R21_BAD_FRAME_LIMIT');
 const report={
  schema:'r21_multi_case_batch_report.v1',
  target_case_count:catalog.target_case_count,
  declared_cases:catalogState.declared_cases,
  provider_label:providerLabel,
  case_count_ran:0,completed_cases:0,blocked_cases:0,
  total_completed_frames:0,total_role_calls:0,
  total_simulated_trades:0,
  total_realized_net_pnl_from_comparable_cases:null,
  real_bot_orders:0,real_paper_account_changes:0,blind_success:false,
  split_summaries:Object.fromEntries(CASE_SPLITS.map(s=>[s,{completed:0,blocked:0}])),
  cases:[],
  limitations:[
   'No real-money or live bot connection. No existing paper account mutation.',
   'Different historical cohorts must have independent provenance and neutral selection.',
   'Completeness, external model authenticity and pretraining leakage must be independently reviewed.',
   'Do not average profits across overlapping windows or incomparable starting capital.',
   'Historical outcomes and winner labels are evaluated only after all case decisions are sealed.'
  ]
 };
 const seenDigests=new Map();
 for(const c of catalog.cases.filter(c=>c.enabled!==false).slice(0,maxCases)){
  let dataset;
  try{
   dataset=await loadDataset(c.dataset_path);
   validateDataset(dataset);
   check(dataset.window&&dataset.universe?.selection==='ASOF_COHORT',
    'R21_CASE_MUST_HAVE_NEUTRAL_WINDOW_LOCK');
   if(c.window)check(dataset.window.start===c.window.start&&
    dataset.window.end===c.window.end,'R21_LOADED_DATASET_WINDOW_MISMATCH');
   const hash=digest(dataset);
   check(!seenDigests.has(hash),'R21_DUPLICATE_DATASET_CONTENT_IN_BATCH');
   seenDigests.set(hash,c.case_id);
   if(c.mode==='BLIND'){
    const readiness=blindReadiness(dataset);
    check(readiness.eligible,'R21_BLIND_READINESS_BLOCKED:'+readiness.reasons.join(','));
    // Metadata alone is not a proof that agent model weights are blind.
    check(c.isolation_verified_by_independent_auditor===true,
     'R21_BLIND_AGENT_ISOLATION_NOT_EXTERNALLY_AUDITED');
   }
   check(providerLabel!=='SYNTHETIC_FIXTURE'||dataset.data_class==='SYNTHETIC',
    'R21_SYNTHETIC_VOTES_FORBIDDEN_ON_HISTORICAL');
   const run=await runContinuousReplay({
    sessionName:'r21-'+c.case_id,
    dataset,publicRoot:path.resolve(outputDir||'r21-replay-output',c.case_id,'public'),
    invokeRole,mode:c.mode,providerLabel,maxFrames:maxFramesPerCase
   });
   report.case_count_ran++;
   report.total_role_calls+=run.role_calls;
   report.total_completed_frames+=run.frames.filter(f=>f.completed).length;
   if(run.status==='COMPLETE'){
    // NEVER read a winner/outcome label from disk before all decisions are sealed.
    const labels=c.labels_path?
     (typeof loadLabels==='function'?await loadLabels(c.labels_path):
      (()=>{throw Error('R21_PRIVATE_LABELS_LOADER_MISSING')})()):null;
    const evaluation=evaluateSealedReplay('r21-'+c.case_id,{
     caseId:c.case_id,labels
    });
    report.completed_cases++;
    report.split_summaries[c.split].completed++;
    report.total_simulated_trades+=evaluation.trade_count;
    report.cases.push({
     case_id:c.case_id,split:c.split,status:'COMPLETE',
     mode:c.mode,frames:evaluation.completed_frames,
     duration_ms:run.duration_ms,role_calls:run.role_calls,
     candidates_detected:evaluation.discovered_candidate_count,
     coins_bought:evaluation.bought_coin_count,
     trade_count:evaluation.trade_count,
     realized_net_pnl:evaluation.realized_net_pnl,
     drawdown_pct:evaluation.max_drawdown_pct,
     unmarked_positions:evaluation.unmarked_positions.length,
     outcome_comparison:evaluation.outcome_comparison,
     historical_blind_success_verified:false
    });
    if(outputDir){
     const file=path.resolve(outputDir,c.case_id,'report.json');
     fs.mkdirSync(path.dirname(file),{recursive:true});
     fs.writeFileSync(file,JSON.stringify(evaluation,null,2)+'\n');
    }
   }else{
    report.blocked_cases++;
    report.split_summaries[c.split].blocked++;
    report.cases.push({
     case_id:c.case_id,split:c.split,status:run.status,
     frame_index:run.completed_frames,total_frames:run.total_frames,
     blocker:run.blocker,duration_ms:run.duration_ms,
     role_calls:run.role_calls,reported_trades:run.simulated_trades,
     no_future_frame_read:true
    });
   }
  }catch(e){
   report.case_count_ran++;
   report.blocked_cases++;
   report.split_summaries[c.split].blocked++;
   report.cases.push({
    case_id:c.case_id,split:c.split,status:'BLOCKED_PRECHECK',
    error:String(e.message||e).slice(0,400),
    role_calls:0,reported_trades:0
   });
  }
 }
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 // No built-in worker adapter: CLI must not silently generate faux Dot votes.
 try{
  const [catalogFile]=process.argv.slice(2);
  if(!catalogFile)throw Error('Usage: node r21-catalog.mjs CASE_CATALOG_JSON (planning only).');
  const catalog=read(catalogFile);
  console.log(JSON.stringify({
   schema:'r21_case_catalog_validation.v1',
   ...validateCaseCatalog(catalog),
   status:'CATALOG_VALIDATED_NOT_EXECUTED',
   actual_external_agent_adapter:'NOT_CONNECTED'
  },null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
