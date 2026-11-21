// Run immediately after each genuine Dot2 cloud capture. Free public sources only.
// Persist limited article/post metadata and response SHA, not copyrighted full feeds.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodeMediaSource,mergeMediaMemory,emptyMediaMemory,mediaAsOfSignals,
 matchMediaPoolHypotheses} from '../src/media-research.mjs';
import {makePairedMediaMarketRankings,evaluatePairedAB} from '../src/media-ab-evaluation.mjs';
const branch='codex/r29-cleanroom-paper-20261121';
if(process.env.GITHUB_REF&&process.env.GITHUB_REF!=='refs/heads/'+branch)throw Error('WRONG_BRANCH');
const runId=process.env.GITHUB_RUN_ID;
if(!/^\d+$/.test(runId||''))throw Error('MISSING_GITHUB_RUN_ID');
const latestMarket=JSON.parse(await readFile('research/feeds/latest.json','utf8'));
if(!latestMarket?.evidence_path?.includes('/'+runId+'/'))throw Error('NOT_SAME_DOT2_CAPTURE_RUN');
const now=()=>new Date().toISOString();
const date=now().slice(0,10),root='research/media/'+date+'/'+runId;
await mkdir(root,{recursive:true});
const rssQueries=[
 {source:'COINDESK_RSS',kind:'RSS',sourceClass:'CRYPTO_NEWS',
 url:'https://www.coindesk.com/arc/outboundfeeds/rss/'},
 {source:'COINTELEGRAPH_RSS',kind:'RSS',sourceClass:'CRYPTO_NEWS',
 url:'https://cointelegraph.com/rss'},
 {source:'GOOGLE_NEWS_MEME_RSS',kind:'RSS',sourceClass:'AGGREGATED_NEWS',
 url:'https://news.google.com/rss/search?q='+encodeURIComponent('memecoin OR "meme coin" OR dogecoin when:1d')+'&hl=en-US&gl=US&ceid=US:en'},
 {source:'GOOGLE_NEWS_CELEBRITY_RSS',kind:'RSS',sourceClass:'AGGREGATED_NEWS',
 url:'https://news.google.com/rss/search?q='+encodeURIComponent('(Trump OR "Elon Musk") (crypto OR meme) when:1d')+'&hl=en-US&gl=US&ceid=US:en'},
 {source:'BLUESKY_WHATS_HOT',kind:'BLUESKY_FEED',sourceClass:'PUBLIC_SOCIAL_FEED',
 url:'https://public.api.bsky.app/xrpc/app.bsky.feed.getFeed?feed='+encodeURIComponent('at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot')+'&limit=50'}
];
const statuses=[];
for(const src of rssQueries){
 const startedAt=now();
 try{
  const response=await fetch(src.url,{headers:{Accept:src.kind==='RSS'?'application/rss+xml,application/xml,text/xml':'application/json'},
    signal:AbortSignal.timeout(12000),redirect:'follow'});
  const body=await response.text(),receivedAt=now();
  const evidence={source:src.source,source_class:src.sourceClass,kind:src.kind,url:src.url,
   status:response.ok?'OK':'HTTP_'+response.status,http_status:response.status,
   started_at_utc:startedAt,received_at_utc:receivedAt,
   response_sha256:createHash('sha256').update(body).digest('hex'),
   bytes:Buffer.byteLength(body),events:[],limitation:null};
  if(!response.ok){evidence.limitation='NO_ACCESS_OR_PROVIDER_ERROR';statuses.push(evidence);continue;}
  if(evidence.bytes>1500000){evidence.status='CONTENT_TOO_LARGE';evidence.limitation='NOT_READ_OVER_1_5_MB';statuses.push(evidence);continue;}
  try{
   const decoded=decodeMediaSource({source:src.source,sourceClass:src.sourceClass,kind:src.kind,
    body,capturedAtUtc:receivedAt,limit:50});
   evidence.events=decoded.events;
   evidence.decode_metrics={source_item_count:decoded.source_item_count,
    inspected_count:decoded.inspected_count,accepted:decoded.accepted,
    undated:decoded.undated,future_dated:decoded.future_dated};
   evidence.limitation='FEED_SAMPLE_NOT_GLOBAL_SOCIAL_OR_NEWS_COVERAGE';
  }catch(error){evidence.status='DECODE_ERROR';
   evidence.limitation=String(error.message||error).slice(0,120);}
  statuses.push(evidence);
 }catch(error){
  statuses.push({source:src.source,source_class:src.sourceClass,kind:src.kind,url:src.url,
   status:'FETCH_ERROR',http_status:null,started_at_utc:startedAt,received_at_utc:now(),
   response_sha256:null,events:[],limitation:String(error.message||error).slice(0,120)});
 }
}
for(const src of [{source:'X_SEARCH',url:'https://developer.x.com/'},
 {source:'REDDIT_SEARCH',url:'https://www.reddit.com/'}]){
 statuses.push({source:src.source,url:src.url,status:'NO_AUTHORIZED_FREE_SEARCH_ACCESS',
  http_status:null,started_at_utc:now(),received_at_utc:now(),response_sha256:null,
  events:[],limitation:'NOT_QUERIED. No paid credentials, scraping, or revoked RSS workaround used.'});
}
const completed=now(),batchPath=root+'/evidence.json';
const counts={attempted:rssQueries.length,available:statuses.filter(x=>x.status==='OK').length,
 failed:statuses.filter(x=>x.status!=='OK'&&!x.status.startsWith('NO_AUTHORIZED')).length,
 inaccessible_platforms:statuses.filter(x=>x.status.startsWith('NO_AUTHORIZED')).map(x=>x.source),
 accepted_events:statuses.reduce((n,x)=>n+x.events.length,0),
 topic_events:statuses.reduce((n,x)=>n+x.events.filter(e=>e.topics.length).length,0)};
