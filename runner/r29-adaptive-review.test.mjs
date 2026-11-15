import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {adaptiveResearchTick} from './dynamic-research-scheduler.mjs';
import {sanitizedAdaptiveReview,syncAdaptivePublicReview,
 ADAPTIVE_PUBLIC_REVIEW_PATH} from './r29-adaptive-publisher.mjs';
const timestamp='2026-11-15T12:00:00.000Z';
const coin='0x'+'a'.repeat(40);
const pool='0x'+'b'.repeat(40);
const s={
 schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
 collection_status:'OBSERVED_OR_PARTIAL',published_at_utc:timestamp,
 candidates:[{candidate_id:'base:'+coin+':'+pool,chain:'base',
 token_address:coin,pool_address:pool,price_usd:0.0003,
 liquidity_usd:150000,volume_m5_usd:25000,buys_m5:45,sells_m5:15,
 pool_created_at_utc:'2026-11-15T11:35:00.000Z',
 source:'GECKOTERMINAL_NEW_POOLS',promotion_biased:false}]
};
const fakeToken='github_pat_FAKE_TEST_TOKEN_123456789012345';
test('R29 immutable local review becomes public stripped safe research NOT trade',async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),'r29-review-publisher-'));
 try{
  const a=await adaptiveResearchTick(s,{folder});
  assert.equal(a.created,true);
  assert.equal(a.review.candidates.length,1);
  const out=sanitizedAdaptiveReview(a.review,a.status);
  assert.equal(out.candidates.length,1);
  assert.equal(out.security_verified,false);
  assert.equal(out.candidates[0].signal,'INDEPENDENT_REVIEW_REQUIRED_NOT_BUY');
  assert(!JSON.stringify(out).includes('wallet_address'));
  const filename=path.join(folder,'status.json');
  const calls=[];
  const fetcher=async (url,opts)=>{
    calls.push({url,method:opts.method,body:opts.body});
    assert(url.includes(ADAPTIVE_PUBLIC_REVIEW_PATH));
    if(opts.method==='GET'&&calls.length===1)return {status:404,ok:false};
    if(opts.method==='PUT')return {status:201,ok:true,json:async()=>({commit:{sha:'a'.repeat(40)}})};
    return {status:200,ok:true,json:async()=>({
     type:'file',sha:'b'.repeat(40),encoding:'base64',
     content:Buffer.from(JSON.stringify(out)).toString('base64')})};
  };
  const first=await syncAdaptivePublicReview({token:fakeToken,filename,fetcher});
  assert.equal(first.status,'PUBLISHED');
  assert.equal(first.public.candidates.length,1);
  assert.equal(calls.length,2);
  const sent=JSON.parse(calls[1].body);
  assert.equal(sent.branch,'codex/r29-chatgpt-github-paper-cycle-20261115');
  const decoded=Buffer.from(sent.content,'base64').toString('utf8');
  assert(!decoded.includes('personal_cash_balance'));
  assert(!decoded.includes(fakeToken));
  assert.equal(JSON.parse(decoded).real_trading_enabled,false);
  const again=await syncAdaptivePublicReview({token:fakeToken,filename,fetcher});
  assert.equal(again.status,'UNCHANGED');
  assert.equal(calls.length,3);
 }finally{await rm(folder,{recursive:true,force:true})}
});
test('tampered or dangerous source review never publishes',async()=>{
 const folder=await mkdtemp(path.join(tmpdir(),'r29-review-tamper-'));
 try{
  const a=await adaptiveResearchTick(s,{folder});
  let called=false;
  const filename=path.join(folder,'status.json');
  const reviewFile=a.filename;
  const tampered=JSON.parse(await readFile(reviewFile,'utf8'));
  tampered.candidates[0].gpt_action='PAPER_BUY';
  await writeFile(reviewFile,JSON.stringify(tampered));
  await assert.rejects(syncAdaptivePublicReview({filename,token:fakeToken,
    fetcher:async()=>{called=true;throw Error('must not call')}}),/INTEGRITY_OR_SAFETY/);
  assert.equal(called,false);
  tampered.candidates[0].gpt_action='NO_ORDER_UNVERIFIED_SECURITY';
  tampered.personal_cash_balance=4999.01;
  await writeFile(reviewFile,JSON.stringify(tampered));
  await assert.rejects(syncAdaptivePublicReview({filename,token:fakeToken,
    fetcher:async()=>{called=true;throw Error('must not call')}}),/INTEGRITY_OR_SAFETY/);
  assert.equal(called,false);
 }finally{await rm(folder,{recursive:true,force:true})}
});
