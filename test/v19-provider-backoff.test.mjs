import test from 'node:test';
import assert from 'node:assert/strict';
import {providerRetryDelay} from '../src/v19-provider-backoff.mjs';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {planMultiChainCapture} from '../src/v19-discovery-budget-plan.mjs';

const at='2026-11-22T09:00:00.000Z';
test('rate limiting backs off deterministically and honors larger Retry-After',()=>{
 const first=providerRetryDelay({httpStatus:429,atUtc:at,previousFailures:0});
 const second=providerRetryDelay({httpStatus:429,atUtc:at,previousFailures:1});
 const third=providerRetryDelay({httpStatus:429,atUtc:at,previousFailures:2});
 assert.equal(first.wait_ms,3600000);
 assert.equal(second.wait_ms,7200000);
 assert.equal(third.wait_ms,14400000);
 assert.equal(first.next_retry_at_utc,'2026-11-22T10:00:00.000Z');
 assert.equal(providerRetryDelay({httpStatus:429,atUtc:at,
  retryAfter:'7200'}).wait_ms,7200000);
});
test('temporary network errors use shorter progressive bounded backoff',()=>{
 assert.equal(providerRetryDelay({httpStatus:503,atUtc:at}).wait_ms,300000);
 assert.equal(providerRetryDelay({httpStatus:null,atUtc:at,previousFailures:1}).wait_ms,600000);
 assert.equal(providerRetryDelay({httpStatus:404,atUtc:at}).retry,false);
});
test('failed page retains retry cursor and cooldown; success clears both',()=>{
 const previous=emptyMarketMemory(),failure=providerRetryDelay({httpStatus:429,atUtc:at});
 const f=mergeMemory(previous,{chain:'base',page:4,candidates:[],
  sourcePath:'research/feeds/2026-11-22/10/base-page4-429.raw.json',
  sourceCapturedAtUtc:at,fetchStatus:'HTTP_429',
  retryAfterUtc:failure.next_retry_at_utc}).memory;
 const c=f.checkpoints['base:GECKOTERMINAL'];
 assert.equal(c.failed_page_to_retry,4);
 assert.equal(c.consecutive_failures,1);
 assert.equal(c.last_success_at_utc,null);
 assert.equal(c.retry_after_utc,'2026-11-22T10:00:00.000Z');
 const before=planMultiChainCapture({networks:['base','solana'],budget:1,
  checkpoints:f.checkpoints,asOfUtc:'2026-11-22T09:30:00.000Z'});
 assert.equal(before.tasks[0].chain,'solana');
 const ready=planMultiChainCapture({networks:['base'],budget:1,
  checkpoints:f.checkpoints,asOfUtc:'2026-11-22T10:00:00.000Z'});
 assert.equal(ready.tasks[0].page,4);
 assert.equal(ready.tasks[0].reason,'RETRY_FAILED_PAGE');
 const s=mergeMemory(f,{chain:'base',page:4,candidates:[],
  sourcePath:'research/feeds/2026-11-22/11/base-page4-ok.raw.json',
  sourceCapturedAtUtc:'2026-11-22T10:01:00.000Z',fetchStatus:'OK'}).memory;
 assert.equal(s.checkpoints['base:GECKOTERMINAL'].retry_after_utc,null);
 assert.equal(s.checkpoints['base:GECKOTERMINAL'].failed_page_to_retry,null);
 assert.equal(s.checkpoints['base:GECKOTERMINAL'].consecutive_failures,0);
 assert.equal(s.checkpoints['base:GECKOTERMINAL'].last_success_at_utc,'2026-11-22T10:01:00.000Z');
});
test('failed page retry remains pending after other chain captures',()=>{
 let mem=emptyMarketMemory();
 mem=mergeMemory(mem,{chain:'base',page:4,candidates:[],
  sourcePath:'research/feeds/2026-11-22/12/base-page4-error.json',
  sourceCapturedAtUtc:at,fetchStatus:'HTTP_429',
  retryAfterUtc:'2026-11-22T10:00:00.000Z'}).memory;
 mem=mergeMemory(mem,{chain:'ethereum',page:1,candidates:[],
  sourcePath:'research/feeds/2026-11-22/12/ethereum-page1.raw.json',
  sourceCapturedAtUtc:'2026-11-22T09:03:00.000Z',fetchStatus:'OK'}).memory;
 assert.equal(mem.checkpoints['base:GECKOTERMINAL'].failed_page_to_retry,4);
 assert.equal(mem.checkpoints['ethereum:GECKOTERMINAL'].last_status,'OK');
});
