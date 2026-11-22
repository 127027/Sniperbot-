import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodeGeckoNewPools,crossCheckDexPair} from '../src/live-pool-discovery.mjs';
import {recoverArchivedV4} from '../src/v18-archived-v4-recovery.mjs';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {makeResearchHandoff} from '../src/feed-handoff.mjs';
import {summarizeDot3RiskStatuses} from '../src/v19-dot3-risk-status.mjs';
import {planHotFairRechecks} from '../src/v19-hot-fair-recheck.mjs';
import {buildDot5DiscoveryLedger} from '../src/v19-dot5-event-ledger.mjs';
import {poolValid,tokenValid} from '../src/market-evidence.mjs';

const root='research/feeds/2026-11-22/45002280249/';
const sourcePath=root+'gecko-ethereum-page3.raw.json';
const originalEvidencePath=root+'evidence.json';
const read=async p=>readFile(p,'utf8');
const archive=async()=>{
 const [raw,evidence]=await Promise.all([read(sourcePath),
  read(originalEvidencePath).then(JSON.parse)]);
 const receipt=evidence.api_evidence.find(x=>x.body_path===sourcePath);
 assert.ok(receipt,'immutable source has a recorded HTTP evidence receipt');
 assert.equal(receipt.provider,'GECKOTERMINAL');
 assert.equal(receipt.http_status,200);
 assert.equal(createHash('sha256').update(raw,'utf8').digest('hex'),receipt.response_sha256);
 assert.equal(Buffer.byteLength(raw,'utf8'),receipt.raw_bytes_utf8);
 return {raw,evidence,receipt};
};

