// Persistent, local-only first-seen news capture ledger (not a trade channel).
// Repeated news reports retain their first locally captured publication snapshot.
// Future historical replays can use these evidence files; a cached RSS date is
// not independently archived social truth, and this does not verify news claims.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {collectResearchNews} from './research-news-rss.mjs';
import {archiveNewsEvent} from './research-news-archive.mjs';

const INTERVAL_MS=15*60000,RETENTION_MS=45*86400000,MAX_BYTES=2_000_000;
const nowMs=s=>Date.parse(s);
const fresh=()=>({schema:'research_news_journal.v1',paper_only:true,actionable:false,
 last_check_at_utc:null,last_coverage:[],events:[]});
function validJournal(v){
 return v?.schema==='research_news_journal.v1'&&v.paper_only===true&&
    v.actionable===false&&Array.isArray(v.events)&&v.events.length<=1000&&
    Array.isArray(v.last_coverage);
}
export async function updateLocalNewsJournal({filename,fetcher=fetch,now=new Date().toISOString()}={}){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!Number.isFinite(nowMs(now)))
  throw Error('INVALID_NEWS_JOURNAL_CONFIG');
 let state=fresh();
 try{
  const bytes=await readFile(filename);
  if(bytes.length>MAX_BYTES)throw Error('NEWS_JOURNAL_TOO_LARGE');
  state=JSON.parse(bytes.toString('utf8'));
 }catch(e){if(e?.code!=='ENOENT')throw e}
 if(!validJournal(state))throw Error('INVALID_EXISTING_NEWS_JOURNAL');
 // Migrate every older hot-journal event to durable storage before any trimming.
 // Archive failure aborts without changing or silently discarding the journal.
 for(const e of state.events)await archiveNewsEvent(filename,e);
 const due=!state.last_check_at_utc||
  nowMs(now)-nowMs(state.last_check_at_utc)>=INTERVAL_MS;
 let newCount=0;
 if(due){
  const capture=await collectResearchNews({fetcher,now});
  const ids=new Set(state.events.map(e=>e.event_id));
  for(const e of capture.leads){
   if(e.paper_only!==true||e.actionable!==false||e.candidate_id!==null)continue;
   if(!ids.has(e.event_id)){
    const archived=await archiveNewsEvent(filename,e);
    // Already-archived URLs retain their ORIGINAL first-seen UTC and are not
    // resurrected with a later RSS observation after leaving the hot cache.
    if(archived.created){state.events.push(archived.event);newCount++}
    ids.add(e.event_id);
   }
  }
  state.last_check_at_utc=now;
  state.last_coverage=capture.coverage;
 }
 // Retention applies ONLY to the bounded recent-news cache. Immutable monthly
 // shards remain available for future time-correct historical research.
 const before=state.events.length,cutoff=nowMs(now)-RETENTION_MS;
 state.events=state.events.filter(e=>e?.paper_only===true&&e.actionable===false&&
  Number.isFinite(nowMs(e.first_observed_at_utc))&&
  nowMs(e.first_observed_at_utc)>=cutoff&&nowMs(e.first_observed_at_utc)<=nowMs(now))
  .slice(-1000);
 if(due||before!==state.events.length){
  const json=JSON.stringify(state);
  if(Buffer.byteLength(json)>MAX_BYTES)throw Error('NEWS_JOURNAL_TOO_LARGE');
  await mkdir(path.dirname(filename),{recursive:true});
  const temp=filename+'.tmp-'+process.pid;
  await writeFile(temp,json+'\n','utf8');
  await rename(temp,filename);
 }
 // Rolling hour is for hourly research agents; every event retains first local
 // capture timestamp and original publisher date separately.
 const recent=state.events.filter(e=>nowMs(now)-nowMs(e.first_observed_at_utc)<=3600000)
  .slice(-16);
 return {schema:'research_news_bridge.v1',paper_only:true,actionable:false,
  checked_at_utc:state.last_check_at_utc,fetch_performed:due,new_saved_events:newCount,
  stored_events:state.events.length,archive_mode:'IMMUTABLE_MONTHLY_LOCAL',
  leads:recent,coverage:state.last_coverage,
  warning:'RSS headlines captured prospectively, not independently verified token IDs or original social posts. Never execute trades.'};
}
