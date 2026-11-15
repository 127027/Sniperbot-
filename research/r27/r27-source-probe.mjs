// R27 retrospective source availability probe. Public API, no credentials.
// Retrospective GDELT article metadata and modern OHLCV backfills are
// research leads only. Neither proves contemporary text nor launch universe.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const sha=s=>createHash('sha256').update(s).digest('hex');
const WIN_START=Date.parse('2026-10-30T00:00:00Z');
const WIN_END=Date.parse('2026-11-14T00:00:00Z');
const DAY=86400000;
const ALLOWED_CHAINS=new Set(['solana','eth','base','bsc']);
function safeUrl(s){
 try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=1000?u.href:null}
 catch{return null}
}
function toCompact(t){
 return new Date(t).toISOString().replace(/[-:T.Z]/g,'').slice(0,14);
}
function gdeltArticle(row){
 if(!row||typeof row!=='object')return null;
 const url=safeUrl(row.url||row.link);
 if(!url)return null;
 const title=typeof row.title==='string'?row.title.slice(0,210):null;
 // GDELT metadata is a 2026/modern indexed claim. Not independent proof
 // that identical source contents existed at the historical cutoff.
 return {source_url:url,headline:title,
  claimed_gdelt_seen_at:typeof row.seendate==='string'?row.seendate:null,
  domain:typeof row.domain==='string'?row.domain.slice(0,100):null,
  contemporaneous_archive_verified:false,actionable:false};
}
export async function probeR27Gdelt({
 fetcher=fetch,pace=async()=>{},maxWindows=5,now=new Date().toISOString()
}={}){
 if(!Number.isInteger(maxWindows)||maxWindows<1||maxWindows>5)
  throw Error('R27_GDELT_INVALID_WINDOW_COUNT');
 const results=[],leads=new Map();
 const time=Date.parse(now);
 for(let i=0;i<maxWindows;i++){
  const start=WIN_START+i*3*DAY,end=Math.min(WIN_END,start+3*DAY);
  if(start>=WIN_END)break;
  const query=new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  query.searchParams.set('query','(memecoin OR "meme coin" OR "token launch" OR "viral crypto")');
  query.searchParams.set('mode','ArtList');
  query.searchParams.set('format','json');
  query.searchParams.set('sort','DateAsc');
  query.searchParams.set('maxrecords','150');
  query.searchParams.set('startdatetime',toCompact(start));
  query.searchParams.set('enddatetime',toCompact(end-1000));
  const slot={window_start_utc:new Date(start).toISOString(),
   window_end_exclusive_utc:new Date(end).toISOString(),
   status:'NOT_CHECKED',articles_returned:0,source_coverage_complete:false,
   reconstructed_asof_verified:false};
  if(time<end){slot.status='WINDOW_NOT_FINISHED';results.push(slot);continue}
  try{
   const response=await fetcher(query.href,{method:'GET',redirect:'error',
    headers:{accept:'application/json'},
    signal:AbortSignal.timeout(18000)});
   if(response?.status===429){
    slot.status='HTTP_429_RATE_LIMIT';results.push(slot);
    // Do not flood shared public service after one rate-limit rejection.
    for(let k=i+1;k<maxWindows;k++){
     const s=WIN_START+k*3*DAY,e=Math.min(WIN_END,s+3*DAY);
     results.push({window_start_utc:new Date(s).toISOString(),
      window_end_exclusive_utc:new Date(e).toISOString(),
      status:'SKIPPED_AFTER_429',articles_returned:0,
      source_coverage_complete:false,reconstructed_asof_verified:false});
    }
    break;
   }
   if(!response?.ok)throw Error('HTTP_'+(response?.status||'UNAVAILABLE'));
   const contentType=response.headers?.get?.('content-type')||'';
   if(!/application\/json/.test(contentType))throw Error('NOT_JSON_CONTENT');
   const raw=await response.text();
   if(Buffer.byteLength(raw)>2000000)throw Error('RESPONSE_TOO_LARGE');
   const result=JSON.parse(raw);
   if(!Array.isArray(result?.articles))throw Error('UNEXPECTED_GDELT_RESPONSE');
   slot.status='HISTORICAL_METADATA_FETCHED_NOT_ASOF_VERIFIED';
   slot.articles_returned=result.articles.length;
   slot.metadata_cap_reached=result.articles.length>=150;
   for(const item of result.articles){
    const a=gdeltArticle(item);
    if(a&&!leads.has(a.source_url))leads.set(a.source_url,a);
   }
  }catch(e){slot.status='UNAVAILABLE_'+String(e.message).slice(0,55)}
  results.push(slot);
  if(i<maxWindows-1)await pace(5500);
 }
 return {schema:'r27_gdelt_retrospective_probe.v1',
  fetched_at_utc:now,window:{start:'2026-10-30T00:00:00Z',
   end_exclusive:'2026-11-14T00:00:00Z'},
  public_query:'memecoin OR meme coin OR token launch OR viral crypto',
  date_buckets:results,
  observed_url_metadata_count:leads.size,
  headlines:[...leads.values()].slice(0,500),
  verified_historical_asof_news_items:0,
  independently_audited_complete_news_intervals:0,
  entire_memecoin_news_universe_verified:false,
  observation_warning:'Historical article metadata fetched after the period is not a contemporaneous archive of original contents.'};
}
export async function r27GeckoPoolBackfill({
 fetcher=fetch,chain,pool_address,before=WIN_END,token='base'
}={}){
 if(!ALLOWED_CHAINS.has(chain)||typeof pool_address!=='string'||
  !(chain==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pool_address):
  /^0x[a-f0-9]{40}$/i.test(pool_address))||!Number.isSafeInteger(before)||
  before<WIN_START||before>WIN_END||token!=='base')
  throw Error('R27_BACKFILL_INVALID_POOL_PARAMS');
 const url=new URL('https://api.geckoterminal.com/api/v2/networks/'+chain+
  '/pools/'+encodeURIComponent(pool_address)+'/ohlcv/hour');
 url.searchParams.set('aggregate','1');url.searchParams.set('before_timestamp',String(Math.floor(before/1000)));
 url.searchParams.set('limit','500');url.searchParams.set('currency','usd');
 url.searchParams.set('token','base');
 const response=await fetcher(url.href,{headers:{accept:'application/json;version=20230203'},
  redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response?.ok)throw Error('R27_GECKO_HTTP_'+response?.status);
 const value=await response.json();
 const xs=value?.data?.attributes?.ohlcv_list;
 if(!Array.isArray(xs)||xs.length>1000)throw Error('R27_GECKO_BAD_OHLCV');
 const bars=xs.filter(x=>Array.isArray(x)&&x.length>=6&&
  Number.isSafeInteger(x[0])&&x[0]*1000>=WIN_START&&x[0]*1000<before).map(x=>({
   t_utc:new Date(x[0]*1000).toISOString(),
   o:Number(x[1]),h:Number(x[2]),l:Number(x[3]),c:Number(x[4]),v_usd:Number(x[5])
  })).filter(x=>x.o>0&&x.l>0&&x.l<=Math.min(x.o,x.c)&&
    x.h>=Math.max(x.o,x.c)&&x.v_usd>=0);
 const source=JSON.stringify(bars);
 return {schema:'r27_pool_ohlcv_retro_backfill.v1',chain,pool_address,
  fetched_after_period:true, historical_candidate_discovery_verified:false,
  past_liquidity_verified:false,security_verified:false,
  executable_buy_sell_quotes_verified:false,retrospective_only:true,
  rows:bars.length,sha256_normalized:sha(source),source_url:url.href,bars};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href){
 const output=process.argv[2]||'r27-probe-output/gdelt-leads.json';
 const report=await probeR27Gdelt({pace:ms=>new Promise(resolve=>setTimeout(resolve,ms))});
 mkdirSync(path.dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({source:'GDELT_DOC_PUBLIC',windows:report.date_buckets.length,
  statuses:report.date_buckets.map(x=>x.status),headline_metadata:report.observed_url_metadata_count,
  verified_asof_items:0,output}));
}
