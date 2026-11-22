import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {planResearchRestart} from '../src/v19-scan-restart-preflight.mjs';
import {emptyProviderBudgetState,reserveProviderRequest} from '../src/v19-provider-budget.mjs';
import {emptyPageCoverage,updatePageCoverage} from '../src/v19-page-coverage.mjs';
import {emptyMarketMemory} from '../src/market-memory.mjs';

const read=async p=>JSON.parse(await readFile(p,'utf8'));
async function realState(){
 const [memory,pageCoverage,providerBudget,olderState,ohlcvState]=await Promise.all([
  'research/state/market-memory.json','research/state/page-coverage.json',
  'research/state/provider-budget.json','research/state/older-pool-captures.json',
  'research/state/ohlcv-backfill.json'
 ].map(read));
 return {memory,pageCoverage,providerBudget,olderState,ohlcvState};
}
const six=['solana','base','ethereum','bsc','robinhood','cronos'];

test('SYS-11: real 19:14Z preflight respects persistent Base 429, zero HTTP/zero trading',async()=>{
 const state=await realState();
 const p=planResearchRestart({...state,asOfUtc:'2026-11-22T19:14:16.000Z'});
 assert.equal(p.status,'WAIT_PERSISTED_PROVIDER_COOLDOWN');
 assert.equal(p.can_issue_provider_http_now,false);
 assert.equal(p.not_before_utc,'2026-11-22T19:54:35.719Z');
 assert.ok(p.waiting_chain_pages.some(x=>x.chain==='base'&&x.page===2));
 assert.equal(p.first_attempt_if_authorized,null);
 assert.equal(p.cumulative_fixed_sample.total_known_meme_market_coverage_pct,null);
 assert.equal(p.global_memecoin_market_coverage_pct,null);
 assert.equal(p.actual_http_starts,0);
 assert.equal(p.actual_gpt_reviews,0);
 assert.equal(p.paper_orders_created,0);
 assert.equal(p.real_orders_created,0);
});
test('SYS-11: after saved cool-down a new single-page preview prioritizes the expired Base2 failure without HTTP',async()=>{
 const state=await realState();
 const p=planResearchRestart({...state,asOfUtc:'2026-11-23T04:00:00.000Z',
  maxNewPoolPages:1});
 assert.equal(p.status,'READY_TO_ATTEMPT_BOUNDED_RESEARCH');
 assert.equal(p.can_issue_provider_http_now,true);
 assert.equal(p.proposed_page_budget,1);
 assert.equal(p.proposed_bounded_sample.length,1);
 assert.deepEqual({chain:p.first_attempt_if_authorized.chain,
  page:p.first_attempt_if_authorized.page},{chain:'base',page:2});
 assert.equal(p.first_attempt_if_authorized.priority,'EXPIRED_FAILED_PAGE_RETRY');
 assert.equal(p.actual_http_200,0);
 assert.equal(p.cumulative_fixed_sample.market_universe_complete,undefined);
 assert.equal(p.cumulative_fixed_sample.historic_success_may_be_stale,true);
});
test('SYS-11: rolling provider budget alone blocks a restart until a slot really expires',()=>{
 const at='2026-11-22T19:00:00.000Z';
 let providerBudget=emptyProviderBudgetState();
 for(let i=0;i<3;i++){
  const step=reserveProviderRequest({state:providerBudget,
   provider:'GECKOTERMINAL',lane:'NEW_POOLS',
   asOfUtc:new Date(Date.parse(at)+i*15100).toISOString(),
   requestId:'preview-reservation-'+i});
  assert.equal(step.gate.allowed,true);
  providerBudget=step.state;
 }
 const pageCoverage=updatePageCoverage(emptyPageCoverage(),{
  asOfUtc:'2026-11-22T19:01:00Z',deferred:[{chain:'base',page:2}]
 }).updated_memory;
 const p=planResearchRestart({
  memory:emptyMarketMemory(),pageCoverage,providerBudget,networks:['base'],
  asOfUtc:'2026-11-22T19:00:45Z',maxNewPoolPages:1
 });
 assert.equal(p.status,'WAIT_ROLLING_WINDOW');
 assert.equal(p.can_issue_provider_http_now,false);
 assert.equal(p.not_before_utc,'2026-11-22T19:01:00.000Z');
 assert.ok(p.waiting_chain_pages.some(x=>x.chain==='base'&&x.page===2));
 assert.equal(providerBudget.providers.GECKOTERMINAL.recent_starts.length,3);
});
test('SYS-11: preflight rejects future/corrupt clock instead of consuming provider capacity',async()=>{
 const state=await realState();
 assert.throws(()=>planResearchRestart({...state,asOfUtc:'no-date'}),
  /INVALID_RESEARCH_RESTART_PREFLIGHT/);
 assert.throws(()=>planResearchRestart({...state,asOfUtc:'2026-11-22T18:50:00Z'}),
  /CORRUPT_PROVIDER_REQUEST_HISTORY/);
 assert.throws(()=>planResearchRestart({...state,asOfUtc:'2026-11-22T19:14:16Z',
  networks:['base','base']}),/INVALID_RESEARCH_RESTART_PREFLIGHT/);
});
test('SYS-11: end-to-end read-only CLI prints persisted cooldown without network or fake BUY',()=>{
 const run=spawnSync(process.execPath,['scripts/plan-r29-research-restart.mjs'],{
  encoding:'utf8',timeout:15000,
  env:{...process.env,R29_PREFLIGHT_ASOF_UTC:'2026-11-22T19:14:16.000Z'}
 });
 assert.equal(run.status,0,run.stderr);
 const row=run.stdout.split('\n').find(v=>v.startsWith('R29_RESEARCH_RESTART_PREFLIGHT '));
 assert.ok(row);
 const p=JSON.parse(row.slice('R29_RESEARCH_RESTART_PREFLIGHT '.length));
 assert.equal(p.can_issue_provider_http_now,false);
 assert.equal(p.not_before_utc,'2026-11-22T19:54:35.719Z');
 assert.equal(p.no_network_no_persistent_write,true);
});
test('SYS-11: preflight source only inspects existing state and does not write research requests or orders',async()=>{
 const code=await readFile('scripts/plan-r29-research-restart.mjs','utf8');
 assert.doesNotMatch(code,/fetch\(|writeFile\(|\.push\(|git commit|signals\/orders\//);
 const core=await readFile('src/v19-scan-restart-preflight.mjs','utf8');
 assert.match(core,/inspectProviderBudget\(/);
 assert.match(core,/activeGeckoProviderCooldown\(/);
 assert.match(core,/planMultiChainCapture\(/);
 assert.doesNotMatch(core,/fetch\(|writeFile\(|execFile\(/);
});
