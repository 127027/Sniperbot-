import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {emptyMarketMemory,mergeMemory,planIncrementalScan} from '../src/market-memory.mjs';
import {fairRecheckPlan,recordRecheckAttempt} from '../src/discovery-fair-queue.mjs';

const first='2026-11-22T00:00:00.000Z';
const at='2026-11-22T01:00:00.000Z';
const pool=n=>'0x'+n.toString(16).padStart(40,'0');
function seed(n=8){
 const entries=Array.from({length:n},(_,i)=>({chain:'base',pool:pool(i+1),
  contract:'0x'+'f'.repeat(40),observed_at_utc:first,symbol:'T'+i}));
 return mergeMemory(emptyMarketMemory(),{candidates:entries,
  sourcePath:'research/feeds/restart-seed.json',sourceCapturedAtUtc:first,
  chain:'base',page:1}).memory;
}
async function roundTrip(value,dir){
 const path=join(dir,'market-memory.json');
 await writeFile(path,JSON.stringify(value,null,2)+'\n','utf8');
 return JSON.parse(await readFile(path,'utf8'));
}
test('D2-09: cold JSON restart preserves exactly the unserved candidates',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'r29-recheck-cold-'));
 try{
  let memory=seed(8);
  const served=new Set();
  for(let cycle=0;cycle<4;cycle++){
   memory=await roundTrip(memory,dir);
   const tick=new Date(Date.parse(at)+cycle*60000).toISOString();
   const plan=fairRecheckPlan(memory,{asOfUtc:tick,maxRechecks:2});
   const facade=planIncrementalScan(memory,{asOfUtc:tick,maxRechecks:2});
   assert.deepEqual(facade.recheck_pool_keys,plan.candidates.map(v=>v.key));
   assert.equal(plan.candidates.length,2);
   for(const candidate of plan.candidates){
    assert.equal(served.has(candidate.key),false,'starvation/recheck before unserved backlog');
    served.add(candidate.key);
    memory=recordRecheckAttempt(memory,{chain:candidate.chain,pool:candidate.pool,
     attemptAtUtc:tick,status:'SOURCE_CHECKED',
     sourcePath:'research/feeds/run-'+cycle+'.json'});
   }
  }
  assert.equal(served.size,8);
  memory=await roundTrip(memory,dir);
  const after=fairRecheckPlan(memory,{asOfUtc:'2026-11-22T01:05:00.000Z',maxRechecks:8});
  assert.equal(after.never_checked_count,0);
  assert.equal(Object.keys(memory.pools).length,8);
  assert.equal(memory.ingested_sources.length,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('D2-09: duplicate archived receipt is idempotent across restart',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'r29-recheck-idem-'));
 try{
  const s=seed(2),p=fairRecheckPlan(s,{asOfUtc:at,maxRechecks:1}).candidates[0];
  const receipt={chain:p.chain,pool:p.pool,attemptAtUtc:at,status:'HTTP_429',
   sourcePath:'research/feeds/error.json'};
  const once=recordRecheckAttempt(s,receipt);
  const disk=await roundTrip(once,dir);
  const twice=recordRecheckAttempt(disk,receipt);
  assert.deepEqual(twice,disk);
  assert.equal(twice.rechecks[p.key].attempts,1);
  assert.throws(()=>recordRecheckAttempt(twice,{...receipt,status:'OK'}),
   /CONFLICTING_RECHECK_RECEIPT_AT_SAME_TIME/);
  assert.throws(()=>recordRecheckAttempt(twice,{...receipt,attemptAtUtc:first}),
   /RECHECK_TIME_REGRESSION/);
  const retry=recordRecheckAttempt(twice,{...receipt,attemptAtUtc:'2026-11-22T02:00:00Z',
   status:'SOURCE_CHECKED',sourcePath:'research/feeds/recovered.json'});
  assert.equal(retry.rechecks[p.key].attempts,2);
  assert.equal(retry.rechecks[p.key].status,'SOURCE_CHECKED');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('D2-09: restricted facade never drops other chains after cold restart',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'r29-recheck-scope-'));
 try{
  let memory=seed(1);
  memory=mergeMemory(memory,{candidates:[{chain:'ethereum',pool:pool(100),
   contract:pool(101),observed_at_utc:first}],
   sourcePath:'research/feeds/eth-100.json',sourceCapturedAtUtc:first,
   chain:'ethereum',page:1}).memory;
  memory=await roundTrip(memory,dir);
  const before=JSON.stringify(memory);
  const plan=planIncrementalScan(memory,{asOfUtc:at,maxRechecks:1,chains:['base']});
  assert.equal(plan.rechecks.length,1);
  assert.equal(plan.rechecks[0].chain,'base');
  assert.equal(JSON.stringify(memory),before);
  assert.equal(Object.keys(memory.pools).length,2);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('D2-09: fresh Node process after disk restart continues one shared queue',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'r29-recheck-process-'));
 try{
  const file=join(dir,'state.json');
  let state=seed(3),firstTick='2026-11-22T01:00:00Z';
  const firstPlan=fairRecheckPlan(state,{asOfUtc:firstTick,maxRechecks:1});
  state=recordRecheckAttempt(state,{chain:firstPlan.candidates[0].chain,
    pool:firstPlan.candidates[0].pool,attemptAtUtc:firstTick,
    status:'SOURCE_CHECKED',sourcePath:'research/feeds/first.json'});
  await writeFile(file,JSON.stringify(state),'utf8');
  // This is a second Node process, not an in-memory JSON clone.
  const script=`import {readFile,writeFile} from 'node:fs/promises';
import {fairRecheckPlan,recordRecheckAttempt} from './src/discovery-fair-queue.mjs';
import {planIncrementalScan} from './src/market-memory.mjs';
const path=process.argv.at(-1),memory=JSON.parse(await readFile(path,'utf8'));
const at='2026-11-22T01:01:00Z';
const p=fairRecheckPlan(memory,{asOfUtc:at,maxRechecks:1}).candidates[0];
const facade=planIncrementalScan(memory,{asOfUtc:at,maxRechecks:1});
if(p.key!==facade.recheck_pool_keys[0])throw Error('SECOND_PLANNER_CONFLICT');
const next=recordRecheckAttempt(memory,{chain:p.chain,pool:p.pool,
 attemptAtUtc:at,status:'SOURCE_CHECKED',sourcePath:'research/feeds/restarted.json'});
await writeFile(path,JSON.stringify(next),'utf8');
console.log(p.key);`;
  const {stdout}=await promisify(execFile)(process.execPath,
   ['--input-type=module','-e',script,file],{cwd:process.cwd(),timeout:15000});
  const last=JSON.parse(await readFile(file,'utf8'));
  assert.notEqual(stdout.trim(),firstPlan.candidates[0].key);
  assert.equal(last.rechecks[stdout.trim()].attempts,1);
  assert.equal(Object.keys(last.rechecks).length,2);
  assert.equal(Object.keys(last.pools).length,3);
 }finally{await rm(dir,{recursive:true,force:true})}
});
