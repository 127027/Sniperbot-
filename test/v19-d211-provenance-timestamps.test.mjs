import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {recoverArchivedV4} from '../src/v18-archived-v4-recovery.mjs';
const pool='0x'+'a'.repeat(40);
const contract='0x'+'b'.repeat(40);
const created='2026-11-21T09:00:00.000Z';
const captured='2026-11-22T11:00:00.000Z';
const reconstructed='2026-11-22T17:00:00.000Z';
const current='2026-11-22T18:00:00.000Z';
const base={chain:'base',pool,contract,symbol:'NEW',
 pool_created_at_utc:created,observed_at_utc:captured,source_page:3,source_row:5};
const get=(m)=>m.pools['base:'+pool];
test('D2-11: creation, Dot2 detection and archive reconstruction are three separate facts',()=>{
 let m=mergeMemory(emptyMarketMemory(),{candidates:[base],
  sourcePath:'research/feeds/2026-11-22/original-raw-page.json',
  sourceCapturedAtUtc:captured,provider:'GECKOTERMINAL_ARCHIVE_RECOVERY',
  reconstructedAtUtc:reconstructed,fetchStatus:'ARCHIVED_ONLY',chain:'base',page:3}).memory;
 const p=get(m);
 assert.equal(p.first_seen_at_utc,captured);
 assert.equal(p.first_original_pool_created_at_utc,created);
 assert.equal(p.first_archive_reconstructed_at_utc,reconstructed);
 assert.equal(p.first_dot2_detected_at_utc,null);
 assert.equal(p.first_seen_legacy_timestamp_is_not_dot2_proof,true);
 assert.equal(p.source_refs[0].source_class,'ARCHIVED_RAW_RECONSTRUCTION');
 assert.equal(p.source_refs[0].first_processed_by_dot2_at_utc,null);
 assert.equal(p.source_refs[0].original_pool_created_at_utc,created);
 assert.equal(p.source_refs[0].source_page,3);
 assert.equal(p.source_refs[0].source_row,5);
 const currentCapture={...base,observed_at_utc:current,source_page:1,source_row:2};
 m=mergeMemory(m,{candidates:[currentCapture],chain:'base',page:1,
  sourcePath:'research/feeds/2026-11-22/live-page1.json',
  sourceCapturedAtUtc:current,provider:'GECKOTERMINAL',fetchStatus:'OK'}).memory;
 assert.equal(get(m).first_dot2_detected_at_utc,current);
 assert.equal(get(m).first_archive_reconstructed_at_utc,reconstructed);
 assert.equal(get(m).first_original_pool_created_at_utc,created);
 assert.equal(get(m).source_refs[1].source_class,'LIVE_DOT2_CAPTURE');
 assert.equal(get(m).source_refs[1].first_processed_by_dot2_at_utc,current);
 assert.equal(get(m).source_refs[1].source_page,1);
 assert.equal(get(m).source_refs[1].source_row,2);
 assert.equal(get(m).observation_count,2);
 assert.equal(m.stats.first_dot2_detected_count,1);
 assert.equal(m.stats.archive_reconstructed_count,1);
});
test('D2-11: imported legacy journals cannot impersonate contemporary Dot2 detection',()=>{
 const imported=mergeMemory(emptyMarketMemory(),{candidates:[base],
  sourcePath:'research/latest/dot-2.json',sourceCapturedAtUtc:captured,
  provider:'DOT2_PRIOR_JOURNAL'}).memory;
 assert.equal(get(imported).first_dot2_detected_at_utc,null);
 assert.equal(get(imported).source_refs[0].source_class,'DERIVED_OR_LEGACY_IMPORT');
 assert.equal(imported.stats.first_dot2_detected_count,0);
 const futureCreation=mergeMemory(emptyMarketMemory(),{candidates:[{
   ...base,pool_created_at_utc:'2026-11-23T00:00:00Z'}],
   sourcePath:'research/feeds/2026-11-22/future.json',
   sourceCapturedAtUtc:captured,provider:'GECKOTERMINAL'}).memory;
 assert.equal(get(futureCreation).first_original_pool_created_at_utc,null);
});
test('D2-11: actual 22-Nov V4 original HTTP sample is not retrospective proof of live Dot2 discovery',async()=>{
 const root='research/feeds/2026-11-22/44997708364/';
 const rawPath=root+'gecko-base-page3.raw.json';
 const [raw,evidence]=await Promise.all([readFile(rawPath,'utf8'),
   readFile(root+'evidence.json','utf8')]);
 const recovered=recoverArchivedV4({rawText:raw,evidence:JSON.parse(evidence),rawPath});
 assert.ok(recovered.candidates.length>=1);
 assert.ok(recovered.originally_raw_captured_at_utc);
 const historical=mergeMemory(emptyMarketMemory(),{candidates:recovered.candidates,
  sourcePath:root+'v18-recovered-v4.json',
  sourceCapturedAtUtc:recovered.originally_raw_captured_at_utc,
  sourceSha256:'a'.repeat(64),provider:'GECKOTERMINAL_ARCHIVE_RECOVERY',
  reconstructedAtUtc:reconstructed,fetchStatus:'ARCHIVED_ONLY',
  chain:'base',page:3}).memory;
 assert.equal(historical.stats.first_dot2_detected_count,0);
 assert.equal(historical.stats.archive_reconstructed_count,recovered.candidates.length);
 for(const p of Object.values(historical.pools)){
  assert.equal(p.first_dot2_detected_at_utc,null);
  assert.equal(p.first_archive_reconstructed_at_utc,reconstructed);
  assert.equal(p.source_refs[0].source_class,'ARCHIVED_RAW_RECONSTRUCTION');
  assert.ok(p.first_seen_at_utc<=reconstructed);
  assert.equal(p.pool_kind,'UNISWAP_V4_POOL_ID');
 }
});
test('D2-11: reconstructions cannot be timestamped earlier than the original source',()=>{
 assert.throws(()=>mergeMemory(emptyMarketMemory(),{candidates:[base],
  sourcePath:'research/feeds/2026-11-22/bad.json',sourceCapturedAtUtc:captured,
  provider:'GECKOTERMINAL_ARCHIVE_RECOVERY',reconstructedAtUtc:created}),
  /INVALID_ARCHIVE_RECONSTRUCTION_TIME/);
 assert.throws(()=>mergeMemory(emptyMarketMemory(),{candidates:[base],
  sourcePath:'research/feeds/2026-11-22/bad2.json',sourceCapturedAtUtc:captured,
  provider:'GECKOTERMINAL',reconstructedAtUtc:current}),
  /INVALID_ARCHIVE_RECONSTRUCTION_TIME/);
});
test('D2-11: never rewrite existing historical memory rows as future real captures append',async()=>{
 const path='research/state/market-memory.json';
 const text=await readFile(path,'utf8');
 const m=JSON.parse(text);
 const originalPoolCount=Object.keys(m.pools).length;
 assert.ok(originalPoolCount>=409,'historical 409-pool baseline was lost');
 const copy=structuredClone(m);
 const updated=mergeMemory(copy,{candidates:[{chain:'bsc',pool:'0x'+'f'.repeat(40),
  contract:'0x'+'e'.repeat(40),observed_at_utc:current,
  pool_created_at_utc:created,symbol:'NEU'}],
  sourcePath:'research/feeds/2026-11-22/strict-provenance-fixture.json',
  sourceCapturedAtUtc:current,provider:'GECKOTERMINAL',
  chain:'bsc',page:1}).memory;
 assert.equal(Object.keys(updated.pools).length,originalPoolCount+1);
 assert.equal(Object.keys(copy.pools).length,originalPoolCount);
 assert.equal(updated.pools['bsc:'+'f'.repeat(40)],undefined);
 assert.equal(updated.pools['bsc:0x'+'f'.repeat(40)].first_dot2_detected_at_utc,current);
 assert.equal(await readFile(path,'utf8'),text);
 const runner=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(runner,/reconstructedAtUtc:archived.recovered_at_utc/);
});
