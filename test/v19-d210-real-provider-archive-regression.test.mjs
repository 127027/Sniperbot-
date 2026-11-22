import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {crossCheckDexPair} from '../src/live-pool-discovery.mjs';
import {fromDexPairOnly} from '../src/discovery-feed.mjs';
const root='research/feeds/2026-11-22/45044300013/';
const parse=async x=>JSON.parse(await readFile(x,'utf8'));
const receipt=(evidence,path)=>evidence.api_evidence.find(x=>x.body_path===path);
test('D2-10: real archived Gecko V4 and DEX exact-pair proof remains positive but research-only',async()=>{
 const evidence=await parse(root+'evidence.json');
 const row=evidence.dex_checks.find(x=>x.chain==='base'
  &&x.status==='TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY'
  &&x.pool.startsWith('0x32a4'));
 assert.ok(row);
 const candidate=evidence.gecko.candidates.find(x=>x.pool===row.pool);
 assert.equal(candidate.pool_kind,'UNISWAP_V4_POOL_ID');
 const rawText=await readFile(row.source,'utf8');
 const evidenceReceipt=receipt(evidence,row.source);
 assert.equal(evidenceReceipt.http_status,200);
 assert.equal(createHash('sha256').update(rawText).digest('hex'),
  evidenceReceipt.response_sha256);
 const actual=crossCheckDexPair({candidate,response:JSON.parse(rawText),
   checkedAtUtc:row.checked_at_utc});
 assert.equal(actual.matched,true);
 assert.equal(actual.status,'TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY');
 assert.equal(actual.pool_identity_key,
  'base|UNISWAP_V4_POOL_ID|'+candidate.pool.toLowerCase());
 assert.equal(actual.token_identity_key,'base|TOKEN|'+candidate.contract.toLowerCase());
 assert.equal(actual.provider_quote_asof_verified,false);
 assert.equal(actual.upstream_provider_independence_proven,false);
 assert.equal(actual.trade_authorized,false);
});
test('D2-10: real archived Cronos DEX response remains explicit NO_MATCH rather than imaginary quote',async()=>{
 const evidence=await parse(root+'evidence.json');
 const row=evidence.dex_checks.find(x=>x.chain==='cronos');
 assert.ok(row);
 const rawText=await readFile(row.source,'utf8');
 const original=receipt(evidence,row.source);
 assert.equal(original.http_status,200);
 assert.equal(createHash('sha256').update(rawText).digest('hex'),
  original.response_sha256);
 const res=fromDexPairOnly({chain:'cronos',pool:row.pool,
  response:JSON.parse(rawText),capturedAtUtc:original.received_at_utc});
 assert.equal(res.candidate,null);
 assert.equal(res.status,'NO_VERIFIED_EXACT_PAIR_AND_BASE');
});
