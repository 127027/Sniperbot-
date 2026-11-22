// ONE triggered capture per dot2 request. No orders, no secrets, no paid market APIs.
// Produces immutable raw public API response + validated evidence for future Dots.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {validateCaptureRequest,decodeGeckoNewPools,crossCheckDexPair,
 fromDexPairOnly,collectSampleMetrics,sha256} from '../src/discovery-feed.mjs';
import {canonicalChain,poolValid} from '../src/market-evidence.mjs';
import {makeResearchHandoff} from '../src/feed-handoff.mjs';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {fairRecheckPlan,recordRecheckAttempt} from '../src/discovery-fair-queue.mjs';
import {makeCaptureObservationBatch,scoreAsOf,labelAfterHorizon} from '../src/forward-learning.mjs';
import {makeAsOfForecastSnapshot,settleMatureForecastSnapshot} from '../src/forward-oracle-journal.mjs';
import {chooseNextDiscoveryPage} from '../src/discovery-page-scheduler.mjs';
import {recoverArchivedV4} from '../src/v18-archived-v4-recovery.mjs';
import {planMultiChainCapture} from '../src/v19-discovery-budget-plan.mjs';
import {planHotFairRechecks} from '../src/v19-hot-fair-recheck.mjs';
import {summarizeRecheckService} from '../src/v19-recheck-service-metrics.mjs';
import {providerRetryDelay} from '../src/v19-provider-backoff.mjs';
import {measureDot1Activity} from '../src/v19-market-activity.mjs';
import {emptyPageCoverage,updatePageCoverage} from '../src/v19-page-coverage.mjs';
import {advanceAdaptiveCadence} from '../src/v19-adaptive-cadence.mjs';
import {makeGeckoOhlcvRequest,decodeGeckoOhlcv} from '../src/v19-gecko-ohlcv.mjs';
import {emptyOhlcvBackfillState,planOhlcvBackfill,recordOhlcvBackfill} from '../src/v19-ohlcv-backfill-queue.mjs';

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
async function fetchRaw(url,provider,fileName){
 const started=now();
 const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(16000)});
 const received=now(),text=await response.text();
 const evidence={provider,url,started_at_utc:started,received_at_utc:received,
  http_status:response.status,http_ok:response.ok,
  retry_after_header:response.headers?.get?.('retry-after')||null,
  response_sha256:sha256(text),
  raw_bytes_utf8:text.length,body_path:root+'/'+fileName};
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
let precedingMemory;
try{precedingMemory=JSON.parse(await readFile(memoryFile,'utf8'));}
catch(err){if(err.code!=='ENOENT')throw err;precedingMemory=emptyMarketMemory();}
const coverageStatePath='research/state/page-coverage.json';
let pageCoverage;
try{pageCoverage=JSON.parse(await readFile(coverageStatePath,'utf8'));}
catch(error){if(error.code!=='ENOENT')throw error;pageCoverage=emptyPageCoverage();}
const capturePlan=planMultiChainCapture({
 networks:request.networks,checkpoints:precedingMemory.checkpoints,
 pageCoverage,budget:request.max_gecko_requests-(request.max_ohlcv_requests??0),asOfUtc:now()});
