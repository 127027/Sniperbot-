import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalMarketIdentity,enrichPersistentMarketIdentity}
 from '../src/v19-canonical-market-identity.mjs';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {fairRecheckPlan} from '../src/discovery-fair-queue.mjs';
const evm=n=>'0x'+n.toString(16).padStart(40,'0');
const v4='0x'+'A'.repeat(64);
const sol='So'+'1'.repeat(38);
const stamp='2026-11-22T00:00:00Z';
test('SYS-13: EVM chain aliases, Robinhood, BNB and case normalize canonically',()=>{
 const bnb=canonicalMarketIdentity({chain:'BNB',pool:evm(1).toUpperCase().replace('0X','0x'),
  contract:evm(8)});
 assert.equal(bnb.chain,'bsc');
 assert.equal(bnb.pool_key,'bsc|EVM_POOL_ADDRESS|'+evm(1));
 assert.equal(bnb.token_key,'bsc|TOKEN|'+evm(8));
 const bsc=canonicalMarketIdentity({chain:'bsc',pool:evm(1),contract:evm(8)});
 assert.equal(bsc.pool_key,bnb.pool_key);
 const rob=canonicalMarketIdentity({chain:'robinhoodchain',pool:evm(1),contract:evm(8)});
 assert.notEqual(rob.pool_key,bnb.pool_key);
 assert.equal(rob.chain,'robinhood');
 const eth=canonicalMarketIdentity({chain:'eth',pool:evm(1),contract:evm(8)});
 assert.notEqual(eth.pool_key,rob.pool_key);
 assert.equal(eth.token_key,'ethereum|TOKEN|'+evm(8));
});
test('SYS-13: 32-byte Uniswap V4 ID never becomes 20-byte token/ordinary pair',()=>{
 const x=canonicalMarketIdentity({chain:'ethereum',pool:v4,pool_kind:'UNISWAP_V4_POOL_ID',
  contract:evm(2)});
 assert.equal(x.pool_kind,'UNISWAP_V4_POOL_ID');
 assert.equal(x.pool_key,'ethereum|UNISWAP_V4_POOL_ID|'+v4.toLowerCase());
 assert.equal(x.token_key,'ethereum|TOKEN|'+evm(2));
 assert.equal(canonicalMarketIdentity({chain:'ethereum',pool:v4,
  contract:evm(2)}),null);
 assert.equal(canonicalMarketIdentity({chain:'ethereum',pool:evm(1),
  pool_kind:'UNISWAP_V4_POOL_ID',contract:evm(2)}),null);
 const without=canonicalMarketIdentity({chain:'base',pool:evm(1)});
 assert.equal(without.token_key,null);
});
test('SYS-13: Solana is base58/case-sensitive and may not be merged with EVM or another Solana case',()=>{
 const s=canonicalMarketIdentity({chain:'solana',pool:sol,contract:'So'+'2'.repeat(38)});
 assert.equal(s.pool_key,'solana|SOLANA_POOL_ADDRESS|'+sol);
 const caseVariant=canonicalMarketIdentity({chain:'solana',pool:'s'+sol.slice(1),contract:'So'+'2'.repeat(38)});
 assert.notEqual(caseVariant.pool_key,s.pool_key);
 assert.equal(canonicalMarketIdentity({chain:'solana',pool:evm(4)}),null);
});
test('SYS-13: duplicate token symbol stays two tokens; two pools of same token stay distinct',()=>{
 let mem=emptyMarketMemory();
 const mk=(pool,contract,symbol)=>({chain:'base',pool,contract,symbol,observed_at_utc:stamp});
 const ids=[[evm(1),evm(20),'DUP'],[evm(2),evm(20),'DUP'],[evm(3),evm(21),'DUP']];
 for(let n=0;n<ids.length;n++){
  const [pool,contract,symbol]=ids[n];
  mem=mergeMemory(mem,{candidates:[mk(pool,contract,symbol)],
   sourcePath:'research/feeds/canonical-'+n+'.json',sourceCapturedAtUtc:stamp,
   chain:'base',page:n+1}).memory;
 }
 const migrated=enrichPersistentMarketIdentity(mem),vals=Object.values(migrated.pools);
 assert.equal(vals.length,3);
 assert.equal(new Set(vals.map(x=>x.pool_identity_key)).size,3);
 assert.equal(new Set(vals.map(x=>x.token_identity_key)).size,2);
 assert.ok(vals.every(x=>x.symbol==='DUP'));
 assert.equal(migrated.canonical_identity_audit.collisions.length,0);
});
test('SYS-13: conflicting contracts never receive a trustworthy unified token key',()=>{
 const mk=(contract)=>({chain:'base',pool:evm(7),contract,
  symbol:'SAME',observed_at_utc:stamp});
 let mem=mergeMemory(emptyMarketMemory(),{candidates:[mk(evm(20))],
  sourcePath:'research/feeds/a.json',sourceCapturedAtUtc:stamp}).memory;
 mem=mergeMemory(mem,{candidates:[mk(evm(21))],
  sourcePath:'research/feeds/b.json',sourceCapturedAtUtc:stamp}).memory;
 const migrated=enrichPersistentMarketIdentity(mem);
 const p=migrated.pools['base:'+evm(7)];
 assert.equal(p.canonical_identity_status,'CONFLICT');
 assert.equal(p.token_identity_key,null);
 assert.equal(p.observed_token_identity_keys.length,2);
 assert.equal(p.contract_conflicts.length,1);
 assert.equal(migrated.canonical_identity_audit.conflicts.length,1);
 assert.equal(p.status,'PENDING_RESEARCH_NOT_BUY_ELIGIBLE');
});
test('SYS-13: real 409-pool legacy archive migrates without rekeying, deleting or rescorings',async()=>{
 const raw=await readFile('research/state/market-memory.json','utf8');
 const original=JSON.parse(raw);
 assert.equal(Object.keys(original.pools).length,409);
 const beforeKeys=Object.keys(original.pools).sort();
 const beforeRefs=Object.fromEntries(Object.entries(original.pools).map(([k,x])=>
  [k,JSON.stringify({refs:x.source_refs,source:x.first_source_path,last:x.last_source_path,
   snapshot:x.last_snapshot,first:x.first_seen_at_utc,last_seen:x.last_seen_at_utc})]));
 const migrated=enrichPersistentMarketIdentity(original);
 assert.equal(migrated.canonical_identity_audit.preserved_pool_count,409);
 assert.equal(migrated.canonical_identity_audit.invalid.length,0);
 assert.equal(migrated.canonical_identity_audit.collisions.length,0);
 assert.equal(migrated.canonical_identity_audit.conflicts.length,0);
 assert.deepEqual(Object.keys(migrated.pools).sort(),beforeKeys);
 assert.deepEqual(migrated.ingested_sources,original.ingested_sources);
 assert.deepEqual(migrated.checkpoints,original.checkpoints);
 assert.deepEqual(migrated.rechecks,original.rechecks);
 for(const [k,x] of Object.entries(migrated.pools)){
  assert.equal(JSON.stringify({refs:x.source_refs,source:x.first_source_path,last:x.last_source_path,
   snapshot:x.last_snapshot,first:x.first_seen_at_utc,last_seen:x.last_seen_at_utc}),
   beforeRefs[k]);
  assert.ok(x.pool_identity_key);
 }
 const v4Count=Object.values(migrated.pools).filter(x=>
  x.pool_identity_type==='UNISWAP_V4_POOL_ID').length;
 assert.equal(v4Count,61);
 const unchanged=fairRecheckPlan(original,{asOfUtc:'2026-11-22T20:00:00Z',maxRechecks:20});
 const after=fairRecheckPlan(migrated,{asOfUtc:'2026-11-22T20:00:00Z',maxRechecks:20});
 assert.deepEqual(after.candidates,unchanged.candidates);
 assert.deepEqual(enrichPersistentMarketIdentity(migrated),migrated);
 assert.equal(JSON.stringify(original.pools).includes('pool_identity_key'),false);
 const onDisk=await readFile('research/state/market-memory.json','utf8');
 assert.equal(onDisk,raw);
});
test('SYS-13: runtime runner applies identity migration at output before storing its checkpoint',async()=>{
 const s=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(s,/import \{enrichPersistentMarketIdentity\}/);
 const start=s.indexOf('memory=enrichPersistentMarketIdentity(memory)');
 const write=s.indexOf('await writeFile(memoryPath');
 assert.ok(start>0&&write>start);
 assert.doesNotMatch(s,/writeFile\('signals\/orders\//);
});
