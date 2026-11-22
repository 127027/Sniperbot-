// ONE triggered capture per dot2 request. No orders, no secrets, no paid market APIs.
// Produces immutable raw public API response + validated evidence for future Dots.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {validateCaptureRequest,decodeGeckoNewPools,crossCheckDexPair,
 fromDexPairOnly,collectSampleMetrics,sha256} from '../src/discovery-feed.mjs';
import {canonicalChain,poolValid} from '../src/market-evidence.mjs';
import {makeResearchHandoff} from '../src/feed-handoff.mjs';
import {emptyDot3RecheckState,planDot3EvidenceRechecks} from '../src/v19-dot3-recheck-scheduler.mjs';
import {summarizeDot3RiskStatuses} from '../src/v19-dot3-risk-status.mjs';
import {buildDot5DiscoveryLedger} from '../src/v19-dot5-event-ledger.mjs';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {fairRecheckPlan,recordRecheckAttempt} from '../src/discovery-fair-queue.mjs';
import {makeCaptureObservationBatch,scoreAsOf,labelAfterHorizon} from '../src/forward-learning.mjs';
import {makeAsOfForecastSnapshot,settleMatureForecastSnapshot} from '../src/forward-oracle-journal.mjs';
import {chooseNextDiscoveryPage} from '../src/discovery-page-scheduler.mjs';
import {recoverArchivedV4} from '../src/v18-archived-v4-recovery.mjs';
import {planMultiChainCapture} from '../src/v19-discovery-budget-plan.mjs';
import {planHotFairRechecks} from '../src/v19-hot-fair-recheck.mjs';
import {planEvidenceRepairRechecks} from '../src/v19-evidence-repair-queue.mjs';
import {summarizeRecheckService} from '../src/v19-recheck-service-metrics.mjs';
import {providerRetryDelay} from '../src/v19-provider-backoff.mjs';
import {measureDot1Activity} from '../src/v19-market-activity.mjs';
import {emptyPageCoverage,updatePageCoverage} from '../src/v19-page-coverage.mjs';
import {advanceAdaptiveCadence} from '../src/v19-adaptive-cadence.mjs';
import {makeGeckoOhlcvRequest,decodeGeckoOhlcv} from '../src/v19-gecko-ohlcv.mjs';
import {emptyOhlcvBackfillState,planOhlcvBackfill,recordOhlcvBackfill} from '../src/v19-ohlcv-backfill-queue.mjs';
import {auditCaptureEvidenceBundle} from '../src/v19-source-integrity.mjs';
import {emptyOlderPoolState,planOlderPoolCaptures,decodeOlderPoolPage,recordOlderPoolCapture} from '../src/v19-older-pool-discovery.mjs';
import {planGeckoRequestPacing} from '../src/v19-gecko-pacing.mjs';
import {activeGeckoProviderCooldown} from '../src/v19-gecko-provider-cooldown.mjs';
import {summarizeR29OperatingMeasurements} from '../src/v19-operating-measurements.mjs';
import {emptyProviderBudgetState,reserveProviderRequest,recordProviderResponse,
 summarizeProviderBudget} from '../src/v19-provider-budget.mjs';
import {planIndependentObservations} from '../src/v19-independent-observation-schedule.mjs';
import {summarizeCumulativeScanProgress} from '../src/v19-cumulative-scan-progress.mjs';
import {enrichPersistentMarketIdentity} from '../src/v19-canonical-market-identity.mjs';
import {selectObservationArchivePaths,parseResearchJsonWithLegacyTrailer}
 from '../src/v19-observation-archive-reader.mjs';

const b='codex/r29-cleanroom-paper-20261121';
if(process.env.GITHUB_REF&&process.env.GITHUB_REF!=='refs/heads/'+b)throw Error('WRONG_BRANCH');
const sha=process.env.GITHUB_SHA;
if(!sha||!/^[0-9a-f]{40}$/.test(sha))throw Error('MISSING_COMMIT_SHA');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',sha],{encoding:'utf8'})
 .trim().split(/\r?\n/).filter(x=>/^research\/requests\/20\d{2}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\.json$/.test(x));
if(changed.length!==1)throw Error('EXPECTED_ONE_REQUEST_FILE');
const path=changed[0];
const request=validateCaptureRequest(JSON.parse(await readFile(path,'utf8')));
const runId=process.env.GITHUB_RUN_ID;
if(!/^\d+$/.test(runId||''))throw Error('MISSING_RUN_ID');
const root='research/feeds/'+new Date(request.created_at_utc).toISOString().slice(0,10)+'/'+runId;
await mkdir(root,{recursive:true});
const now=()=>new Date().toISOString();
const fetches=[],dexChecks=[],fallback=[],rechecked=[],artifacts=[];
let lastGeckoStartedMs=null;
let runGeckoRetryAtUtc=null;
let precedingMemory,olderState,ohlcvState,providerBudget;
const providerBudgetPath='research/state/provider-budget.json';
const providerLane=(provider,url)=>provider==='DEXSCREENER'?'PAIR':
  url.includes('/trending_pools')?'TRENDING':
  url.includes('/ohlcv/')?'OHLCV':'NEW_POOLS';
