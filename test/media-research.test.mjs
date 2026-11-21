import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMediaSource,mergeMediaMemory,emptyMediaMemory,mediaAsOfSignals,
 matchMediaPoolHypotheses} from '../src/media-research.mjs';
const t='2026-11-21T21:00:00Z';
const rss='<rss><channel><item><title><![CDATA[Trump discusses DOGE meme token]]></title>'
 +'<link>https://news.example/post1</link><pubDate>Sat, 21 Nov 2026 20:20:00 GMT</pubDate></item>'
 +'<item><title>PEPE tomorrow</title><link>https://news.example/future</link>'
 +'<pubDate>Sun, 22 Nov 2026 00:00:00 GMT</pubDate></item></channel></rss>';
const source=()=>decodeMediaSource({source:'NEWS_TEST',sourceClass:'RSS_NEWS',kind:'RSS',body:rss,capturedAtUtc:t});
test('RSS source metadata: future publication cannot enter an as-of signal',()=>{
 const x=source();
 assert.equal(x.accepted,1);
 assert.equal(x.future_dated,1);
 assert.deepEqual(x.events[0].topics,['DOGE','TRUMP','MEMECOIN']);
 assert.equal(x.events[0].order_authorized,undefined);
});
test('two fetches of same headline add only one distinct observation',()=>{
 const e=source();
 const a=mergeMediaMemory(emptyMediaMemory(),{batchPath:'research/media/2026-11-21/1/evidence.json',
   capturedAtUtc:t,sources:[{source:'NEWS_TEST',status:'OK',http_status:200,events:e.events}]});
 const b=mergeMediaMemory(a.memory,{batchPath:'research/media/2026-11-21/2/evidence.json',
   capturedAtUtc:'2026-11-21T22:00:00Z',
   sources:[{source:'NEWS_TEST',status:'OK',http_status:200,events:e.events}]});
 assert.equal(a.added,1);assert.equal(b.added,0);assert.equal(b.repeated,1);
 const s=mediaAsOfSignals(b.memory,{asOfUtc:'2026-11-21T22:00:00Z'});
 assert.equal(s.topics.find(x=>x.topic==='DOGE').recent_distinct_observations,1);
 assert.equal(s.orders,0);
 assert.equal(s.comparison_window_qualified,false);
 assert.equal(s.topics.find(x=>x.topic==='DOGE').attention_delta_observed,null);
});
test('public Bluesky feed: use only topic-matched posts, not every account',()=>{
 const body=JSON.stringify({feed:[{post:{uri:'at://did:plc:abc/app.bsky.feed.post/xyz',
  author:{handle:'news.example'},record:{text:'dogecoin memecoin trending',createdAt:'2026-11-21T20:20:00Z'},
  likeCount:12,repostCount:4}},{post:{uri:'at://did:plc:def/app.bsky.feed.post/pqr',
  author:{handle:'user.example'},record:{text:'weather today',createdAt:'2026-11-21T20:30:00Z'}}}]});
 const b=decodeMediaSource({source:'BSKY',sourceClass:'BLUESKY_PUBLIC_FEED',kind:'BLUESKY_FEED',
 body,capturedAtUtc:t});
 assert.equal(b.events.length,1);
 assert.equal(b.events[0].engagement_snapshot.likes,12);
 assert.equal(b.events[0].buy_authorized,false);
});
test('no bare celebrity meme symbol may be treated as verified token contract',()=>{
 const s=mediaAsOfSignals(mergeMediaMemory(null,{batchPath:'research/media/2026-11-21/1/evidence.json',
  capturedAtUtc:t,sources:[{source:'NEWS_TEST',status:'OK',events:source().events}]}).memory,{asOfUtc:t});
 const p={kind:'R29_PERSISTENT_MARKET_MEMORY',pools:{x:{chain:'base',pool:'0x'+'b'.repeat(40),
 contract:'0x'+'a'.repeat(40),symbol:'DOGE'}}};
 assert.equal(matchMediaPoolHypotheses(s,p).number,0);
});
test('inaccessible X/Reddit sources are visibility gaps, never zero posts',()=>{
 const m=mergeMediaMemory(null,{batchPath:'research/media/2026-11-21/1/evidence.json',
 capturedAtUtc:t,sources:[{source:'X',url:'https://api.x.com',status:'NO_AUTHORIZED_FREE_ACCESS',events:[]},
 {source:'REDDIT',url:'https://www.reddit.com',status:'NO_AUTHORIZED_FREE_ACCESS',events:[]}]});
 assert.equal(m.memory.stats.unique_events,0);
 assert.equal(m.memory.source_status.X.status,'NO_AUTHORIZED_FREE_ACCESS');
 assert.equal(m.memory.stats.working_sources,0);
});
