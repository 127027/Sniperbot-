import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {activeGeckoProviderCooldown as gate}
 from '../src/v19-gecko-provider-cooldown.mjs';
const atUtc='2026-11-22T15:25:00Z';
const checkpoint={
 'ethereum:GECKOTERMINAL':{provider:'GECKOTERMINAL',last_status:'HTTP_429',
   retry_after_utc:'2026-11-22T16:11:15.734Z'},
 'base:GECKOTERMINAL':{provider:'GECKOTERMINAL',last_status:'OK',retry_after_utc:null},
 'unknown:DEXSCREENER':{provider:'DEXSCREENER',last_status:'HTTP_429',retry_after_utc:'2026-11-25T00:00:00Z'}
};
test('actual ethereum 429 blocks ALL Gecko API endpoints, without blocking unrelated providers',()=>{
 const x=gate({checkpoints:checkpoint,atUtc});
 assert.equal(x.active,true);
 assert.equal(x.http_requests_authorized,false);
 assert.equal(x.retry_not_before_utc,'2026-11-22T16:11:15.734Z');
 assert.equal(x.provider_scope,'GECKOTERMINAL_ALL_ENDPOINTS');
 assert.equal(x.paper_orders_authorized,0);
});
test('an elapsed cooldown is not kept active forever',()=>{
 assert.equal(gate({checkpoints:checkpoint,atUtc:'2026-11-22T16:11:15.735Z'}).active,false);
});
test('a new in-run 429 takes precedence and can extend a persisted cooldown',()=>{
 const x=gate({checkpoints:checkpoint,atUtc,
   runRetryAtUtc:'2026-11-22T17:00:00Z'});
 assert.equal(x.retry_not_before_utc,'2026-11-22T17:00:00.000Z');
 assert.equal(x.source,'IN_RUN_HTTP_429');
});
test('non-429 errors and unrelated checkpoints never imply Gecko cooldown',()=>{
 const x=gate({checkpoints:{'ethereum:GECKOTERMINAL':{last_status:'HTTP_503',
   retry_after_utc:'2026-11-23T15:00:00Z'}},atUtc});
 assert.equal(x.active,false);
 assert.equal(x.http_requests_authorized,true);
});
test('malformed timestamps fail safely in the policy inputs',()=>{
 assert.throws(()=>gate({atUtc:'not-a-time'}),/INVALID_GECKO_PROVIDER_COOLDOWN_INPUT/);
 assert.throws(()=>gate({atUtc,runRetryAtUtc:'invalid'}),/INVALID_GECKO_PROVIDER_COOLDOWN_INPUT/);
});
test('runner defers primary/trending/OHLCV Gecko work while a provider 429 is active',async()=>{
 const code=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(code,/activeGeckoProviderCooldown/);
 assert.match(code,/if\(geckoBlock\(\)\.active\)/);
 assert.match(code,/DEFERRED_PROVIDER_429/);
 assert.match(code,/runGeckoRetryAtUtc=backoff\.next_retry_at_utc/);
 assert.match(code,/runGeckoRetryAtUtc=wait\.next_retry_at_utc/);
 assert.match(code,/runGeckoRetryAtUtc=delay\.next_retry_at_utc/);
 assert.match(code,/metrics\.v19_gecko_provider_429_cooldown=/);
});