const deferredByProviderBudget=e=>{
 const m=String(e?.message||e);
 return m==='GECKO_PROVIDER_429_COOLDOWN_NOT_ELAPSED'
  ||m==='PROVIDER_PROVIDER_COOLDOWN'
  ||m==='PROVIDER_REQUEST_ALREADY_RESERVED';
};
const geckoBlock=()=>{
 const inherited=activeGeckoProviderCooldown({
  checkpoints:precedingMemory?.checkpoints||{},
  olderCheckpoints:olderState?.checkpoints||{},
  ohlcvMarkets:ohlcvState?.markets||{},atUtc:now(),
  runRetryAtUtc:runGeckoRetryAtUtc
 });
 const until=Date.parse(providerBudget?.providers?.GECKOTERMINAL?.cooldown_until_utc||'');
 if(Number.isFinite(until)&&until>Date.now()&&
    (!inherited.active||until>Date.parse(inherited.retry_not_before_utc)))
   return {...inherited,active:true,http_requests_authorized:false,
    retry_not_before_utc:new Date(until).toISOString(),source:'PERSISTENT_SHARED_PROVIDER_BUDGET'};
 return inherited;
};
async function fetchRaw(url,provider,fileName){
 if((provider==='GECKOTERMINAL'||provider==='GECKOTERMINAL_OHLCV')
    &&geckoBlock().active)
   throw Error('GECKO_PROVIDER_429_COOLDOWN_NOT_ELAPSED');
 const pacing=planGeckoRequestPacing({
   provider,nowEpochMs:Date.now(),
   lastGeckoStartedEpochMs:lastGeckoStartedMs
 });
 if(pacing.wait_ms>0)
   await new Promise(resolve=>setTimeout(resolve,pacing.wait_ms));
 // All Gecko family endpoints share one provider pacing window.
 // Successful HTTP replies, 429 errors and failed attempts count alike.
 const lane=providerLane(provider,url),requestId=runId+':'+provider+':'+fileName;
 // Real rolling-window and endpoint reservations are shared between jobs.
 // If the minute budget is full, wait for the next slot instead of
 // treating an unattempted page as an HTTP error.
 for(;;){
   if((provider==='GECKOTERMINAL'||provider==='GECKOTERMINAL_OHLCV')
      &&geckoBlock().active)throw Error('GECKO_PROVIDER_429_COOLDOWN_NOT_ELAPSED');
   const grant=reserveProviderRequest({state:providerBudget,provider,lane,
     asOfUtc:now(),requestId});
   if(grant.gate.allowed){providerBudget=grant.state;break;}
   if(grant.gate.reason!=='ROLLING_WINDOW_BUDGET')
     throw Error('PROVIDER_'+grant.gate.reason);
   await new Promise(resolve=>setTimeout(resolve,Math.max(1,grant.gate.wait_ms)));
 }
 const actualStartMs=Date.now();
 if(pacing.subject_to_gecko_pacing)lastGeckoStartedMs=actualStartMs;
 const started=new Date(actualStartMs).toISOString();
 let response,text;
 try{
   response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(16000)});
   text=await response.text();
 }catch(error){
   providerBudget=recordProviderResponse({state:providerBudget,provider,lane,
     requestId,asOfUtc:now(),httpStatus:null});
   throw error;
 }
 const received=now();
 providerBudget=recordProviderResponse({state:providerBudget,provider,lane,
   requestId,asOfUtc:received,httpStatus:response.status,
   retryAfter:response.headers?.get?.('retry-after')||null});
 const evidence={provider,url,started_at_utc:started,received_at_utc:received,
  http_status:response.status,http_ok:response.ok,
  retry_after_header:response.headers?.get?.('retry-after')||null,
  gecko_request_spacing_wait_ms:pacing.wait_ms,
  gecko_minimum_start_separation_ms:pacing.subject_to_gecko_pacing
    ?pacing.minimum_start_separation_ms:null,
  response_sha256:sha256(text),
  raw_bytes_utf8:Buffer.byteLength(text,'utf8'),body_path:root+'/'+fileName};
 // Store response as received including error responses; never alter/repair timestamps.
 await writeFile(evidence.body_path,text,'utf8');
 artifacts.push(evidence.body_path);fetches.push(evidence);
 if(!response.ok)throw Error('HTTP_'+response.status);
 try{return {json:JSON.parse(text),evidence};}
 catch{throw Error('INVALID_JSON_RESPONSE');}
}
// Existing Dot2 runner, but all six chains can now share a bounded request.
// A capture *plan* is not evidence that each planned page was received.
const memoryFile='research/state/market-memory.json';
try{precedingMemory=JSON.parse(await readFile(memoryFile,'utf8'));}
catch(err){if(err.code!=='ENOENT')throw err;precedingMemory=emptyMarketMemory();}
const coverageStatePath='research/state/page-coverage.json';
let pageCoverage;
try{pageCoverage=JSON.parse(await readFile(coverageStatePath,'utf8'));}
catch(error){if(error.code!=='ENOENT')throw error;pageCoverage=emptyPageCoverage();}
const olderStatePath='research/state/older-pool-captures.json';
try{olderState=JSON.parse(await readFile(olderStatePath,'utf8'));}
catch(err){if(err.code!=='ENOENT')throw err;olderState=emptyOlderPoolState();}
const ohlcvStatePath='research/state/ohlcv-backfill.json';
try{ohlcvState=JSON.parse(await readFile(ohlcvStatePath,'utf8'));}
catch(err){if(err.code!=='ENOENT')throw err;ohlcvState=emptyOhlcvBackfillState();}
try{providerBudget=JSON.parse(await readFile(providerBudgetPath,'utf8'));}
catch(err){if(err.code!=='ENOENT')throw err;providerBudget=emptyProviderBudgetState();}
const capturePlan=planMultiChainCapture({
 networks:request.networks,checkpoints:precedingMemory.checkpoints,
 pageCoverage,budget:request.max_gecko_requests-(request.max_ohlcv_requests??0)
   -(request.max_older_pool_requests??0),asOfUtc:now()});
const receivedPages=[],failedPages=[],deferredPages=[];
// Global provider throttle: every planned but unattempted page becomes
// durable backlog even after a mid-run 503/network/429 provider cooldown.
for(let i=0;i<capturePlan.tasks.length;i++){
 const beforeRequestBlock=geckoBlock();
 if(beforeRequestBlock.active){
   deferredPages.push(...capturePlan.tasks.slice(i).map(task=>({
     ...task,reason:'PROVIDER_COOLDOWN_NOT_HTTP_ATTEMPTED',
     retry_after_utc:beforeRequestBlock.retry_not_before_utc
   })));
   break;
 }
 const task=capturePlan.tasks[i],chain=task.chain,page=task.page;
 const network=chain==='ethereum'?'eth':chain==='cronos'?'cro':chain;
 const url='https://api.geckoterminal.com/api/v2/networks/'+network
   +'/new_pools?include=base_token,quote_token&page='+page;
 const fileName='gecko-'+chain+'-page'+page+'.raw.json';
 const fullPath=root+'/'+fileName;
 try{
   const got=await fetchRaw(url,'GECKOTERMINAL',fileName);
   const pageData=decodeGeckoNewPools({network:chain,response:got.json,
     capturedAtUtc:got.evidence.received_at_utc,page});
   receivedPages.push({chain,page,reason:task.reason,decoded:pageData,
     sourcePath:got.evidence.body_path,sourceSha256:got.evidence.response_sha256,
     capturedAtUtc:got.evidence.received_at_utc});
 }catch(error){
   // A provider-budget veto is NOT a failed HTTP request. Preserve this
   // page and all remaining planned pages as unattempted durable backlog.
   if(deferredByProviderBudget(error)){
     const until=geckoBlock().retry_not_before_utc;
     deferredPages.push({chain,page,reason:'PROVIDER_BUDGET_DEFERRED',
       retry_after_utc:until});
     deferredPages.push(...capturePlan.tasks.slice(i+1).map(task=>({
       ...task,reason:'PROVIDER_BUDGET_DEFERRED',retry_after_utc:until
     })));
     break;
   }
   const prior=fetches.findLast(x=>x.body_path===fullPath);
   const status=prior?.http_status===429?'HTTP_429':
     prior?.http_ok===true?'DECODE_ERROR':
     prior?.http_status?'HTTP_'+prior.http_status:'SOURCE_ERROR';
   const attemptTime=prior?.received_at_utc||now();
   const backoff=providerRetryDelay({
     httpStatus:prior?.http_ok===true?null:(prior?.http_status||null),
     previousFailures:precedingMemory.checkpoints[chain+':GECKOTERMINAL']?.consecutive_failures||0,
     retryAfter:prior?.retry_after_header||null,atUtc:attemptTime});
   // When no HTTP body exists, record a unique immutable error receipt.
   // Never claim that an unfetched pool page was successfully archived.
   const attemptPath=prior?.body_path||root+'/gecko-'+chain+'-page'+page+'.error.json';
   if(!prior){
     await writeFile(attemptPath,JSON.stringify({schema:1,kind:'R29_V19_GECKO_FETCH_ERROR',
       chain,page,attempt_at_utc:attemptTime,url,error:String(error?.message||error).slice(0,100),
       response_body_received:false,trade_authorized:false},null,2)+'\n','utf8');
     artifacts.push(attemptPath);
   }
   failedPages.push({chain,page,status,sourcePath:attemptPath,
     capturedAtUtc:attemptTime,retryAfterUtc:backoff.next_retry_at_utc});
   if(prior)prior.error=String(error?.message||error).slice(0,100);
   else fetches.push({provider:'GECKOTERMINAL',url,error:String(error?.message||error).slice(0,100)});
   if(status==='HTTP_429'){
     runGeckoRetryAtUtc=backoff.next_retry_at_utc;
     // Back off for the remaining work; persistent checkpoint retains
     // failed attempt so other chains can be serviced next time.
     deferredPages.push(...capturePlan.tasks.slice(i+1));
     break;
   }
 }
}
// Optional older/trending pool discovery: same Dot2 and public Gecko request budget.
const olderPlan=planOlderPoolCaptures({state:olderState,networks:request.networks,
 asOfUtc:now(),maxRequests:request.max_older_pool_requests??0});
