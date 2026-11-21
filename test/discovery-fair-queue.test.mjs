import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMarketMemory,mergeMemory} from '../src/market-memory.mjs';
import {fairRecheckPlan,recordRecheckAttempt} from '../src/discovery-fair-queue.mjs';
const t='2026-11-21T17:00:00Z',chain='base',contract='0x'+'a'.repeat(40);
function sample(n){return {chain,pool:'0x'+n.toString(16).padStart(40,'0'),contract,observed_at_utc:t,symbol:'COIN'+n};}
let m=mergeMemory(emptyMarketMemory(),{candidates:Array.from({length:18},(_,i)=>sample(i+1)),
 sourcePath:'research/feeds/test.json',sourceCapturedAtUtc:t}).memory;
test('rotates through all 18 pools in three batches of six without starvation',()=>{
 let s=m,seen=new Set();
 for(let round=0;round<3;round++){
   const plan=fairRecheckPlan(s,{asOfUtc:new Date(Date.parse(t)+round*60000).toISOString(),maxRechecks:6});
   assert.equal(plan.candidates.length,6);
   for(const x of plan.candidates){assert.equal(seen.has(x.key),false);seen.add(x.key);
     s=recordRecheckAttempt(s,{chain:x.chain,pool:x.pool,attemptAtUtc:new Date(Date.parse(t)+round*60000).toISOString(),
      status:'SOURCE_CHECKED',sourcePath:'research/feeds/run'+round+'.json'});
   }
 }
 assert.equal(seen.size,18);
 assert.equal(fairRecheckPlan(s,{asOfUtc:'2026-11-21T18:00:00Z'}).never_checked_count,0);
});
test('source failure still moves the attempt cursor but does not create fake observations',()=>{
 const x=fairRecheckPlan(m,{asOfUtc:t,maxRechecks:1}).candidates[0];
 const v=recordRecheckAttempt(m,{chain:x.chain,pool:x.pool,attemptAtUtc:t,status:'HTTP_429',
 sourcePath:'research/feeds/failed.json'});
 assert.equal(v.pools[x.key].observation_count,1);
 assert.equal(fairRecheckPlan(v,{asOfUtc:t,maxRechecks:1}).candidates[0].key!==x.key,true);
 assert.throws(()=>recordRecheckAttempt(v,{chain:x.chain,pool:x.pool,attemptAtUtc:'2020-01-01T00:00:00Z',
 status:'HTTP_429',sourcePath:'research/feeds/a.json'}),/RECHECK_TIME_REGRESSION/);
});
