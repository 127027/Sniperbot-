// ONE triggered capture per dot2 request. No orders, no secrets, no paid market APIs.
// Produces immutable raw public API response + validated evidence for future Dots.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {validateCaptureRequest,chooseNetwork,decodeGeckoNewPools,crossCheckDexPair,
 fromDexPairOnly,collectSampleMetrics,sha256} from '../src/discovery-feed.mjs';
import {canonicalChain,poolValid} from '../src/market-evidence.mjs';
import {makeResearchHandoff} from '../src/feed-handoff.mjs';
import {emptyMarketMemory,mergeMemory,planIncrementalScan} from '../src/market-memory.mjs';

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
const chosen=chooseNetwork(request,Number(process.env.GITHUB_RUN_NUMBER)||0);
const now=()=>new Date().toISOString();
const fetches=[],dexChecks=[],fallback=[],artifacts=[];
async function fetchRaw(url,provider,fileName){
 const started=now();
 const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(16000)});
 const received=now(),text=await response.text();
 const evidence={provider,url,started_at_utc:started,received_at_utc:received,
  http_status:response.status,http_ok:response.ok,response_sha256:sha256(text),
  raw_bytes_utf8:text.length,body_path:root+'/'+fileName};
 // Store response as received including error responses; never alter/repair timestamps.
 await writeFile(evidence.body_path,text,'utf8');
 artifacts.push(evidence.body_path);fetches.push(evidence);
 if(!response.ok)throw Error('HTTP_'+response.status);
 try{return {json:JSON.parse(text),evidence};}
 catch{throw Error('INVALID_JSON_RESPONSE');}
}
let decoded=null;
const mainUrl='https://api.geckoterminal.com/api/v2/networks/'+chosen.network
 +'/new_pools?include=base_token,quote_token&page=1';
try{
 const got=await fetchRaw(mainUrl,'GECKOTERMINAL','gecko-'+chosen.chain+'-page1.raw.json');
 decoded=decodeGeckoNewPools({network:chosen.chain,response:got.json,capturedAtUtc:got.evidence.received_at_utc,page:1});
}catch(error){fetches.at(-1)?.http_ok===false ? (fetches.at(-1).error=String(error.message||error)) :
 fetches.push({provider:'GECKOTERMINAL',url:mainUrl,error:String(error.message||error).slice(0,100)});}