const olderPages=[],olderFailures=[];
for(const job of olderPlan.tasks){
 if(geckoBlock().active){
  olderFailures.push({chain:job.chain,duration:job.duration,
   status:'DEFERRED_PROVIDER_429',
   retry_after_utc:geckoBlock().retry_not_before_utc});
  continue;
 }
 const fileName='gecko-'+job.chain+'-trending-'+job.duration+'.raw.json';
 try{
  const result=await fetchRaw(job.url,'GECKOTERMINAL',fileName);
  const decodedOlder=decodeOlderPoolPage({network:job.chain,response:result.json,
    capturedAtUtc:result.evidence.received_at_utc,page:job.page,duration:job.duration});
  olderPages.push({job,decoded:decodedOlder,sourcePath:result.evidence.body_path,
    sourceSha256:result.evidence.response_sha256,
    capturedAtUtc:result.evidence.received_at_utc});
  olderState=recordOlderPoolCapture({state:olderState,task:job,status:'OK',
    capturedAtUtc:result.evidence.received_at_utc,
    sourceRawPath:result.evidence.body_path,sourceSha256:result.evidence.response_sha256});
 }catch(err){
  if(deferredByProviderBudget(err)){
    olderFailures.push({chain:job.chain,duration:job.duration,
      status:'DEFERRED_PROVIDER_429',
      retry_after_utc:geckoBlock().retry_not_before_utc,
      reason:'NO_HTTP_REQUEST_BUDGET_VETO'});
    continue;
  }
  const prior=fetches.findLast(x=>x.provider==='GECKOTERMINAL'&&x.url===job.url);
  const status=prior?.http_status===429?'HTTP_429':'ERROR',when=prior?.received_at_utc||now();
  const wait=providerRetryDelay({httpStatus:prior?.http_status||null,
    previousFailures:olderState.checkpoints[job.chain]?.failures||0,
    retryAfter:prior?.retry_after_header||null,atUtc:when});
  olderState=recordOlderPoolCapture({state:olderState,task:job,status,
    capturedAtUtc:when,retryAfterUtc:wait.next_retry_at_utc});
  olderFailures.push({chain:job.chain,duration:job.duration,status,
    retry_after_utc:wait.next_retry_at_utc});
  if(status==='HTTP_429')runGeckoRetryAtUtc=wait.next_retry_at_utc;
 }
}
await writeFile(olderStatePath,JSON.stringify(olderState,null,2)+'\n','utf8');
const olderCandidates=olderPages.flatMap(p=>p.decoded.candidates);
const decoded=receivedPages.length?{
 schema:1,network:'MULTI_CHAIN',page:null,
 found_count:receivedPages.reduce((n,x)=>n+x.decoded.found_count,0),
 rejected_count:receivedPages.reduce((n,x)=>n+x.decoded.rejected_count,0),
 requested_pool_count:receivedPages.reduce((n,x)=>n+(x.decoded.requested_pool_count||0),0),
 candidates:receivedPages.flatMap(x=>x.decoded.candidates),
 // Preserve all parser rejects across chain/page, even unsupported V4 pools.
 rejected:receivedPages.flatMap(x=>(x.decoded.rejected||[]).map(r=>({
   ...r,chain:x.chain,source_page:x.page,source_raw_path:x.sourcePath,
   source_http_captured_at_utc:x.capturedAtUtc
 }))),
 captured_at_utc:now()
}:null;
const chosen={chain:receivedPages[0]?.chain||capturePlan.tasks[0]?.chain||'UNKNOWN',
 rotation:null};
const scanPage=receivedPages[0]?.page||capturePlan.tasks[0]?.page||null;
const pageDecision={page:scanPage,reason:'V19_BOUNDED_MULTI_CHAIN_CAPTURE',
 gap_known:capturePlan.not_scheduled.length>0||deferredPages.length>0};
const incoming=JSON.parse(await readFile('research/latest/dot-2.json','utf8'));
const known=Array.isArray(incoming?.candidates)?incoming.candidates:[];
const memoryPath='research/state/market-memory.json';
let memory=precedingMemory;
// One-time provenance-checked rescue of a documented 22 Nov Base V4 parser loss.
// The original HTTP time is preserved; no retroactive Dot2 discovery or fresh quote.
const archivedRoot='research/feeds/2026-11-22/44997708364/';
const archivedRawPath=archivedRoot+'gecko-base-page3.raw.json';
const archivedEvidencePath=archivedRoot+'evidence.json';
const recoveredPath=archivedRoot+'v18-recovered-v4.json';
let recoveredV4Count=0,recoveryError=null;
if(!memory.ingested_sources?.includes(recoveredPath)){
 try{
   const [rawText,rawEvidence]=await Promise.all([
     readFile(archivedRawPath,'utf8'),readFile(archivedEvidencePath,'utf8')
   ]);
   const recovery=recoverArchivedV4({rawText,evidence:JSON.parse(rawEvidence),rawPath:archivedRawPath});
   const archived={...recovery,recovered_at_utc:now()};
   const recoveryFileText=JSON.stringify(archived,null,2)+'\n';
   await writeFile(recoveredPath,recoveryFileText,'utf8');
   artifacts.push(recoveredPath);
   // sourcePath points to the *derived* file, so its digest must be the
   // derived file's SHA; the original raw SHA remains in archived metadata.
   const merged=mergeMemory(memory,{candidates:recovery.candidates,
     sourcePath:recoveredPath,sourceCapturedAtUtc:recovery.originally_raw_captured_at_utc,
     sourceSha256:sha256(recoveryFileText),
     chain:'base',page:3,provider:'GECKOTERMINAL_ARCHIVE_RECOVERY',fetchStatus:'ARCHIVED_ONLY'});
   memory=merged.memory;
   recoveredV4Count=merged.added;
 }catch(error){
   recoveryError=String(error?.message||error).slice(0,160);
   fetches.push({provider:'GECKOTERMINAL_ARCHIVE_RECOVERY',error:recoveryError});
 }
}
const plan=fairRecheckPlan(memory,{asOfUtc:now(),maxRechecks:request.max_dex_pairs});
// D2-04: old but real as-of captured observations provide a repair queue
// when only one price / a distant comparison exists. Only historic batches
// already on disk before this capture are eligible; no Excel/oracle inputs.
const repairHistory=[];
try{
 const paths=selectObservationArchivePaths({
  paths:await readdir('research/observations',{recursive:true}),kind:'FORWARD',limit:200});
 for(const rel of paths){
  try{
   const b=JSON.parse(await readFile('research/observations/'+rel,'utf8'));
   if(b.kind==='R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS')repairHistory.push(b);
  }catch{/* malformed source is never a current breakout signal */}
 }
}catch(error){if(error.code!=='ENOENT')throw error;}
const repairAsOfUtc=now();
const repairRanking=scoreAsOf({batches:repairHistory,asOfUtc:repairAsOfUtc,
 maxCandidates:100000});
const repairProposal=planEvidenceRepairRechecks({ranking:repairRanking,memory,
 asOfUtc:repairAsOfUtc,maxCandidates:100});
// Every fresh candidate is ranked before a bounded DEX crosscheck; unselected
// ones still enter persistent memory and must not be silently lost.
const recheckPlan=planHotFairRechecks({
 freshCandidates:[...(decoded?.candidates||[]),...olderCandidates],fairCandidates:plan.candidates,
 legacyCandidates:known,repairCandidates:repairProposal.selected,
 asOfUtc:now(),maxChecks:request.max_dex_pairs,
 round:Number(process.env.GITHUB_RUN_NUMBER)||0});
