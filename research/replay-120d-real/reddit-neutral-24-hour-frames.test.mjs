import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveDayFrames,collectDayFrames} from './reddit-neutral-24-hour-frames.mjs';
const sha='a'.repeat(64);
const sec=x=>Date.parse(x)/1000;
const post=(id,created,retrieved,edited=false)=>({
 id,subreddit:'CryptoMoonShots',created_utc:sec(created),
 retrieved_on:sec(retrieved),edited,title:'New community coin mention',
 selftext:'On-chain evidence has to be confirmed',score:1200000,num_comments:45000
});
const src=posts=>[{status:'OK',subreddit:'CryptoMoonShots',source_sha256:sha,posts}];
test('hourly frames expose only posts actually captured before that hour',()=>{
 const r=archiveDayFrames({day_utc:'2026-09-18',from_sources:src([
 post('abcd1','2026-09-18T00:01:00Z','2026-09-18T00:02:00Z'),
 post('abcd2','2026-09-18T12:20:00Z','2026-09-18T13:01:00Z')
 ])});
 assert.equal(r.frames.length,24);
 assert.equal(r.frames[0].available_archived_posts.length,1);
 assert.equal(r.frames[11].available_archived_posts.length,1);
 assert.equal(r.frames[13].available_archived_posts.length,2);
 assert.equal(r.archived_posts_usable_by_day_end,2);
 assert.equal(r.realized_pnl_test_usdc,null);
 const text=JSON.stringify(r);
 assert.equal(text.includes('"score"'),false);
 assert.equal(text.includes('"num_comments"'),false);
});
test('future capture and unknown edit history are quarantined',()=>{
 const r=archiveDayFrames({day_utc:'2026-09-18',from_sources:src([
 post('abcde1','2026-09-18T13:00:00Z','2026-09-19T01:00:00Z'),
 post('abcde2','2026-09-18T13:00:00Z','2026-09-18T13:01:00Z',sec('2026-09-19T00:00:00Z'))
 ])});
 assert.equal(r.archived_posts_usable_by_day_end,0);
 assert.ok(r.source_or_record_gaps.includes('UNVERIFIED_ARCHIVE_TIME'));
 assert.ok(r.source_or_record_gaps.includes('EDITED_CONTENT_NOT_PROVEN_ORIGINAL'));
});
test('failed source cannot be interpreted as zero public conversations',()=>{
 const r=archiveDayFrames({day_utc:'2026-09-18',from_sources:[{status:'UNAVAILABLE',subreddit:'memecoins'}]});
 assert.equal(r.source_or_record_gaps[0],'memecoins');
 assert.equal(r.frames[0].complete_community_census_proven,false);
});
test('real API collector is unbiased by names and has three fixed communities',async()=>{
 const requests=[];
 const r=await collectDayFrames({fetcher:async url=>{
  const u=new URL(url);requests.push(u);
  return {ok:true,text:async()=>JSON.stringify({data:[]})};
 }});
 assert.equal(r.frames.length,24);
 assert.equal(requests.length,3);
 assert.ok(requests.every(u=>!u.searchParams.has('title')&&!u.searchParams.has('query')));
 assert.ok(requests.every(u=>u.searchParams.get('sort')==='asc'));
});
