import test from 'node:test';
import assert from 'node:assert/strict';
import {runPoolReadbackBatch,READBACK_BATCH_LIMIT} from './readback-batch.mjs';
const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40);
const id='base:'+token+':'+pool;
const base=()=>({paper_only:true,actionable:false,watchlist:{stale:false},
 advisories:{candidates:Array.from({length:8},(_,i)=>({
  chain:'base',token_address:token,pool_address:i===0?pool:'0x'+i.toString(16).padStart(40,'0'),
  candidate_id:'base:'+token+':'+(i===0?pool:'0x'+i.toString(16).padStart(40,'0')),
  watchlist_state:'NEW'
 }))}});
const now='2026-11-10T14:00:00Z';
test('only three candidates per batch; external data never becomes a buy',async()=>{
 let requests=0;
 const fetcher=async()=>{requests++;throw Error('EXPECTED_NETWORK_DOWN')};
 const r=await runPoolReadbackBatch({network:base(),fetcher,now});
 assert.equal(r.attempted,READBACK_BATCH_LIMIT);
 assert.equal(requests,6);
 assert.equal(r.status,'COMPLETED_READ_ONLY');
 assert(r.results.every(x=>x.market_identity_verified===false&&x.paper_entry_authorized===false));
 assert(r.results.every(x=>x.contract_status==='UNKNOWN'));
});
test('stale, invalid, actionable research never triggers provider requests',async()=>{
 let count=0;
 const fetcher=async()=>{count++;return null};
 for(const bad of [{...base(),watchlist:{stale:true}},{...base(),actionable:true},
  {...base(),paper_only:false},null]){
  const r=await runPoolReadbackBatch({network:bad,fetcher,now});
  assert.equal(r.status,'SKIPPED_NO_FRESH_RESEARCH');
  assert.equal(r.attempted,0);
 }
 assert.equal(count,0);
});
test('archived and rejected candidates are skipped',async()=>{
 const n=base();
 n.advisories.candidates[0].watchlist_state='REJECTED';
 n.advisories.candidates[1].watchlist_state='ARCHIVED';
 let count=0;
 const r=await runPoolReadbackBatch({network:n,now,fetcher:async()=>{count++;throw Error('UNAVAILABLE')}});
 assert.equal(r.attempted,3);
 assert.equal(count,6);
 assert(!r.results.some(x=>x.candidate_id===id));
});
