import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {recoverArchivedV4} from '../src/v18-archived-v4-recovery.mjs';
import {decodeGeckoNewPools} from '../src/live-pool-discovery.mjs';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
const root='research/feeds/2026-11-22/44997708364/';
const rawPath=root+'gecko-base-page3.raw.json';
const rawText=await readFile(new URL('../'+rawPath,import.meta.url),'utf8');
const evidence=JSON.parse(await readFile(new URL('../'+root+'evidence.json',import.meta.url),'utf8'));

test('all 11 lost V4 records recovered with original HTTP time and original raw hash',()=>{
 const r=recoverArchivedV4({rawText,evidence,rawPath});
 assert.equal(r.recovered_v4_count,11);
 assert.equal(r.decoded_total,20);
 assert.ok(r.candidates.every(c=>c.observed_at_utc==='2026-11-22T07:19:40.439Z'));
 assert.ok(r.candidates.every(c=>c.original_dot2_discovery_verified===false&&!c.trade_authorized));
 assert.equal(r.history_reconstruction_not_fresh_quote,true);
});

test('altered or unreferenced raw response cannot be promoted to archived pool evidence',()=>{
 assert.throws(()=>recoverArchivedV4({rawText:rawText+' ',evidence,rawPath}),/ARCHIVE_RAW_HASH_NOT_PROVEN/);
 assert.throws(()=>recoverArchivedV4({rawText,evidence,rawPath:'research/feeds/elsewhere.raw.json'}),/ARCHIVE_RAW_HASH_NOT_PROVEN/);
});

test('recovery merges 9 old visible pools plus 11 old skipped pools, without duplicating history',()=>{
 const r=recoverArchivedV4({rawText,evidence,rawPath});
 const all=decodeGeckoNewPools({network:'base',response:JSON.parse(rawText),
  capturedAtUtc:r.originally_raw_captured_at_utc,page:3});
 const acceptedOld=all.candidates.filter(x=>x.pool_kind!=='UNISWAP_V4_POOL_ID');
 assert.equal(acceptedOld.length,9);
 const old=mergeMemory(emptyMarketMemory(),{candidates:acceptedOld,
  sourcePath:rawPath,sourceCapturedAtUtc:r.originally_raw_captured_at_utc,chain:'base',page:3}).memory;
 const derivedPath=root+'v18-recovered-v4.json';
 const updated=mergeMemory(old,{candidates:r.candidates,sourcePath:derivedPath,
  sourceCapturedAtUtc:r.originally_raw_captured_at_utc,chain:'base',page:3,provider:'GECKOTERMINAL_ARCHIVE_RECOVERY'}).memory;
 assert.equal(updated.stats.total_discovered,20);
 assert.equal(updated.stats.contracts_complete,20);
 const repeated=mergeMemory(updated,{candidates:r.candidates,sourcePath:derivedPath,
  sourceCapturedAtUtc:r.originally_raw_captured_at_utc});
 assert.equal(repeated.already_ingested,true);
 assert.equal(repeated.memory.stats.total_discovered,20);
});
