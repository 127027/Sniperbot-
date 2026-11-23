// Explicit user-approved R29 research-only recovery of 176 neutral Solana
// mints from retrospective 12 October 2026 sample. All HTTP captures
// happen TODAY; NONE is evidence of delivery to a GPT Dot in October.
// Exactly 176 initial GETs max, plus <=1 retry on a 429/503 for any item,
// total bounded at 200 GETs. Never call broker, wallet, OpenAI or GitHub
// write APIs. Output goes ONLY to local GitHub Actions artifacts.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {R29_PINNED_NEUTRAL_OCT_SOURCE as original,
 auditRetrospectiveNeutral24HourlySource}
 from '../src/v19-retrospective-neutral-source-overlay.mjs';
import {interpretV24GeckoHourlyResponse}
 from '../src/v24-gecko-neutral-hourly-queue.mjs';
import {planV25NeutralRemaining176,reconcileV25NeutralResearch}
 from '../src/v25-neutral-remaining-176-research.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';

const branch='refs/heads/codex/r29-cleanroom-paper-20261121';
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
const sha=x=>createHash('sha256').update(x).digest('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
if(process.env.GITHUB_REF!==branch
 ||!/^[a-f0-9]{40}$/.test(commit||'')
 ||!/^[0-9]{1,20}$/.test(run||''))
 throw Error('R29_V25_EXPLICIT_BRANCH_AND_RUN_REQUIRED');
const changed=execFileSync('git',
 ['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const files=changed.filter(x=>
 /^research\/neutral-remaining-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1||files.length!==1)
 throw Error('R29_V25_ONE_EXPLICIT_USER_AUTHORIZED_REQUEST_ONLY');
const request=JSON.parse(await readFile(files[0],'utf8'));
if(request?.schema!==1
 ||request.kind!=='R29_V25_EXPLICIT_NEUTRAL_REMAINING_176_GECKO_RESEARCH'
 ||request.historical_date!=='2026-10-12'
 ||request.previous_verified_mints!==16
 ||request.remaining_neutral_mints!==176
 ||request.source_artifact_id!==original.artifact_id
 ||request.max_public_http_gets!==200
 ||!Number.isInteger(request.pacing_ms)
 ||request.pacing_ms<14000||request.pacing_ms>30000
 ||request.one_retry_on_429_or_503!==true
 ||request.read_only!==true
 ||request.no_winners_as_discovery_input!==true
 ||request.no_october_asof_promotion!==true
 ||request.no_paid_api_or_wallet!==true
 ||request.no_trade_or_state_writes!==true)
 throw Error('R29_V25_INVALID_USER_APPROVED_RESEARCH_CONTRACT');
const originalProtected=[
 resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),
  'state.json'))];
const before=await fingerprintProtectedFiles(originalProtected);
const prior=await readFile('probe-artifacts/neutral-source-v2/2026-10-11.json');
const day=await readFile('probe-artifacts/neutral-source-v2/2026-10-12.json');
if(sha(prior)!==original.day_11_sha256||sha(day)!==original.day_12_sha256)
 throw Error('R29_V25_PINNED_ORIGINAL_NEUTRAL_ARCHIVE_SHA_CHANGED');
const retro=auditRetrospectiveNeutral24HourlySource({
 priorDay:JSON.parse(prior),tradingDay:JSON.parse(day),
 artifactDownloadedAtUtc:new Date().toISOString()});
const plan=planV25NeutralRemaining176({retrospective:retro});
if(plan.requests.length!==176||plan.hour_indices.length!==22)
 throw Error('R29_V25_WRONG_NEUTRAL_176_REPLAY_UNIVERSE');