test('same original Ethereum V4 archive: correct 18 lost V4 and keep two V2 = 20/20',async()=>{
 const {raw,evidence,receipt}=await archive();
 assert.equal(evidence.gecko.found_count,2);
 assert.equal(evidence.gecko.rejected_count,18);
 const decoded=decodeGeckoNewPools({
  network:'ethereum',response:JSON.parse(raw),
  page:evidence.selected_page,capturedAtUtc:receipt.received_at_utc});
 assert.equal(decoded.requested_pool_count,20);
 assert.equal(decoded.found_count,20);
 assert.equal(decoded.rejected_count,0);
 assert.equal(decoded.with_full_contract,20);
 const v4=decoded.candidates.filter(x=>x.pool_kind==='UNISWAP_V4_POOL_ID');
 assert.equal(v4.length,18);
 assert.equal(decoded.candidates.filter(x=>x.pool_kind===null).length,2);
 assert.equal(v4.every(x=>/^0x[0-9a-f]{64}$/i.test(x.pool)),true);
 assert.equal(v4.every(x=>poolValid(x.chain,x.pool,x.pool_kind)
    &&!tokenValid(x.chain,x.pool)&&tokenValid(x.chain,x.contract)),true);
 assert.equal(v4.every(x=>x.source_url.includes('/eth/pools/')
    &&x.source_page===3&&x.source_api==='GECKOTERMINAL_NEW_POOLS_JSON'),true);
 assert.equal(v4.every(x=>x.observed_at_utc===receipt.received_at_utc),true);
});
test('archived V4 recovery proves old source bytes, but NOT original Dot2 acceptance',async()=>{
 const {raw,evidence}=await archive();
 const recovered=recoverArchivedV4({rawText:raw,evidence,rawPath:sourcePath});
 assert.equal(recovered.recovered_v4_count,18);
 assert.equal(recovered.decoded_total,20);
 assert.equal(recovered.history_reconstruction_not_fresh_quote,true);
 assert.equal(recovered.originally_raw_captured_at_utc,
  evidence.api_evidence.find(x=>x.body_path===sourcePath).received_at_utc);
 assert.equal(recovered.candidates.every(x=>
  x.recovered_from_original_capture===true
  &&x.original_dot2_discovery_verified===false
  &&x.trade_authorized===false),true);
 assert.throws(()=>recoverArchivedV4({
  rawText:raw+' ',evidence,rawPath:sourcePath}),/ARCHIVE_RAW_HASH_NOT_PROVEN/);
});
test('recovery retains old two original discoveries and adds 18 V4 once in memory',async()=>{
 const {raw,evidence,receipt}=await archive();
 const initial=mergeMemory(emptyMarketMemory(),{
   candidates:evidence.gecko.candidates,sourcePath:originalEvidencePath,
   sourceCapturedAtUtc:evidence.captured_completed_at_utc,
   chain:'ethereum',page:3}).memory;
 assert.equal(initial.stats.total_discovered,2);
 const recovered=recoverArchivedV4({rawText:raw,evidence,rawPath:sourcePath});
 const recoveryPath=root+'v19-ethereum-v4-rederived.json';
 const result=mergeMemory(initial,{candidates:recovered.candidates,
   sourcePath:recoveryPath,sourceCapturedAtUtc:receipt.received_at_utc,
   chain:'ethereum',page:3,provider:'GECKOTERMINAL_ARCHIVE_REPLAY'});
 assert.equal(result.added,18);
 assert.equal(result.memory.stats.total_discovered,20);
 assert.equal(result.memory.stats.contracts_complete,20);
 assert.equal(Object.values(result.memory.pools)
  .filter(x=>x.pool_kind==='UNISWAP_V4_POOL_ID').length,18);
 assert.equal(Object.values(result.memory.pools)
  .every(x=>x.status==='PENDING_RESEARCH_NOT_BUY_ELIGIBLE'),true);
 const repeat=mergeMemory(result.memory,{candidates:recovered.candidates,
   sourcePath:recoveryPath,sourceCapturedAtUtc:receipt.received_at_utc});
 assert.equal(repeat.already_ingested,true);
 assert.equal(repeat.memory.stats.total_discovered,20);
});
test('existing Dot2 -> Dot3 -> Dot5 RESEARCH pipeline preserves V4 type, no phantom orders',async()=>{
 const {raw,evidence,receipt}=await archive();
 const decoded=decodeGeckoNewPools({network:'ethereum',
   response:JSON.parse(raw),page:3,capturedAtUtc:receipt.received_at_utc});
 const rederivedEvidence={...evidence,gecko:decoded};
 const handoff=makeResearchHandoff({
   evidence:rederivedEvidence,atUtc:evidence.captured_completed_at_utc});
 assert.equal(handoff.counts.unique_pools,20);
 assert.equal(handoff.counts.full_contracts,20);
 assert.equal(handoff.counts.trade_eligible,0);
 assert.equal(handoff.candidates.filter(x=>x.pool_kind==='UNISWAP_V4_POOL_ID').length,18);
 assert.equal(handoff.candidates.every(x=>x.BUY_AUTHORIZED===false),true);
 const risk=summarizeDot3RiskStatuses({handoff,
   asOfUtc:evidence.captured_completed_at_utc});
 assert.equal(risk.candidates.length,20);
 assert.equal(risk.order_authorized_count,0);
 assert.equal(risk.candidates.filter(x=>x.pool_kind==='UNISWAP_V4_POOL_ID').length,18);
 assert.equal(risk.candidates.some(x=>x.trade_authorized),false);
 const dot5=buildDot5DiscoveryLedger({
   capture:rederivedEvidence,handoff,dot3RiskPreview:risk,
   asOfUtc:evidence.captured_completed_at_utc,sourceEvidencePath:originalEvidencePath});
 assert.equal(dot5.summary.recorded_lifecycle_entities,20);
 assert.equal(dot5.summary.handoff_accepted_pools,20);
 assert.equal(dot5.summary.upstream_parser_rejections,0);
 assert.equal(dot5.summary.verified_orders,0);
 assert.equal(dot5.events.filter(x=>x.pool_kind==='UNISWAP_V4_POOL_ID').length,18);
 assert.equal(dot5.events.every(x=>x.order===null&&x.client_receipt===null),true);
});
test('as-of neutral HOT/FAIR planning can see all 20, but has no paper authority',async()=>{
 const {raw,evidence,receipt}=await archive();
 const dec=decodeGeckoNewPools({network:'ethereum',response:JSON.parse(raw),
   page:3,capturedAtUtc:receipt.received_at_utc});
 const p=planHotFairRechecks({freshCandidates:dec.candidates,
   asOfUtc:evidence.captured_completed_at_utc,maxChecks:6,round:0});
 assert.equal(p.all_new_pool_count,20);
 assert.equal(p.selected_count,6);
 assert.equal(p.deferred_new_pool_count,14);
 assert.equal(p.priority_uses_future_winners,false);
 assert.equal(p.trade_authorized,false);
 assert.equal(p.paper_orders,0);
});
test('32-byte v4 pool ID is not a valid 20-byte token contract or blindly Dex matched',async()=>{
 const {raw,evidence,receipt}=await archive();
 const dec=decodeGeckoNewPools({network:'ethereum',response:JSON.parse(raw),
   page:3,capturedAtUtc:receipt.received_at_utc});
 const v4=dec.candidates.find(x=>x.pool_kind==='UNISWAP_V4_POOL_ID');
 assert.equal(tokenValid('ethereum',v4.pool),false);
 const check=crossCheckDexPair({candidate:v4,response:{pairs:[]},
  checkedAtUtc:evidence.captured_completed_at_utc});
 assert.equal(check.matched,false);
 assert.equal(check.trade_authorized??false,false);
});
test('network alias eth is not the Uniswap-v4 relationship id uniswap-v4-ethereum',()=>{
 const pool='0x'+'a'.repeat(64),token='0x'+'b'.repeat(40);
 const raw={data:[{id:'eth_'+pool,attributes:{address:pool},
   relationships:{dex:{data:{id:'uniswap-v4-eth'}},base_token:{data:{id:'eth_'+token}}}}],
   included:[{id:'eth_'+token,attributes:{address:token,symbol:'TEST'}}]};
 const mismatch=decodeGeckoNewPools({network:'eth',response:raw,
   capturedAtUtc:'2026-11-22T09:00:00.000Z',page:3});
 assert.equal(mismatch.found_count,0);
 assert.equal(mismatch.rejected_count,1);
 raw.data[0].relationships.dex.data.id='uniswap-v4-ethereum';
 const good=decodeGeckoNewPools({network:'eth',response:raw,
   capturedAtUtc:'2026-11-22T09:00:00.000Z',page:3});
 assert.equal(good.found_count,1);
 assert.equal(good.candidates[0].pool_kind,'UNISWAP_V4_POOL_ID');
});