// Optional OHLCV history inside the EXISTING Gecko request budget; no other bot.
const ohlcvPlan=planOhlcvBackfill({state:ohlcvState,candidates:recheckPlan.selected,
 asOfUtc:now(),maxRequests:request.max_ohlcv_requests??0,limit:600});
const ohlcvResults=[];
for(const target of ohlcvPlan.targets){
 if(geckoBlock().active){
  ohlcvResults.push({key:target.key,status:'DEFERRED_PROVIDER_429',
   retry_after_utc:geckoBlock().retry_not_before_utc,trade_authorized:false});
  continue;
 }
 const q=makeGeckoOhlcvRequest({chain:target.chain,pool:target.pool,
  pool_kind:target.pool_kind,tokenContract:target.contract,
  beforeTimestamp:target.next_before_timestamp,limit:ohlcvPlan.limit});
 const safe=String(target.pool).replace(/[^a-zA-Z0-9]/g,'');
 const name='gecko-'+target.chain+'-'+safe+'-'+target.next_before_timestamp;
 try{
  const result=await fetchRaw(q.source_url,'GECKOTERMINAL_OHLCV',name+'.raw.json');
  const received=result.evidence.received_at_utc;
  const archive=decodeGeckoOhlcv({request:q,response:result.json,
    capturedAtUtc:received,asOfUtc:received,
    sourceRawPath:result.evidence.body_path,sourceSha256:result.evidence.response_sha256});
  const archivePath=root+'/'+name+'.research.json';
  await writeFile(archivePath,JSON.stringify(archive,null,2)+'\n','utf8');
  artifacts.push(archivePath);
  ohlcvState=recordOhlcvBackfill(ohlcvState,{target,page:archive,
    asOfUtc:received,status:'OK',sourceRawPath:result.evidence.body_path,
    sourceSha256:result.evidence.response_sha256});
  ohlcvResults.push({key:target.key,status:'ARCHIVED_RESEARCH_ONLY',
    raw_path:result.evidence.body_path,research_path:archivePath,
    candle_count:archive.decoded_candle_count,available_at_utc:received,
    trade_authorized:false});
 }catch(err){
  if(deferredByProviderBudget(err)){
    ohlcvResults.push({key:target.key,status:'DEFERRED_PROVIDER_429',
      retry_after_utc:geckoBlock().retry_not_before_utc,
      reason:'NO_HTTP_REQUEST_BUDGET_VETO',trade_authorized:false});
    continue;
  }
  const attempted=now();
  const response=fetches.findLast(x=>x.provider==='GECKOTERMINAL_OHLCV'&&x.url===q.source_url);
  const status=response?.http_status===429?'HTTP_429':
    response?.http_ok===true?'INVALID_RESPONSE':
    response?.http_status?'HTTP_ERROR':'SOURCE_ERROR';
  const delay=providerRetryDelay({httpStatus:response?.http_status||null,
    previousFailures:ohlcvState.markets[target.key]?.failed_pages||0,
    retryAfter:response?.retry_after_header||null,atUtc:attempted});
  if(status==='HTTP_429')runGeckoRetryAtUtc=delay.next_retry_at_utc;
  ohlcvState=recordOhlcvBackfill(ohlcvState,{target,status,asOfUtc:attempted,
    retryAfterUtc:delay.next_retry_at_utc});
  ohlcvResults.push({key:target.key,status,
    reason:String(err.message||err).slice(0,100),
    retry_after_utc:delay.next_retry_at_utc,trade_authorized:false});
 }
}
await writeFile(ohlcvStatePath,JSON.stringify(ohlcvState,null,2)+'\n','utf8');
const attempts=[];
const targets=recheckPlan.selected;
const unique=new Set();
for(const c of targets){
 if(dexChecks.length>=request.max_dex_pairs)break;
 const chain=canonicalChain(c.chain),pool=c.pool,poolKind=c.pool_kind||null;
 const key=chain+':'+pool;
 const checkedAt=now();
 if(!chain||!pool||unique.has(key))continue;
 unique.add(key);
 const providerChain=chain==='ethereum'?'ethereum':chain==='cronos'?'cronos':chain;
 const url='https://api.dexscreener.com/latest/dex/pairs/'+providerChain+'/'+pool;
 try{
  const data=await fetchRaw(url,'DEXSCREENER','dex-'+chain+'-'+String(pool).replace(/[^a-zA-Z0-9]/g,'')+'.raw.json');
  if(c.contract){
   const check=crossCheckDexPair({candidate:c,response:data.json,checkedAtUtc:data.evidence.received_at_utc});
   dexChecks.push({chain,pool,source:data.evidence.body_path,...check});
   if(check.matched===true&&Number.isFinite(check.dexscreener_price_usd)
     &&check.dexscreener_price_usd>0&&Number.isFinite(check.dexscreener_liquidity_usd)){
      rechecked.push({chain,pool,pool_kind:poolKind,contract:c.contract,symbol:c.symbol||null,
       pool_kind:c.pool_kind||null,
       observed_at_utc:data.evidence.received_at_utc,
       source_api:'DEXSCREENER_VERIFIED_RECHECK',
       source_raw_path:data.evidence.body_path,
       observed_price_usd:check.dexscreener_price_usd,
       liquidity_usd:check.dexscreener_liquidity_usd,
       volume_24h_usd:null,category:'RECHECK',
       trade_authorized:false});
   }
  }else{
   const rec=fromDexPairOnly({chain,pool,pool_kind:poolKind,response:data.json,capturedAtUtc:data.evidence.received_at_utc});
   dexChecks.push({chain,pool,source:data.evidence.body_path,status:rec.status,
    matched:!!rec.candidate});
   if(rec.candidate)fallback.push({...rec.candidate,source_raw_path:data.evidence.body_path});
  }
 }catch(error){
   // A DEX provider-budget veto did NOT query this pool. Leave its fair
   // cursor untouched for the next capture, never manufacture an attempt.
   if(deferredByProviderBudget(error))continue;
   dexChecks.push({chain,pool,status:'DEX_ERROR',
     error:String(error.message||error).slice(0,100)});
 }
 const latestCheck=dexChecks.at(-1);
 attempts.push({chain,pool,pool_kind:poolKind,checked_at_utc:checkedAt,status:latestCheck?.status||'UNKNOWN',
  source_path:latestCheck?.source||root+'/evidence.json'});
}
const metrics=collectSampleMetrics({geckoDecoded:decoded,dexChecks,fallbackCandidates:fallback,requests:fetches});
metrics.discovery_page=scanPage;
metrics.discovery_page_reason=pageDecision.reason;
// Explicit per-chain checkpoint provenance: the former single-chain
// 'oldCheckpoint' was removed when multi-chain capture was introduced.
metrics.previous_chain_page_checkpoint=receivedPages.length===1
  ?precedingMemory.checkpoints[receivedPages[0].chain+':GECKOTERMINAL']?.next_page_to_consider??null
  :null;
metrics.previous_chain_page_checkpoints=Object.fromEntries(
  request.networks.map(chain=>[chain,
    precedingMemory.checkpoints[chain+':GECKOTERMINAL']?.next_page_to_consider??null]));
metrics.verified_recheck_price_observations=rechecked.length;
metrics.v19_older_pool_discovery={requested_budget:request.max_older_pool_requests??0,
 attempted:olderPages.length+olderFailures.filter(x=>x.status!=='DEFERRED_PROVIDER_429').length,
 deferred_due_to_provider_429:olderFailures.filter(x=>x.status==='DEFERRED_PROVIDER_429').length,
 old_pool_watch_candidates:olderCandidates.filter(x=>x.category==='OLDER_POOL_WATCH').length,
 page_sources:olderPages.map(x=>x.sourcePath),failures:olderFailures,
 no_global_market_completeness_claim:true,no_buy_authorization:true};
