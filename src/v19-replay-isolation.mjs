// R29 V1.9 SYS-09: external state and Github signal inbox are READ ONLY.
// Runs against an isolated in-memory model account, never the paper client.
// The digest snapshot can attest only files accessible to the calling process.
// No writes, mkdir, mutation, GitHub API, trading, or remote background work.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function fingerprintProtectedFiles(paths=[]){
 if(!Array.isArray(paths)||paths.some(x=>typeof x!=='string'||!x.trim())
   ||new Set(paths.map(resolve)).size!==paths.length)
  throw Error('INVALID_PROTECTED_PAPER_FILE_PATHS');
 const files=[];
 for(const path of paths){
  const absolute=resolve(path);
  try{
   const bytes=await readFile(absolute);
   files.push({path:absolute,exists:true,
     bytes:bytes.byteLength,sha256:sha(bytes)});
  }catch(error){
   if(error.code!=='ENOENT')throw error;
   files.push({path:absolute,exists:false,bytes:0,sha256:null});
  }
 }
 return {schema:1,kind:'R29_V19_PROTECTED_PAPER_STATE_SNAPSHOT',
  files,protected_path_count:files.length,
  exact_file_bytes_recorded:false,
  all_paths_read_only:true};
}
export function assertProtectedFilesUnchanged(before,after){
 if(before?.kind!=='R29_V19_PROTECTED_PAPER_STATE_SNAPSHOT'
   ||after?.kind!=='R29_V19_PROTECTED_PAPER_STATE_SNAPSHOT'
   ||before.files.length!==after.files.length
   ||before.files.some((x,i)=>x.path!==after.files[i].path
       ||x.exists!==after.files[i].exists
       ||x.bytes!==after.files[i].bytes
       ||x.sha256!==after.files[i].sha256))
  throw Error('PROTECTED_PAPER_STATE_CHANGED_ABORT_REPORT');
 return {status:'UNCHANGED',protected_file_count:before.files.length,
  verified_on_this_machine_only:true,
  proves_remote_Windows_files_unchanged:false};
}
export function makeResearchOnlyReplayReceipt({report,runId}={}){
 if(report?.kind!=='R29_V18_ON_DEMAND_FIVE_ROLE_SHADOW_BACKTEST'
   ||typeof runId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(runId))
  throw Error('INVALID_RESEARCH_REPLAY_RECEIPT');
 return {schema:1,kind:'R29_V19_ISOLATED_RESEARCH_REPLAY_RECEIPT',
  id:'research-'+runId,date:report.date,
  simulation:true,not_a_paper_client_receipt:true,
  never_post_to_github_signals:true,
  model_start_cash_test_usdc:report.start_capital_test_usdc,
  amount_per_coin_test_usdc:report.amount_per_coin_test_usdc,
  model_end_cash_test_usdc:report.model_ending_cash_test_usdc,
  modeled_buys:report.model_replay_summary.buys,
  modeled_sells:report.model_replay_summary.sells,
  actual_git_orders:0,actual_client_paper_fills:0,
  live_paper_balance_was_not_loaded_into_replay:true,
  output_policy:'ONLY_PROBE_ARTIFACTS'};
}
