import test from 'node:test';
import assert from 'node:assert/strict';
import {parseResearchNewsRSS,collectResearchNews} from './research-news-rss.mjs';

const now='2026-11-10T08:00:00Z';
const rss=(items)=>'<rss><channel>'+items.map(x=>
 '<item><title><![CDATA['+x.title+']]></title><link>'+x.link+'</link>'+
 '<pubDate>'+x.date+'</pubDate><description><![CDATA['+(x.description||'')+']]></description></item>'
 ).join('')+'</channel></rss>';
const pub='Tue, 10 Nov 2026 07:42:00 GMT';
test('first-seen news timestamps are local capture, not claimed article publication date',()=>{
 const rows=parseResearchNewsRSS(rss([{title:'White House shares viral penguin image',
  link:'https://example.org/whitehouse-penguin-post',date:pub}]),
  {feed:'TestNews',observed_at_utc:now});
 assert.equal(rows.length,1);
 assert.equal(rows[0].first_observed_at_utc,now);
 assert.equal(rows[0].original_published_at_utc,'2026-11-10T07:42:00.000Z');
 assert.equal(rows[0].candidate_id,null);
 assert.equal(rows[0].actionable,false);
 assert.equal(rows[0].original_post_content_independently_verified,false);
 assert(!Object.hasOwn(rows[0],'BUY'));
 assert(!Object.hasOwn(rows[0],'probability_pct'));
});
test('future dated and old retrospective sources are rejected',()=>{
 const xml=rss([
  {title:'Penguin goes viral',link:'https://example.org/future',date:'Wed, 11 Nov 2026 13:00:00 GMT'},
  {title:'TRUMP memecoin news',link:'https://example.org/old',date:'Tue, 03 Nov 2026 07:00:00 GMT'},
  {title:'Coin boosts',link:'https://user:pass@evil.example/secret',date:pub},
  {title:'Random general news without meme',link:'https://safe.example/random',date:pub}
 ]);
 const results=parseResearchNewsRSS(xml,{feed:'Test',observed_at_utc:now});
 assert.equal(results.length,0);
});
test('public provider 429 becomes unavailable, unrelated news never fabricates a token or order',async()=>{
 let requests=0;
 const result=await collectResearchNews({now,fetcher:async url=>{
  requests++;
  if(url.includes('cointelegraph'))return {ok:false,status:429};
  return {ok:true,headers:{get:()=>null},text:async()=>rss([
   {title:'Pepe new meme coin surges on Solana',link:'https://source.example/pepe',date:pub},
   {title:'Today local weather in Barcelona',link:'https://source.example/weather',date:pub}
  ])};
 }});
 assert.equal(requests,8);
 assert.equal(result.coverage.filter(r=>r.status==='OK').length,7);
 assert.equal(result.coverage.filter(r=>r.status==='SOURCE_UNAVAILABLE').length,1);
 assert.equal(result.leads.length,1,'same news URL is deduplicated across publishers');
 assert.equal(result.leads[0].candidate_id,null,'no contract inferred from ticker/animal');
 assert.equal(result.actionable,false);
});
test('bounded parsed items with no network and no unaudited script injection',()=>{
 const long=rss(Array.from({length:80},(_,i)=>({title:'Solana meme coin '+i,
  link:'https://source.example/article'+i,date:pub})));
 const rows=parseResearchNewsRSS(long,{feed:'Test',observed_at_utc:now});
 assert.equal(rows.length,40);
 assert(rows.every(r=>r.actionable===false&&r.paper_only===true));
 const malicious=parseResearchNewsRSS(rss([{title:'Meme coin <script>alert(1)</script>',
  link:'https://source.example/x',date:pub}]),{feed:'Test',observed_at_utc:now});
 assert(!malicious[0].title.includes('<script>'));
});

test('general-world culture and IPO catalysts are observed without winner names or token guesses',()=>{
 const xml=rss([
  {title:'Beloved zoo hippo dies after becoming a popular attraction',
   link:'https://news.example/hippo',date:pub},
  {title:'Major video game franchise releases its next installment',
   link:'https://news.example/game',date:pub},
  {title:'Artificial intelligence startup prepares IPO debut',
   link:'https://news.example/ipo',date:pub},
  {title:'A random weather report with no event',link:'https://news.example/weather',date:pub}
 ]);
 const rows=parseResearchNewsRSS(xml,{feed:'BBCWorld',observed_at_utc:now});
 assert.equal(rows.length,3);
 assert(rows.every(e=>e.signal_categories.includes('GENERAL_EVENT_CATALYST_CANDIDATE')));
 assert(rows.every(e=>e.candidate_id===null&&e.actionable===false));
 assert(!rows.some(e=>e.source_url.includes('weather')));
});
test('fair source sampling preserves general-world news after crypto feeds fill their own lists',async()=>{
 const result=await collectResearchNews({now,fetcher:async url=>{
  const source=new URL(url).pathname.replace(/[^a-z]/g,'')||'crypto';
  return {ok:true,headers:{get:()=>null},text:async()=>rss(Array.from({length:12},(_,i)=>({
   title:source.includes('rss')?'Beloved zoo animal dies after viral story':'Solana meme coin launch '+i,
   link:'https://news.example/'+source+'-'+i,date:pub
  })))};
 }});
 assert.equal(result.coverage.length,8);
 assert.equal(result.leads.length,16);
 assert(result.leads.some(e=>e.source_name.startsWith('BBC')),
  'general-source event must not be crowded out');
 assert(result.leads.every(e=>e.actionable===false&&e.candidate_id===null));
});
