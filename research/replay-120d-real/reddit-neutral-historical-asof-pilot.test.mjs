import test from 'node:test';
import assert from 'node:assert/strict';
import {auditNeutralRedditPosts,probeNeutralReddit} from './reddit-neutral-historical-asof-pilot.mjs';
const sec=x=>Date.parse(x)/1000;
const row=(id,created,retrieved)=>({id,created_utc:sec(created),retrieved_on:sec(retrieved),
 subreddit:'CryptoMoonShots',title:'This is test content, never forward to GPT',score:999999});
test('a post is only available after archived capture, later scores are never used',()=>{
 const r=auditNeutralRedditPosts({data:[row('a','2026-09-18T12:00:00Z','2026-09-18T12:01:00Z')]},
  {subreddit:'CryptoMoonShots'});
 assert.equal(r.posts_archive_seen_by_day_end,1);
 assert.equal(r.posts_with_non_asof_engagement_fields_suppressed,1);
 assert.equal(r.post_titles_and_token_names_exported,false);
 assert.equal(JSON.stringify(r).includes('test content'),false);
});
test('later archive capture does NOT become 2026-09-18 source',()=>{
 const r=auditNeutralRedditPosts({data:[row('b','2026-09-18T22:00:00Z','2026-11-17T00:00:00Z')]},
 {subreddit:'CryptoMoonShots'});
 assert.equal(r.posts_archive_seen_by_day_end,0);
 assert.equal(r.posts_archive_seen_only_later,1);
});
test('source title and future engagement never become historic model evidence',()=>{
 const r=auditNeutralRedditPosts({data:[{
 id:'c',subreddit:'CryptoMoonShots',created_utc:sec('2026-09-18T01:00:00Z'),
 retrieved_on:null,score:100000,title:'POSTHOC_WILL_NOT_LEAK'}]},
 {subreddit:'CryptoMoonShots'});
 assert.equal(r.posts_archive_time_missing,1);
 assert.equal(JSON.stringify(r).includes('POSTHOC_WILL_NOT_LEAK'),false);
});
test('wrong day, wrong community and duplicate ID fail closed',()=>{
 assert.throws(()=>auditNeutralRedditPosts({data:[row('x','2026-11-18T00:00:00Z','2026-11-18T00:00:01Z')]},
 {subreddit:'CryptoMoonShots'}),/DATE_RANGE/);
 assert.throws(()=>auditNeutralRedditPosts({data:[{...row('a','2026-09-18T01:00:00Z','2026-09-18T01:01:00Z'),subreddit:'solana'}]},
 {subreddit:'CryptoMoonShots'}),/WRONG_COMMUNITY/);
 assert.throws(()=>auditNeutralRedditPosts({data:[row('a','2026-09-18T01:00:00Z','2026-09-18T01:01:00Z'),row('a','2026-09-18T02:00:00Z','2026-09-18T02:01:00Z')]},
 {subreddit:'CryptoMoonShots'}),/DUPLICATE/);
});
test('three source-neutral subreddits, not coin keyword search, and no credentials',async()=>{
 const seen=[];
 const sample={data:[{id:'t',created_utc:sec('2026-09-18T01:00:00Z'),retrieved_on:sec('2026-09-18T01:05:00Z')}]};
 const x=await probeNeutralReddit({fetcher:async url=>{
  const u=new URL(url);seen.push(u);
  const row={...sample.data[0],subreddit:u.searchParams.get('subreddit')};
  return {ok:true,text:async()=>JSON.stringify({data:[row]})};
 }});
 assert.equal(seen.length,3);
 assert.ok(seen.every(x=>x.searchParams.get('query')===null&&x.searchParams.get('title')===null));
 assert.equal(x.no_user_winner_shortlist_used,true);
 assert.equal(x.historical_social_60d_completeness_proven,false);
});
