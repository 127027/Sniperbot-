import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeBatches} from './r23-merge-batches.mjs';
const window={start:'2023-03-14T00:00:00Z',end:'2023-05-14T23:59:59Z'};
const quote_pair_policy='WETH_USDC_USDT_ONLY_NO_OUTCOME_SELECTION';
function b(from,to,{n=1,complete=true,checked=true}={}){
 const sources=Array.from({length:n},(_,i)=>({
  id:'pair:'+from+':'+i,kind:'POOL',candidate_id:'eth:token'+from+'-'+i,
  event_at:'2023-04-14T00:00:00.000Z',payload:{pool:'0xpool'+from+'-'+i},
  proof:{verified:checked,historical_ledger_verified:checked}
 }));
 return {schema:'r23_onchain_discovery.v1',source:'ETHEREUM_UNISWAP_V2_PAIRCREATED',
  window,quote_pair_policy,requested_blocks:{from,to},completed_through_block:to,
  complete_block_range:complete,independently_cross_checked:checked,
  observed_pair_events:sources.length,chunks:[{from_block:from,to_block:to}],
  asof_corpus:{schema:'asof_corpus.v1',sources}};
}
test('merges contiguous batches but does not label pools as memecoins',()=>{
 const m=mergeBatches([b(110,120),b(100,109)]);
 assert.equal(m.distinct_pool_candidates,2);
 assert.equal(m.verified_memecoins,0);
 assert.equal(m.confirmed_trades,0);
 assert.equal(m.source_kinds.MARKET,0);
 assert.equal(m.block_range_gaps,0);
 assert.equal(m.all_sources_cross_checked,true);
});
test('rejects skipped blocks, overlap, duplicate events and mixed window',()=>{
 assert.throws(()=>mergeBatches([b(100,105),b(107,110)]),/MISSING_OR_OVERLAPPING_BLOCKS/);
 assert.throws(()=>mergeBatches([b(100,105),b(105,110)]),/MISSING_OR_OVERLAPPING_BLOCKS/);
 const duplicate=b(106,110);duplicate.asof_corpus.sources[0].id=b(100,105).asof_corpus.sources[0].id;
 assert.throws(()=>mergeBatches([b(100,105),duplicate]),/DUPLICATE_SOURCE_EVENT/);
 const x=b(106,110);x.window={...window,end:'2023-05-13T23:59:59Z'};
 assert.throws(()=>mergeBatches([b(100,105),x]),/MIXED_HISTORY_WINDOWS/);
});
test('even 50 mock candidates are not 50 independently verified memecoins',()=>{
 const m=mergeBatches([b(100,101,{n:50})]);
 assert.equal(m.target_pool_candidates_found,true);
 assert.equal(m.distinct_pool_candidates,50);
 assert.equal(m.verified_memecoins,0);
 assert.equal(m.asof_corpus.sources.length,50);
});
test('rejects missing sources and does not claim secondary attestation',()=>{
 const x=b(100,101,{checked:false});
 const m=mergeBatches([x]);
 assert.equal(m.all_sources_cross_checked,false);
 x.observed_pair_events=2;
 assert.throws(()=>mergeBatches([x]),/SOURCE_COUNT_MISMATCH/);
});

test('consecutive partial checkpoints merge when every resumed block is present',()=>{
 const first=b(100,110,{complete:false});
 first.completed_through_block=105;
 first.chunks=[{from_block:100,to_block:105}];
 const second=b(106,110,{complete:true});
 const joined=mergeBatches([first,second]);
 assert.equal(joined.block_range_gaps,0);
 assert.equal(joined.all_submitted_batches_complete,true);
 const alone=mergeBatches([first]);
 assert.equal(alone.all_submitted_batches_complete,false);
});