metrics.v19_ohlcv_backfill={budget:request.max_ohlcv_requests??0,
 attempted:ohlcvResults.filter(x=>x.status!=='DEFERRED_PROVIDER_429').length,
 deferred_due_to_provider_429:ohlcvResults.filter(x=>x.status==='DEFERRED_PROVIDER_429').length,
 results:ohlcvResults,research_only:true};
metrics.v19_hot_fair_service=summarizeRecheckService({plan:recheckPlan,attempts,asOfUtc:now()});
// Selected != actually HTTP-attempted != exact-pair-matched != new price.
// The real EHUNT REPAIR response had zero DEX pairs, not a usable quote.
const repairKeys=new Set(recheckPlan.selected
 .filter(c=>c.queue==='EVIDENCE_REPAIR').map(c=>c.key));
const keyFor=(chain,pool)=>chain+':'+(chain==='solana'?pool:String(pool).toLowerCase());
const repairActualAttempts=attempts.filter(a=>repairKeys.has(keyFor(a.chain,a.pool)));
const repairActualDexResponses=dexChecks.filter(d=>repairKeys.has(keyFor(d.chain,d.pool)));
const repairTruePriceObservations=rechecked.filter(c=>repairKeys.has(keyFor(c.chain,c.pool)));
const repairStatusCounts={};
for(const result of repairActualDexResponses){
 const status=result.status||'UNKNOWN';
 repairStatusCounts[status]=(repairStatusCounts[status]||0)+1;
}
metrics.v19_evidence_repair_rechecks={
 source_observation_batches:repairHistory.length,
 as_of_utc:repairAsOfUtc,
 ranking_pool_count:repairRanking.counts.observed_unique_pools,
 eligible_repair_pool_count:repairProposal.all_due_candidates,
 offered_for_selection:repairProposal.selected.length,
 deferred_before_selection:repairProposal.deferred_count,
 selected_for_actual_dex_attempt:recheckPlan.repair_selected,
  actually_attempted_dex_checks:repairActualAttempts.length,
  actual_dex_response_count:repairActualDexResponses.length,
  exact_pair_responses:repairActualDexResponses.filter(x=>x.matched===true).length,
  new_observed_repair_prices:repairTruePriceObservations.length,
  attempt_status_counts:repairStatusCounts,
 skipped:repairProposal.skipped,
 no_provider_calls_claimed_from_proposal:true,
 no_oracle_winners:true,orders_authorized:0};
metrics.v19_hot_fair_recheck_plan={selected:recheckPlan.selected.map(x=>({chain:x.chain,pool:x.pool,queue:x.queue,research_score:x.research_score??null})),
  all_new_pool_count:recheckPlan.all_new_pool_count,deferred_new_pool_count:recheckPlan.deferred_new_pool_count,
  deferred_new_pool_keys:recheckPlan.deferred_new_pool_keys,
  deferred_repair_pool_keys:recheckPlan.deferred_repair_keys,
  repair_selected:recheckPlan.repair_selected,hot_selected:recheckPlan.hot_selected,
  fair_selected:recheckPlan.fair_selected,trade_authorized:false};
metrics.v19_chain_page_plan=capturePlan;
// A planned chain/page is not a successful HTTP capture. A one-request Dot2
// payload for six requested chains is a measurable research DATA_GAP, not
// evidence that other five chains were quiet or already fully scanned.
const actuallyReceivedChains=new Set(receivedPages.map(x=>x.chain));
metrics.v19_actual_chain_capture={
 requested_chains:[...request.networks],
 attempted_chains:[...new Set([...receivedPages,...failedPages].map(x=>x.chain))],
 http_success_chains:[...actuallyReceivedChains].sort(),
 http_success_chain_count:actuallyReceivedChains.size,
 chains_without_success_this_run:request.networks.filter(x=>!actuallyReceivedChains.has(x)),
 scheduled_request_budget:capturePlan.requested_budget,
 minimum_one_page_per_chain_budget:capturePlan.minimum_gecko_page_requests_for_one_attempt_per_chain,
 plan_was_underbudgeted:capturePlan.incomplete_chain_attempts_are_a_data_gap,
 all_six_requested_chains_received_this_run:
  request.networks.length===6&&request.networks.every(x=>actuallyReceivedChains.has(x)),
 verified_global_market_coverage:false,
 note:'A source capture 200 is a sample, not an autonomous GPT review, executable quote, or full-chain completeness.'
};
metrics.v19_gecko_received_pages=receivedPages.map(x=>({chain:x.chain,page:x.page,found:x.decoded.found_count}));
metrics.v19_gecko_failed_pages=failedPages.map(x=>({chain:x.chain,page:x.page,
  status:x.status,retry_after_utc:x.retryAfterUtc}));
metrics.v19_gecko_deferred_pages=deferredPages;
metrics.v19_gecko_provider_429_cooldown=geckoBlock();
metrics.v19_persistent_provider_budget=summarizeProviderBudget({state:providerBudget,asOfUtc:now()});
metrics.v19_provider_budget_checkpoint_path=providerBudgetPath;
metrics.v19_gecko_actual_attempts=receivedPages.length+failedPages.length;
// Offset pages can move between calls: keep a separate, immutable-evidence
// backed ledger for failed, deferred, skipped and overlapping page indices.
const coverageReport=updatePageCoverage(pageCoverage,{
 asOfUtc:now(),
 successes:receivedPages.map(x=>({chain:x.chain,page:x.page,
   captured_at_utc:x.capturedAtUtc,source_path:x.sourcePath,
   source_sha256:x.sourceSha256,
   requested_pool_count:x.decoded.requested_pool_count,
   rejected_count:x.decoded.rejected_count,
   candidates:x.decoded.candidates})),
 failures:failedPages.map(x=>({chain:x.chain,page:x.page,
   attempt_at_utc:x.capturedAtUtc,reason:x.status,
   http_status:x.status==='HTTP_429'?429:null})),
 deferred:deferredPages.map(x=>({chain:x.chain,page:x.page}))
});
const coverageReportPath=root+'/page-coverage-report.json';
await writeFile(coverageReportPath,JSON.stringify(coverageReport,null,2)+'\n','utf8');
await writeFile(coverageStatePath,JSON.stringify(coverageReport.updated_memory,null,2)+'\n','utf8');
artifacts.push(coverageReportPath);
metrics.v19_page_coverage={unresolved_page_indices:coverageReport.total_unresolved_page_indices,
 page_overlap_records:coverageReport.run.duplicate_pool_ids_across_pages,
 chain_coverage:coverageReport.chain_coverage,coverage_is_complete:false};
metrics.v19_page_coverage_path=coverageReportPath;
metrics.v19_fixed_sample_progress=summarizeCumulativeScanProgress({
 coverage:coverageReport.updated_memory,networks:request.networks,
 targetPagesPerChain:10,asOfUtc:now()
});

