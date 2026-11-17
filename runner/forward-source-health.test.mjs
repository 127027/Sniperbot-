import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {summarizeForwardSourceHealth,syncPublicForwardSourceHealth,
 PUBLIC_SOURCE_HEALTH_PATH} from './forward-source-health.mjs';

const now=Date.parse('2026-11-17T18:00:00.000Z');
const at=mins=>new Date(now-mins*60000).toISOString();
const collector={
 schema:'research_market_collector_status.v1',
 paper_only:true,actionable:false,collection_status:'OBSERVED_OR_PARTIAL',
 status:'RUNNING_RESEARCH',last_check_at_utc:at(2),
 candidate_count:42,coverage:[],publishing_enabled:true,
 publish_error:null,secret_token:'github_pat_PRIVATE_SHOULD_NEVER_LEAK',
 local_wallet:'PRIVATE_WALLET_SHOULD_NOT_PUBLISH',cashUsdc:4999
};
const stream={
 schema:'sniper_r29_solana_live_stream_status.v1',
 paper_only:true,actionable:false,status:'CONNECTED_FREE_ONLY',
 connected:true,last_connected_at_utc:at(45),
 last_event_received_at_utc:at(5),recorded_launch_events:17,
 total_paid_subscriptions:0,secret:'PRIVATE_123'
};
const remote={
 schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
 published_at_utc:at(20),candidates:[{dangerous_private:'NEVER_PUBLIC'}]
};
const fakeToken='github_pat_FAKE_TEST_TOKEN_123456789012345';
test('correctly distinguishes live laptop Paper bot from stale public market source',()=>{
 const actual=summarizeForwardSourceHealth({now,marketStatus:collector,
  streamStatus:stream,remoteMarket:{...remote,published_at_utc:at(2)},
  remoteMarketAccess:'OK'});
 assert.equal(actual.market_source_status,'RESEARCH_FEED_RECENT');
 assert.equal(actual.solana_stream_status,'SOLANA_STREAM_PROVIDER_CONNECTED_UNVERIFIED');
 const stale=summarizeForwardSourceHealth({now,marketStatus:collector,
  streamStatus:stream,remoteMarket:{...remote,published_at_utc:at(1100)},
  remoteMarketAccess:'OK'});
 assert.equal(stale.market_source_status,'PUBLIC_MARKET_FEED_STALE');
 assert.equal(stale.public_market_recent,false);
 assert.equal(stale.actual_gpt_model_scans_verified,false);
 assert.equal(stale.actual_paper_fills_verified,false);
 assert.equal(stale.recommendation,'DO_NOT_BUY_ON_SOURCE_STATUS_ALONE');
 const encoded=JSON.stringify(stale);
 for(const unsafe of ['PRIVATE_WALLET','PRIVATE_123','4999',
  'secret_token','cashUsdc','NEVER_PUBLIC','github_pat_'])
  assert(!encoded.includes(unsafe));
});
test('source statuses do not claim full coverage, provider transactions or fresh data from missing files',()=>{
 const absent=summarizeForwardSourceHealth({now,remoteMarketAccess:'UNAVAILABLE'});
 assert.equal(absent.market_source_status,'LOCAL_COLLECTOR_STATUS_MISSING_OR_INVALID');
 assert.equal(absent.solana_stream_status,'SOLANA_STREAM_STATUS_MISSING_OR_INVALID');
 assert.equal(absent.public_market_recent,false);
 assert.equal(absent.source_complete,false);
 const noPublish=summarizeForwardSourceHealth({now,
  marketStatus:{...collector,publishing_enabled:false},remoteMarket});
 assert.equal(noPublish.market_source_status,'LOCAL_GITHUB_MARKET_PUBLISH_DISABLED');
 const blocked=summarizeForwardSourceHealth({now,
  marketStatus:{...collector,status:'BLOCKED_RESEARCH_DATA_ACCESS'},remoteMarket});
 assert.equal(blocked.market_source_status,'LOCAL_RESEARCH_SOURCE_BLOCKED');
 const late=summarizeForwardSourceHealth({now,
  marketStatus:{...collector,last_check_at_utc:at(15)},remoteMarket});
 assert.equal(late.market_source_status,'LOCAL_COLLECTOR_STALE');
});
test('GitHub courier publishes source freshness only, no secrets and no buys; duplicate is throttled',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'r29-health-'));
 try{
  const marketFile=path.join(dir,'market.json'),streamFile=path.join(dir,'stream.json');
  await writeFile(marketFile,JSON.stringify(collector));
  await writeFile(streamFile,JSON.stringify(stream));
  const calls=[],urlPrefix='https://api.github.com/repos/127027/Sniperbot-/contents/';
  let saved=null;
  const fetcher=async(url,req)=>{
   calls.push({url,method:req.method});
   assert(url.startsWith(urlPrefix));
   if(url.includes('research/market/latest.json?ref=')){
    return {ok:true,status:200,json:async()=>({
     type:'file',sha:'a'.repeat(40),encoding:'base64',
     content:Buffer.from(JSON.stringify(remote)).toString('base64')})};
   }
   assert(url.includes(PUBLIC_SOURCE_HEALTH_PATH));
   if(req.method==='GET')return saved?{
     ok:true,status:200,json:async()=>({
      type:'file',sha:'b'.repeat(40),encoding:'base64',
      content:Buffer.from(JSON.stringify(saved)).toString('base64')})
   }:{ok:false,status:404};
   assert.equal(req.method,'PUT');
   saved=JSON.parse(Buffer.from(JSON.parse(req.body).content,'base64').toString('utf8'));
   return {ok:true,status:201,json:async()=>({commit:{sha:'c'.repeat(40)}})};
  };
  const first=await syncPublicForwardSourceHealth({
   token:fakeToken,marketFile,streamFile,now,fetcher});
  assert.equal(first.published,true);
  assert.equal(first.public.market_source_status,'RESEARCH_FEED_RECENT');
  assert.equal(saved.account_balance_or_private_wallet_published,false);
  assert.equal(calls.filter(x=>x.method==='PUT').length,1);
  assert(!JSON.stringify(saved).includes('4999'));
  assert(!JSON.stringify(saved).includes('PRIVATE_WALLET'));
  const repeat=await syncPublicForwardSourceHealth({
   token:fakeToken,marketFile,streamFile,now:now+60_000,fetcher});
  assert.equal(repeat.published,false);
  assert.equal(calls.filter(x=>x.method==='PUT').length,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('no GitHub token means no public data access or information leaks',async()=>{
 await assert.rejects(syncPublicForwardSourceHealth({
  token:'',now,fetcher:async()=>{throw Error('fetch must not occur')}
 }),/SOURCE_HEALTH_AUTH_REQUIRED/);
});
