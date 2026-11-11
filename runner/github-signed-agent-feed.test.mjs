import test from 'node:test';
import assert from 'node:assert/strict';
import {ORDER_FEED_URL,fetchSignedPaperOrderFeed,pollSignedPaperOrderFeed} from './github-signed-agent-feed.mjs';
const now=Date.parse('2026-11-11T10:00:00Z');
const make=(signals=[],other={})=>({schema:'sniper_signed_paper_signal_feed.v1',
 published_at_utc:new Date(now-2000).toISOString(),signals,...other});
function transport(feed){
 return async(url,options)=>{
  assert.equal(url,ORDER_FEED_URL);
  assert.equal(options.redirect,'error');
  assert.equal(options.method,'GET');
  return new Response(JSON.stringify(feed),{status:200});
 };
}
test('empty cloud courier does NOT invent any real Dot or Paper execution',async()=>{
 let received=0;
 const r=await pollSignedPaperOrderFeed({fetcher:transport(make()),now,
  consume:async()=>{received++}});
 assert.equal(r.received,0);
 assert.equal(r.authenticated_by_transport,false);
 assert.equal(received,0);
});
test('GitHub is untrusted transport only: still delegates every signed command to local consumer',async()=>{
 const a={signal_id:'sig_'+'a'.repeat(32),untrusted_claim:'BUY'};
 const b={signal_id:'sig_'+'b'.repeat(32),untrusted_claim:'SELL'};
 const calls=[];
 const result=await pollSignedPaperOrderFeed({
  fetcher:transport(make([a,b])),now,
  consume:async cmd=>{calls.push(cmd.signal_id);return {status:'REJECTED_UNSIGNED'}}});
 assert.deepEqual(calls,[a.signal_id,b.signal_id]);
 assert.equal(result.received,2);
 assert(result.receipts.every(x=>x.status==='REJECTED_UNSIGNED'));
 assert.equal(result.authenticated_by_transport,false);
});
test('stale, duplicated, oversized, malformed and unexpected feeds fail closed',async()=>{
 const cases=[
  make([],{published_at_utc:new Date(now-300001).toISOString()}),
  make([{signal_id:'abc'},{signal_id:'abc'}]),
  make([],{schema:'different'}),
  make([],{extra:'unexpected'}),
  make(Array.from({length:9},(_,i)=>({signal_id:String(i)})))
 ];
 for(const feed of cases)await assert.rejects(
  fetchSignedPaperOrderFeed({fetcher:transport(feed),now}));
 const tooLarge=async()=>new Response('z'.repeat(65537),{status:200});
 await assert.rejects(fetchSignedPaperOrderFeed({fetcher:tooLarge,now}),/TOO_LARGE/);
 const missing=async()=>new Response('{}',{status:404});
 await assert.rejects(fetchSignedPaperOrderFeed({fetcher:missing,now}),/NOT_AVAILABLE/);
});
