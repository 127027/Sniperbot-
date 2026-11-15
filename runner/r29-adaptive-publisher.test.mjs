import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {sanitizedAdaptivePresence,syncAdaptivePublicPresence,
 ADAPTIVE_PUBLIC_PATH} from './r29-adaptive-publisher.mjs';

const local={schema:'sniper_r29_dynamic_research_status.v1',
 paper_only:true,actionable:false,
 first_seen_at_utc:'2026-11-15T10:00:00.000Z',
 day_utc:'2026-11-15',day_review_count:1,total_review_count:1,
 last_review_at_utc:'2026-11-15T10:00:00.000Z',
 next_due_at_utc:'2026-11-16T00:00:00.000Z',frequency_per_day:1,
 experiment_phase:'OBSERVATION_WARMUP_30_DAYS',
 experiment_day_index:0,last_review_sha256:'f'.repeat(64),
 recent_candidate_count:12,can_authorize_trades:false,
 real_trading_enabled:false,account_balances_included:false,
 fake_private_key:'never-share',token:'github_pat_FAKE_DO_NOT_PUBLISH',
 simulated_cash_balance:4999.01};
test('strict whitelist strips all private data, does not imply AI or executable orders',()=>{
 const o=sanitizedAdaptivePresence(local);
 assert.equal(o.frequency_per_day,1);
 assert.equal(o.can_authorize_trades,false);
 assert.equal(o.account_balance_or_wallet_published,false);
 assert.equal(o.security_verification,'UNKNOWN_NOT_EXECUTABLE');
 const raw=JSON.stringify(o);
 for(const x of ['fake_private_key','never-share','github_pat_','4999.01','simulated_cash_balance'])
  assert(!raw.includes(x));
 assert.throws(()=>sanitizedAdaptivePresence({...local,can_authorize_trades:true}),/INVALID/);
 assert.throws(()=>sanitizedAdaptivePresence({...local,real_trading_enabled:true}),/INVALID/);
 assert.throws(()=>sanitizedAdaptivePresence({...local,last_review_sha256:'bad'}),/INVALID/);
});
test('no local journal means never post made-up progress',async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),'r29-public-empty-'));
 try{
  let called=false;
  const result=await syncAdaptivePublicPresence({filename:path.join(folder,'none.json'),
   token:'github_pat_FAKE_TEST_TOKEN_123456789012345',fetcher:async()=>{called=true;throw Error('NO!')}});
  assert.equal(result.status,'NOT_STARTED_NO_LOCAL_RESEARCH_STATUS');
  assert.equal(called,false);
 }finally{await rm(folder,{recursive:true,force:true})}
});
test('GitHub bridge publishes only one public research summary and then deduplicates',async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),'r29-public-upsert-'));
 const filename=path.join(folder,'status.json');
 try{
  await writeFile(filename,JSON.stringify(local));
  const calls=[];
  const fakeToken='github_pat_FAKE_TEST_TOKEN_123456789012345';
  const fetcher=async(url,opt)=>{
    calls.push({url,method:opt.method,body:opt.body});
    assert(url.includes(ADAPTIVE_PUBLIC_PATH));
    if(opt.method==='GET' && calls.length===1)return {status:404,ok:false};
    if(opt.method==='PUT')return {status:201,ok:true,json:async()=>({commit:{sha:'a'.repeat(40)}})};
    return {status:200,ok:true,json:async()=>({
      type:'file',sha:'b'.repeat(40),encoding:'base64',
      content:Buffer.from(JSON.stringify(sanitizedAdaptivePresence(local))).toString('base64')})};
  };
  const one=await syncAdaptivePublicPresence({filename,token:fakeToken,fetcher});
  assert.equal(one.status,'PUBLISHED');
  assert.equal(one.published,true);
  assert.equal(calls.length,2);
  const sent=JSON.parse(calls[1].body);
  assert.equal(sent.branch,'codex/r29-chatgpt-github-paper-cycle-20261115');
  const decoded=Buffer.from(sent.content,'base64').toString('utf8');
  assert(!decoded.includes('private_key'));
  assert(!decoded.includes('4999.01'));
  assert.equal(JSON.parse(decoded).real_trading_enabled,false);
  const two=await syncAdaptivePublicPresence({filename,token:fakeToken,fetcher});
  assert.equal(two.status,'UNCHANGED');
  assert.equal(calls.length,3);
 }finally{await rm(folder,{recursive:true,force:true})}
});
