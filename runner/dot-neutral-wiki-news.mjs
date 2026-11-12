// Offline/historical neutral news source intake; NOT a trading-bot adapter.
// Uses immutable dated Wikipedia revision histories, NOT today's edited page.
// Source is a *secondary* editorial digest. No crypto-winner seed/target labels.
// Node 20+; pass fetchImpl for testability; network requests only on explicit CLI invocation.
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const isDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const hash=s=>createHash('sha256').update(s).digest('hex');
const getDate=d=>new Date(d+'T00:00:00Z');
export function newsPageTitle(day){
 if(!isDay(day))throw Error('INVALID_DAY');
 const dt=getDate(day);
 return 'Portal:Current_events/'+day.slice(0,4)+'_'+dt.toLocaleString('en-US',{month:'long',timeZone:'UTC'})+'_'+dt.getUTCDate();
}
export function wikiSourceQuery(day){
 const title=newsPageTitle(day);
 const until=day+'T23:59:59Z';
 const url=new URL('https://en.wikipedia.org/w/api.php');
 for(const [key,value] of Object.entries({
  action:'query',format:'json',formatversion:'2',prop:'revisions',
  titles:title,rvlimit:'1',rvstart:until,rvdir:'older',
  rvslots:'main',rvprop:'ids|timestamp|content'
 }))url.searchParams.set(key,value);
 return {title,cutoff_utc:until,url:url.toString()};
}
export function parseAsOfRevision(day,json){
 const q=wikiSourceQuery(day),p=json?.query?.pages?.[0],rev=p?.revisions?.[0];
 if(!rev||p?.missing===true)return {day_utc:day,state:'UNAVAILABLE_ASOF',reason:'NO_2024_REVISION_BEFORE_DAILY_CUTOFF'};
 const utc=rev.timestamp,content=rev.slots?.main?.content;
 if(typeof utc!=='string'||!Number.isFinite(Date.parse(utc))||
  Date.parse(utc)>Date.parse(q.cutoff_utc)||!Number.isSafeInteger(rev.revid)||
  rev.revid<=0||typeof content!=='string'||content.length<25)
  throw Error('INVALID_OR_FUTURE_REVISION');
 return {
  schema:'sniper_neutral_historical_news_snapshot.v1',
  day_utc:day,source_kind:'SECONDARY_EDITORIAL_NEWS_ASOF_REVISION',
  classification:'ASOF_REVISION_NEWS_ONLY_NOT_ORIGINAL_SOCIAL_OR_TRADING_EVIDENCE',
  state:'VERIFIED_REVISION_METADATA_AWAITING_INDEPENDENT_CONTENT_READBACK',
  wikipedia_title:q.title,revision_id:rev.revid,
  revision_timestamp_utc:utc,asof_cutoff_utc:q.cutoff_utc,
  permanent_url:'https://en.wikipedia.org/w/index.php?oldid='+rev.revid,
  source_api_url:q.url,content_sha256:hash(content),
  revision_wikitext:content,original_crypto_buy_signals:0,
  contains_future_winner_labels:false,training_only:true,bot_handoff:false
 };
}
export async function fetchNewsAsOf(day,{fetchImpl=fetch}={}){
 const q=wikiSourceQuery(day);
 const response=await fetchImpl(q.url,{headers:{'Accept':'application/json',
    'User-Agent':'SniperHistoricalResearch/1.0 (GitHub: 127027/Sniperbot-; offline evaluation)'}});
 if(!response?.ok)throw Error('NEWS_ARCHIVE_HTTP_'+(response?.status??'UNKNOWN'));
 return parseAsOfRevision(day,await response.json());
}
export async function collectNeutralNews(start,end,{fetchImpl=fetch,onProgress=()=>{}}={}){
 if(!isDay(start)||!isDay(end)||end<start||
    (Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000>61)
  throw Error('INVALID_WINDOW');
 const results=[],errors=[];
 for(let ts=Date.parse(start+'T00:00:00Z');ts<=Date.parse(end+'T00:00:00Z');ts+=86400000){
  const day=new Date(ts).toISOString().slice(0,10);
  try{const src=await fetchNewsAsOf(day,{fetchImpl});results.push(src);
   onProgress({day,status:src.state,rev:src.revision_id||null});
  }catch(e){errors.push({day_utc:day,error:String(e)});onProgress({day,status:'ERROR'});}
 }
 return {schema:'sniper_neutral_news_archive_batch.v1',
  start_utc:start,end_utc:end,
  day_count:results.length+errors.length,
  day_source_count:results.filter(s=>s.revision_id).length,
  historical_social_coverage_verified:false,
  historical_onchain_coverage_verified:false,
  winners_preselected:false,
  actionable:false,bot_handoff:false,
  snapshots:results,errors};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const [start,end,output]=process.argv.slice(2);
 if(!start||!end||!output||!output.endsWith('.json'))throw Error('Usage: node runner/dot-neutral-wiki-news.mjs START_DATE END_DATE OUTPUT.json');
 const batch=await collectNeutralNews(start,end,{onProgress:x=>process.stderr.write(JSON.stringify(x)+'\n')});
 writeFileSync(output,JSON.stringify(batch,null,2)+'\n');
 process.stdout.write(JSON.stringify({output,day_count:batch.day_count,day_source_count:batch.day_source_count,errors:batch.errors.length})+'\n');
}
