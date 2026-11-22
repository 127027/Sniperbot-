import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('real 22-Nov six-chain capture only appends pools, preserving all 409 pre-capture identities and first sources',async()=>{
 const baseline=JSON.parse(await readFile(
  'test/fixtures/v19-original-409-pool-provenance-baseline.json','utf8'));
 const current=JSON.parse(await readFile('research/state/market-memory.json','utf8'));
 assert.equal(baseline.kind,'R29_V19_PRE_CAPTURE_ORIGINAL_POOL_PROVENANCE_FIXTURE');
 assert.equal(baseline.original_pool_count,409);
 assert.equal(baseline.entries.length,409);
 assert.equal(new Set(baseline.entries.map(p=>p.key)).size,409);
 const currentKeys=Object.keys(current.pools);
 assert.ok(currentKeys.length>=488,'the real 79-pool increase over 409 was lost');
 for(const original of baseline.entries){
  const pool=current.pools[original.key];
  assert.ok(pool,'historical pool identity deleted: '+original.key);
  assert.equal(pool.first_seen_at_utc,original.first_seen_at_utc,
   'original first-seen timestamp altered: '+original.key);
  assert.equal(pool.first_source_path,original.first_source_path,
   'original first source altered: '+original.key);
 }
 assert.ok(currentKeys.filter(key=>!baseline.entries.some(p=>p.key===key)).length>=79,
  'new data must append to baseline without replacing any old pool');
 assert.equal(current.mode,'PAPER_RESEARCH_ONLY');
});