// Exact original per-page samples, persisted independently of the flattened
// candidate report. Dot1 and historical replay use the SAME activity extractor.
const activityDay=dataDate=>dataDate.slice(0,10);
const currentActivityPages=receivedPages.map(p=>({
 kind:'R29_V19_GECKO_PAGE_ACTIVITY_CAPTURE',source_class:'ORIGINAL_CAPTURE',
 chain:p.chain,page:p.page,captured_at_utc:p.capturedAtUtc,
 available_at_utc:p.capturedAtUtc,source_raw_path:p.sourcePath,
 raw_response_sha256:p.sourceSha256,
 candidates:p.decoded.candidates
}));
const previousActivityPages=[];
const legacyActivityFilesRecovered=[];
try{
  const paths=selectObservationArchivePaths({
   paths:await readdir('research/observations',{recursive:true}),kind:'ACTIVITY',limit:80});
 for(const relative of paths){
   try{
      const parsed=parseResearchJsonWithLegacyTrailer(
       await readFile('research/observations/'+relative,'utf8'),
       {sourcePath:'research/observations/'+relative});
      const saved=parsed.value;
      if(saved.kind==='R29_V19_PAGE_CAPTURE_ACTIVITY_JOURNAL'&&Array.isArray(saved.pages)){
        previousActivityPages.push(...saved.pages);
        if(parsed.legacy_trailer_recovered)legacyActivityFilesRecovered.push(parsed.source_path);
      }
   }catch{/* Invalid old research file is not proof of market activity. */}
 }
}catch(error){if(error.code!=='ENOENT')throw error;}
const activityResult=measureDot1Activity({
 pageCaptures:[...previousActivityPages,...currentActivityPages],asOfUtc:now()});
// A triggered Dot2 research capture can give Dot1 a cadence RECOMMENDATION
// without running any of the five paused GPT automations.
const dot1AdvicePath='research/state/dot1-cadence-advice.json';
let dot1Prior=null,dot1PriorLegacyTrailer=false;
try{
 const parsed=parseResearchJsonWithLegacyTrailer(
  await readFile(dot1AdvicePath,'utf8'),{sourcePath:dot1AdvicePath});
 const saved=parsed.value;
 if(saved.kind==='R29_V19_DOT1_CADENCE_RECOMMENDATION'){
  dot1Prior=saved.state;dot1PriorLegacyTrailer=parsed.legacy_trailer_recovered;
 }
}catch(error){if(error.code!=='ENOENT')throw error;}
metrics.v19_legacy_json_suffix_recovery={
 prior_dot1_state_legacy_suffix:dot1PriorLegacyTrailer,
 recovered_activity_files:legacyActivityFilesRecovered,
 recovered_activity_file_count:legacyActivityFilesRecovered.length,
 original_archive_files_rewritten:0,raw_source_validity_claim:false,
 recovery_rule:'ONLY_EXACT_FINAL_HEX_5C6E_WITH_VALID_JSON_PREFIX'};
const dot1Advice=advanceAdaptiveCadence({
 previous:dot1Prior,metrics:activityResult.metrics,asOfUtc:now()});
await writeFile(dot1AdvicePath,JSON.stringify(dot1Advice,null,2)+'\n','utf8');
const activityPath='research/observations/'+activityDay(now())+'/'+runId+'-activity-pages.json';
await mkdir('research/observations/'+activityDay(now()),{recursive:true});
await writeFile(activityPath,JSON.stringify({
 schema:1,kind:'R29_V19_PAGE_CAPTURE_ACTIVITY_JOURNAL',
 source_request_path:path,captured_at_utc:now(),pages:currentActivityPages,
 derived_asof_metrics:activityResult,
 warning:'Sampled Chain/Page activity; not a complete global market measurement and not trading authority.'
},null,2)+'\n','utf8');
metrics.v19_dot1_measured_activity={
 observed_newly_created_pools:activityResult.observed_newly_created_pools,
 volume_change_pct:activityResult.metrics.volumeChangePct,
 comparable_page_pairs:activityResult.comparable_page_pairs,
 active_chains:activityResult.active_chains,
 complete_comparable_panel:activityResult.comparable_panel_complete,
 no_market_calm_claim:true};
metrics.v19_dot1_activity_journal_path=activityPath;
metrics.v19_dot1_cadence_recommendation={target:dot1Advice.target,
  reason:dot1Advice.reason,quiet_confirmations:dot1Advice.quiet_confirmations,
  actual_gpt_reviews:0};
metrics.v19_independent_observation_cadence=planIndependentObservations({
 asOfUtc:now(),priorCaptureAtUtc:precedingMemory.generated_at_utc||null,
 reviewTarget:dot1Advice.target,hotPoolCount:recheckPlan.all_new_pool_count,
 unresolvedPageCount:coverageReport.total_unresolved_page_indices,
 openPaperPositions:null,
 capturedPagesThisRun:receivedPages.length+olderPages.length+
   ohlcvResults.filter(x=>x.status==='ARCHIVED_RESEARCH_ONLY').length
});
metrics.v18_archived_v4_recovered_pool_count=recoveredV4Count;
metrics.v18_archived_v4_recovery_error=recoveryError;
// Re-read all actual on-disk raw responses before publishing the evidence
// journal. If any self-reported SHA mismatches its source file, abort the run.
const sourceRows=fetches.filter(x=>x?.body_path&&x?.response_sha256);
const sourceBodies=Object.fromEntries(await Promise.all(sourceRows.map(async x=>
  [x.body_path,await readFile(x.body_path,'utf8')])));
const sourceIntegrity=auditCaptureEvidenceBundle({
 rawFiles:sourceBodies,apiEvidence:sourceRows,asOfUtc:now()});
if(sourceIntegrity.proofs.some(x=>x.status==='REJECTED'))
 throw Error('SOURCE_INTEGRITY_AUDIT_REJECTED');
metrics.v19_source_integrity={checked:sourceIntegrity.checked,
 bytes_verified:sourceIntegrity.bytes_verified,
 late_capture:sourceIntegrity.late_capture,
 errors_or_rejected:sourceIntegrity.errors_or_rejected,
 capture_time_independently_attested:false};
const data={schema:1,kind:'DOT2_PUBLIC_CAPTURE_EVIDENCE',mode:'PAPER_RESEARCH_ONLY',
  request_path:path,requested_at_utc:request.created_at_utc,captured_completed_at_utc:now(),
  source_chain:receivedPages.length===1?chosen.chain:'MULTI_CHAIN',network_rotation:chosen.rotation,selected_page:scanPage,
  coverage_is_global:false,coverage_is_all_chains:false,gecko:decoded,
  dex_checks:dexChecks,dex_fallback_candidates:fallback,
  older_pool_candidates:olderCandidates,
  page_capture_failures:failedPages.map(x=>({
    chain:x.chain,page:x.page,status:x.status,
    source_path:x.sourcePath,attempt_at_utc:x.capturedAtUtc,
    retry_after_utc:x.retryAfterUtc})),
  page_capture_deferred:deferredPages.map(x=>({
    chain:x.chain,page:x.page,status:'NOT_CAPTURED_DEFERRED'})),
  api_evidence:fetches,metrics,source_integrity:sourceIntegrity,
  errors:fetches.filter(x=>x.error||x.http_ok===false).map(x=>({provider:x.provider,status:x.http_status||null,error:x.error||'HTTP_NOT_OK'})),
  published_paper_orders:0,verified_client_fills:0,
  limitations:['Multi-chain sampled pages do not constitute full market or full chain coverage.','HTTP timestamps are own capture, not provider quote update time.',
  'One DEX source can recover a full contract but not independently establish price safety.',
  'Risk, sellability, independent quotes and actual paper-client fills still required.']};
const filename=root+'/evidence.json';
await writeFile(filename,JSON.stringify(data,null,2)+'\n','utf8');artifacts.push(filename);
// The previous Dot2 journal is immutable. Preserve its queued identities even if
// a public new-pools API page no longer contains them.
const mergedOld=mergeMemory(memory,{candidates:known,
 sourcePath:incoming.journal_path||'research/latest/dot-2.json',
 sourceCapturedAtUtc:incoming.updated_at_utc||data.captured_completed_at_utc,
 provider:'DOT2_PRIOR_JOURNAL',chain:null,page:1});
