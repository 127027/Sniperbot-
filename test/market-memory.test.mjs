import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMarketMemory,mergeMemory,planIncrementalScan,compactMemoryWithoutEvidenceLoss} from '../src/market-memory.mjs';
const pool='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',contract='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const c=(time='2025-01-01T00:05:00Z')=>({chain:'base',pool,contract,observed_at_utc:time,category:'REVIVED',symbol:'A'});
const add=(mem,src,t,candidates=[c(t)])=>mergeMemory(mem,{candidates,sourcePath:'research/feeds/'+src+'.json',
 sourceCapturedAtUtc:t,chain:'base',page:1});
test('old pools persist across months and scan midnight, not reset at day boundary',()=>{
 const a=add(emptyMarketMemory(),'a','2025-01-01T00:05:00Z').memory;
 const p=planIncrementalScan(a,{asOfUtc:'2026-11-21T00:00:00Z'});
 assert.equal(p.historical_pool_count,1);assert.equal(p.rechecks[0].contract,contract);
 const b=add(a,'b','2026-11-21T00:15:00Z').memory;
 assert.equal(Object.values(b.pools)[0].first_seen_at_utc,'2025-01-01T00:05:00.000Z');
 assert.equal(Object.values(b.pools)[0].observation_count,2);
 assert.equal(b.stats.total_observation_batches,2);
});
test('same raw source is idempotent and cannot be counted twice',()=>{
 const a=add(null,'a','2026-11-21T00:00:00Z');
 const b=add(a.memory,'a','2026-11-21T00:00:00Z');
 assert.equal(b.already_ingested,true);assert.equal(b.memory.stats.total_discovered,1);
});
test('contract conflict is retained and never silently substituted',()=>{
 const a=add(null,'a','2026-11-21T00:00:00Z').memory;
 const b=add(a,'b','2026-11-21T01:00:00Z',[{...c('2026-11-21T01:00:00Z'),contract:'0x'+'c'.repeat(40)}]);
 const v=Object.values(b.memory.pools)[0];
 assert.equal(v.contract,contract);assert.equal(v.contract_conflicts.length,1);
});
test('no future evidence may be injected into past and no truncation of pool age',()=>{
 const r=add(null,'x','2026-11-21T00:00:00Z',[c('2026-11-21T10:00:00Z')]);
 assert.equal(r.invalid,1);assert.equal(r.memory.stats.total_discovered,0);
});
test('memory cleanup never destroys source or order evidence',()=>{
 const m=add(null,'x','2026-11-21T00:00:00Z').memory;
 const c=compactMemoryWithoutEvidenceLoss(m);
 assert.deepEqual(c.deleted_files,[]);assert.equal(c.memory.stats.total_discovered,1);
});
