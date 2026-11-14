import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {selectFollowupCandidates,dueFollowups,finishFollowupState,runFollowups,
 fetchFollowupPool,fetchFollowupBatch,emptyFollowupState} from './memecoin-followups.mjs';

const now='2026-11-09T12:00:00Z';
const at=m=>new Date(Date.parse(now)+m*60000).toISOString();
const token='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40),id='base:'+token+':'+pool;
const coin=(overrides={})=>({chain:'base',token_address:token,pool_address:pool,candidate_id:id,
 price_usd:.00001,liquidity_usd:100000,volume_m5_usd:2000,
 buys_m5:40,sells_m5:10,...overrides});
const snapshot=(atUtc=now,candidates=[coin()])=>({schema:'research_market_snapshot.v1',
 paper_only:true,actionable:false,published_at_utc:atUtc,candidates});
const gt=(c=coin())=>({data:{attributes:{address:c.pool_address,base_token_price_usd:String(c.price_usd),
 reserve_in_usd:String(c.liquidity_usd),volume_usd:{m5:String(c.volume_m5_usd)},
 transactions:{m5:{buys:40,sells:10}}},
 relationships:{base_token:{data:{id:'base_'+c.token_address}}}}});
const response=data=>({ok:true,json:async()=>data});

test('admit one new research sample per six-hour slot instead of filling all cohort slots at launch',()=>{
 const next=selectFollowupCandidates(emptyFollowupState(),snapshot());
 assert.equal(next.admitted,1);
 const record=next.state.records[0];
 assert.equal(record.baseline_price_usd,.00001);
 assert.equal(record.selection,'EARLY_MOMENTUM');
 assert.equal(record.observations[0].quality,'UNVERIFIED_DEX_INDICATIVE');
 assert.equal(dueFollowups(next.state,{now:at(14)}).length,0);
 assert.equal(dueFollowups(next.state,{now:at(16)}).length,1);
 assert.equal(selectFollowupCandidates(next.state,snapshot()).admitted,0);
 const batch=Array.from({length:12},(_,i)=>{
  const a='0x'+(i+100).toString(16).padStart(40,'0');
  const p='0x'+(i+300).toString(16).padStart(40,'0');
  return coin({token_address:a,pool_address:p,candidate_id:'base:'+a+':'+p});
 });
 const capped=selectFollowupCandidates(emptyFollowupState(),snapshot(now,batch));
 assert.equal(capped.admitted,1);
 assert.equal(capped.omitted,0);
 assert(capped.state.records.every(r=>r.actionable===undefined));
});
test('provider must return exact chain-token-pool, never substitutes another contract',async()=>{
 const record=selectFollowupCandidates(emptyFollowupState(),snapshot()).state.records[0];
 assert.equal((await fetchFollowupPool(record,{now:at(16),fetcher:async()=>response(gt())})).price_usd,.00001);
 await assert.rejects(fetchFollowupPool(record,{now:at(16),fetcher:async()=>response(gt(coin({token_address:'0x'+'f'.repeat(40)})))}),/MISMATCH/);
 await assert.rejects(fetchFollowupPool(record,{now:at(16),fetcher:async()=>response(gt(coin({price_usd:0})))}),/VALID_PRICE/);
});
test('persist selected pool history separately; outage never fabricates quote, ledger or sale',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-followups-'));
 const filename=path.join(dir,'research','pools.json');
 const paper=path.join(dir,'paper-state-v03.json');
 await writeFile(paper,'{"cashUsdc":5000}');
 try{
  let fetched=0;
  const start=await runFollowups(snapshot(),{filename,now,fetcher:async()=>{fetched++;return response(gt())}});
  assert.equal(start.admitted,1);assert.equal(fetched,0);
  const next=await runFollowups(snapshot(at(16),[]),{filename,now:at(16),fetcher:async()=>{fetched++;return response(gt())}});
  assert.equal(next.followup_ok,1);assert.equal(fetched,1);
  const before=JSON.parse(await readFile(filename,'utf8')).records[0];
  assert.equal(before.observations.length,2);
  const err=await runFollowups(snapshot(at(32),[]),{filename,now:at(32),
   fetcher:async()=>{throw Object.assign(Error('rate'),{status:429})}});
  assert.equal(err.followup_failed,1);
  const after=JSON.parse(await readFile(filename,'utf8')).records[0];
  assert.equal(after.observations.length,2,'No forged quote on outage');
  assert.equal(after.last_error,'HTTP_429');
  assert.equal(await readFile(paper,'utf8'),'{"cashUsdc":5000}');
  const matured=finishFollowupState({...emptyFollowupState(),records:[after]}, {now:at(14*24*60+1)});
  assert.equal(matured.records[0].outcomes.outcomes[200].hit,null,'Missing followups are UNKNOWN, not misses');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('malformed existing research history fails closed and is not overwritten',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-followup-invalid-'));
 const filename=path.join(dir,'pools.json');
 await writeFile(filename,'{invalid json');
 try{
  await assert.rejects(runFollowups(snapshot(),{filename}),SyntaxError);
  assert.equal(await readFile(filename,'utf8'),'{invalid json');
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('six-hour slots keep sampling later launches instead of using the whole 14-day budget at once',()=>{
 const s1=selectFollowupCandidates(emptyFollowupState(),snapshot(now,[coin()]));
 const token2='0x'+'a'.repeat(40),pool2='0x'+'b'.repeat(40);
 const second=coin({token_address:token2,pool_address:pool2,candidate_id:'base:'+token2+':'+pool2});
 const s2=selectFollowupCandidates(s1.state,snapshot(at(360),[second]),{now:at(360)});
 assert.equal(s1.admitted,1);
 assert.equal(s2.admitted,1);
 assert.equal(s2.state.records.length,2);
 assert.notEqual(s1.state.records[0].slot_id,s2.state.records[1].slot_id);
});
test('multi-pool endpoint matches every exact original pool and never invents missing quotes',async()=>{
 const first=selectFollowupCandidates(emptyFollowupState(),snapshot(now,[coin()])).state.records[0];
 const secondToken='0x'+'a'.repeat(40),secondPool='0x'+'b'.repeat(40);
 const second={...first,candidate_id:'base:'+secondToken+':'+secondPool,
  token_address:secondToken,pool_address:secondPool};
 const urls=[];
 const fetcher=async url=>{
  urls.push(url);
  return response({data:[gt(coin({price_usd:.002})).data,
    gt(coin({token_address:secondToken,pool_address:secondPool,
      candidate_id:second.candidate_id,price_usd:.003})).data]});
 };
 const obs=await fetchFollowupBatch([first,second],{fetcher,now:at(16)});
 assert.equal(urls.length,1,'two pools in one public request');
 assert.match(urls[0],/\/pools\/multi\//);
 assert.deepEqual(obs.map(x=>x.obs?.price_usd),[.002,.003]);
 const missing=await fetchFollowupBatch([first,second],{now:at(16),
  fetcher:async()=>response({data:[gt().data]})});
 assert.equal(missing[0].obs.price_usd,.00001);
 assert.equal(missing[1].obs,undefined,'a missing pool is not a synthetic fill');
 assert.equal(missing[1].error,'POOL_IDENTITY_OR_PRICE_UNAVAILABLE');
});
