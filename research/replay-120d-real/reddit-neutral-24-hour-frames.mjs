// R29 neutral public social historical day-frames. First day pilot only;
// no winner-name queries, no current likes/comments, no claims of full coverage.
// Feed only as-of archived content into an ISOLATED future model invocation.
import {createHash} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
export const DAY='2026-09-18';
const SUBS=['CryptoMoonShots','memecoins','solana'];
const BASE='https://arctic-shift.photon-reddit.com/api/posts/search';
const sha=x=>createHash('sha256').update(x).digest('hex');
const ms=x=>{
 if(typeof x==='number'&&Number.isFinite(x)&&x>0)return x>1e12?x:x*1000;
 if(typeof x==='string'&&Number.isFinite(Date.parse(x)))return Date.parse(x);
 return NaN;
};
const valid=(x,reason)=>{if(!x)throw Error(reason)};
export function archiveDayFrames({day_utc,from_sources}){
 valid(day_utc===DAY&&Array.isArray(from_sources)&&from_sources.length<=3,
 'UNAPPROVED_SOCIAL_DAY');
 const start=Date.parse(day_utc+'T00:00:00Z'),end=start+86400000;
 const posts=[],seen=new Set(),missing=[];
 for(const s of from_sources){
  if(s?.status!=='OK'){missing.push(s?.subreddit||'unknown');continue;}
  valid(SUBS.includes(s.subreddit)&&Array.isArray(s.posts)&&
   /^[a-f0-9]{64}$/.test(s.source_sha256),'INVALID_SOCIAL_SOURCE_MANIFEST');
  for(const p of s.posts){
   const created=ms(p.created_utc),captured=ms(p.retrieved_on),
     edited=p.edited===false||p.edited===null||p.edited===undefined?null:ms(p.edited);
   if(!Number.isFinite(created)||created<start||created>=end||
      !Number.isFinite(captured)||captured<created||captured>=end){
    missing.push('UNVERIFIED_ARCHIVE_TIME');continue;
   }
   // If recorded content was later edited, our archive may now contain a
   // modified version. Reject rather than allow hindsight into the model.
   if(p.edited!==false&&p.edited!==null&&p.edited!==undefined&&
      (!Number.isFinite(edited)||edited>captured)){
    missing.push('EDITED_CONTENT_NOT_PROVEN_ORIGINAL');continue;
   }
   const id=String(p.id||'');
   if(!/^[a-z0-9]{4,12}$/.test(id)||seen.has(id)){missing.push('UNTRUSTED_OR_DUPLICATE_POST');continue;}
   seen.add(id);
   if(p.edited===undefined)missing.push('POST_CONTENT_EDIT_HISTORY_UNATTESTED');
   const title=String(p.title||'').replace(/\s+/g,' ').slice(0,140);
   const body=String(p.selftext||'').replace(/\s+/g,' ').slice(0,160);
   posts.push({item_id:id,channel:'community',source_id:'arctic-shift:'+s.subreddit,
    source_sha256:s.source_sha256,
    url:'https://www.reddit.com/r/'+s.subreddit+'/comments/'+id+'/',
    published_at_utc:new Date(created).toISOString(),
    archived_at_utc:new Date(captured).toISOString(),
    observed_at_utc:new Date(captured).toISOString(),
    edited_at_utc:edited===null?null:new Date(edited).toISOString(),
    title,body_excerpt:body,source_archival_method:'ARCTIC_SHIFT_RETRIEVED_ON_CONTENT_EDIT_HISTORY_UNATTESTED',
    // No score, comments, later edited title nor winner/pump rank.
   });
  }
 }
 posts.sort((a,b)=>a.archived_at_utc.localeCompare(b.archived_at_utc)||
  a.item_id.localeCompare(b.item_id));
 const frames=Array.from({length:24},(_,i)=>{
  const asof=new Date(start+(i+1)*3600000).toISOString();
  return {virtual_asof_utc:asof,
   available_archived_posts:posts.filter(x=>x.archived_at_utc<=asof&&x.published_at_utc<=asof),
   complete_community_census_proven:false,
   model_calls_historically_made:0,
   original_source_collected_after_historic_date:true,
   no_future_engagement_score_or_outcome_labels:true};
 });
 return {schema:'r29_neutral_reddit_24h_asof_social_frames.v1',
  day_utc,communities:SUBS,
  archived_posts_usable_by_day_end:posts.length,
  original_capture_time_not_later_global_score:true,
  not_all_social_media:true,
  source_or_record_gaps:missing,
  frames,original_historic_gpt_model_calls:0,
  model_buy_sell_fills:0,realized_pnl_test_usdc:null};
}
export async function collectDayFrames({fetcher=fetch}={}){
 const sources=[];
 for(const sub of SUBS){
  const url=new URL(BASE);
  Object.entries({subreddit:sub,after:DAY,before:'2026-09-19',
   sort:'asc',limit:'100',
   fields:'id,created_utc,retrieved_on,subreddit,title,selftext'}).forEach(([k,v])=>
   url.searchParams.set(k,v));
  try{
   const response=await fetcher(url.toString(),{
    signal:AbortSignal.timeout(15000),redirect:'error',headers:{accept:'application/json'}});
   if(!response.ok)throw Error('ARCTIC_HTTP_'+response.status);
   const raw=await response.text();
   if(raw.length>2_000_000)throw Error('ARCTIC_OVERSIZE');
   const v=JSON.parse(raw);
   valid(Array.isArray(v.data)&&v.data.length<=100,'ARCTIC_SCHEMA_CHANGED');
   if(v.data.some(p=>p?.subreddit?.toLowerCase()!==sub.toLowerCase()))
    throw Error('WRONG_COMMUNITY_RETURNED');
   sources.push({status:'OK',subreddit:sub,source_sha256:sha(raw),posts:v.data});
  }catch(e){sources.push({status:'UNAVAILABLE',subreddit:sub,reason:String(e.message||e).slice(0,70)});}
 }
 const result=archiveDayFrames({day_utc:DAY,from_sources:sources});
 return {...result,source_fetch_diagnostics:sources.map(s=>({subreddit:s.subreddit,status:s.status,reason:s.reason||null,received_posts:s.posts?.length||0}))};
}
if(process.argv[1]?.endsWith('reddit-neutral-24-hour-frames.mjs')){
 try{
  const result=await collectDayFrames();
  const path=resolve(process.argv[2]||'research/replay-120d-real/generated/reddit-2026-09-18-hourly-sources.json');
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify(result,null,2)+'\n');
  console.log('R29_REDDIT_NEUTRAL_DAYFRAMES',JSON.stringify({
   day:result.day_utc,hourly_frames:result.frames.length,
   posts:result.archived_posts_usable_by_day_end,
   gaps:result.source_or_record_gaps.length,
   source_diagnostics:result.source_fetch_diagnostics,
   first_hour_posts:result.frames[0].available_archived_posts.length,
   first_half_day_posts:result.frames[11].available_archived_posts.length,
   no_trades:true}));
 }catch(e){console.error('R29_REDDIT_FRAMES_ERROR',String(e.message||e));process.exitCode=1;}
}
