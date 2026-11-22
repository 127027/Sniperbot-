// SYS-06 / QA-04: execute one explicitly committed, immutable, cleanroom
// 29h historical research request through the SAME existing replay CLI.
// No provider APIs, winners, wallet, OpenAI API, Dots, live trading or signals.
import {execFileSync,spawnSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateManualBacktestRequest} from '../src/v19-manual-backtest-request.mjs';

const branch='refs/heads/codex/r29-cleanroom-paper-20261121';
if(process.env.GITHUB_REF!==branch)throw Error('OFFLINE_REQUEST_WRONG_BRANCH');
const gitSha=process.env.GITHUB_SHA,runId=process.env.GITHUB_RUN_ID;
if(!/^[0-9a-f]{40}$/.test(gitSha||'')||!/^[0-9]{1,20}$/.test(runId||''))
 throw Error('OFFLINE_REQUEST_NOT_FROM_GITHUB_ACTIONS');
const changed=execFileSync('git',
 ['diff-tree','--no-commit-id','--name-only','-r',gitSha],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const requests=changed.filter(p=>/^research\/offline-backtest-requests\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\.json$/.test(p));
if(changed.length!==1||requests.length!==1)throw Error('EXPECTED_EXACTLY_ONE_IMMUTABLE_OFFLINE_REQUEST');
const requestPath=requests[0],raw=await readFile(requestPath,'utf8');
const data=JSON.parse(raw);
if(data.schema!==1||data.kind!=='R29_V19_EXPLICIT_OFFLINE_BACKTEST_REQUEST'
 ||data.mode!=='PAPER_RESEARCH_ONLY'
 ||data.requested_by!=='user-approved-r29-backtest'
 ||data.do_not_publish_orders!==true||data.activate_gpt_dots!==false
 ||data.use_live_provider_apis!==false||data.mutate_existing_client_state!==false
 ||typeof data.created_at_utc!=='string'||!Number.isFinite(Date.parse(data.created_at_utc))
 ||!requestPath.includes('/'+data.created_at_utc.slice(0,10)+'/')
 ||!Object.hasOwn(data,'manifest_path'))
 throw Error('INVALID_EXPLICIT_OFFLINE_BACKTEST_REQUEST');
const params=validateManualBacktestRequest({
 date:data.date,inputPath:data.manifest_path||'',ref:branch
});
if(!params.manual_trigger_only||params.automations_activated!==0
 ||params.paper_order_publication_allowed!==false
 ||params.existing_paper_account_mutation_allowed!==false)
 throw Error('BACKTEST_REQUEST_GATES_NOT_SATISFIED');
// A path may be allowed, but its file is NOT historical proof. Never accept
// an Oracle or a winner-selected sampling as an October discovery input.
if(params.input_path){
 const manifest=JSON.parse(await readFile(params.input_path,'utf8'));
 if(manifest?.selected_from_future_winner_list!==false
  ||manifest?.kind!=='R29_V18_ASOF_REPLAY_INPUT'
  ||manifest?.date!==data.date
  ||!Array.isArray(manifest?.snapshots)
  ||manifest.snapshots.some(s=>s?.source_class==='POST_EVENT_ORACLE'
   ||s?.provenance==='POST_EVENT_ORACLE'))
  throw Error('HINDSIGHT_EVALUATION_MANIFEST_BLOCKED');
}
await mkdir('probe-artifacts',{recursive:true});
const filename='probe-artifacts/v19-explicit-offline-29h-'+runId+'.json';
const args=['scripts/v18-backtest-on-demand.mjs',...params.cli_args,'--output',filename];
const executed=spawnSync(process.execPath,args,{
 encoding:'utf8',maxBuffer:8*1024*1024,timeout:120000,
 env:{...process.env,R29_MODE:'PAPER',R29_ENABLE_LIVE:''}
});
if(executed.status!==0||executed.signal)throw Error('OFFLINE_BACKTEST_FAILED: '+
 (executed.stderr||executed.stdout).slice(0,2500));
const content=await readFile(filename),output=JSON.parse(content.toString('utf8'));
const report=output.requested_backtest,ledger=output.isolated_model_ledger_audit;
if(report?.date!==data.date
 ||report.on_demand_29h_timeline?.hourly_ticks!==29
 ||report.on_demand_29h_timeline?.warmup_hours!==5
 ||report.on_demand_29h_timeline?.decision_hours!==24
 ||!['DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE',
      'PROVISIONAL_ASOF_SOURCE_AUTHENTICITY_NOT_VERIFIED'].includes(report.status)
 ||ledger?.status!=='MODEL_CASH_AND_LOTS_RECONCILED'
 ||output.protected_files_unchanged?.status!=='UNCHANGED'
 ||output.protected_files_unchanged?.proves_remote_Windows_files_unchanged!==false
 ||report.confirmed_paper_orders!==0||report.confirmed_paper_fills!==0
 ||report.historical_proven_trades!==0||report.historical_gpt_dot_runs!==0)
 throw Error('OFFLINE_BACKTEST_NOT_RESEARCH_ONLY');
const sha=x=>createHash('sha256').update(x).digest('hex');
const verification={schema:1,kind:'R29_V19_EXPLICIT_GITHUB_OFFLINE_BACKTEST_RECEIPT',
 run_id:runId,source_commit:gitSha,source_request_path:requestPath,
 request_sha256:sha(raw),date:data.date,requested_input_path:params.input_path,
 window_start_utc:report.historical_warmup_start_utc,
 window_end_utc:report.end_utc,
 data_status:report.status,
 accepted_snapshot_count:report.accepted_input_count,
 rejected_snapshot_count:report.rejected_input_count,
 model_buys:ledger.modeled_buys,model_sells:ledger.modeled_sells,
 modeled_receipts:ledger.model_receipt_count,
 original_historical_gpt_reviews:0,
 actual_paper_fills:0,actual_orders_published:0,real_money_orders:0,
 provider_requests_performed:0,
 remote_Windows_Paper_files_inspected:false,
 protected_accessible_files_unchanged:true,
 provenance_not_necessarily_independently_verified:true,
 original_october_data_gaps_not_filled_by_synthetic_scenario:true,
 result_path:filename,result_sha256:sha(content),
 research_artifact_only:true,
 current_market_capture_not_started:true
};
const outputPath='probe-artifacts/v19-explicit-offline-29h-receipt-'+runId+'.json';
await writeFile(outputPath,JSON.stringify(verification,null,2)+'\n',{flag:'wx'});
console.log('R29_V19_EXPLICIT_OFFLINE_BACKTEST_DONE',JSON.stringify(verification));
