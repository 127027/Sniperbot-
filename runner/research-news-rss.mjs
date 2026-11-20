// Prospective, read-only public news and viral narrative feed.
// This is a TIMESTAMPED ORIGINAL OBSERVATION in the local collector, not
// a reconstructed 2013-2026 feed, token identification or BUY signal.
import {createHash} from 'node:crypto';
const FEEDS=Object.freeze([
 {name:'Decrypt',url:'https://decrypt.co/feed'},
 {name:'BeInCrypto',url:'https://beincrypto.com/feed/'},
 {name:'Cointelegraph',url:'https://cointelegraph.com/rss'},
 {name:'BBCWorld',url:'https://feeds.bbci.co.uk/news/world/rss.xml'},
 {name:'BBCBusiness',url:'https://feeds.bbci.co.uk/news/business/rss.xml'},
 {name:'BBCTech',url:'https://feeds.bbci.co.uk/news/technology/rss.xml'},
 {name:'BBCEntertainment',url:'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml'},
 {name:'BBCUSCanada',url:'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml'}
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
 const crypto=/(meme\s?coin|memecoin|meme\s?token|pump\.fun|token launch|new crypto token|viral|doge|pepe|penguin|squirrel|shiba|solana|celebrity coin|trump|elon musk)/i;
 const topics=/(video games?|\bgames?\b|gaming|game studio|film|movies?|music artist|hippo|zoo|wildlife|animals?|artificial intelligence|\bai\b|ai startup|initial public offering|\bipo\b|stock market debut|social media|internet sensation)/i;
 const events=/(launch(?:ed|es)?|releas(?:es|ed)?|debut(?:s|ed)?|premiere[sd]?|goes public|initial public offering|\bipo\b|dies|died|death|passes away|breaks? record|goes viral|viral sensation|trending|viral)/i;
 const tags=[];
 if(crypto.test(text))tags.push('PUBLIC_NEWS_NARRATIVE_LEAD');
 // General-world catalysts are research leads, NOT verified token mappings.
 // Never match hard-coded known winning projects or infer a contract.
 if(topics.test(text)&&events.test(text))tags.push('GENERAL_EVENT_CATALYST_CANDIDATE');
 if(/penguin|squirrel|cat|doge|pepe|animal|viral|hippo|zoo|wildlife/i.test(text))
  tags.push('MEME_CULTURE_CANDIDATE');
 if(/trump|president|white house|election|celebrity|elon musk/i.test(text))
  tags.push('PUBLIC_FIGURE_CONTEXT');
 if(/pump\.fun|solana|launch|token|coin|liquidity/i.test(text))
  tags.push('POSSIBLE_CRYPTO_TOKEN_CONTEXT');
 return tags.slice(0,4);
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
 const perFeed=[],coverage=[];
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
   perFeed.push(parsed.sort((a,b)=>Date.parse(b.original_published_at_utc)-Date.parse(a.original_published_at_utc)));
   coverage.push({feed:feed.name,status:'OK',relevant_items:parsed.length});
  }catch(e){
   perFeed.push([]);
   coverage.push({feed:feed.name,status:'SOURCE_UNAVAILABLE',
    reason_code:String(e?.message||'SOURCE_UNAVAILABLE').slice(0,72)});
  }
 }
 const leads=[],seen=new Set();
 // Fair round-robin prevents the first crypto RSS feed from crowding out
 // independently observed general cultural/news catalysts.
 for(let i=0;i<MAX_ITEMS&&leads.length<16;i++){
  let found=false;
  for(const feed of perFeed){
   const e=feed[i];if(!e)continue;found=true;
   if(!seen.has(e.event_id)){leads.push(e);seen.add(e.event_id)}
   if(leads.length>=16)break;
  }
  if(!found)break;
 }
 return {schema:'research_news_captures.v1',paper_only:true,actionable:false,
  observed_at_utc:now,
  leads,coverage,
  warning:'News first seen at local fetch time. RSS dates are publisher claims. News topics, politicians, animals and viral stories do NOT identify a unique tradeable meme token.'};
}