const receivedPages=[],failedPages=[],deferredPages=[];
for(let i=0;i<capturePlan.tasks.length;i++){
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
     // Back off for the remaining work; persistent checkpoint retains
     // failed attempt so other chains can be serviced next time.
     deferredPages.push(...capturePlan.tasks.slice(i+1));
     break;
   }
 }
}
const decoded=receivedPages.length?{
 schema:1,network:'MULTI_CHAIN',page:null,
 found_count:receivedPages.reduce((n,x)=>n+x.decoded.found_count,0),
 rejected_count:receivedPages.reduce((n,x)=>n+x.decoded.rejected_count,0),
 candidates:receivedPages.flatMap(x=>x.decoded.candidates),
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
// Every fresh candidate is ranked before a bounded DEX crosscheck; unselected
// ones still enter persistent memory and must not be silently lost.
const recheckPlan=planHotFairRechecks({
 freshCandidates:decoded?.candidates||[],fairCandidates:plan.candidates,
 legacyCandidates:known,asOfUtc:now(),maxChecks:request.max_dex_pairs,
 round:Number(process.env.GITHUB_RUN_NUMBER)||0});
// Optional OHLCV history inside the EXISTING Gecko request budget; no other bot.
const ohlcvStatePath='research/state/ohlcv-backfill.json';
let ohlcvState;
try{ohlcvState=JSON.parse(await readFile(ohlcvStatePath,'utf8'));}
catch(err){if(err.code!=='ENOENT')throw err;ohlcvState=emptyOhlcvBackfillState();}
const ohlcvPlan=planOhlcvBackfill({state:ohlcvState,candidates:recheckPlan.selected,
 asOfUtc:now(),maxRequests:request.max_ohlcv_requests??0,limit:600});
const ohlcvResults=[];
for(const target of ohlcvPlan.targets){
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
  const attempted=now();
  const response=fetches.findLast(x=>x.provider==='GECKOTERMINAL_OHLCV'&&x.url===q.source_url);
  const status=response?.http_status===429?'HTTP_429':
    response?.http_ok===true?'INVALID_RESPONSE':
    response?.http_status?'HTTP_ERROR':'SOURCE_ERROR';
  const delay=providerRetryDelay({httpStatus:response?.http_status||null,
    previousFailures:ohlcvState.markets[target.key]?.failed_pages||0,
    retryAfter:response?.retry_after_header||null,atUtc:attempted});
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
 }catch(error){dexChecks.push({chain,pool,status:'DEX_ERROR',error:String(error.message||error).slice(0,100)});}
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
metrics.v19_ohlcv_backfill={budget:request.max_ohlcv_requests??0,
 attempted:ohlcvResults.length,results:ohlcvResults,research_only:true};
metrics.v19_hot_fair_service=summarizeRecheckService({plan:recheckPlan,attempts,asOfUtc:now()});
metrics.v19_hot_fair_recheck_plan={selected:recheckPlan.selected.map(x=>({chain:x.chain,pool:x.pool,queue:x.queue,research_score:x.research_score??null})),
  all_new_pool_count:recheckPlan.all_new_pool_count,deferred_new_pool_count:recheckPlan.deferred_new_pool_count,
  deferred_new_pool_keys:recheckPlan.deferred_new_pool_keys,hot_selected:recheckPlan.hot_selected,
  fair_selected:recheckPlan.fair_selected,trade_authorized:false};
metrics.v19_chain_page_plan=capturePlan;
metrics.v19_gecko_received_pages=receivedPages.map(x=>({chain:x.chain,page:x.page,found:x.decoded.found_count}));
metrics.v19_gecko_failed_pages=failedPages.map(x=>({chain:x.chain,page:x.page,
  status:x.status,retry_after_utc:x.retryAfterUtc}));
metrics.v19_gecko_deferred_pages=deferredPages;
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
try{
 const paths=(await readdir('research/observations',{recursive:true}))
   .filter(path=>/-activity-pages\\.json$/.test(path)).sort().slice(-80);
 for(const relative of paths){
   try{
     const saved=JSON.parse(await readFile('research/observations/'+relative,'utf8'));
     if(saved.kind==='R29_V19_PAGE_CAPTURE_ACTIVITY_JOURNAL'&&Array.isArray(saved.pages))
       previousActivityPages.push(...saved.pages);
   }catch{/* Invalid old research file is not proof of market activity. */}
 }
}catch(error){if(error.code!=='ENOENT')throw error;}
const activityResult=measureDot1Activity({
 pageCaptures:[...previousActivityPages,...currentActivityPages],asOfUtc:now()});
// A triggered Dot2 research capture can give Dot1 a cadence RECOMMENDATION
// without running any of the five paused GPT automations.
const dot1AdvicePath='research/state/dot1-cadence-advice.json';
let dot1Prior=null;
try{
 const saved=JSON.parse(await readFile(dot1AdvicePath,'utf8'));
 if(saved.kind==='R29_V19_DOT1_CADENCE_RECOMMENDATION')dot1Prior=saved.state;
}catch(error){if(error.code!=='ENOENT')throw error;}
const dot1Advice=advanceAdaptiveCadence({
 previous:dot1Prior,metrics:activityResult.metrics,asOfUtc:now()});
await writeFile(dot1AdvicePath,JSON.stringify(dot1Advice,null,2)+'\\n','utf8');
const activityPath='research/observations/'+activityDay(now())+'/'+runId+'-activity-pages.json';
await mkdir('research/observations/'+activityDay(now()),{recursive:true});
await writeFile(activityPath,JSON.stringify({
 schema:1,kind:'R29_V19_PAGE_CAPTURE_ACTIVITY_JOURNAL',
 source_request_path:path,captured_at_utc:now(),pages:currentActivityPages,
 derived_asof_metrics:activityResult,
 warning:'Sampled Chain/Page activity; not a complete global market measurement and not trading authority.'
},null,2)+'\\n','utf8');
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
metrics.v18_archived_v4_recovered_pool_count=recoveredV4Count;
metrics.v18_archived_v4_recovery_error=recoveryError;
const data={schema:1,kind:'DOT2_PUBLIC_CAPTURE_EVIDENCE',mode:'PAPER_RESEARCH_ONLY',
  request_path:path,requested_at_utc:request.created_at_utc,captured_completed_at_utc:now(),
  source_chain:receivedPages.length===1?chosen.chain:'MULTI_CHAIN',network_rotation:chosen.rotation,selected_page:scanPage,
  coverage_is_global:false,coverage_is_all_chains:false,gecko:decoded,
  dex_checks:dexChecks,dex_fallback_candidates:fallback,
  api_evidence:fetches,metrics,
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
 geckoCandidates:decoded?.candidates||[],dexFallbackCandidates:[...fallback,...rechecked]});
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
await mkdir('research/state/checkpoints',{recursive:true});
await writeFile(memoryPath,JSON.stringify(memory,null,2)+'\n','utf8');
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
const latest={schema:1,kind:'LATEST_DOT2_PUBLIC_CAPTURE_POINTER',mode:'PAPER_RESEARCH_ONLY',
  request_path:path,evidence_path:filename,handoff_path:handoffPath,captured_at_utc:data.captured_completed_at_utc,
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
