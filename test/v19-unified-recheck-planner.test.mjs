import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMarketMemory,mergeMemory,planIncrementalScan} from '../src/market-memory.mjs';
import {fairRecheckPlan,recordRecheckAttempt} from '../src/discovery-fair-queue.mjs';
const at='2026-11-22T09:00:00.000Z';
const older='2026-10-12T00:00:00.000Z';
const c=(i,chain='base')=>({chain,pool:'0x'+i.toString(16).padStart(40,'0'),
 contract:'0x'+'f'.repeat(40),observed_at_utc:older,symbol:'TEST'+i});
function seed(){
 return mergeMemory(emptyMarketMemory(),{candidates:[c(1),c(2),c(3),c(4,'ethereum')],
 sourcePath:'research/feeds/fair-seed.json',sourceCapturedAtUtc:older,provider:'GECKOTERMINAL',
 chain:'base',page:1}).memory;
}
test('legacy facade and active Dot2 scheduler choose IDENTICAL fair pool keys',()=>{
 let m=seed();
 for(let n=0;n<4;n++){
  const facade=planIncrementalScan(m,{asOfUtc:at,maxRechecks:2});
  const active=fairRecheckPlan(m,{asOfUtc:at,maxRechecks:2});
  assert.deepEqual(facade.recheck_pool_keys,active.candidates.map(c=>c.key));
  assert.equal(facade.scheduler_source,'SINGLE_FAIR_RECHECK_PLAN');
  for(const x of active.candidates)
   m=recordRecheckAttempt(m,{chain:x.chain,pool:x.pool,attemptAtUtc:
    new Date(Date.parse(at)+n*60000).toISOString(),
    status:'SOURCE_CHECKED',sourcePath:'research/feeds/recheck-'+n+'.json'});
 }
 assert.equal(fairRecheckPlan(m,{asOfUtc:at,maxRechecks:4}).never_checked_count,0);
});
test('restricted chain view never mutates other chain pool history',()=>{
 const m=seed(),before=JSON.stringify(m);
 const subset=planIncrementalScan(m,{asOfUtc:at,maxRechecks:8,chains:['ethereum']});
 assert.equal(subset.historical_pool_count,1);
 assert.deepEqual(subset.recheck_pool_keys,['ethereum:'+c(4,'ethereum').pool]);
 assert.equal(subset.chains_requested.length,1);
 assert.equal(JSON.stringify(m),before);
});
test('two pools of unequal ages but equal recheck status use same fair cursor, not conflicting last-seen sorting',()=>{
 let m=seed();
 m=recordRecheckAttempt(m,{chain:'base',pool:c(1).pool,attemptAtUtc:'2026-11-22T08:00:00.000Z',
 status:'SOURCE_CHECKED',sourcePath:'research/feeds/checked.json'});
 const a=planIncrementalScan(m,{asOfUtc:at,maxRechecks:1});
 const b=fairRecheckPlan(m,{asOfUtc:at,maxRechecks:1});
 assert.deepEqual(a.recheck_pool_keys,b.candidates.map(x=>x.key));
 assert.notEqual(a.recheck_pool_keys[0],'base:'+c(1).pool);
});
test('invalid dates, budgets and duplicate chains cannot trigger a second scheduler',()=>{
 const m=seed();
 assert.throws(()=>planIncrementalScan(m,{asOfUtc:'bad'}),/INVALID_SCAN_PLAN/);
 assert.throws(()=>planIncrementalScan(m,{asOfUtc:at,maxRechecks:101}),/INVALID_SCAN_PLAN/);
 assert.throws(()=>planIncrementalScan(m,{asOfUtc:at,chains:['base','base']}),/INVALID_SCAN_PLAN/);
});