memory=mergedOld.memory;
let geckoAdded=0,geckoUpdated=0;
for(const pageResult of receivedPages){
 const merged=mergeMemory(memory,{candidates:pageResult.decoded.candidates,
   sourcePath:pageResult.sourcePath,
   sourceCapturedAtUtc:pageResult.capturedAtUtc,
   sourceSha256:pageResult.sourceSha256,provider:'GECKOTERMINAL',
   chain:pageResult.chain,page:pageResult.page,fetchStatus:'OK'});
 memory=merged.memory;geckoAdded+=merged.added;geckoUpdated+=merged.updated;
}
// Trending pools join SAME pool memory, never a parallel bot.
for(const p of olderPages){
 const merged=mergeMemory(memory,{candidates:p.decoded.candidates,
  sourcePath:p.sourcePath,sourceCapturedAtUtc:p.capturedAtUtc,
  sourceSha256:p.sourceSha256,provider:'GECKOTERMINAL_TRENDING',
  chain:p.job.chain,page:p.job.page,fetchStatus:'OK'});
 memory=merged.memory;
}
// Persist failed page attempts too: a failure is NOT successful coverage.
for(const failure of failedPages){
 const merged=mergeMemory(memory,{candidates:[],
   sourcePath:failure.sourcePath,
   sourceCapturedAtUtc:failure.capturedAtUtc,provider:'GECKOTERMINAL',
   chain:failure.chain,page:failure.page,fetchStatus:failure.status,
   retryAfterUtc:failure.retryAfterUtc});
 memory=merged.memory;
}
const mergedDex=mergeMemory(memory,{candidates:fallback,
 sourcePath:filename,sourceCapturedAtUtc:data.captured_completed_at_utc,
 provider:'DEXSCREENER',chain:null,page:1});
memory=mergedDex.memory;
const recheckObservationPath=root+'/dex-recheck-observations.json';
await writeFile(recheckObservationPath,JSON.stringify({
 schema:1,kind:'UNFILTERED_VERIFIED_EXACT_POOL_DEX_RECHECKS',
 captured_at_utc:data.captured_completed_at_utc,
 total_rechecks_with_actual_prices:rechecked.length,
 observations:rechecked,
 disclaimer:'Provider quote-as-of unverified; this is only a historical observed capture, not an executable BUY quote.'
},null,2)+'\n','utf8');
artifacts.push(recheckObservationPath);
if(rechecked.length){
 const mergedRechecks=mergeMemory(memory,{candidates:rechecked,
  sourcePath:recheckObservationPath,sourceCapturedAtUtc:data.captured_completed_at_utc,
  provider:'DEXSCREENER_RECHECK',chain:null,page:1});
 memory=mergedRechecks.memory;
}
for(const attempt of attempts)memory=recordRecheckAttempt(memory,{
 chain:attempt.chain,pool:attempt.pool,pool_kind:attempt.pool_kind,attemptAtUtc:attempt.checked_at_utc,
 status:attempt.status,sourcePath:attempt.source_path
});
// Unfiltered, forward-only observations, NOT winner names or historical labels.
const observationPath='research/observations/'+new Date(data.captured_completed_at_utc).toISOString().slice(0,10)+'/'+runId+'.json';
const batch=makeCaptureObservationBatch({
 capturedAtUtc:data.captured_completed_at_utc,sourcePath:filename,
 geckoCandidates:[...(decoded?.candidates||[]),...olderCandidates],dexFallbackCandidates:[...fallback,...rechecked]});
await mkdir('research/observations/'+new Date(data.captured_completed_at_utc).toISOString().slice(0,10),{recursive:true});
await writeFile(observationPath,JSON.stringify(batch,null,2)+'\n','utf8');
const previous=[];
try{
 const all=(await readdir('research/observations',{recursive:true}))
   .filter(x=>/\.json$/.test(x)).sort();
 // Read the latest 200 batches per wake for bounded CPU, preserve all older
 // files on GitHub for historical offline analysis without age restriction.
 for(const rel of all.slice(-200)){
  try{const x=JSON.parse(await readFile('research/observations/'+rel,'utf8'));
   if(x.kind==='R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS')previous.push(x);
  }catch{/* malformed historic capture is not silently promoted to a valid quote */}
 }
}catch(error){if(error.code!=='ENOENT')throw error;}
const prospectiveRanking=scoreAsOf({batches:previous,asOfUtc:data.captured_completed_at_utc});
const rankingPath='research/observations/'+new Date(data.captured_completed_at_utc).toISOString().slice(0,10)+'/'+runId+'-asof-ranking.json';
await writeFile(rankingPath,JSON.stringify(prospectiveRanking,null,2)+'\n','utf8');
const forwardRoot='research/forecasts/'+new Date(data.captured_completed_at_utc).toISOString().slice(0,10);
await mkdir(forwardRoot,{recursive:true});
const forecast=makeAsOfForecastSnapshot({ranking:prospectiveRanking,batches:previous});
const forecastPath=forwardRoot+'/'+runId+'-asof.json';
await writeFile(forecastPath,JSON.stringify(forecast,null,2)+'\n','utf8');
// Evaluate previous forecasts only when actual time has moved past their
// future horizon; retain unknown where a matched future quote is missing.
const pastForecasts=[];
try {
 const all=(await readdir('research/forecasts',{recursive:true}))
   .filter(x=>/(^|\/)\d+-asof\.json$/.test(x)).sort();
 for(const relative of all.slice(-60)){
  try{
   const x=JSON.parse(await readFile('research/forecasts/'+relative,'utf8'));
   if(x.kind==='R29_PROSPECTIVE_ORACLE_FORECAST_SNAPSHOT'&&
    x.as_of_utc<data.captured_completed_at_utc)pastForecasts.push(x);
  }catch{/* corrupted historic snapshot is never accepted as a valid oracle label */}
 }
}catch(err){if(err.code!=='ENOENT')throw err;}
const matureResults=pastForecasts.slice(-4).map(x=>
 settleMatureForecastSnapshot({snapshot:x,batches:previous,asOfUtc:data.captured_completed_at_utc}));
const matureForecastPath=forwardRoot+'/'+runId+'-matured.json';
await writeFile(matureForecastPath,JSON.stringify({
 schema:1,kind:'R29_PROSPECTIVE_ORACLE_MATURED_SCAN_BATCH',
 at_utc:data.captured_completed_at_utc,source_forecasts:matureResults,
 total_observed_endpoint_labels:matureResults.reduce((sum,x)=>sum+x.observed,0),
 no_buys_authorized:true
},null,2)+'\n','utf8');
await mkdir('research/forecasts',{recursive:true});
await writeFile('research/forecasts/latest.json',JSON.stringify({
 schema:1,kind:'R29_LATEST_FORWARD_ORACLE_JOURNAL',
 as_of_utc:data.captured_completed_at_utc,forecast_path:forecastPath,
 matured_path:matureForecastPath,forecast_count:forecast.predictions.length,
 rankable_asof:forecast.rankable_inputs,
 mature_result_observations:matureResults.reduce((sum,x)=>sum+x.observed,0),
 oracle_is_not_live_strategy:true,paper_orders_published:0
},null,2)+'\n','utf8');
// Labels only for a previous scan whose full 24h has elapsed; never label
// the current observation using future values.
const maturePrior=previous.filter(x=>x.captured_at_utc&&Date.parse(x.captured_at_utc)+24*3600000<=Date.parse(data.captured_completed_at_utc))
 .sort((a,b)=>b.captured_at_utc.localeCompare(a.captured_at_utc))[0];
