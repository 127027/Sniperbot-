import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,writeFile,utimes,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {saveHistory,pruneHistory,appendResearchAlerts,recentResearchAlerts} from './research-market-daemon.mjs';
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

test('local market alert journal deduplicates and never touches virtual paper ledger',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-market-alerts-'));
 const file=path.join(dir,'research-learning','market-alerts.json');
 const ledger=path.join(dir,'paper-state-v03.json');
 const now=Date.parse('2026-11-10T07:00:00Z');
 const e={event_id:'research-alert-'+'1'.repeat(32),
   event_type:'MARKET_ACCELERATION',paper_only:true,actionable:false,
   observed_at_utc:new Date(now).toISOString(),candidate_id:'base:token:pool'};
 try{
  await writeFile(ledger,'{"cashUsdc":5000}');
  const a=await appendResearchAlerts([e],{filename:file,now});
  const b=await appendResearchAlerts([e],{filename:file,now});
  assert.equal(a.added,1);assert.equal(b.added,0);
  const j=JSON.parse(await readFile(file,'utf8'));
  assert.equal(j.events.length,1);
  assert.equal(j.actionable,false);
  assert.equal(await readFile(ledger,'utf8'),'{"cashUsdc":5000}');
  await assert.rejects(appendResearchAlerts([{...e,actionable:true}],{filename:file,now}),/READ_ONLY/);
  assert.equal((JSON.parse(await readFile(file,'utf8'))).events.length,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('public publisher does not allow rogue trade instructions hidden in market alerts',async()=>{
 const alert={event_id:'research-alert-'+'2'.repeat(32),
   event_type:'MARKET_ACCELERATION',paper_only:true,actionable:false,probability_pct:null,
   recommended_action:'INDEPENDENT_FIVE_ROLE_REVIEW'};
 const bad={...snapshot,research_alerts:[{...alert,amount:1000,action:'PAPER_BUY'}]};
 await assert.rejects(publishResearchSnapshot(bad,{token:'fake-test-token-not-a-secret'}),/Unsafe/);
 const fake={...snapshot,research_alerts:[{...alert,probability_pct:95}]};
 await assert.rejects(publishResearchSnapshot(fake,{token:'fake-test-token-not-a-secret'}),/Unsafe/);
 const with96={...snapshot,candidates:Array.from({length:96},(_,i)=>({candidate_id:'demo-'+i}))};
 const published=await publishResearchSnapshot(with96,{token:'fake-test-token-not-a-secret',
   fetcher:async(url,o)=>o.method==='GET'?
    {status:404,ok:false,json:async()=>({})}:
    {status:201,ok:true,json:async()=>({commit:{sha:'new-commit'}})}});
 assert.equal(published.path,'research/market/latest.json');
 await assert.rejects(publishResearchSnapshot({...with96,candidates:[...with96.candidates,{}]},
    {token:'fake-test-token-not-a-secret'}),/Unsafe/);
});

test('GitHub hourly Dot sees last 60 minutes of local read-only market alerts',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-rolling-alerts-'));
 const filename=path.join(dir,'market-alerts.json');
 const now=Date.parse('2026-11-10T07:00:00Z');
 const event=(id,when)=>({
  event_id:'research-alert-'+id.repeat(32),event_type:'MARKET_ACCELERATION',
  paper_only:true,actionable:false,observed_at_utc:new Date(when).toISOString(),
  candidate_id:'base:token:pool',recommended_action:'INDEPENDENT_FIVE_ROLE_REVIEW'
 });
 try{
  const lastHour=event('1',now-15*60_000);
  const yesterday=event('2',now-2*3600_000);
  await appendResearchAlerts([lastHour,yesterday],{filename,now});
  const shared=await recentResearchAlerts({filename,now});
  assert.deepEqual(shared.map(e=>e.event_id),[lastHour.event_id]);
  assert(shared.every(e=>e.paper_only===true&&e.actionable===false));
  await assert.rejects(recentResearchAlerts({filename,now,windowMs:3*86400_000}),/WINDOW/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
