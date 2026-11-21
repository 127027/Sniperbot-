// R29 V1.4 public media research: neither a social firehose nor a buy signal.
import {createHash} from 'node:crypto';
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const hash=s=>createHash('sha256').update(s).digest('hex');
const https=x=>typeof x==='string'&&/^https:\/\/[a-z0-9.-]+(?:[/?#:]|$)/i.test(x.trim())?x.trim():null;
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
 .replace(/<[^>]+>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(full,k)=>{
  const map={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
  if(k[0]==='#'){const n=k.toLowerCase().startsWith('#x')?parseInt(k.slice(2),16):Number(k.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):full;}
  return map[k.toLowerCase()]||full;
 }).replace(/\s+/g,' ').trim();
const tag=(s,k)=>decode(s.match(new RegExp('<(?:[a-z]+:)?'+k+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-z]+:)?'+k+'>','i'))?.[1]||'');
const TOPICS=[
 ['DOGE',/\b(?:dogecoin|doge)\b/i],['PEPE',/\b(?:pepe|pepecoin)\b/i],
 ['TRUMP',/\b(?:trump|maga)\b/i],['ELON',/\b(?:elon\s+musk|elonmusk)\b/i],
 ['MEMECOIN',/\b(?:meme[\s-]*coin|memecoin|meme\s+token)\b/i],
 ['SOLANA',/\bsolana\b/i],['FLOKI',/\bfloki\b/i],['SHIBA',/\b(?:shiba\s+inu|shib)\b/i],
 ['VIRAL',/\b(?:viral|internet\s+meme|trending)\b/i]
];
export const detectMediaTopics=s=>TOPICS.filter(([,r])=>r.test(String(s||''))).map(([t])=>t);
const event=({source,sourceClass,url,headline,published,seen,engagement=null})=>{
 const link=https(url),captured=iso(seen),title=decode(headline).slice(0,260);
 if(!link||!title||!captured)return null;
 return {id:hash(source+'|'+link),source,source_class:sourceClass,
  url:link,headline:title,topics:detectMediaTopics(title),
  published_at_utc:iso(published),first_captured_at_utc:captured,
  last_captured_at_utc:captured,engagement_snapshot:engagement,
  author_identity_verified:false,independently_correlated:false,
  buy_authorized:false};
};
export function decodeMediaSource({source,sourceClass,kind,body,capturedAtUtc,limit=50}={}){
 const when=iso(capturedAtUtc);
 if(!when||!source||typeof body!=='string'||!['RSS','BLUESKY_FEED'].includes(kind)||!Number.isInteger(limit)||limit<1||limit>200)
  throw Error('BAD_MEDIA_INPUT');
 let rows=[],inputItems=0;
 if(kind==='RSS'){
  const items=body.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
  inputItems=items.length;
  rows=items.slice(0,limit).map(i=>event({source,sourceClass,seen:when,url:tag(i,'link')||tag(i,'guid'),
   headline:tag(i,'title'),published:tag(i,'pubDate')||tag(i,'published')})).filter(Boolean);
 }else{
  let obj;try{obj=JSON.parse(body);}catch{throw Error('BAD_MEDIA_JSON');}
  if(!Array.isArray(obj?.feed))throw Error('BAD_BLUESKY_FEED');
  inputItems=obj.feed.length;
  rows=obj.feed.slice(0,limit).map(({post:p}={})=>{
   const uri=p?.uri,handle=p?.author?.handle,rekey=typeof uri==='string'?uri.split('/').at(-1):null;
   if(!/^[a-z0-9.-]+$/i.test(handle||'')||!/^[a-z0-9]+$/i.test(rekey||''))return null;
   return event({source,sourceClass,seen:when,url:'https://bsky.app/profile/'+handle+'/post/'+rekey,
    headline:p?.record?.text?.slice(0,260)||'',published:p?.record?.createdAt||p?.indexedAt,
    engagement:{likes:Number.isInteger(p?.likeCount)?p.likeCount:null,reposts:Number.isInteger(p?.repostCount)?p.repostCount:null}});
  }).filter(x=>x&&x.topics.length);
 }
 const valid=rows.filter(x=>x.published_at_utc&&x.published_at_utc<=when);
 return {source,source_class:sourceClass,kind,source_item_count:inputItems,
  inspected_count:Math.min(inputItems,limit),accepted:valid.length,
  undated:rows.filter(x=>!x.published_at_utc).length,
  future_dated:rows.filter(x=>x.published_at_utc&&x.published_at_utc>when).length,
  events:valid,coverage_complete:false};
}
export const emptyMediaMemory=()=>({schema:1,kind:'R29_MEDIA_MEMORY',mode:'PAPER_RESEARCH_ONLY',
 events:{},captures:[],source_status:{},stats:{unique_events:0,valid_topic_events:0}});
export function mergeMediaMemory(existing,{batchPath,capturedAtUtc,sources=[]}={}){
 const t=iso(capturedAtUtc),m=structuredClone(existing||emptyMediaMemory());
 if(!t||!batchPath?.startsWith('research/media/')||!Array.isArray(sources)||m.kind!=='R29_MEDIA_MEMORY')throw Error('BAD_MEDIA_MERGE');
 if(m.captures.includes(batchPath))return {memory:m,added:0,repeated:0,already_ingested:true};
 let added=0,repeated=0;
 for(const s of sources){
  if(!s?.source)continue;
  const past=m.source_status[s.source]||{};
  m.source_status[s.source]={status:s.status||'UNKNOWN',http_status:s.http_status??null,
   attempted_at_utc:t,source_url:s.url||null,limitation:s.limitation||null,
   last_success_at_utc:s.status==='OK'?t:past.last_success_at_utc||null};
  for(const e of s.events||[]){
   if(!e.id||!iso(e.published_at_utc)||!iso(e.first_captured_at_utc)
     ||e.published_at_utc>t||e.first_captured_at_utc>t)continue;
   if(!m.events[e.id]){m.events[e.id]=e;added++;}
   else{m.events[e.id].last_captured_at_utc=t;repeated++;}
  }
 }
 m.captures.push(batchPath);
 m.stats={unique_events:Object.keys(m.events).length,
  valid_topic_events:Object.values(m.events).filter(x=>x.topics.length>0).length,
  captures:m.captures.length,attempted_sources:Object.keys(m.source_status).length,
  working_sources:Object.values(m.source_status).filter(x=>x.last_success_at_utc).length};
 return {memory:m,added,repeated,already_ingested:false};
}
export function mediaAsOfSignals(memory,{asOfUtc,windowHours=24}={}){
 const t=iso(asOfUtc);
 if(memory?.kind!=='R29_MEDIA_MEMORY'||!t||!Number.isInteger(windowHours)||windowHours<1)throw Error('BAD_MEDIA_ASOF');
 const now=Date.parse(t),dur=windowHours*3600000,groups=new Map();
 for(const e of Object.values(memory.events)){
  const p=iso(e.published_at_utc),c=iso(e.first_captured_at_utc);
  if(!p||!c||p>t||c>t||now-Date.parse(c)>2*dur)continue;
  for(const topic of e.topics||[]){
   if(!groups.has(topic))groups.set(topic,[]);
   groups.get(topic).push(e);
  }
 }
 const signals=[...groups].map(([topic,items])=>{
  const recent=items.filter(x=>now-Date.parse(x.first_captured_at_utc)<=dur);
  const older=items.length-recent.length;
  return {topic,recent_distinct_observations:recent.length,previous_window_distinct_observations:older,
   distinct_source_ids:new Set(recent.map(x=>x.source)).size,
   recent_sample_urls:recent.slice(0,4).map(x=>x.url),
   attention_delta_observed:recent.length-older,
   measurement:'FETCHED_PUBLIC_ARTICLE_OR_POST_URLS_NOT_GLOBAL_MENTIONS',
   unverified_media_to_token_relation:true,risk_eligible:false,order_authorized:false};
 }).sort((a,b)=>b.recent_distinct_observations-a.recent_distinct_observations||a.topic.localeCompare(b.topic));
 return {schema:1,kind:'R29_MEDIA_ASOF_SIGNALS',as_of_utc:t,
  topics:signals,source_coverage:memory.source_status,
  global_social_media_coverage:false,verifiable_viral_breakout:false,orders:0};
}
export function matchMediaPoolHypotheses(signals,marketMemory){
 if(signals?.kind!=='R29_MEDIA_ASOF_SIGNALS'||marketMemory?.kind!=='R29_PERSISTENT_MARKET_MEMORY')throw Error('BAD_MEDIA_POOL_MATCH');
 const results=[];
 for(const p of Object.values(marketMemory.pools||{})){
  const symbol=String(p.symbol||'').toUpperCase().trim();
  if(symbol.length<4||/^(?:DOGE|PEPE|TRUMP|USDT|WETH|ETH|BASE|TOKEN|MEME|MOON)$/.test(symbol))continue;
  const matches=signals.topics.filter(s=>s.topic===symbol);
  if(matches.length)results.push({chain:p.chain,pool:p.pool,contract:p.contract,
   symbol,reason:'NAME_MATCH_NOT_CONTRACT_IDENTITY',topics:matches.map(x=>x.topic),
   risk_eligible:false,order_authorized:false});
 }
 return {schema:1,kind:'R29_SOCIAL_MARKET_RESEARCH_HYPOTHESES',
  matches:results,number:results.length,orders:0,
  note:'No celebrity, topic or post should be treated as proof of token identity or official endorsement.'};
}
