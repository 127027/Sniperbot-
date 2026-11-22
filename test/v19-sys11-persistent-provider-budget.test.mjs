import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyProviderBudgetState,reserveProviderRequest,inspectProviderBudget,
 recordProviderResponse,summarizeProviderBudget} from '../src/v19-provider-budget.mjs';
const at='2026-11-22T00:00:00.000Z';
const later=n=>new Date(Date.parse(at)+n).toISOString();
const id=n=>'test-request-'+n;
function start(state,{provider='GECKOTERMINAL',lane='NEW_POOLS',ms=0,n}={}){
 const r=reserveProviderRequest({state,provider,lane,asOfUtc:later(ms),requestId:id(n)});
 return r;
}
test('SYS-11: 6 new pool + 2 reserved trending calls fill conservative Gecko 8/min bucket',()=>{
 let state=emptyProviderBudgetState();
 for(let n=0;n<6;n++){
  const r=start(state,{n,ms:n*6100});assert.equal(r.gate.allowed,true);
  state=r.state;
 }
 const newMore=start(state,{n:6,ms:37000});
 assert.equal(newMore.gate.allowed,false);
 assert.equal(newMore.gate.reason,'ROLLING_WINDOW_BUDGET');
 const older=start(state,{n:7,ms:38000,lane:'TRENDING'});
 assert.equal(older.gate.allowed,true);state=older.state;
 const ohlcv=start(state,{n:8,ms:44000,lane:'OHLCV'});
 assert.equal(ohlcv.gate.allowed,true);state=ohlcv.state;
 assert.equal(start(state,{n:9,ms:49000,lane:'OHLCV'}).gate.allowed,false);
 const summary=summarizeProviderBudget({state,asOfUtc:later(50000)});
 assert.equal(summary.per_provider.GECKOTERMINAL.rolling_starts,8);
 assert.equal(summary.per_provider.GECKOTERMINAL.started_lanes.NEW_POOLS,6);
 assert.equal(summary.per_provider.GECKOTERMINAL.started_lanes.TRENDING,1);
 assert.equal(summary.per_provider.GECKOTERMINAL.started_lanes.OHLCV,1);
 const restarted=JSON.parse(JSON.stringify(state));
 const recovered=start(restarted,{n:10,ms:61000});
 assert.equal(recovered.gate.allowed,true);
 assert.equal(recovered.state.providers.GECKOTERMINAL.request_starts_total,9);
});
test('SYS-11: HTTP429 crosses Gecko lanes and cold JSON restart, DEX remains independent',()=>{
 let state=start(emptyProviderBudgetState(),{n:1}).state;
 state=recordProviderResponse({state,provider:'GECKOTERMINAL',lane:'NEW_POOLS',
  requestId:id(1),asOfUtc:later(120),httpStatus:429,retryAfter:'120'});
 const persisted=JSON.parse(JSON.stringify(state));
 const gate=inspectProviderBudget({state:persisted,provider:'GECKOTERMINAL_OHLCV',
  lane:'OHLCV',asOfUtc:later(3600000),requestId:id(2)});
 assert.equal(gate.allowed,false);
 assert.equal(gate.reason,'PROVIDER_COOLDOWN');
 assert.ok(Date.parse(gate.retry_not_before_utc)>Date.parse(later(3600000)));
 const dex=start(persisted,{n:3,provider:'DEXSCREENER',lane:'PAIR',ms:180});
 assert.equal(dex.gate.allowed,true);
 const after=start(persisted,{n:4,ms:7200000});
 assert.equal(after.gate.allowed,true);
});
test('SYS-11: request reservation and HTTP receipt cannot be duplicated',()=>{
 const r=start(emptyProviderBudgetState(),{n:11});
 assert.equal(r.gate.allowed,true);
 assert.equal(start(r.state,{n:11}).gate.reason,'REQUEST_ALREADY_RESERVED');
 const completed=recordProviderResponse({state:r.state,provider:'GECKOTERMINAL',
  lane:'NEW_POOLS',requestId:id(11),asOfUtc:later(15),httpStatus:200});
 assert.equal(completed.providers.GECKOTERMINAL.last_http_status,200);
 assert.throws(()=>recordProviderResponse({state:completed,provider:'GECKOTERMINAL',
  lane:'NEW_POOLS',requestId:id(11),asOfUtc:later(16),httpStatus:200}),
  /DUPLICATE_PROVIDER_RESPONSE_RECEIPT/);
 assert.throws(()=>recordProviderResponse({state:completed,provider:'GECKOTERMINAL',
  lane:'OHLCV',requestId:id(11),asOfUtc:later(16),httpStatus:200}),
  /PROVIDER_RESPONSE_WITHOUT_RESERVATION/);
});
test('SYS-11: corrupted clock/history must not re-grant capacity',()=>{
 const s=start(emptyProviderBudgetState(),{n:1,ms:60000}).state;
 assert.throws(()=>start(s,{n:2,ms:0}),/CORRUPT_PROVIDER_REQUEST_HISTORY/);
 assert.throws(()=>inspectProviderBudget({state:s,provider:'UNKNOWN',
  lane:'NEW_POOLS',asOfUtc:at,requestId:id(2)}),
  /INVALID_PROVIDER_BUDGET_REQUEST/);
});
test('SYS-11: existing runner uses this budget for real HTTP starts and persists its cursor',async()=>{
 const runner=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(runner,/reserveProviderRequest\(/);
 assert.match(runner,/recordProviderResponse\(/);
 assert.match(runner,/providerBudgetPath='research\/state\/provider-budget\.json'/);
 assert.match(runner,/await writeFile\(providerBudgetPath/);
 assert.match(runner,/metrics\.v19_persistent_provider_budget=/);
 assert.match(runner,/if\(geckoBlock\(\)\.active\)break/);
 assert.match(runner,/if\(pacing\.wait_ms>0\)/);
 assert.doesNotMatch(runner,/signals\/orders\/|writeFile\('signals\//);
});
