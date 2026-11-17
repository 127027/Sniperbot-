// Research-only historical public Reddit archive provenance probe.
// Neutral communities, chronological posts, NO token-name queries or current scores.
// Reports counts/timing, NEVER forward current edited content as a historic GPT input.
import {createHash} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const API='https://arctic-shift.photon-reddit.com/api/posts/search';
const COMMUNITY=['CryptoMoonShots','memecoins','solana'];
const START='2026-09-18',STOP='2026-09-19';
const ts=x=>{
 if(typeof x==='number'&&Number.isFinite(x)&&x>0)return x>1e12?x:x*1000;
 if(typeof x==='string'&&Number.isFinite(Date.parse(x)))return Date.parse(x);
 return NaN;
};
const digest=x=>createHash('sha256').update(x).digest('hex');
export function auditNeutralRedditPosts(raw,{subreddit,requested_after=START,requested_before=STOP}={}){
 if(!raw||!Array.isArray(raw.data)||raw.data.length>1000)throw Error('ARCTIC_JSON_SCHEMA_INVALID');
 const a=Date.parse(requested_after+'T00:00:00Z');
 const b=Date.parse(requested_before+'T00:00:00Z');
 let created_in_range=0,original_archive_before_day_end=0,
   capture_missing=0,captured_after_day_end=0,late_metrics_unusable=0;
 const sample=[];const seen=new Set();
 for(const row of raw.data){
  if(!row||typeof row.id!=='string'||seen.has(row.id))throw Error('ARCTIC_INVALID_OR_DUPLICATE_ID');
  seen.add(row.id);
  const created=ts(row.created_utc),archived=ts(row.retrieved_on);
  if(!Number.isFinite(created)||created<a||created>=b)throw Error('ARCTIC_DATE_RANGE_OR_CREATED_INVALID');
  if(typeof row.subreddit==='string'&&row.subreddit.toLowerCase()!==subreddit.toLowerCase())
   throw Error('ARCTIC_WRONG_COMMUNITY');
  created_in_range++;
  if(Number.isFinite(archived)){
   if(archived<=b)original_archive_before_day_end++;
   else captured_after_day_end++;
  }else capture_missing++;
  // Later scores / comment totals are NOT as-of values; never export them.
  if('score' in row||'num_comments' in row)late_metrics_unusable++;
  sample.push({created_at_utc:new Date(created).toISOString(),
   original_archive_captured_at_utc:Number.isFinite(archived)?new Date(archived).toISOString():null,
   archive_at_or_before_day_end:Number.isFinite(archived)&&archived<=b});
 }
 return {subreddit,neutral_keywordless_retrieval:true,raw_returned_posts:raw.data.length,
  created_in_requested_day:created_in_range,
  posts_archive_seen_by_day_end:original_archive_before_day_end,
  posts_archive_time_missing:capture_missing,
  posts_archive_seen_only_later:captured_after_day_end,
  posts_with_non_asof_engagement_fields_suppressed:late_metrics_unusable,
  post_titles_and_token_names_exported:false,
  actual_model_social_research_scans:0,
  asof_snapshots_usable_only_after_original_retrieved_on:true,
  sample_timestamps_only:sample.slice(0,5)};
}
export async function probeNeutralReddit({fetcher=fetch}={}){
 const findings=[];
 for(const subreddit of COMMUNITY){
  const u=new URL(API);
  for(const [k,v] of Object.entries({subreddit,after:START,before:STOP,
   sort:'asc',limit:'50',fields:'id,created_utc,retrieved_on,subreddit,title,url'}))
   u.searchParams.set(k,v);
  try{
   const r=await fetcher(u.toString(),{headers:{accept:'application/json'},
    signal:AbortSignal.timeout(12000),redirect:'error'});
   if(!r.ok)throw Error('ARCTIC_HTTP_'+r.status);
   const raw=await r.text();
   if(raw.length>2_000_000)throw Error('ARCTIC_OVERSIZE');
   findings.push({...auditNeutralRedditPosts(JSON.parse(raw),{subreddit}),
    response_source_sha256:digest(raw),source_url:u.toString(),status:'OBSERVED_SAMPLE'});
  }catch(e){findings.push({subreddit,status:'SOURCE_UNAVAILABLE_OR_SCHEMA_GAP',
   error_code:String(e.message||e).slice(0,80),posts_inferred:0,
   source_is_not_assumed_complete:true});}
 }
 return {schema:'r29_reddit_neutral_historical_social_asof_pilot.v1',
  source:'ARCTIC_SHIFT_PUBLIC_ARCHIVE',days_examined:1,day_utc:START,
  communities_neutral_not_posthoc_selected:COMMUNITY,findings,
  no_user_winner_shortlist_used:true,
  historical_social_60d_completeness_proven:false,
  historical_gpt_trade_pnl_proven:false,
  warning:'The original archive retrieved_on timestamp is critical; created_utc alone does not prove content or engagement numbers were visible at GPT scan time.'};
}
if(process.argv[1]?.endsWith('reddit-neutral-historical-asof-pilot.mjs')){
 const result=await probeNeutralReddit();
 const out=resolve(process.argv[2]||'research/replay-120d-real/generated/reddit-neutral-one-day-asof-audit.json');
 mkdirSync(dirname(out),{recursive:true});
 writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 console.log('R29_REDDIT_ASOF_PILOT',JSON.stringify(result.findings.map(x=>({
  subreddit:x.subreddit,status:x.status,raw_posts:x.raw_returned_posts??null,
  before_day_end:x.posts_archive_seen_by_day_end??null,error:x.error_code??null
 }))));
}
