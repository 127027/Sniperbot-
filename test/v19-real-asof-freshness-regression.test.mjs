// V1.9 D2-04 regression: recompute a real archived November point in time.
// This reads immutable forward observations, never winner-reference oracles,
// never calls an API and never writes signals/orders.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {scoreAsOf} from '../src/forward-learning.mjs';

test('real 22-Nov 15:11 UTC as-of snapshot demotes two 997-minute-old leaders',async()=>{
 const archived=JSON.parse(await readFile(
  'research/observations/2026-11-22/45036887325-asof-ranking.json','utf8'));
 assert.equal(archived.as_of_utc,'2026-11-22T15:11:16.013Z');
 assert.equal(archived.counts.research_rankable,3);
 const records=(await readdir('research/observations',{recursive:true}))
  .filter(x=>/\.json$/.test(x)).sort();
 const batches=[];
 // Same last-200 scan as the production runner; exclude later captures
 // using scoreAsOf's own available-at gate.
 for(const rel of records.slice(-200)){
  try{
   const b=JSON.parse(await readFile('research/observations/'+rel,'utf8'));
   if(b.kind==='R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS')batches.push(b);
  }catch{/* malformed earlier artifacts never become trading evidence */}
 }
 assert.ok(batches.length>0);
 const replay=scoreAsOf({batches,asOfUtc:archived.as_of_utc});
 const old=new Map(archived.candidates.map(x=>[x.key,x]));
 const next=new Map(replay.candidates.map(x=>[x.key,x]));
 for(const key of [
  'bsc:0x03aa0e5114c12d3974da2ab1843cd197e24e4274',
  'bsc:0x364f490a973f8fecddb5845ebc66562ec94ad54a'
 ]){
  assert.ok(old.get(key)?.score!==null);
  assert.equal(next.get(key)?.score,null);
  assert.equal(next.get(key)?.status,'WATCH_STALE_LAST_CAPTURE');
  assert.equal(next.get(key)?.latest_capture_is_recent,false);
 }
 const cronos='cronos:0x835a8fe7370c5c08b9a4efda273e28ff7bcf161c';
 assert.ok(next.get(cronos)?.score!==null);
 assert.equal(next.get(cronos).latest_capture_is_recent,true);
 assert.equal(replay.counts.research_rankable,1);
 assert.ok(replay.counts.stale_last_captures>=2);
 assert.equal(replay.orders,0);
 assert.ok(replay.candidates.every(x=>x.trade_authorized===false));
});
