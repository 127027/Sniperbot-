import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyPageCoverage,updatePageCoverage} from '../src/v19-page-coverage.mjs';
import {planMultiChainCapture} from '../src/v19-discovery-budget-plan.mjs';

const at='2026-11-22T12:00:00.000Z';
const candidate=n=>({chain:'base',pool:'0x'+n.toString(16).padStart(40,'0')});
const success=(page,minute=1,nums=[page])=>({chain:'base',page,
 captured_at_utc:new Date(Date.parse('2026-11-22T11:00:00.000Z')+minute*60000).toISOString(),
 source_path:'research/feeds/2026-11-22/xyz/base-page'+page+'-'+minute+'.raw.json',
 source_sha256:'a'.repeat(64),requested_pool_count:20,rejected_count:0,
 candidates:nums.map(candidate)});
const opts=(ledger,budget=2)=>planMultiChainCapture({networks:['base'],budget,
 asOfUtc:at,pageCoverage:ledger,checkpoints:{
  'base:GECKOTERMINAL':{page:3,next_page_to_consider:4,
    last_attempt_at_utc:'2026-11-22T11:03:00.000Z'}
 }});
test('page 3 first leaves pages 1 and 2 explicitly unresolved and scheduled before page 4',()=>{
 const r=updatePageCoverage(emptyPageCoverage(),{asOfUtc:at,successes:[success(3)]});
 assert.deepEqual(r.updated_memory.chains.base.pending_pages,[1,2]);
 assert.equal(r.total_unresolved_page_indices,2);
 assert.equal(r.coverage_is_complete,false);
 assert.equal(r.chain_coverage[0].whole_market_complete,false);
 const plan=opts(r.updated_memory);
 assert.deepEqual(plan.tasks.map(x=>x.page),[1,2]);
});
test('capturing missing earlier pages clears the recorded index gap without claiming full coverage',()=>{
 const first=updatePageCoverage(emptyPageCoverage(),{asOfUtc:at,successes:[success(3)]});
 const second=updatePageCoverage(first.updated_memory,{asOfUtc:at,
  successes:[success(1,30),success(2,31)]});
 assert.deepEqual(second.updated_memory.chains.base.pending_pages,[]);
 assert.equal(second.updated_memory.chains.base.max_observed_page,3);
 assert.equal(second.coverage_is_complete,false);
 assert.equal(second.chain_coverage[0].recent_set_within_90s,false);
 assert.equal(second.run.succeeded,2);
});
test('failed previously captured page is retried, not erased by earlier successful evidence',()=>{
 const prior=updatePageCoverage(emptyPageCoverage(),{asOfUtc:at,
  successes:[success(1,1),success(2,2)]});
 const failure=updatePageCoverage(prior.updated_memory,{asOfUtc:at,
  failures:[{chain:'base',page:2,attempt_at_utc:'2026-11-22T11:50:00.000Z',http_status:429}]});
 assert.deepEqual(failure.updated_memory.chains.base.pending_pages,[2]);
 const plan=opts(failure.updated_memory,1);
 assert.equal(plan.tasks[0].page,2);
 const recovered=updatePageCoverage(failure.updated_memory,{asOfUtc:at,
  successes:[success(2,59)]});
 assert.deepEqual(recovered.updated_memory.chains.base.pending_pages,[]);
 assert.equal(recovered.updated_memory.chains.base.pages[2].successful_captures,2);
});
test('deferred unattempted pages are durable but do not count as API successes',()=>{
 const r=updatePageCoverage(emptyPageCoverage(),{asOfUtc:at,
  deferred:[{chain:'base',page:5}]});
 assert.equal(r.run.attempted,0);
 assert.equal(r.run.deferred,1);
 assert.equal(r.total_unresolved_page_indices,1);
 assert.equal(opts(r.updated_memory,1).tasks[0].page,5);
});
test('duplicate pool identities across shifting page offsets remain visible in diagnostics',()=>{
 const a=updatePageCoverage(emptyPageCoverage(),{asOfUtc:at,
  successes:[success(1,1,[100,101]),success(2,2,[100,102])]});
 assert.equal(a.run.duplicate_pool_ids_across_pages,1);
 assert.equal(a.run.duplicate_pool_details[0].pool_key,'base:'+candidate(100).pool);
 assert.equal(a.coverage_is_complete,false);
});
test('future captures and unsigned/missing raw bytes are never recorded as observed pages',()=>{
 assert.throws(()=>updatePageCoverage(emptyPageCoverage(),{asOfUtc:at,
  successes:[{...success(1),captured_at_utc:'2026-11-22T13:00:00.000Z'}]}),
  /INVALID_PAGE_SUCCESS_PROOF/);
 assert.throws(()=>updatePageCoverage(emptyPageCoverage(),{asOfUtc:at,
  successes:[{...success(1),source_sha256:null}]}),
  /INVALID_PAGE_SUCCESS_PROOF/);
});
