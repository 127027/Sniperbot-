// R29 SYS-11: replay already-COMMITTED HTTP200 RAW bytes from a prior
// interrupted Dot2 run without issuing a second network request.
// Never treat a captured (but unparsed) old page as prior real Dot2 discovery.
// No orders, no upstream calls, no winner labels.
import {createHash} from 'node:crypto';
import {decodeGeckoNewPools} from './live-pool-discovery.mjs';
import {mergeMemory} from './market-memory.mjs';
import {updatePageCoverage} from './v19-page-coverage.mjs';
import {canonicalChain} from './market-evidence.mjs';
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');
const responsePath=/^research\/feeds\/\d{4}-\d{2}-\d{2}\/(\d+)\/gecko-(solana|base|ethereum|bsc|robinhood|cronos)-page([1-9]\d{0,2})\.raw\.json$/;
const network=x=>x==='ethereum'?'eth':x==='cronos'?'cro':x;
export function restoreCommittedInflightCapture({
 journal,rawFiles={},memory,pageCoverage,asOfUtc
}={}){
 const now=iso(asOfUtc);
 if(!now||journal?.kind!=='R29_V19_INFLIGHT_CAPTURE_JOURNAL'
   ||!/^[0-9]{1,20}$/.test(journal.run_id||'')
   ||!Array.isArray(journal.http_receipts)
   ||!Array.isArray(journal.planned_pages)
   ||!rawFiles||typeof rawFiles!=='object'
   ||memory?.kind!=='R29_PERSISTENT_MARKET_MEMORY'
   ||pageCoverage?.kind!=='R29_V19_OFFSET_PAGE_COVERAGE')
   throw Error('INVALID_COMMITTED_INFLIGHT_REPLAY');
 let mem=structuredClone(memory),coverage=structuredClone(pageCoverage);
 const recovered=[],rejected=[],alreadyRecorded=[],skipped=[];
 const planned=new Set(journal.planned_pages.map(x=>{
  const c=canonicalChain(x?.chain),p=x?.page;
  if(!c||!Number.isInteger(p)||p<1||p>1000)
   throw Error('INVALID_COMMITTED_INFLIGHT_PLANNED_PAGE');
  return c+':'+p;
 }));
 for(const r of journal.http_receipts){
  const path=r?.body_path,match=typeof path==='string'?path.match(responsePath):null;
  if(!match){skipped.push({path:path||null,reason:'NOT_GECKO_NEW_POOL_RAW'});continue;}
  const [_,runId,chain,num]=match,page=Number(num),pageKey=chain+':'+page;
  if(runId!==journal.run_id||!planned.has(pageKey)){
   rejected.push({path,reason:'JOURNAL_RUN_OR_PLAN_MISMATCH'});continue;
  }
  if(r.http_status!==200){skipped.push({path,reason:'NON_200_HTTP'});continue;}
  const captured=iso(r.received_at_utc),started=iso(r.started_at_utc);
  const url='https://api.geckoterminal.com/api/v2/networks/'+network(chain)
   +'/new_pools?include=base_token,quote_token&page='+page;
  const raw=rawFiles[path];
  if(!captured||!started||started>captured||captured>now
    ||r.provider!=='GECKOTERMINAL'||r.url!==url
    ||!/^[a-f0-9]{64}$/.test(r.response_sha256||'')
    ||typeof raw!=='string'||digest(raw)!==r.response_sha256){
   rejected.push({path,reason:'RAW_SHA_URL_TIME_OR_PROVIDER_NOT_AUTHENTICATED'});continue;
  }
  const previous=coverage.chains?.[chain]?.pages?.[page];
  if(previous?.last_success_at_utc&&previous.last_success_at_utc>=captured){
   alreadyRecorded.push({path,reason:'EQUAL_OR_NEWER_PAGE_ALREADY_INDEXED'});continue;
  }
  let decoded;
  try{
   decoded=decodeGeckoNewPools({network:chain,response:JSON.parse(raw),
    capturedAtUtc:captured,page});
  }catch(error){
   rejected.push({path,reason:'ORIGINAL_HTTP200_DECODER_FAILED'});continue;
  }
  // We know the original HTTP page arrived in the old run. We only FIRST
  // successfully indexed it now, without fabricating earlier live discovery.
  const oldCheckpoint=mem.checkpoints?.[chain+':GECKOTERMINAL'];
  const previousMemoryAt=mem.generated_at_utc;
  const previousLastSource=mem.last_ingested_source_path;
  if(!mem.ingested_sources?.includes(path)){
   mem=mergeMemory(mem,{candidates:decoded.candidates,
    sourcePath:path,sourceCapturedAtUtc:captured,
    sourceSha256:r.response_sha256,
    chain,page,provider:'GECKOTERMINAL_ARCHIVED_HTTP_RECOVERY',
    reconstructedAtUtc:now,fetchStatus:'ARCHIVED_ONLY'}).memory;
   // Reconstructing an OLD raw HTTP page cannot rewind the active live
   // discovery chain cursor or make the whole memory appear older.
   if(oldCheckpoint)mem.checkpoints[chain+':GECKOTERMINAL']=oldCheckpoint;
   if(previousMemoryAt&&previousMemoryAt>captured){
    mem.generated_at_utc=previousMemoryAt;
    mem.last_ingested_source_path=previousLastSource;
   }
  }
  const result=updatePageCoverage(coverage,{asOfUtc:now,
    successes:[{chain,page,captured_at_utc:captured,
      source_path:path,source_sha256:r.response_sha256,
      requested_pool_count:decoded.requested_pool_count,
      rejected_count:decoded.rejected_count,
      candidates:decoded.candidates}]});
  coverage=result.updated_memory;
  recovered.push({chain,page,raw_path:path,sha256:r.response_sha256,
   source_http_received_at_utc:captured,
   recovered_at_utc:now,
   decoded_pool_count:decoded.found_count,
   first_live_dot2_discovery_falsely_backdated:false});
 }
 return {schema:1,kind:'R29_V19_COMMITTED_INFLIGHT_RECOVERY_RESULT',
  from_run_id:journal.run_id,as_of_utc:now,
  memory:mem,pageCoverage:coverage,recovered,rejected,alreadyRecorded,skipped,
  recovered_page_count:recovered.length,
  recovered_candidate_rows:recovered.reduce((n,x)=>n+x.decoded_pool_count,0),
  raw_bytes_rewritten:0,
  paper_orders_authorized:0,original_capture_time_independently_attested:false};
}
