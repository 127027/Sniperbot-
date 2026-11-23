// R29 V2.4: one source-pinned 8-mint neutral October scan cohort per
// EXPLICIT GitHub request. Pace <=~9 calls/min, no API key, no trades.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {R29_PINNED_NEUTRAL_OCT_SOURCE as original,
 auditRetrospectiveNeutral24HourlySource}
 from '../src/v19-retrospective-neutral-source-overlay.mjs';
import {planV24GeckoHourlySlice,interpretV24GeckoHourlyResponse,
 deferV24AfterRateLimit,summarizeV24GeckoHourlySlice}
 from '../src/v24-gecko-neutral-hourly-queue.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';
const branch='refs/heads/codex/r29-cleanroom-paper-20261121';
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!==branch||!/^[0-9a-f]{40}$/.test(commit||'')
 ||!/^[0-9]{1,20}$/.test(run||''))
 throw Error('V24_EXPLICIT_RESEARCH_RUN_REQUIRED');
const files=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const requests=files.filter(x=>
 /^research\/gecko-neutral-hourly-requests\/2026-11-23\/[A-Za-z0-9_-]+\.json$/.test(x));
if(files.length!==1||requests.length!==1)
 throw Error('V24_REQUIRES_ONE_ONLY_REQUEST_COMMIT');
const requested=JSON.parse(await readFile(requests[0],'utf8'));
const hour=requested.hour_index;
if(requested?.schema!==1
 ||requested.kind!=='R29_V24_EXPLICIT_NEUTRAL_GECKO_8_MINT_HOURLY_RESEARCH'
 ||requested.historical_date!=='2026-10-12'
 ||!Number.isInteger(hour)||hour<0||hour>23
 ||requested.max_public_http_requests!==8
 ||!Number.isInteger(requested.pacing_interval_ms)
 ||requested.pacing_interval_ms<6500||requested.pacing_interval_ms>30000
 ||requested.read_only!==true
 ||requested.no_winner_oracle_seed!==true
 ||requested.no_historical_asof_claim!==true
 ||requested.no_api_key_or_wallet!==true
 ||requested.no_trade_writes!==true
 ||requested.original_source_artifact_id!==original.artifact_id)
 throw Error('V24_RESEARCH_HOURLY_REQUEST_INVALID');
const sha=x=>createHash('sha256').update(x).digest('hex');
const protectedFiles=[
 resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(protectedFiles);
const base='probe-artifacts/neutral-source-v2/';
const prior=await readFile(base+'2026-10-11.json');
const trading=await readFile(base+'2026-10-12.json');
if(sha(prior)!==original.day_11_sha256||sha(trading)!==original.day_12_sha256)
 throw Error('V24_PINNED_NEUTRAL_ARCHIVE_CHANGED');
const retro=auditRetrospectiveNeutral24HourlySource({
 priorDay:JSON.parse(prior),tradingDay:JSON.parse(trading),
 artifactDownloadedAtUtc:new Date().toISOString()});
const plan=planV24GeckoHourlySlice({retrospective:retro,hour,
 rowIndexes:requested.row_indexes??null});
const dir='probe-artifacts/v24-neutral-gecko-hour-'+String(hour).padStart(2,'0')+'-'+run;
await mkdir(dir,{recursive:true});
await writeFile(dir+'/source-plan.json',JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
const out=[];
let haltForRateLimit=false;
for(const q of plan.requests){
 if(haltForRateLimit){
  const deferred=deferV24AfterRateLimit({query:q});
  out.push(deferred);
  console.log('R29_V24_DEFERRED_AFTER_429',JSON.stringify({
   hour,source_row:q.row_index,mint:q.mint,
   provider_request_performed:false,orders:0}));
  continue;
 }
 let http_status=0,raw_text='';
 try{
  const r=await fetch(q.url,{method:'GET',
   headers:{accept:'application/json;version=20230203',
    'user-agent':'r29-retrospective-neutral-research-only/1.0'},
   signal:AbortSignal.timeout(15000)});
  http_status=r.status;
  const raw=Buffer.from(await r.arrayBuffer());
  if(raw.length>3_000_000)throw Error('PUBLIC_RESPONSE_TOO_LARGE');
  raw_text=raw.toString('utf8');
 }catch(err){http_status=0;raw_text=JSON.stringify({
  local_source_gap:true,error:err?.name==='TimeoutError'?'TIMEOUT':'PUBLIC_SOURCE_UNAVAILABLE'});}
 const receipt={url:q.url,method:'GET',http_status,
  captured_at_utc:new Date().toISOString(),raw_text,
  raw_sha256:sha(raw_text)};
 await writeFile(dir+'/gecko-'+q.row_index+'.raw.json',raw_text,{flag:'wx'});
 const assessed=interpretV24GeckoHourlyResponse({query:q,receipt});
 out.push(assessed);
 if(http_status===429||http_status===503)haltForRateLimit=true;
 console.log('R29_V24_NEUTRAL_SOURCE_RESPONSE',JSON.stringify({
  historical_hour:hour,source_row:q.row_index,
  mint:q.mint,http_status,status:assessed.status,
  current_exact_pool_count:assessed.return_pools.length,
  raw_sha256:receipt.raw_sha256,
  original_october_asof_discovery:false,orders:0}));
 // Official Gecko documentation also describes approximately 10/min.
 // Use slower conservative cap instead of exhaustively retrying 429s.
 if(!haltForRateLimit&&q!==plan.requests.at(-1))
  await new Promise(resolve=>setTimeout(resolve,requested.pacing_interval_ms));
}
const summary=summarizeV24GeckoHourlySlice({plan,observations:out});
const report={...summary,source_commit:commit,workflow_run_id:run,
 neutral_source_actions_run:original.actions_run_id,
 neutral_source_artifact_id:original.artifact_id,
 pinned_trading_day_sha256:original.day_12_sha256};
await writeFile(dir+'/audit.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(protectedFiles));
console.log('R29_V24_NEUTRAL_HOURLY_COMPLETE',JSON.stringify({
 hour,read_only_queries:report.public_provider_requests,
 originally_requested_mints:plan.sample_mints,
 deferred_requests:report.unattempted_due_to_provider_rate_limit,
 http200:report.http200,
 current_identified_mints:report.currently_identifiable_mints,
 current_pool_links:report.currently_identifiable_pool_links,
 unresolved_mints:report.unknown_current_identity_mints,
 original_october_market_truth:false,orders:0,
 report:dir+'/audit.json'}));
