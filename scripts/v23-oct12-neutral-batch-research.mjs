// User-approved R29 V2.3 post-event research: 192 neutral Solana mints,
// exactly seven keyless public DexScreener GET batches (<=30 tokens each).
// This is NOT an Oct 12 as-of replay or valid historical BUY/SELL feed.
// Only GitHub-Actions offline checkout and probe-artifacts are writable.
// No API keys, wallets, GPT, GitHub signal/order writes, or user account.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {auditRetrospectiveNeutral24HourlySource,
 R29_PINNED_NEUTRAL_OCT_SOURCE as pinned}
 from '../src/v19-retrospective-neutral-source-overlay.mjs';
import {makeV23NeutralBatches,assessV23DexBatch,
 summarizeV23NeutralBatchFindings}
 from '../src/v23-oct12-neutral-mint-batches.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';

const branch='refs/heads/codex/r29-cleanroom-paper-20261121';
const sha=x=>createHash('sha256').update(x).digest('hex');
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!==branch
 ||!/^[0-9a-f]{40}$/.test(commit||'')
 ||!/^[0-9]{1,20}$/.test(run||''))
 throw Error('V23_EXPLICIT_USER_GITHUB_READONLY_RUN_REQUIRED');
const changed=execFileSync('git',
 ['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const requests=changed.filter(x=>/^research\/neutral-batch-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||requests.length!==1)
 throw Error('V23_ONE_USER_APPROVED_REQUEST_FILE_ONLY');
const request=JSON.parse(await readFile(requests[0],'utf8'));
if(request?.schema!==1||request.kind!=='R29_V23_USER_EXPLICIT_192_NEUTRAL_MINT_BATCH_LOOKUP'
 ||request.date!=='2026-10-12'
 ||request.source_actions_run_id!==44048309420
 ||request.source_artifact_id!==14312891173
 ||request.mints_expected!==192||request.max_provider_requests!==7
 ||request.mints_per_request!==30
 ||request.no_winner_seed!==true||request.read_only!==true
 ||request.original_historical_availability_not_proved!==true
 ||request.no_orders_or_account_changes!==true
 ||request.no_broker_or_wallet_api!==true)
 throw Error('V23_UNAUTHORIZED_REQUEST_CONTRACT');
const p=[
 resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))
];
const before=await fingerprintProtectedFiles(p);
const base='probe-artifacts/neutral-source-v2/';
const priorBytes=await readFile(base+'2026-10-11.json');
const dayBytes=await readFile(base+'2026-10-12.json');
if(sha(priorBytes)!==pinned.day_11_sha256
 ||sha(dayBytes)!==pinned.day_12_sha256)
 throw Error('V23_ORIGINAL_NEUTRAL_SAMPLE_SHA_CHANGED');
const retrospective=auditRetrospectiveNeutral24HourlySource({
 priorDay:JSON.parse(priorBytes),tradingDay:JSON.parse(dayBytes),
 artifactDownloadedAtUtc:new Date().toISOString()});
const plan=makeV23NeutralBatches({retrospective});
if(plan.request_count!==7||plan.unique_mints!==192)
 throw Error('V23_UNEXPECTED_NEUTRAL_SAMPLE_UNIVERSE');
const target='probe-artifacts/v23-oct12-neutral-batches-'+run;
await mkdir(target,{recursive:true});
await writeFile(target+'/neutral-plan.json',JSON.stringify({
 ...plan,requests:plan.requests.map(q=>({...q,url_sha256:sha(q.url)}))
},null,2)+'\n',{flag:'wx'});
const assessments=[];
for(const req of plan.requests){
 // Deliberately one request at a time. 7 total is far below documented
 // public 300/min limit. No retries, hidden pagination or token search.
 const endpoint=req.url;let status=0,raw='';
 try{
  const response=await fetch(endpoint,{method:'GET',headers:{
    'accept':'application/json','user-agent':'r29-postrun-neutral-research/1.0'
   },signal:AbortSignal.timeout(15000)});
  status=response.status;
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>5_000_000)throw Error('V23_PROVIDER_RESPONSE_TOO_LARGE');
  raw=bytes.toString('utf8');
 }catch(err){
  status=0;
  raw=JSON.stringify({local_source_gap:true,
   status:err?.name==='TimeoutError'?'TIMEOUT':'READ_ONLY_PROVIDER_UNAVAILABLE'});
 }
 const receipt={http_method:'GET',endpoint,http_status:status,
  captured_at_utc:new Date().toISOString(),
  raw_text:raw,raw_sha256:sha(raw)};
 await writeFile(target+'/dex-batch-'+req.index+'.raw.json',raw,{flag:'wx'});
 const assessed=assessV23DexBatch({batch:req,receipt});
 assessments.push(assessed);
 console.log('R29_V23_REAL_HTTP_BATCH',JSON.stringify({
  index:req.index,requested_mints:req.mints.length,
  http_status:status,status:assessed.status,
  matched_mints:assessed.matched_count,
  matched_pools:assessed.pools.length,
  raw_sha256:receipt.raw_sha256,
  orders:0,not_historical_asof:true
 }));
 // Use no paid keys. A rate-limit is recorded, not silently retried.
 if(req.index<6)await new Promise(resolve=>setTimeout(resolve,1000));
}
const audit=summarizeV23NeutralBatchFindings({plan,assessments});
if(audit.provider_http_requests!==7
 ||audit.original_october_provider_delivery_proven!==false
 ||audit.historical_replay_or_live_trade_authorized!==false
 ||audit.winner_reference_oracle_accessed!==false)
 throw Error('V23_INVALID_POSTRUN_RESEARCH_RECEIPT');
const output={...audit,source_commit:commit,workflow_run_id:run,
 source_request:requests[0],source_request_sha256:sha(JSON.stringify(request)),
 original_neutral_archive_day_sha256:pinned.day_12_sha256,
 original_neutral_archive_prior_sha256:pinned.day_11_sha256,
 source_artifact_id:pinned.artifact_id,
 source_actions_run_id:pinned.actions_run_id};
await writeFile(target+'/audit-summary.json',JSON.stringify(output,null,2)+'\n',{flag:'wx'});
await writeFile(target+'/batch-receipts.json',JSON.stringify(assessments.map(
 a=>({...a,pools:a.pools.map(p=>({...p,source_http_status:a.http_status,
   response_sha256:a.response_sha256}))})
),null,2)+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(p));
console.log('R29_V23_POSTRUN_NEUTRAL_RESEARCH_DONE',JSON.stringify({
 matched_mints:output.matched_neutral_mints,
 unmatched_mints:output.unmatched_neutral_mints,
 mapped_pool_pairs:output.matched_exact_mint_pool_pairs,
 provider_200:output.provider_http200,
 data_gaps:output.provider_http_data_gap,
 historical_original_quotes_verified:0,
 original_october_dot2_discovery_proven:false,
 historical_gpt_trades:0,paper_orders:0,
 report_path:target+'/audit-summary.json'
}));
