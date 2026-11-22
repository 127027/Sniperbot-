import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planGeckoRequestPacing,MIN_GECKO_REQUEST_GAP_MS}
 from '../src/v19-gecko-pacing.mjs';
const now=Date.parse('2026-11-22T15:11:15.718Z');
test('six rapid Gecko requests use 6.1s conservative ten-per-minute start pacing',()=>{
 const first=planGeckoRequestPacing({provider:'GECKOTERMINAL',
   nowEpochMs:now});
 assert.equal(first.wait_ms,0);
 assert.equal(MIN_GECKO_REQUEST_GAP_MS,6100);
 const second=planGeckoRequestPacing({provider:'GECKOTERMINAL',
   nowEpochMs:now+30,lastGeckoStartedEpochMs:now});
 assert.equal(second.wait_ms,MIN_GECKO_REQUEST_GAP_MS-30);
 assert.equal(second.subject_to_gecko_pacing,true);
 assert.equal(second.rate_limit_override_authorized,false);
 const next=planGeckoRequestPacing({provider:'GECKOTERMINAL',
   nowEpochMs:now+6300,lastGeckoStartedEpochMs:now});
 assert.equal(next.wait_ms,0);
});
test('OHLCV and trending share the same provider spacing while DEX has separate domain',()=>{
 assert.equal(planGeckoRequestPacing({provider:'GECKOTERMINAL_OHLCV',
   nowEpochMs:now+1,lastGeckoStartedEpochMs:now}).wait_ms,6099);
 const dex=planGeckoRequestPacing({provider:'DEXSCREENER',
   nowEpochMs:now+1,lastGeckoStartedEpochMs:now});
 assert.equal(dex.wait_ms,0);
 assert.equal(dex.subject_to_gecko_pacing,false);
});
test('invalid clock, minimum gap or impossible future start reject instead of corrupting pacing',()=>{
 for(const args of [
  {provider:'GECKOTERMINAL',nowEpochMs:NaN},
  {provider:'GECKOTERMINAL',nowEpochMs:now,minGapMs:0},
  {provider:'GECKOTERMINAL',nowEpochMs:now,lastGeckoStartedEpochMs:now+100}
 ])assert.throws(()=>planGeckoRequestPacing(args),/INVALID_GECKO_PACING_INPUT/);
});
test('runner uses one shared Gecko start clock and preserves HTTP429 fail-closed path',async()=>{
 const s=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(s,/let lastGeckoStartedMs=null/);
 assert.match(s,/planGeckoRequestPacing\(/);
 assert.match(s,/if\(pacing\.wait_ms>0\)/);
 assert.match(s,/new Promise\(resolve=>setTimeout\(resolve,pacing\.wait_ms\)\)/);
 assert.match(s,/if\(pacing\.subject_to_gecko_pacing\)lastGeckoStartedMs=actualStartMs/);
 assert.match(s,/if\(status==='HTTP_429'\)/);
});
test('spacing makes no claim that HTTP 429 retry-after has elapsed',()=>{
 const x=planGeckoRequestPacing({provider:'GECKOTERMINAL',
   nowEpochMs:now+500,lastGeckoStartedEpochMs:now});
 assert.equal(x.actual_provider_success_not_implied,true);
 assert.equal(x.rate_limit_override_authorized,false);
});