const incoming=JSON.parse(await readFile('research/latest/dot-2.json','utf8'));
const known=Array.isArray(incoming?.candidates)?incoming.candidates:[];
const memoryPath='research/state/market-memory.json';
let memory;
try{memory=JSON.parse(await readFile(memoryPath,'utf8'));}
catch(error){if(error.code!=='ENOENT')throw error;memory=emptyMarketMemory();}
const plan=planIncrementalScan(memory,{asOfUtc:now(),maxRechecks:request.max_dex_pairs});
const targets=[
 ...(decoded?.candidates||[]).filter(c=>c.contract).slice(0,2),
 ...plan.rechecks.filter(c=>canonicalChain(c.chain)&&poolValid(c.chain,c.pool)),
 ...known.filter(c=>canonicalChain(c.chain)&&poolValid(c.chain,c.pool)).slice(0,request.max_dex_pairs)
];
const unique=new Set();
for(const c of targets){
 if(dexChecks.length>=request.max_dex_pairs)break;
 const chain=canonicalChain(c.chain),pool=c.pool;
 const key=chain+':'+pool;
 if(!chain||!pool||unique.has(key))continue;
 unique.add(key);
 const providerChain=chain==='ethereum'?'ethereum':chain==='cronos'?'cronos':chain;
 const url='https://api.dexscreener.com/latest/dex/pairs/'+providerChain+'/'+pool;
 try{
  const data=await fetchRaw(url,'DEXSCREENER','dex-'+chain+'-'+String(pool).replace(/[^a-zA-Z0-9]/g,'')+'.raw.json');
  if(c.contract){
   dexChecks.push({chain,pool,source: data.evidence.body_path,
    ...crossCheckDexPair({candidate:c,response:data.json,checkedAtUtc:data.evidence.received_at_utc})});
  }else{
   const rec=fromDexPairOnly({chain,pool,response:data.json,capturedAtUtc:data.evidence.received_at_utc});
   dexChecks.push({chain,pool,source:data.evidence.body_path,status:rec.status,
    matched:!!rec.candidate});
   if(rec.candidate)fallback.push({...rec.candidate,source_raw_path:data.evidence.body_path});
  }
 }catch(error){dexChecks.push({chain,pool,status:'DEX_ERROR',error:String(error.message||error).slice(0,100)});}
}
const metrics=collectSampleMetrics({geckoDecoded:decoded,dexChecks,fallbackCandidates:fallback,requests:fetches});
const data={schema:1,kind:'DOT2_PUBLIC_CAPTURE_EVIDENCE',mode:'PAPER_RESEARCH_ONLY',
  request_path:path,requested_at_utc:request.created_at_utc,captured_completed_at_utc:now(),
  source_chain:chosen.chain,network_rotation:chosen.rotation,selected_page:1,
  coverage_is_global:false,coverage_is_all_chains:false,gecko:decoded,
  dex_checks:dexChecks,dex_fallback_candidates:fallback,
  api_evidence:fetches,metrics,
  errors:fetches.filter(x=>x.error||x.http_ok===false).map(x=>({provider:x.provider,status:x.http_status||null,error:x.error||'HTTP_NOT_OK'})),
  published_paper_orders:0,verified_client_fills:0,
  limitations:['No full scan beyond the fetched page or chosen chain.','HTTP timestamps are own capture, not provider quote update time.',
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
const mergedGecko=mergeMemory(memory,{candidates:decoded?.candidates||[],
 sourcePath:decoded?root+'/gecko-'+chosen.chain+'-page1.raw.json':filename,
 sourceCapturedAtUtc:data.captured_completed_at_utc,
 sourceSha256:fetches.find(x=>x.provider==='GECKOTERMINAL')?.response_sha256||null,
 provider:'GECKOTERMINAL',chain:chosen.chain,page:1,
 fetchStatus:decoded?'OK':(data.errors[0]?.error||'SOURCE_ERROR')});
memory=mergedGecko.memory;
const mergedDex=mergeMemory(memory,{candidates:fallback,
 sourcePath:filename,sourceCapturedAtUtc:data.captured_completed_at_utc,
 provider:'DEXSCREENER',chain:null,page:1});
memory=mergedDex.memory;
await mkdir('research/state/checkpoints',{recursive:true});
await writeFile(memoryPath,JSON.stringify(memory,null,2)+'\n','utf8');
const memoryCheckpointPath='research/state/checkpoints/'+runId+'.json';
const nextPlan=planIncrementalScan(memory,{asOfUtc:data.captured_completed_at_utc,maxRechecks:request.max_dex_pairs});
const memoryCheckpoint={schema:1,kind:'R29_MEMORY_SCAN_CHECKPOINT',
 run_id:runId,created_at_utc:data.captured_completed_at_utc,request_path:path,
 immutable_feed_path:filename,
 imported_existing_dot2:mergedOld.added,
 new_gecko_pools:mergedGecko.added,
 new_dex_fallback_pools:mergedDex.added,
 updated_pool_observations:mergedOld.updated+mergedGecko.updated+mergedDex.updated,
 coverage:memory.checkpoints,stats:memory.stats,
 historic_rechecks_next:nextPlan.rechecks,
 no_history_age_cutoff:true,no_trades_authorized:true,
 source_errors:data.errors};
await writeFile(memoryCheckpointPath,JSON.stringify(memoryCheckpoint,null,2)+'\n','utf8');
await writeFile('research/state/latest.json',JSON.stringify({
 schema:1,checkpoint_path:memoryCheckpointPath,memory_path:memoryPath,
 created_at_utc:data.captured_completed_at_utc,stats:memory.stats},null,2)+'\n','utf8');
const handoff=makeResearchHandoff({evidence:data,atUtc:data.captured_completed_at_utc});
const handoffPath=root+'/dot2-to-dot3-handoff.json';
await writeFile(handoffPath,JSON.stringify(handoff,null,2)+'\n','utf8');
artifacts.push(handoffPath);
const latest={schema:1,kind:'LATEST_DOT2_PUBLIC_CAPTURE_POINTER',mode:'PAPER_RESEARCH_ONLY',
  request_path:path,evidence_path:filename,handoff_path:handoffPath,captured_at_utc:data.captured_completed_at_utc,
  source_chain:chosen.chain,metrics,handoff_counts:handoff.counts,market_memory_path:memoryPath,memory_checkpoint_path:memoryCheckpointPath,memory_stats:memory.stats,source_evidence_paths:artifacts,
  trading_ready:false,orders_created:0};
await mkdir('research/feeds',{recursive:true});
await writeFile('research/feeds/latest.json',JSON.stringify(latest,null,2)+'\n','utf8');
console.log('DOT2_CAPTURE_DONE',JSON.stringify({evidence_path:filename,request_path:path,
 network:chosen.chain,metrics,memory_stats:memory.stats,memory_checkpoint:memoryCheckpointPath,errors:data.errors}));