let matureLabelsPath=null;
if(maturePrior){
 const outcome=labelAfterHorizon({batches:previous,decisionAtUtc:maturePrior.captured_at_utc});
 matureLabelsPath='research/observations/'+new Date(data.captured_completed_at_utc).toISOString().slice(0,10)+'/'+runId+'-mature-24h-labels.json';
 await writeFile(matureLabelsPath,JSON.stringify(outcome,null,2)+'\n','utf8');
}
// SYS-13: add typed/normalized identities while preserving all 409+ legacy
// keys, source refs, as-of observations and existing fair-queue cursors.
memory=enrichPersistentMarketIdentity(memory);
await mkdir('research/state/checkpoints',{recursive:true});
await writeFile(memoryPath,JSON.stringify(memory,null,2)+'\n','utf8');
await writeFile(providerBudgetPath,JSON.stringify(providerBudget,null,2)+'\n','utf8');
const memoryCheckpointPath='research/state/checkpoints/'+runId+'.json';
const nextPlan=fairRecheckPlan(memory,{asOfUtc:data.captured_completed_at_utc,maxRechecks:request.max_dex_pairs});
const memoryCheckpoint={schema:1,kind:'R29_MEMORY_SCAN_CHECKPOINT',
 run_id:runId,created_at_utc:data.captured_completed_at_utc,request_path:path,
 immutable_feed_path:filename,
 imported_existing_dot2:mergedOld.added,
 new_gecko_pools:geckoAdded,
 new_dex_fallback_pools:mergedDex.added,
 actual_rechecked_prices:rechecked.length,
 dex_recheck_observation_path:recheckObservationPath,
 scan_page_decision:pageDecision,
 updated_pool_observations:mergedOld.updated+geckoUpdated+mergedDex.updated,
 coverage:memory.checkpoints,stats:memory.stats,
 historic_rechecks_next:nextPlan.candidates,
 fair_recheck_attempts:attempts,
 fair_recheck_backlog_remaining:plan.backlog_count,
 observation_path:observationPath,ranking_path:rankingPath,
 activity_capture_path:activityPath,
 page_coverage_report_path:coverageReportPath,
 ohlcv_backfill_state_path:ohlcvStatePath,
 dot1_cadence_advice_path:dot1AdvicePath,
 forecast_path:forecastPath,matured_forecast_path:matureForecastPath,
 matured_label_path:matureLabelsPath,
 prospective_ranking_counts:prospectiveRanking.counts,
 no_history_age_cutoff:true,no_trades_authorized:true,
 source_errors:data.errors};
await writeFile(memoryCheckpointPath,JSON.stringify(memoryCheckpoint,null,2)+'\n','utf8');
await writeFile('research/state/latest.json',JSON.stringify({
 schema:1,checkpoint_path:memoryCheckpointPath,memory_path:memoryPath,
 observation_path:observationPath,ranking_path:rankingPath,
 activity_capture_path:activityPath,
 page_coverage_report_path:coverageReportPath,
 forecast_path:forecastPath,matured_forecast_path:matureForecastPath,
 matured_label_path:matureLabelsPath,
 created_at_utc:data.captured_completed_at_utc,stats:memory.stats},null,2)+'\n','utf8');
const handoff=makeResearchHandoff({evidence:data,atUtc:data.captured_completed_at_utc});
const handoffPath=root+'/dot2-to-dot3-handoff.json';
await writeFile(handoffPath,JSON.stringify(handoff,null,2)+'\n','utf8');
artifacts.push(handoffPath);
const dot3StatusPreview=summarizeDot3RiskStatuses({
 handoff,asOfUtc:data.captured_completed_at_utc,mode:'LIVE_PAPER'});
const dot3StatusPreviewPath=root+'/dot3-research-risk-status-preview.json';
await writeFile(dot3StatusPreviewPath,JSON.stringify(dot3StatusPreview,null,2)+'\n','utf8');
artifacts.push(dot3StatusPreviewPath);
const dot5EventLedger=buildDot5DiscoveryLedger({
 capture:data,handoff,dot3RiskPreview:dot3StatusPreview,
 asOfUtc:data.captured_completed_at_utc,
 sourceEvidencePath:filename
});
const dot5LedgerPath=root+'/dot5-neutral-event-ledger.json';
await writeFile(dot5LedgerPath,JSON.stringify(dot5EventLedger,null,2)+'\n','utf8');
artifacts.push(dot5LedgerPath);
// Provider HTTP / simulated role work are never GPT review execution.
const operations=summarizeR29OperatingMeasurements({
 capture:data,asOfUtc:data.captured_completed_at_utc,
 cadenceAdvice:dot1Advice,riskPreview:dot3StatusPreview,
 dot5Ledger:dot5EventLedger,ranking:prospectiveRanking
});
const operatingMetricsPath=root+'/v19-operating-measurements.json';
await writeFile(operatingMetricsPath,JSON.stringify(operations,null,2)+'\n','utf8');
artifacts.push(operatingMetricsPath);
const dot3RecoveryPath='research/state/dot3-recheck-state.json';
let dot3Recovery;
try{dot3Recovery=JSON.parse(await readFile(dot3RecoveryPath,'utf8'));}
catch(err){if(err.code!=='ENOENT')throw err;dot3Recovery=emptyDot3RecheckState();}
const dot3RecheckPlan=planDot3EvidenceRechecks({
 handoff,asOfUtc:data.captured_completed_at_utc,
 state:dot3Recovery,maxRequests:Math.min(6,request.max_dex_pairs)});
const dot3RecheckPlanPath=root+'/dot3-next-evidence-rechecks.json';
await writeFile(dot3RecheckPlanPath,JSON.stringify(dot3RecheckPlan,null,2)+'\n','utf8');
artifacts.push(dot3RecheckPlanPath);
// The existing Dot2 capture only PLANS Dot3 rechecks; it doesn't execute
// fake provider requests, issue Dot3 attestations or create any Paper order.

const latest={schema:1,kind:'LATEST_DOT2_PUBLIC_CAPTURE_POINTER',mode:'PAPER_RESEARCH_ONLY',
  request_path:path,evidence_path:filename,handoff_path:handoffPath,
   dot3_recheck_plan_path:dot3RecheckPlanPath,
   dot3_status_preview_path:dot3StatusPreviewPath,
   dot5_event_ledger_path:dot5LedgerPath,
   operating_metrics_path:operatingMetricsPath,
   captured_at_utc:data.captured_completed_at_utc,
  source_chain:data.source_chain,metrics,handoff_counts:handoff.counts,
 observation_path:observationPath,ranking_path:rankingPath,
 forecast_path:forecastPath,matured_forecast_path:matureForecastPath,
 matured_label_path:matureLabelsPath,prospective_counts:prospectiveRanking.counts,
 fair_recheck_backlog_remaining:plan.backlog_count,market_memory_path:memoryPath,memory_checkpoint_path:memoryCheckpointPath,memory_stats:memory.stats,page_coverage_report_path:coverageReportPath,source_evidence_paths:artifacts,
  trading_ready:false,orders_created:0};
await mkdir('research/feeds',{recursive:true});
await writeFile('research/feeds/latest.json',JSON.stringify(latest,null,2)+'\n','utf8');
console.log('DOT2_CAPTURE_DONE',JSON.stringify({evidence_path:filename,request_path:path,
 network:chosen.chain,metrics,memory_stats:memory.stats,memory_checkpoint:memoryCheckpointPath,prospective:prospectiveRanking.counts,recheck_prices:rechecked.length,fair_backlog:plan.backlog_count,errors:data.errors}));
