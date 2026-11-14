// Prospective, read-only public news and viral narrative feed.
// This is a TIMESTAMPED ORIGINAL OBSERVATION in the local collector, not
// a reconstructed 2013-2026 feed, token identification or BUY signal.
import {createHash} from 'node:crypto';
const FEEDS=Object.freeze([
 {name:'Decrypt',url:'https://decrypt.co/feed'},
 {name:'BeInCrypto',url:'https://beincrypto.com/feed/'},
 {name:'Cointelegraph',url:'https://cointelegraph.com/rss'}
]);
const MAX_XML=200000,MAX_ITEMS=40,MAX_AGE=72*3600000;
function xmlText(v){
 if(typeof v!=='string')return '';
 const t=v.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g,'')
  .replace(/<[^>]*>/g,' ')
  .replace(/&amp;/g,'&').replace(/&quot;/g,'"')
  .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/[\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim();
 return t.slice(0,700);
}
function tag(item,name){
 const re=new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i');
 return xmlText(re.exec(item)?.[1]||'');
}
function safeUrl(u){
 if(typeof u!=='string'||u.length>900)return null;
 try{const x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password?x.toString():null}catch{return null}
}
function relevance(title,description){
 const text=(title+' '+description).toLowerCase();
 const hit=/(meme\s?coin|memecoin|meme\s?token|pump\.fun|token launch|new crypto token|viral|doge|pepe|penguin|squirrel|shiba|solana|celebrity coin|trump|elon musk)/i;
 const labels=[];
 if(hit.test(text))labels.push('PUBLIC_NEWS_NARRATIVE_LEAD');
 if(/penguin|squirrel|cat|doge|pepe|animal|viral/i.test(text))labels.push('MEME_CULTURE_CANDIDATE');
 if(/trump|president|white house|election|celebrity|elon musk/i.test(text))labels.push('PUBLIC_FIGURE_CONTEXT');
 if(/pump\.fun|solana|launch|token|coin|liquidity/i.test(text))labels.push('POSSIBLE_CRYPTO_TOKEN_CONTEXT');
 return labels;
}
export function parseResearchNewsRSS(xml,{feed,observed_at_utc}={}){
 if(typeof xml!=='string'||xml.length>MAX_XML||!Number.isFinite(Date.parse(observed_at_utc))||
    typeof feed!=='string'||!feed)throw Error('INVALID_RSS_INPUT');
 const now=Date.parse(observed_at_utc);
 const items=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,MAX_ITEMS);
 const out=[];
 for(const [,raw] of items){
  const title=tag(raw,'title'),link=safeUrl(tag(raw,'link')),description=tag(raw,'description');
  const pub=Date.parse(tag(raw,'pubDate')),sourceFirstKnown=Number.isFinite(pub)&&pub<=now+60000;
  if(!title||!link||!sourceFirstKnown||now-pub>MAX_AGE)continue;
  const tags=relevance(title,description);
  if(!tags.length)continue;
  const event_id='news-'+createHash('sha256').update(link).digest('hex').slice(0,32);
  out.push({event_id,source_name:feed,source_url:link,title,
   original_published_at_utc:new Date(pub).toISOString(),
   first_observed_at_utc:observed_at_utc,
   source_timestamp_quality:'RSS_PUBLISHER_CLAIM_NOT_INDEPENDENTLY_ARCHIVED',
   signal_categories:tags,
   chain:null,token_address:null,pool_address:null,candidate_id:null,
   original_post_content_independently_verified:false,
   paper_only:true,actionable:false});
 }
 return out;
}
export async function collectResearchNews({fetcher=fetch,now=new Date().toISOString()}={}){
 if(!Number.isFinite(Date.parse(now)))throw Error('INVALID_NEWS_TIME');
 const leads=[],coverage=[],seen=new Set();
 for(const feed of FEEDS){
  try{
   const r=await fetcher(feed.url,{signal:AbortSignal.timeout(9000),
    redirect:'error',headers:{accept:'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8',
     'user-agent':'SniperPublicResearchNewsCollector/1.0'}});
   if(!r?.ok)throw Error('HTTP_'+(r?.status||'UNKNOWN'));
   const declared=Number(r.headers?.get?.('content-length')||0);
   if(declared>MAX_XML)throw Error('RSS_EXCEEDS_CAP');
   const xml=await r.text();
   const parsed=parseResearchNewsRSS(xml,{feed:feed.name,observed_at_utc:now});
   for(const e of parsed){if(!seen.has(e.event_id)){leads.push(e);seen.add(e.event_id)}}
   coverage.push({feed:feed.name,status:'OK',relevant_items:parsed.length});
  }catch(e){
   coverage.push({feed:feed.name,status:'SOURCE_UNAVAILABLE',
    reason_code:String(e?.message||'SOURCE_UNAVAILABLE').slice(0,72)});
  }
 }
 return {schema:'research_news_captures.v1',paper_only:true,actionable:false,
  observed_at_utc:now,
  leads:leads.slice(0,16),coverage,
  warning:'News first seen at local fetch time. RSS dates are publisher claims. News topics, politicians, animals and viral stories do NOT identify a unique tradeable meme token.'};
}
