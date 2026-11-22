import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {decodeGeckoNewPools} from '../src/live-pool-discovery.mjs';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {fairRecheckPlan,recordRecheckAttempt} from '../src/discovery-fair-queue.mjs';
import {makeResearchHandoff} from '../src/feed-handoff.mjs';
import {makeCaptureObservationBatch,scoreAsOf} from '../src/forward-learning.mjs';
import {buildRiskRecheckQueue} from '../src/risk-recheck-queue.mjs';

const captured='2026-11-22T07:19:41.241Z';
const raw=JSON.parse(await readFile(new URL('../research/feeds/2026-11-22/44997708364/gecko-base-page3.raw.json',import.meta.url),'utf8'));
const decoded=()=>decodeGeckoNewPools({network:'base',response:raw,capturedAtUtc:captured,page:3});

test('actual archived Base page 3 retains all 20 pools, including 11 Uniswap V4 pool IDs',()=>{
 const result=decoded();
 assert.equal(raw.data.length,20);
 assert.equal(result.found_count,20);
 assert.equal(result.rejected_count,0);
 assert.equal(result.with_full_contract,20);
 assert.equal(result.candidates.filter(x=>x.pool_kind==='UNISWAP_V4_POOL_ID').length,11);
 assert.ok(result.candidates.every(x=>x.trade_authorized!==true));
});

test('unknown or mismatched DEX metadata never turns an arbitrary 32-byte value into a valid pool',()=>{
 const changed=structuredClone(raw);
 changed.data[1].relationships.dex.data.id='uniswap-v4-ethereum';
 const r=decodeGeckoNewPools({network:'base',response:changed,capturedAtUtc:captured,page:3});
 assert.equal(r.found_count,19);
 assert.equal(r.rejected_count,1);
 assert.equal(r.rejected[0].row,1);
});

test('V4 pool kind survives memory, fair recheck, handoff, forward ranking and risk worklist, never BUY',()=>{
 const d=decoded();
 const mem=mergeMemory(emptyMarketMemory(),{candidates:d.candidates,
   sourcePath:'research/feeds/2026-11-22/44997708364/gecko-base-page3.raw.json',
   sourceCapturedAtUtc:captured,chain:'base',page:3}).memory;
 assert.equal(mem.stats.total_discovered,20);
 const q=fairRecheckPlan(mem,{asOfUtc:captured,maxRechecks:100});
 assert.equal(q.valid_recheck_pools,20);
 const v4=q.candidates.find(x=>x.pool_kind==='UNISWAP_V4_POOL_ID');
 assert.ok(v4);
 const recheck=recordRecheckAttempt(mem,{chain:v4.chain,pool:v4.pool,pool_kind:v4.pool_kind,attemptAtUtc:captured,
   status:'SOURCE_CHECKED',sourcePath:'research/feeds/v18-shadow-test.json'});
 assert.equal(recheck.rechecks[v4.key].attempts,1);
 const evidence={kind:'DOT2_PUBLIC_CAPTURE_EVIDENCE',mode:'PAPER_RESEARCH_ONLY',
   request_path:'research/requests/2026-11-22/example.json',
   captured_completed_at_utc:captured,gecko:d,dex_checks:[],dex_fallback_candidates:[]};
 const h=makeResearchHandoff({evidence,atUtc:captured});
 assert.equal(h.counts.unique_pools,20);
 assert.equal(h.counts.trade_eligible,0);
 assert.equal(h.candidates.filter(x=>x.pool_kind==='UNISWAP_V4_POOL_ID').length,11);
 const batch=makeCaptureObservationBatch({capturedAtUtc:captured,
  sourcePath:'research/feeds/2026-11-22/44997708364/evidence.json',geckoCandidates:d.candidates});
 assert.equal(batch.counts.valid,20);
 assert.equal(batch.observations.filter(x=>x.pool_kind==='UNISWAP_V4_POOL_ID').length,11);
 assert.equal(scoreAsOf({batches:[batch],asOfUtc:captured}).counts.research_rankable,0);
 const risk=buildRiskRecheckQueue({report:{candidates:h.candidates},asOfUtc:captured,limit:50});
 assert.equal(risk.scanned_candidate_count,20);
 assert.equal(risk.counts.IDENTITY_UNVERIFIED,0);
 assert.equal(risk.actual_orders,0);
 assert.ok(risk.worklist.every(x=>x.eligible_for_buy===false));
});

test('two time-separated observations can rank a V4 pool without creating risk approval',()=>{
 const d=decoded();
 const coin=d.candidates.find(x=>x.pool_kind==='UNISWAP_V4_POOL_ID'&&x.liquidity_usd>=5000);
 assert.ok(coin);
 const a=makeCaptureObservationBatch({capturedAtUtc:captured,sourcePath:'research/feeds/v18-a.json',geckoCandidates:[coin]});
 const later='2026-11-22T07:25:41.241Z';
 const b=makeCaptureObservationBatch({capturedAtUtc:later,sourcePath:'research/feeds/v18-b.json',
   geckoCandidates:[{...coin,observed_at_utc:later,observed_price_usd:coin.observed_price_usd*1.10}]});
 const result=scoreAsOf({batches:[a,b],asOfUtc:later});
 assert.equal(result.counts.research_rankable,1);
 assert.equal(result.candidates[0].pool_kind,'UNISWAP_V4_POOL_ID');
 assert.equal(result.candidates[0].trade_authorized,false);
});
