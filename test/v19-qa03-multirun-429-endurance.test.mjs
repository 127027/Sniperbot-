import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {emptyPageCoverage,updatePageCoverage} from '../src/v19-page-coverage.mjs';
import {planMultiChainCapture} from '../src/v19-discovery-budget-plan.mjs';
import {emptyProviderBudgetState,reserveProviderRequest,recordProviderResponse,
 inspectProviderBudget} from '../src/v19-provider-budget.mjs';
const chains=['solana','base','ethereum','bsc','robinhood','cronos'];
const origin=Date.parse('2026-11-22T00:00:00.000Z');
const iso=t=>new Date(t).toISOString();
const pool=(chain,page)=>{
 if(chain==='solana')return 'So'+'1'.repeat(37)+'ABCDEFGHJKLMNPQRSTUV'[page];
 return '0x'+(chains.indexOf(chain)*10000+page).toString(16).padStart(40,'0');
};
const contract=chain=>chain==='solana'?'So'+'2'.repeat(38):'0x'+'e'.repeat(40);
const candidate=(chain,page,at)=>({chain,pool:pool(chain,page),
 contract:contract(chain),symbol:'QA03',observed_at_utc:at,
 trade_authorized:false});
test('QA-03: 12 durable two-hour wakes resume all six chains after cross-endpoint 429',()=>{
 let memory=emptyMarketMemory(),pages=emptyPageCoverage(),budget=emptyProviderBudgetState();
 let throttleCount=0,captured=0,unattempted=0;
 const served=new Set();
 for(let cycle=0;cycle<12;cycle++){
  // Simulate a real new process using independently serialized GitHub JSON.
  memory=JSON.parse(JSON.stringify(memory));
  pages=JSON.parse(JSON.stringify(pages));
  budget=JSON.parse(JSON.stringify(budget));
  const base=origin+cycle*2*3600000;
  const plan=planMultiChainCapture({networks:chains,checkpoints:memory.checkpoints,
   pageCoverage:pages,budget:6,asOfUtc:iso(base)});
  const successes=[],failures=[],deferred=[];
  for(let index=0;index<plan.tasks.length;index++){
   const task=plan.tasks[index],at=iso(base+index*6500);
   const requestId='qa03-'+cycle+'-'+task.chain+'-'+task.page;
   const grant=reserveProviderRequest({state:budget,provider:'GECKOTERMINAL',
    lane:'NEW_POOLS',asOfUtc:at,requestId});
   assert.equal(grant.gate.allowed,true,'unexpected provider burst or cooldown');
   budget=grant.state;
   if(cycle===0&&task.chain==='ethereum'){
    budget=recordProviderResponse({state:budget,provider:'GECKOTERMINAL',
      lane:'NEW_POOLS',asOfUtc:iso(Date.parse(at)+100),requestId,
      httpStatus:429,retryAfter:'30'});
    const retry=budget.providers.GECKOTERMINAL.cooldown_until_utc;
    memory=mergeMemory(memory,{candidates:[],chain:task.chain,page:task.page,
      sourcePath:'research/feeds/qa03/0-ethereum.error.json',
      sourceCapturedAtUtc:at,provider:'GECKOTERMINAL',
      fetchStatus:'HTTP_429',retryAfterUtc:retry}).memory;
    failures.push({chain:task.chain,page:task.page,attempt_at_utc:at,
      reason:'HTTP_429',http_status:429});
    throttleCount++;
    for(const pending of plan.tasks.slice(index+1)){
     deferred.push({chain:pending.chain,page:pending.page});unattempted++;
    }
    break;
   }
   budget=recordProviderResponse({state:budget,provider:'GECKOTERMINAL',
      lane:'NEW_POOLS',asOfUtc:iso(Date.parse(at)+100),requestId,httpStatus:200});
   const src='research/feeds/qa03/'+cycle+'-'+task.chain+'-p'+task.page+'.raw.json';
   const c=candidate(task.chain,task.page,at);
   memory=mergeMemory(memory,{candidates:[c],chain:task.chain,page:task.page,
     sourcePath:src,sourceCapturedAtUtc:at,provider:'GECKOTERMINAL',
     fetchStatus:'OK',sourceSha256:'a'.repeat(64)}).memory;
   successes.push({chain:task.chain,page:task.page,captured_at_utc:at,
     source_path:src,source_sha256:'a'.repeat(64),candidates:[c]});
   served.add(task.chain+':'+c.pool);captured++;
  }
  pages=updatePageCoverage(pages,{asOfUtc:iso(base+60000),successes,failures,
   deferred}).updated_memory;
  assert.equal(memory.kind,'R29_PERSISTENT_MARKET_MEMORY');
  assert.equal(pages.kind,'R29_V19_OFFSET_PAGE_COVERAGE');
  assert.equal(Object.keys(memory.pools).length,served.size);
  if(cycle===0){
   assert.equal(throttleCount,1);
   assert.equal(inspectProviderBudget({state:budget,provider:'GECKOTERMINAL_OHLCV',
     lane:'OHLCV',asOfUtc:iso(base+50000),requestId:'qa03-future-ohlcv'}).reason,
     'PROVIDER_COOLDOWN');
   assert.equal(pages.chains.ethereum.pages[1],undefined);
   assert.ok(pages.chains.ethereum.pending_pages.includes(1));
  }
 }
 assert.equal(throttleCount,1);
 assert.equal(unattempted,3);
 assert.ok(captured>50);
 assert.ok(chains.every(c=>memory.checkpoints[c+':GECKOTERMINAL']?.last_success_at_utc));
 assert.ok(chains.every(c=>pages.chains[c]?.pages[1]));
 assert.ok(chains.every(c=>pages.chains[c]?.pages[2]));
 assert.ok(chains.every(c=>pages.chains[c]?.pages[3]));
 assert.equal(memory.stats.total_discovered,served.size);
 assert.ok(Object.values(pages.chains).every(x=>x.pending_pages.length<=20));
 assert.equal(Object.keys(memory.pools).length,served.size);
 assert.equal(budget.providers.GECKOTERMINAL.request_starts_total,captured+throttleCount);
 assert.equal(budget.providers.GECKOTERMINAL.consecutive_429,0);
});
test('QA-03: archive replay cannot convert unattempted tasks to successful pages',()=>{
 const first=updatePageCoverage(emptyPageCoverage(),{
  asOfUtc:iso(origin+60000),deferred:[
   {chain:'solana',page:1},{chain:'base',page:1},
   {chain:'ethereum',page:1},{chain:'cronos',page:1}]});
 assert.equal(first.run.succeeded,0);
 assert.equal(first.run.attempted,0);
 assert.equal(first.run.deferred,4);
 assert.equal(first.total_unresolved_page_indices,4);
 assert.ok(Object.values(first.updated_memory.chains).every(v=>
   v.pending_pages.length===1&&Object.keys(v.pages).length===0));
 const after=JSON.parse(JSON.stringify(first.updated_memory));
 const resumed=planMultiChainCapture({networks:chains,budget:6,pageCoverage:after,
  asOfUtc:iso(origin+7200000)});
 assert.equal(resumed.scheduled_requests,6);
 assert.ok(resumed.tasks.some(v=>v.chain==='ethereum'&&v.page===1));
 assert.equal(resumed.actual_http_success_per_chain_is_not_proven_by_plan,true);
});
