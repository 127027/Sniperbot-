import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
 parseRankingPage,collectPublicRankingResearch,updateLocalRankingResearch,
 RANKING_SOURCES,RANKING_CACHE_MS
} from './research-public-ranking-discovery.mjs';
import {assertResearch} from './research-market-publisher.mjs';

const at='2026-11-20T12:30:00.000Z';
const a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),sol='9'.repeat(44);
const html=links=>'<html>'+links.map(l=>'<a href="'+l+'">Untrusted title</a>').join('')+'</html>';
test('V6.4 extracts precise chain/contract from live-style ranking links, never a guessed pool',()=>{
 const rows=parseRankingPage(html([
  '/x/bsc/'+a+'/',
  '/x/bsc/'+a+'/',
  'https://sasapad.fun/x/bsc/'+b+'/',
  'https://evil.example/x/bsc/'+a+'/',
  '/x/eth/'+a+'/',
  '/x/bsc/NOT_A_CONTRACT/'
 ]),{chain:'bsc',source:'BSC_NEW',observed_at_utc:at});
 assert.equal(rows.length,2);
 assert.equal(rows[0].token_address,a);
 assert.equal(rows[0].pool_address,null);
 assert.equal(rows[0].candidate_id,null);
 assert.equal(rows[0].paper_entry_authorized,false);
 assert.equal(rows[0].trade_safety_verified,false);
 assert.equal(rows[0].observed_at_utc,at);
 assert(!JSON.stringify(rows).includes('Untrusted title'));
});
test('V6.4 different contracts with same displayed name remain distinct, never trade approved',()=>{
 const x=parseRankingPage(html(['/x/solana/'+sol+'/']),
  {chain:'solana',source:'SOLANA_NEW',observed_at_utc:at});
 const y=parseRankingPage(html(['/x/bsc/'+a+'/']),
  {chain:'bsc',source:'BSC_NEW',observed_at_utc:at});
 assert.equal(x.length,1);assert.equal(y.length,1);
 assert.equal(x[0].source,'SASA_PUBLIC_RANKING_RESEARCH');
 assert.equal(y[0].chain,'bsc');
 assert.notEqual(x[0].token_address,y[0].token_address);
});
test('V6.4 neutral discovery fetches fixed URLs and supports unsupported chains as research only',async()=>{
 let requests=0;
 const fetcher=async(url,opts)=>{
  requests++;
  assert(RANKING_SOURCES.some(s=>s.url===url));
  assert.equal(opts.redirect,'error');
  const source=RANKING_SOURCES.find(s=>s.url===url);
  const token=source.chain==='solana'?sol:a;
  return {ok:true,text:async()=>html(['/x/'+source.chain+'/'+token+'/']),
   headers:{get:()=>null}};
 };
 const x=await collectPublicRankingResearch({now:at,fetcher});
 assert.equal(requests,8);
 assert.equal(x.coverage.length,8);
 assert.equal(x.leads.length,6,'duplicate token links across NEW and GAINERS pages deduplicate by chain/address');
 assert(x.leads.some(l=>l.chain==='robinhood'));
 assert(x.leads.some(l=>l.chain==='arc'));
 assert(x.leads.every(l=>l.actionable===false&&l.pool_address===null));
 assert(x.leads.every(l=>l.observed_at_utc===at));
 assertResearch({schema:'research_market_snapshot.v1',
  paper_only:true,actionable:false,published_at_utc:at,candidates:[],
  ranking_leads:x.leads,ranking_coverage:x.coverage});
});
test('V6.4 provider outage remains visible, does not masquerade as empty market',async()=>{
 const x=await collectPublicRankingResearch({now:at,fetcher:async()=>({ok:false,status:429})});
 assert.equal(x.leads.length,0);
 assert.equal(x.coverage.length,8);
 assert(x.coverage.every(c=>c.status==='SOURCE_UNAVAILABLE'));
 assert(x.coverage.every(c=>c.reason_code==='HTTP_429'));
});
test('V6.4 30 minute cache preserves original observation time and avoids excess requests',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'r29-v64-rank-'));
 const file=path.join(dir,'rankings.json');
 let calls=0;
 const fetcher=async(url)=>{
  calls++;
  const source=RANKING_SOURCES.find(s=>s.url===url);
  const token=source.chain==='solana'?sol:a;
  return {ok:true,text:async()=>html(['/x/'+source.chain+'/'+token+'/']),headers:{get:()=>null}};
 };
 try{
  const first=await updateLocalRankingResearch({filename:file,fetcher,now:at});
  const later=new Date(Date.parse(at)+RANKING_CACHE_MS-1000).toISOString();
  const second=await updateLocalRankingResearch({filename:file,fetcher,now:later});
  assert.equal(calls,8);
  assert.equal(second.cached,true);
  assert.equal(first.checked_at_utc,second.checked_at_utc);
  assert.deepEqual(first.leads,second.leads);
  const third=await updateLocalRankingResearch({
   filename:file,fetcher,now:new Date(Date.parse(at)+RANKING_CACHE_MS).toISOString()});
  assert.equal(calls,16);
  assert.equal(third.cached,false);
  assert.notEqual(third.checked_at_utc,first.checked_at_utc);
 }finally{await rm(dir,{force:true,recursive:true})}
});
test('V6.4 requires a valid source and rejects oversized or wrong-chain HTML',()=>{
 assert.throws(()=>parseRankingPage('x'.repeat(300001),{chain:'bsc',source:'BSC_NEW',observed_at_utc:at}));
 assert.deepEqual(parseRankingPage(html(['/x/bsc/'+a+'/']),{
  chain:'solana',source:'SOLANA_NEW',observed_at_utc:at}),[]);
});