const evidence={schema:1,kind:'R29_PUBLIC_MEDIA_CAPTURE_EVIDENCE',mode:'PAPER_RESEARCH_ONLY',
 captured_completed_at_utc:completed,market_capture_path:latestMarket.evidence_path,
 source_capture_statuses:statuses,counts,
 warning:'Article and social metadata only. No X/Reddit access without authorization. No media post alone authorizes a trade.',
 orders:0};
await writeFile(batchPath,JSON.stringify(evidence,null,2)+'\n','utf8');
const path='research/media/state/memory.json';
let memory;
try{memory=JSON.parse(await readFile(path,'utf8'));}
catch(err){if(err.code!=='ENOENT')throw err;memory=emptyMediaMemory();}
const merged=mergeMediaMemory(memory,{batchPath,capturedAtUtc:completed,sources:statuses});
memory=merged.memory;
await mkdir('research/media/state',{recursive:true});
await writeFile(path,JSON.stringify(memory,null,2)+'\n','utf8');
const signals=mediaAsOfSignals(memory,{asOfUtc:completed});
const signalsPath=root+'/asof-signals.json';
await writeFile(signalsPath,JSON.stringify(signals,null,2)+'\n','utf8');
const market=JSON.parse(await readFile('research/state/market-memory.json','utf8'));
const linked=matchMediaPoolHypotheses(signals,market);
const linkPath=root+'/pool-hypotheses.json';
await writeFile(linkPath,JSON.stringify(linked,null,2)+'\n','utf8');
// This market ranking was frozen BEFORE the current media HTTP fetches.
// Current media articles are therefore NOT retroactively visible to the market ranking.
const frozenMarketRank=JSON.parse(await readFile(latestMarket.ranking_path,'utf8'));
const paired=makePairedMediaMarketRankings({marketRanking:frozenMarketRank,mediaMemory:memory});
const evaluation=evaluatePairedAB({paired,labels:null});
// Only frozen prior research decisions with later 24h matured labels qualify.
let maturedABPath=null,maturedABStatus='WAIT_FOR_MATURED_FORWARD_LABELS';
if(latestMarket.matured_label_path){
 const labels=JSON.parse(await readFile(latestMarket.matured_label_path,'utf8'));
 const oldFiles=(await readdir('research/media',{recursive:true}))
  .filter(x=>x.endsWith('/paired-ab-market-media.json')).sort().reverse().slice(0,400);
 for(const relative of oldFiles){
  let old;try{old=JSON.parse(await readFile('research/media/'+relative,'utf8'));}catch{continue;}
  if(old?.paired?.as_of_utc!==labels.decision_at_utc)continue;
  const result=evaluatePairedAB({paired:old.paired,labels,topK:10});
  maturedABPath=root+'/matured-ab-evaluation.json';
  maturedABStatus=result.status;
  await writeFile(maturedABPath,JSON.stringify({
   schema:1,kind:'R29_CAUSAL_MATURED_MEDIA_AB_EVALUATION',
   original_pair_path:'research/media/'+relative,
   original_market_decision_at_utc:old.paired.as_of_utc,
   labels_path:latestMarket.matured_label_path,evaluation:result,
   no_trading_order:true
  },null,2)+'\n','utf8');
  break;
 }
 if(!maturedABPath)maturedABStatus='PRIOR_PAIR_NOT_FOUND_FOR_MATURED_LABEL';
}
const pairedPath=root+'/paired-ab-market-media.json';
await writeFile(pairedPath,JSON.stringify({paired,evaluation},null,2)+'\n','utf8');
await writeFile('research/media/latest.json',JSON.stringify({
 schema:1,kind:'R29_LATEST_MEDIA_RESEARCH',captured_at_utc:completed,
 evidence_path:batchPath,signals_path:signalsPath,memory_path:path,
 pool_hypotheses_path:linkPath,paired_ab_path:pairedPath,paired_ab_status:evaluation.status,
 matured_ab_path:maturedABPath,matured_ab_status:maturedABStatus,
 counts,added_unique_events:merged.added,
 repeated_items:merged.repeated,topic_count:signals.topics.length,
 media_memory_stats:memory.stats,orders_published:0},null,2)+'\n','utf8');
console.log('R29_V14_MEDIA_CAPTURE',JSON.stringify({run_id:runId,market_capture:latestMarket.evidence_path,
 available:counts.available,attempted:counts.attempted,errors:counts.failed,
 events:counts.accepted_events,topics:signals.topics.length,paired_ab_status:evaluation.status,
 memory_unique:memory.stats.unique_events,source_statuses:statuses.map(s=>[s.source,s.status]),
 matured_ab_status:maturedABStatus,no_orders:true}));
