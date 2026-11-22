import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {emptyPageCoverage,updatePageCoverage} from '../src/v19-page-coverage.mjs';
import {stagePendingCapture,appendPartialHttpReceipt} from '../src/v19-partial-capture-durability.mjs';
import {restoreCommittedInflightCapture} from '../src/v19-inflight-http-recovery.mjs';
const first='2026-11-22T17:10:00.000Z',now='2026-11-22T18:45:00.000Z',run='450888001';
const pool='0x'+'b'.repeat(40),contract='0x'+'a'.repeat(40);
const url='https://api.geckoterminal.com/api/v2/networks/base/new_pools?include=base_token,quote_token&page=1';
const path='research/feeds/2026-11-22/'+run+'/gecko-base-page1.raw.json';
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const raw=JSON.stringify({data:[{id:'base_'+pool,
 attributes:{address:pool,base_token_price_usd:'0.002',reserve_in_usd:'20000',
  pool_created_at:'2026-11-22T12:00:00Z'},
 relationships:{base_token:{data:{id:'base_'+contract}}}}],
 included:[{id:'base_'+contract,attributes:{address:contract,symbol:'RESTART'}}]});
function journal({rawText=raw,http_status=200,sourceUrl=url,receive=first,sourcePath=path}={}){
 const initial=stagePendingCapture({pageCoverage:emptyPageCoverage(),
  tasks:[{chain:'base',page:1},{chain:'ethereum',page:1}],
  atUtc:first,runId:run}).journal;
 return appendPartialHttpReceipt(initial,{atUtc:receive,evidence:{
  provider:'GECKOTERMINAL',url:sourceUrl,http_status,
  body_path:sourcePath,response_sha256:sha(rawText),
  started_at_utc:receive,received_at_utc:receive}});
}
test('SYS-11: after interrupted GitHub capture reuse SHA-verified original page instead of fetching again',()=>{
 const original=journal();
 const restarted=JSON.parse(JSON.stringify(original));
 const restored=restoreCommittedInflightCapture({
  journal:restarted,rawFiles:{[path]:raw},
  memory:emptyMarketMemory(),pageCoverage:emptyPageCoverage(),asOfUtc:now});
 assert.equal(restored.recovered_page_count,1);
 assert.equal(restored.recovered_candidate_rows,1);
 assert.equal(restored.recovered[0].raw_path,path);
 assert.equal(restored.recovered[0].source_http_received_at_utc,first);
 assert.equal(restored.memory.pools['base:'+pool].first_seen_at_utc,first);
 assert.equal(restored.memory.pools['base:'+pool].first_dot2_detected_at_utc,null);
 assert.equal(restored.memory.pools['base:'+pool].first_archive_reconstructed_at_utc,now);
 assert.equal(restored.memory.pools['base:'+pool].source_refs[0].source_class,
  'ARCHIVED_RAW_RECONSTRUCTION');
 assert.equal(restored.pageCoverage.chains.base.pages[1].last_source_path,path);
 assert.equal(restored.pageCoverage.chains.base.pages[1].last_sha256,sha(raw));
 assert.equal(restored.paper_orders_authorized,0);
 assert.equal(restored.raw_bytes_rewritten,0);
 // Replaying exactly the same GitHub content cannot double-count a pool.
 const twice=restoreCommittedInflightCapture({
  journal:restarted,rawFiles:{[path]:raw},
  memory:JSON.parse(JSON.stringify(restored.memory)),
  pageCoverage:JSON.parse(JSON.stringify(restored.pageCoverage)),asOfUtc:now});
 assert.equal(twice.recovered_page_count,0);
 assert.equal(twice.alreadyRecorded.length,1);
 assert.deepEqual(twice.memory,restored.memory);
});
test('SYS-11: reject changed raw bytes, spoofed URL, future capture, wrong run or HTTP429',()=>{
 const base={memory:emptyMarketMemory(),pageCoverage:emptyPageCoverage(),asOfUtc:now};
 assert.equal(restoreCommittedInflightCapture({...base,
  journal:journal(),rawFiles:{[path]:raw+' '}}).rejected[0].reason,
  'RAW_SHA_URL_TIME_OR_PROVIDER_NOT_AUTHENTICATED');
 assert.equal(restoreCommittedInflightCapture({...base,
  journal:journal({sourceUrl:'https://evil.example.com/api'}),rawFiles:{[path]:raw}})
  .rejected[0].reason,'RAW_SHA_URL_TIME_OR_PROVIDER_NOT_AUTHENTICATED');
 assert.equal(restoreCommittedInflightCapture({...base,
  journal:journal({receive:'2026-11-23T01:00:00Z'}),rawFiles:{[path]:raw}})
  .rejected[0].reason,'RAW_SHA_URL_TIME_OR_PROVIDER_NOT_AUTHENTICATED');
 assert.equal(restoreCommittedInflightCapture({...base,
  journal:journal({http_status:429}),rawFiles:{[path]:raw}})
  .recovered_page_count,0);
 const spoof=journal();
 spoof.run_id='450888002';
 assert.equal(restoreCommittedInflightCapture({...base,journal:spoof,rawFiles:{[path]:raw}})
  .rejected[0].reason,'JOURNAL_RUN_OR_PLAN_MISMATCH');
});
test('SYS-11: never regress a newer chain cursor or replace a newer observed page with old archive',()=>{
 let mem=mergeMemory(emptyMarketMemory(),{
  candidates:[],chain:'base',page:5,provider:'GECKOTERMINAL',
  sourcePath:'research/feeds/2026-11-22/newer.json',
  sourceCapturedAtUtc:'2026-11-22T18:30:00Z'}).memory;
 const before=JSON.stringify(mem.checkpoints['base:GECKOTERMINAL']);
 const previous=mem.generated_at_utc;
 const recovery=restoreCommittedInflightCapture({journal:journal(),rawFiles:{[path]:raw},
  memory:mem,pageCoverage:emptyPageCoverage(),asOfUtc:now});
 assert.equal(JSON.stringify(recovery.memory.checkpoints['base:GECKOTERMINAL']),before);
 assert.equal(recovery.memory.generated_at_utc,previous);
 const newest=updatePageCoverage(emptyPageCoverage(),{asOfUtc:now,successes:[{
  chain:'base',page:1,captured_at_utc:'2026-11-22T18:30:00Z',
  source_path:'research/feeds/2026-11-22/newer-001.json',
  source_sha256:'a'.repeat(64),candidates:[]}]}).updated_memory;
 const skipped=restoreCommittedInflightCapture({journal:journal(),rawFiles:{[path]:raw},
  memory:mem,pageCoverage:newest,asOfUtc:now});
 assert.equal(skipped.recovered_page_count,0);
 assert.equal(skipped.alreadyRecorded.length,1);
 assert.equal(skipped.pageCoverage.chains.base.pages[1].last_source_path,
  'research/feeds/2026-11-22/newer-001.json');
});
test('SYS-11: real earlier committed Gecko API bytes recover without changing their content hash',async()=>{
 const root='research/feeds/2026-11-22/45044300013/';
 const evidence=JSON.parse(await readFile(root+'evidence.json','utf8'));
 const entry=evidence.api_evidence.find(x=>x.provider==='GECKOTERMINAL'
   &&x.http_status===200&&x.url?.includes('/networks/bsc/new_pools'));
 assert.ok(entry);
 const rawText=await readFile(entry.body_path,'utf8');
 assert.equal(sha(rawText),entry.response_sha256);
 const match=entry.body_path.match(/gecko-(\w+)-page(\d+)\.raw\.json$/);
 assert.ok(match);
 const originalRun='45044300013';
 const synthetic=stagePendingCapture({pageCoverage:emptyPageCoverage(),
  tasks:[{chain:match[1],page:Number(match[2])}],runId:originalRun,
  atUtc:entry.started_at_utc}).journal;
 const signed=appendPartialHttpReceipt(synthetic,{evidence:entry,atUtc:entry.received_at_utc});
 const recovered=restoreCommittedInflightCapture({journal:signed,
  rawFiles:{[entry.body_path]:rawText},memory:emptyMarketMemory(),
  pageCoverage:emptyPageCoverage(),asOfUtc:now});
 assert.equal(recovered.recovered_page_count,1);
 assert.equal(recovered.recovered[0].sha256,entry.response_sha256);
 assert.ok(recovered.recovered_candidate_rows>0);
 assert.equal(recovered.paper_orders_authorized,0);
 assert.ok(Object.values(recovered.memory.pools)
  .every(p=>p.first_dot2_detected_at_utc===null));
});
test('SYS-11: production real capture restores prior inflight committed pages BEFORE new API calls',async()=>{
 const runner=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 const replay=runner.indexOf('restoreCommittedInflightCapture({');
 const plan=runner.indexOf('const capturePlan=planMultiChainCapture(');
 const firstNetwork=runner.indexOf('const got=await fetchRaw(');
 assert.ok(replay>0&&plan>replay&&firstNetwork>plan);
 assert.match(runner,/recoveredInflight\.push\(\.\.\.restored\.recovered\)/);
 assert.match(runner,/await writeFile\(coverageStatePath,JSON\.stringify\(pageCoverage/);
 assert.match(runner,/restored_pages_are_not_fresh_provider_fetches:true/);
 assert.match(runner,/original_raw_files_rewritten:0/);
});
