import test from 'node:test';
import assert from 'node:assert/strict';
import {planMultiChainCapture} from '../src/v19-discovery-budget-plan.mjs';
import {validateCaptureRequest} from '../src/discovery-feed.mjs';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';

const networks=['solana','base','ethereum','bsc','robinhood','cronos'];
const at='2026-11-22T09:00:00.000Z';
const request={schema:1,kind:'DOT2_DISCOVERY_CAPTURE_REQUEST',mode:'PAPER_RESEARCH_ONLY',
 requested_by:'dot-2-discovery',do_not_publish_orders:true,
 networks,created_at_utc:at,max_gecko_requests:12,max_dex_pairs:8};
test('explicit bounded 12-request budget covers each of six chains and two different pages',()=>{
 assert.equal(validateCaptureRequest(request).max_gecko_requests,12);
 const plan=planMultiChainCapture({networks,budget:12,asOfUtc:at});
 assert.equal(plan.scheduled_requests,12);
 assert.equal(new Set(plan.tasks.map(x=>x.chain)).size,6);
 assert.equal(new Set(plan.tasks.map(x=>x.chain+':'+x.page)).size,12);
 assert.ok(networks.every(chain=>plan.tasks.some(x=>x.chain===chain&&x.page===1)));
 assert.ok(networks.every(chain=>plan.tasks.some(x=>x.chain===chain&&x.page===2)));
 assert.equal(plan.orders_authorized,0);
 assert.throws(()=>validateCaptureRequest({...request,max_gecko_requests:13}),/GECKO_BUDGET_EXCEEDED/);
});
test('with a two-page budget, least-recently-scanned chains win first',()=>{
 const ck={};
 for(let i=0;i<networks.length;i++){
  ck[networks[i]+':GECKOTERMINAL']={
   page:1,next_page_to_consider:2,
   last_attempt_at_utc:new Date(Date.parse(at)-(6-i)*3600000).toISOString()
  };
 }
 const plan=planMultiChainCapture({networks,budget:2,checkpoints:ck,asOfUtc:at});
 assert.deepEqual(plan.tasks.map(x=>x.chain),['solana','base']);
 assert.deepEqual(plan.tasks.map(x=>x.page),[2,2]);
 assert.equal(plan.not_scheduled.length,4);
});
test('retry-after cooldown skips a throttled chain without starving other chains',()=>{
 const checkpoint={'solana:GECKOTERMINAL':{page:1,next_page_to_consider:2,
  last_attempt_at_utc:'2026-11-22T08:59:00Z',
  retry_after_utc:'2026-11-22T10:00:00Z'}};
 const plan=planMultiChainCapture({networks:['solana','base'],budget:1,
   checkpoints:checkpoint,asOfUtc:at});
 assert.deepEqual(plan.tasks.map(x=>x.chain),['base']);
 assert.equal(plan.not_scheduled[0].reason,'RATE_LIMIT_COOLDOWN');
});
test('concrete second-source pages persist independently with their own source and chain checkpoint',()=>{
 const time='2026-11-22T08:01:00.000Z';
 const a={chain:'base',pool:'0x'+'a'.repeat(40),
  contract:'0x'+'b'.repeat(40),symbol:'A',observed_at_utc:time};
 const b={chain:'ethereum',pool:'0x'+'c'.repeat(40),
  contract:'0x'+'d'.repeat(40),symbol:'B',observed_at_utc:time};
 let mem=mergeMemory(emptyMarketMemory(),{candidates:[a],chain:'base',page:1,
  sourcePath:'research/feeds/2026-11-22/1/gecko-base-page1.raw.json',
  sourceCapturedAtUtc:time,sourceSha256:'a'.repeat(64)}).memory;
 mem=mergeMemory(mem,{candidates:[b],chain:'ethereum',page:2,
  sourcePath:'research/feeds/2026-11-22/1/gecko-ethereum-page2.raw.json',
  sourceCapturedAtUtc:time,sourceSha256:'b'.repeat(64)}).memory;
 assert.equal(mem.stats.total_discovered,2);
 assert.equal(mem.checkpoints['base:GECKOTERMINAL'].page,1);
 assert.equal(mem.checkpoints['ethereum:GECKOTERMINAL'].page,2);
 assert.equal(mem.ingested_sources.length,2);
 assert.equal(mem.pools['base:'+a.pool].source_refs[0].source_sha256,'a'.repeat(64));
});
test('persisted HTTP 429 is an attempted page, not successful coverage',()=>{
 const failed=mergeMemory(emptyMarketMemory(),{candidates:[],chain:'solana',page:1,
  sourcePath:'research/feeds/2026-11-22/2/gecko-solana-page1.raw.json',
  sourceCapturedAtUtc:'2026-11-22T08:59:00Z',fetchStatus:'HTTP_429'}).memory;
 assert.equal(failed.checkpoints['solana:GECKOTERMINAL'].last_status,'HTTP_429');
 assert.equal(failed.checkpoints['solana:GECKOTERMINAL'].last_success_at_utc,null);
 const plan=planMultiChainCapture({networks:['solana','base'],budget:1,
  checkpoints:failed.checkpoints,asOfUtc:at});
 assert.equal(plan.tasks[0].chain,'base');
});
