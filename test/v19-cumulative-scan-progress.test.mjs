import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyPageCoverage,updatePageCoverage} from '../src/v19-page-coverage.mjs';
import {summarizeCumulativeScanProgress} from '../src/v19-cumulative-scan-progress.mjs';
const chains=['solana','base','ethereum','bsc','robinhood','cronos'];
const at='2026-11-22T00:01:00Z',one='2026-11-22T01:01:00Z';
const two='2026-11-22T02:01:00Z';
const proof=(page,date)=>chains.map(chain=>({chain,page,
 captured_at_utc:date,source_path:'research/feeds/demo/'+chain+'-page'+page+'.json',
 source_sha256:'a'.repeat(64),candidates:[]}));
const score=(c,date)=>summarizeCumulativeScanProgress({
 coverage:c,networks:chains,targetPagesPerChain:10,asOfUtc:date});
test('user example: 00:00 covers 10%, 01:00 covers 20% of fixed sample only',()=>{
 let coverage=updatePageCoverage(emptyPageCoverage(),{
   asOfUtc:at,successes:proof(1,at)}).updated_memory;
 const first=score(coverage,at);
 assert.equal(first.numerator_successful_unique_chain_pages,6);
 assert.equal(first.denominator_fixed_planned_chain_pages,60);
 assert.equal(first.captured_plan_progress_pct,10);
 assert.equal(first.total_known_meme_market_coverage_pct,null);
 assert.ok(first.per_chain.every(x=>x.progress_pct===10));
 // 429/deferred HTTP does not fake another 10% progress.
 coverage=updatePageCoverage(coverage,{asOfUtc:one,
   deferred:chains.map(chain=>({chain,page:2}))}).updated_memory;
 const gap=score(JSON.parse(JSON.stringify(coverage)),one);
 assert.equal(gap.captured_plan_progress_pct,10);
 assert.ok(gap.per_chain.every(x=>x.documented_waiting_page_numbers.includes(2)));
 coverage=updatePageCoverage(coverage,{asOfUtc:two,
   successes:proof(2,two)}).updated_memory;
 const second=score(JSON.parse(JSON.stringify(coverage)),two);
 assert.equal(second.captured_plan_progress_pct,20);
 assert.equal(second.missing_planned_pages,48);
 assert.ok(second.per_chain.every(x=>x.still_missing_page_numbers.length===8));
 assert.equal(second.orders_authorized,0);
});
test('actual archived source pointer required; no future or malformed hash gets credit',()=>{
 const state=emptyPageCoverage();
 state.chains.base={pages:{
  1:{last_success_at_utc:at,last_source_path:'research/feeds/genuine.json',last_sha256:'a'.repeat(64)},
  2:{last_success_at_utc:at,last_source_path:'research/feeds/unknown.json',last_sha256:'bad'},
  3:{last_success_at_utc:'2026-11-23T00:01:00Z',last_source_path:'research/feeds/future.json',last_sha256:'b'.repeat(64)}
 },pending_pages:[2,3]};
 const s=summarizeCumulativeScanProgress({coverage:state,networks:['base'],
   targetPagesPerChain:10,asOfUtc:one});
 assert.equal(s.captured_plan_progress_pct,10);
 assert.deepEqual(s.per_chain[0].captured_page_numbers,[1]);
 assert.equal(s.total_known_meme_market_coverage_pct,null);
});
test('existing Dot2 runner records cumulative coverage from saved confirmed pages',async()=>{
 const runner=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(runner,/summarizeCumulativeScanProgress/);
 assert.match(runner,/coverage:coverageReport\.updated_memory/);
 assert.match(runner,/targetPagesPerChain:10/);
 assert.match(runner,/metrics\.v19_fixed_sample_progress=/);
});
