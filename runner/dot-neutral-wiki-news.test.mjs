import test from 'node:test';
import assert from 'node:assert/strict';
import {newsPageTitle,wikiSourceQuery,parseAsOfRevision,
  fetchNewsAsOf,collectNeutralNews} from './dot-neutral-wiki-news.mjs';
// Synthetic revision content only; no 2024 media article, meme, coin, or trading label.
const response=(day,stamp='2024-09-10T21:46:00Z',id=1234567)=>({
 query:{pages:[{title:newsPageTitle(day),
 revisions:[{revid:id,timestamp:stamp,slots:{main:{content:'Synthetic neutral news digest for offline unit test. No financial information.'}}}]}]}
});
test('Wikipedia historical title and revision query are deterministic for the first virtual day',()=>{
 assert.equal(newsPageTitle('2024-09-10'),'Portal:Current_events/2024_September_10');
 const q=wikiSourceQuery('2024-09-10');
 const url=new URL(q.url);
 assert.equal(url.searchParams.get('rvstart'),'2024-09-10T23:59:59Z');
 assert.equal(url.searchParams.get('rvdir'),'older');
 assert.equal(url.searchParams.get('rvslots'),'main');
});
test('immutable revision metadata is marked SECONDARY, never as original meme discovery or trade',()=>{
 const s=parseAsOfRevision('2024-09-10',response('2024-09-10'));
 assert.equal(s.revision_timestamp_utc,'2024-09-10T21:46:00Z');
 assert.equal(s.state,'VERIFIED_REVISION_METADATA_AWAITING_INDEPENDENT_CONTENT_READBACK');
 assert.equal(s.source_kind,'SECONDARY_EDITORIAL_NEWS_ASOF_REVISION');
 assert.equal(s.original_crypto_buy_signals,0);
 assert.equal(s.bot_handoff,false);
 assert.equal(s.permanent_url,'https://en.wikipedia.org/w/index.php?oldid=1234567');
 assert.match(s.content_sha256,/^[a-f0-9]{64}$/);
});
test('following-day edits cannot leak into earlier virtual day',()=>{
 assert.throws(()=>parseAsOfRevision('2024-09-10',
  response('2024-09-10','2024-09-11T00:01:00Z')), /INVALID_OR_FUTURE_REVISION/);
});
test('missing original-time revision reports unavailable rather than fabricating news',()=>{
 const r=parseAsOfRevision('2024-09-10',{query:{pages:[{title:'x',missing:true}]}});
 assert.equal(r.state,'UNAVAILABLE_ASOF');
 assert.equal(r.revision_id,undefined);
});
test('network fetch only called by explicit consumer and API failures fail closed',async()=>{
 let called=0;
 const ok=async url=>{called++;const u=new URL(url);assert.equal(u.hostname,'en.wikipedia.org');
  return {ok:true,status:200,json:async()=>response('2024-09-10')}};
 const x=await fetchNewsAsOf('2024-09-10',{fetchImpl:ok});
 assert.equal(x.revision_id,1234567);assert.equal(called,1);
 await assert.rejects(()=>fetchNewsAsOf('2024-09-10',{fetchImpl:async()=>({ok:false,status:429})}),/NEWS_ARCHIVE_HTTP_429/);
});
test('two daily packets do not copy prior-day facts as freshly discovered news',async()=>{
 const calls=[];
 const f=async url=>{const date=new URL(url).searchParams.get('rvstart').slice(0,10);
  calls.push(date);
  return {ok:true,json:async()=>response(date,date+'T21:46:00Z',date==='2024-09-10'?10001:10002)}};
 const r=await collectNeutralNews('2024-09-10','2024-09-11',{fetchImpl:f});
 assert.deepEqual(calls,['2024-09-10','2024-09-11']);
 assert.equal(r.day_count,2);assert.equal(r.day_source_count,2);
 assert.equal(r.snapshots[0].day_utc,'2024-09-10');
 assert.equal(r.snapshots[1].day_utc,'2024-09-11');
 assert.equal(r.historical_onchain_coverage_verified,false);
 assert.equal(r.winners_preselected,false);
});
test('partial archive API outages are counted and never promoted to zero-events-day',async()=>{
 let n=0;
 const result=await collectNeutralNews('2024-09-10','2024-09-11',{fetchImpl:async()=>{
   n++;if(n===1)throw Error('sample API outage');
   return {ok:true,json:async()=>response('2024-09-11','2024-09-11T21:46:00Z')} }});
 assert.equal(result.day_count,2);
 assert.equal(result.errors.length,1);
 assert.equal(result.day_source_count,1);
});
test('61-day training window is supported but no populated day is falsely reported when all unavailable',async()=>{
 const empty=async()=>({ok:true,json:async()=>({query:{pages:[{missing:true}]}})});
 const r=await collectNeutralNews('2024-09-10','2024-11-09',{fetchImpl:empty});
 assert.equal(r.day_count,61);
 assert.equal(r.day_source_count,0);
 assert.equal(r.snapshots.every(s=>s.state==='UNAVAILABLE_ASOF'),true);
});
