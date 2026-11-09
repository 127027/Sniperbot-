import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,writeFile,utimes,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {saveHistory,pruneHistory} from './research-market-daemon.mjs';
import {publishResearchSnapshot,publishingEnabled} from './research-market-publisher.mjs';
const now=Date.parse('2026-11-09T17:00:00.000Z');
const snapshot={schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
  producer:'Local read-only research market collector',published_at_utc:'2026-11-09T17:00:00.000Z',
  collection_status:'OBSERVED_OR_PARTIAL',coverage:[],candidates:[],summary:{identities:0}};
test('local history is gzip-compressed research, never a portfolio or trading event',async()=>{
  const folder=await mkdtemp(path.join(tmpdir(),'sniper-market-history-'));
  try{
    const file=await saveHistory(snapshot,{folder});
    assert.match(path.basename(file),/^snapshot-\d{8}T\d{9}Z\.json\.gz$/);
    const value=JSON.parse(gunzipSync(await readFile(file)).toString('utf8'));
    assert.equal(value.actionable,false);assert.equal(value.paper_only,true);
    assert.deepEqual(value.candidates,[]);
  }finally{await rm(folder,{force:true,recursive:true})}
});
test('cleanup removes only old owned history files; never unknown files or bot state',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sniper-market-prune-'));
  try{
    const first=await saveHistory(snapshot,{folder:dir});
    const unrelated=path.join(dir,'paper-state-v03.json');
    await writeFile(unrelated,'{"cashUsdc":1000}');
    const expiredTime=new Date(now-25*24*3600_000);
    await utimes(first,expiredTime,expiredTime);
    const result=await pruneHistory({folder:dir,now,retainMs:21*24*3600_000});
    assert.equal(result.deleted,1);
    assert.deepEqual(await readdir(dir),['paper-state-v03.json']);
    assert.equal(await readFile(unrelated,'utf8'),'{"cashUsdc":1000}');
  }finally{await rm(dir,{force:true,recursive:true})}
});
test('cleanup obeys a byte limit and does not delete unrelated data',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'sniper-market-quota-'));
  try{
    const snapA={...snapshot,published_at_utc:'2026-11-09T16:00:00.000Z'};
    await saveHistory(snapA,{folder:dir});
    await saveHistory(snapshot,{folder:dir});
    await writeFile(path.join(dir,'notes.txt'),'owner data not to delete');
    const result=await pruneHistory({folder:dir,now,maxFiles:1});
    assert.equal(result.remaining,1);
    assert.equal(result.deleted,1);
    assert.equal(await readFile(path.join(dir,'notes.txt'),'utf8'),'owner data not to delete');
  }finally{await rm(dir,{force:true,recursive:true})}
});
test('GitHub market publication is opt-in and non-actionable only',async()=>{
  assert.equal(publishingEnabled({}),false);
  assert.equal(publishingEnabled({SNIPER_MARKET_PUBLISH:'1'}),false);
  assert.equal(publishingEnabled({SNIPER_MARKET_PUBLISH:'1',SNIPER_MARKET_GITHUB_TOKEN:'test-token-long-enough'}),true);
  await assert.rejects(publishResearchSnapshot(snapshot),/NOT_CONFIGURED/);
  await assert.rejects(publishResearchSnapshot({...snapshot,actionable:true},{token:'test-token-long-enough'}),/Unsafe/);
});
test('publisher writes the fixed work branch and fixed research-only path using SHA',async()=>{
  const calls=[];
  const token='fake-test-token-not-a-secret';
  const fetcher=async (url,opts)=>{
    calls.push({url,method:opts.method,body:opts.body,headers:opts.headers});
    if(opts.method==='GET')return {status:200,ok:true,json:async()=>({type:'file',sha:'previous-blob'})};
    return {status:201,ok:true,json:async()=>({commit:{sha:'new-commit'}})};
  };
  const result=await publishResearchSnapshot(snapshot,{token,fetcher});
  assert.equal(result.branch,'codex/research-gateway-v04');
  assert.equal(result.path,'research/market/latest.json');
  assert.equal(calls.length,2);
  const sent=JSON.parse(calls[1].body);
  assert.equal(sent.sha,'previous-blob');
  assert.equal(sent.branch,'codex/research-gateway-v04');
  const decoded=JSON.parse(Buffer.from(sent.content,'base64').toString('utf8'));
  assert.equal(decoded.actionable,false);assert.equal(decoded.paper_only,true);
  assert.ok(calls.every(c=>!c.url.includes('main')));
});
test('publisher refuses a concurrent GitHub SHA update and never retries blindly',async()=>{
  const fetcher=async(url,opts)=>opts.method==='GET'?
    {status:200,ok:true,json:async()=>({type:'file',sha:'old'})}:
    {status:409,ok:false,json:async()=>({message:'conflict'})};
  await assert.rejects(publishResearchSnapshot(snapshot,{token:'fake-test-token-not-a-secret',fetcher}),/SHA_CONFLICT/);
});