const base='probe-artifacts/v25-neutral-176-'+run;
await mkdir(base,{recursive:true});
await writeFile(base+'/research-request.json',JSON.stringify({
 ...request,source_commit:commit,workflow_run_id:run,
 source_request_path:files[0],source_request_sha256:sha(await readFile(files[0]))
},null,2)+'\n',{flag:'wx'});
await writeFile(base+'/planned-176-mints.json',JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
const records=[];
let used=0,previousWasRateLimited=false,rateLimitedEvents=0;
let stoppedByBackpressure=false,stopReason=null;
const begun=Date.now();
async function requestSource(q,attempt){
 if(used>=200)throw Error('R29_V25_PUBLIC_GET_CAP_EXCEEDED');
 used++;
 let raw_text='',http_status=0;
 try{
  const response=await fetch(q.url,{
   method:'GET',
   headers:{accept:'application/json;version=20230203',
    'user-agent':'r29-neural-postevent-research/1.0'},
   signal:AbortSignal.timeout(18000)});
  http_status=response.status;
  const buf=Buffer.from(await response.arrayBuffer());
  if(buf.length>3_000_000)throw Error('PUBLIC_RESPONSE_TOO_LARGE');
  raw_text=buf.toString('utf8');
 }catch(e){
  http_status=0;
  raw_text=JSON.stringify({local_source_gap:true,
   error:e?.name==='TimeoutError'?'PUBLIC_GET_TIMEOUT':
    e?.message==='PUBLIC_RESPONSE_TOO_LARGE'?'RESPONSE_TOO_LARGE':
    'PUBLIC_PROVIDER_UNAVAILABLE'});
 }
 const receipt={url:q.url,method:'GET',
  captured_at_utc:new Date().toISOString(),http_status,raw_text,
  raw_sha256:sha(raw_text)};
 const filename='hour-'+String(q.sample_hour_index).padStart(2,'0')+
  '-row-'+q.row_index+'-attempt-'+attempt+'.raw.json';
 await writeFile(base+'/'+filename,raw_text,{flag:'wx'});
 return {receipt,filename};
}
async function checkpoint(lastHour){
 const body=reconcileV25NeutralResearch({plan,results:records});
 await writeFile(base+'/checkpoint.json',JSON.stringify({
  ...body,source_commit:commit,github_run_id:run,
  source_archive_id:original.artifact_id,
  source_archive_12_oct_sha256:original.day_12_sha256,
  http_get_attempts_including_retries:used,
  provider_rate_limit_events:rateLimitedEvents,
  remaining_unattempted:body.unattempted_mints,
  stopped_by_backpressure:stoppedByBackpressure,
  stop_reason:stopReason,
  previous_16_exact_current_mint_pool_identifications_unmodified:true,
  all_actual_captures_happened_after_october:true,
  completed_in_this_runner:body.unattempted_mints===0
 },null,2)+'\n');
 console.log('R29_V25_176_SOURCE_PROGRESS',JSON.stringify({
  last_completed_hour:lastHour,
  inspected_rows:body.submitted_source_receipts,
  new_current_pool_identifications:body.additional_mints_with_current_exact_pool,
  current_exact_mint_pool_mints_including_prior_16:
   body.combined_current_exact_mint_pool_mints,
  unresolved_unattempted:body.unattempted_mints,
  http_get_attempts:used,provider_429_503:rateLimitedEvents,
  original_october_asof_evidence_added:0,actual_client_orders:0
 }));
}
for(const q of plan.requests){
 if(used>=200){
  stoppedByBackpressure=true;stopReason='HTTP_REQUEST_BUDGET_REACHED';
  break;
 }
 // Do not hammer shared public endpoints after an API throttling signal.
 if(previousWasRateLimited)await sleep(90000);
 else if(used>0)await sleep(request.pacing_ms);
 let r=await requestSource(q,0);
 let backpressure=r.receipt.http_status===429||r.receipt.http_status===503;
 if(backpressure){
  rateLimitedEvents++;
  console.log('R29_V25_PROVIDER_BACKPRESSURE',JSON.stringify({
   hour:q.sample_hour_index,row:q.row_index,
   status:r.receipt.http_status,retry_after_cooldown:true}));
  await sleep(90000);
  if(used>=200){stoppedByBackpressure=true;stopReason='RETRY_BUDGET_REACHED';break;}
  r=await requestSource(q,1);
  backpressure=r.receipt.http_status===429||r.receipt.http_status===503;
  if(backpressure)rateLimitedEvents++;
 }
 const assessed=interpretV24GeckoHourlyResponse({query:q,receipt:r.receipt});
 records.push({...assessed,row_index:q.row_index,
  actual_http_raw_filename:r.filename});
 previousWasRateLimited=backpressure;
 if(backpressure){
  // Stop and preserve a resume manifest, rather than burn further calls.
  stoppedByBackpressure=true;
  stopReason='REPEATED_429_OR_503_PROVIDER_LIMIT';
 }
 if(q.row_index===7||backpressure)await checkpoint(q.sample_hour_index);
 if(backpressure)break;
 // A hard, conservative duration guard preserves data rather than timing out.
 if(Date.now()-begun>80*60*1000){
  stoppedByBackpressure=true;stopReason='RESEARCH_TIME_GUARD';
  break;
 }
}
await checkpoint(records.at(-1)?.historical_hour_index??null);
const report=reconcileV25NeutralResearch({plan,results:records});
await writeFile(base+'/final-audit.json',JSON.stringify({
 ...report,source_commit:commit,workflow_run_id:run,
 source_request_path:files[0],original_neutral_source_artifact_id:original.artifact_id,
 original_neutral_source_12oct_sha256:original.day_12_sha256,
 used_public_gets_including_retries:used,
 provider_throttling_events:rateLimitedEvents,
 cleanly_stopped_on_repeated_rate_limit:stoppedByBackpressure,
 stop_reason:stopReason,
 all_records_maintain_november_capture_provenance:true,
 winner_reference_65_post_event_never_consulted:true,
 historical_trading_qa04_accepted:false,
 trade_signals_published:0,
 wallet_changes:0
},null,2)+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,
 await fingerprintProtectedFiles(originalProtected));
console.log('R29_V25_NEUTRAL_176_SOURCE_RESEARCH_FINISHED',JSON.stringify({
 actual_http_gets:used,inspected_rows:records.length,
 newly_current_identified_mints:report.additional_mints_with_current_exact_pool,
 total_current_known_neutral_mints:report.combined_current_exact_mint_pool_mints,
 remaining_unattempted:report.unattempted_mints,
 stopped_by_rate_limit:stoppedByBackpressure,
 stop_reason:stopReason,
 original_october_asof_discovery_or_eligible_trades:0,
 actual_gpt_dot_decisions:0,client_orders:0,
 report_path:base+'/final-audit.json'
}));
