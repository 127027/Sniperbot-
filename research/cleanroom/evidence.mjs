// Read-only evidence preparation, not a trading strategy or signal publisher.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import assert from 'node:assert/strict';
const BASE='https://api.coingecko.com/api/v3';
const platforms={solana:'solana',ethereum:'ethereum','binance-smart-chain':'bsc',base:'base','arbitrum-one':'arbitrum','polygon-pos':'polygon','optimistic-ethereum':'optimism',avalanche:'avalanche'};
const canonical=(chain,address)=>{if(typeof address!=='string')return null;if(chain==='solana')return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)?address:null;return /^0x[0-9a-fA-F]{40}$/.test(address)?address.toLowerCase():null};
const key=(chain,contract)=>chain+':'+canonical(chain,contract);
const ts=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const validNum=x=>typeof x==='number'&&Number.isFinite(x);
export function joinEvidence(market,registry,pools,at){
 if(!Array.isArray(market)||!Array.isArray(registry)||!Array.isArray(pools))throw Error('INVALID_INPUT');
 const n=Date.parse(at);if(!Number.isFinite(n))throw Error('INVALID_TIME');
 const byId=new Map(),conflicts=new Set(),poolMap=new Map();
 for(const r of registry){if(typeof r?.id!=='string')continue;if(byId.has(r.id)){conflicts.add(r.id);continue}byId.set(r.id,r)}
 for(const p of pools){const c=canonical(p.chain,p.contract);if(!c)continue;const k=key(p.chain,c);if(!poolMap.has(k)||Number(p.liquidity_usd)>Number(poolMap.get(k).liquidity_usd))poolMap.set(k,p)}
 const rows=[],gaps=[],seen=new Set();
 for(const m of market){const id=m.id;if(typeof id!=='string'||seen.has(id))continue;seen.add(id);const r=byId.get(id),time=ts(m.provider_quote_time),age=time?n-Date.parse(time):Infinity;
  if(!r||conflicts.has(id)){gaps.push({id,reason:'COINGECKO_ID_UNRESOLVED'});continue}
  if(!validNum(m.price_eur)||m.price_eur<=0||!time||age<0||age>15*60000){gaps.push({id,reason:'INVALID_OR_STALE_EUR_QUOTE'});continue}
  const identities=Object.entries(r.platforms??{}).flatMap(([p,a])=>{const chain=platforms[p];const contract=chain&&canonical(chain,a);if(!contract)return [];const pool=poolMap.get(key(chain,contract));return [{chain,contract,pool:pool?{pool_address:pool.pool,liquidity_usd:pool.liquidity_usd,volume_1h_usd:pool.volume_1h_usd,price_usd:pool.price_usd,change_1h_pct:pool.change_1h_pct,provider_quote_time:pool.provider_quote_time??null}:null}]});
  if(!identities.length){gaps.push({id,reason:'NO_SUPPORTED_CONTRACT_NATIVE_OR_UNRESOLVED'});continue}
  // CoinGecko quotes are asset-level, not a chain-specific execution quote. Preserve all verified mappings.
  rows.push({id,coin:m.symbol,price_eur:m.price_eur,observed_at_utc:time,source_url:BASE+'/coins/markets?vs_currency=eur&ids='+encodeURIComponent(id)+'&price_change_percentage=1h',change_1h_pct:m.change_1h_pct,volume_24h_eur:m.volume_24h_eur,identities,quote_scope:'COINGECKO_ASSET_INDICATIVE_PAPER',risk_status:'NOT_ASSESSED',decision_status:'RESEARCH_INPUT_NOT_BUY'});
 }
 return {rows,gaps};
}
// Preserve raw discovery leads separately from verified asset-level evidence.
// A missing CoinGecko join must not silently erase newly observed token addresses.
export function discoveryInventory(snapshot,joined){
 const aliases={solana:'solana',ethereum:'ethereum',eth:'ethereum',bsc:'bsc',base:'base',arbitrum:'arbitrum',polygon:'polygon',optimism:'optimism',avalanche:'avalanche'};
 const known=new Set(joined.rows.flatMap(r=>r.identities.map(i=>key(i.chain,i.contract))));
 const leads=new Map();
 for(const source of snapshot.sources??[]){
  if(source.status!=='OK')continue;
  for(const row of source.rows??[]){
   const chain=aliases[row.chain],contract=chain&&canonical(chain,row.contract);
   if(!contract)continue;
   const k=key(chain,contract);
   const item=leads.get(k)??{chain,contract,joined_asset:known.has(k),classification:'UNVERIFIED_DISCOVERY_LEAD',observations:[]};
   item.observations.push({source:source.name,url:source.url,retrieved_at:source.finished_at,symbol:row.symbol??null,pool:row.pool??null,liquidity_usd:row.liquidity_usd??null,volume_1h_usd:row.volume_1h_usd??null,change_1h_pct:row.change_1h_pct??null,provider_quote_time:row.provider_quote_time??null});
   leads.set(k,item);
  }
 }
 const rows=[...leads.values()];
 return {schema:'cleanroom.discovery.inventory.v1',distinct_contracts:rows.length,not_joined:rows.filter(r=>!r.joined_asset).length,rows,coverage:'Only retrieved source pages. Unknown global denominator. Leads are not verified memecoins, quotes, risk assessments or BUYs.'};
}

async function req(url,parser,headers={}){
 const started_at=new Date().toISOString();try{const r=await fetch(url,{headers,signal:AbortSignal.timeout(25000),redirect:'follow'});const status=r.status;if(!r.ok)return {url,started_at,finished_at:new Date().toISOString(),status:'HTTP_'+status,http_status:status,data:null};
 const raw=await r.text();if(raw.length>12000000)throw Error('RESPONSE_TOO_LARGE');const data=parser(raw);return {url,started_at,finished_at:new Date().toISOString(),status:'OK',http_status:status,data};
 }catch(e){return {url,started_at,finished_at:new Date().toISOString(),status:'ERROR',error:String(e.cause?.code??e.message),data:null}}
}
function rss(raw){
 const clean=x=>x?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').trim().slice(0,500)??null;
 const items=[...raw.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,15).map(m=>{const t=k=>clean(m[1].match(new RegExp('<'+k+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+k+'>','i'))?.[1]);return {title:t('title'),url:t('link'),published_at:ts(t('pubDate'))}});
 if(!items.length)throw Error('NO_RSS_ITEMS');return items;
}
if(process.argv.includes('--self-test')){
 const at='2026-11-26T10:00:00.000Z',address='0x'+'a'.repeat(40);
 const m={id:'coin-a',symbol:'A',price_eur:1,provider_quote_time:'2026-11-26T09:59:00Z',change_1h_pct:2};
 const registry=[{id:'coin-a',platforms:{ethereum:address}}];
 const a=joinEvidence([m],registry,[],at);assert.equal(a.rows.length,1);assert.equal(a.rows[0].identities[0].contract,address);assert.equal(a.rows[0].decision_status,'RESEARCH_INPUT_NOT_BUY');
 assert.equal(joinEvidence([{...m,provider_quote_time:'2026-11-26T09:00:00Z'}],registry,[],at).rows.length,0);
 assert.equal(joinEvidence([m],[],[],at).rows.length,0);assert.equal(joinEvidence([m],[...registry,...registry],[],at).rows.length,0);
 assert.equal(rss('<rss><item><title>Test</title><link>https://example.com</link><pubDate>Thu, 26 Nov 2026 09:00:00 GMT</pubDate></item></rss>')[0].published_at,'2026-11-26T09:00:00.000Z');
 const discovery=discoveryInventory({sources:[{name:'fixture',status:'OK',rows:[{chain:'ethereum',contract:address},{chain:'ethereum',contract:address.toUpperCase().replace('0X','0x')},{chain:'ethereum',contract:'0x'+'b'.repeat(40)},{chain:'ethereum',contract:'invalid'}]}]},a);
 assert.equal(discovery.distinct_contracts,2);assert.equal(discovery.not_joined,1);assert.equal(discovery.rows[0].observations.length,2);assert.equal(discovery.rows[1].classification,'UNVERIFIED_DISCOVERY_LEAD');
 console.log('Evidence and discovery inventory fixtures passed');
}else{
 const snapshot=JSON.parse(await readFile(process.env.CLEANROOM_OUTPUT??'research/cleanroom/market-latest.json','utf8'));
 const market=snapshot.sources.find(s=>s.name==='CoinGecko EUR meme markets')?.rows??[];
 const pools=snapshot.sources.filter(s=>s.name.startsWith('GeckoTerminal')).flatMap(s=>s.rows);
 const headers=process.env.COINGECKO_DEMO_KEY?{'x-cg-demo-api-key':process.env.COINGECKO_DEMO_KEY}:{};
 const [reg,...news]=await Promise.all([req(BASE+'/coins/list?include_platform=true',JSON.parse,headers),req('https://www.coindesk.com/arc/outboundfeeds/rss/',rss),req('https://cointelegraph.com/rss',rss)]);
 const finished_at=new Date().toISOString();
 const joined=joinEvidence(market,Array.isArray(reg.data)?reg.data:[],pools,finished_at);
 const result={schema:'cleanroom.evidence.v1',mode:'RESEARCH_ONLY',finished_at,market_snapshot_finished_at:snapshot.finished_at,source_logs:[...snapshot.sources.map(({name,url,started_at,finished_at,status,rows})=>({name,url,started_at,finished_at,status,row_count:rows.length})),...([reg,...news].map(({data,...s})=>({...s,row_count:Array.isArray(data)?data.length:0})))],market_rows:market.length,joined_count:joined.rows.length,unresolved_count:joined.gaps.length,...joined,discovery:discoveryInventory(snapshot,joined),news:news.flatMap(s=>(s.data??[]).map(x=>({...x,source:s.url}))),limitations:'No global completeness, no chain-specific execution quote, risk or trade decision. Freshness and identity must be checked again before any broadcast.'};
 const dest='research/cleanroom/evidence-latest.json';await mkdir(dirname(dest),{recursive:true});await writeFile(dest,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({finished_at,market_rows:result.market_rows,joined:result.joined_count,unresolved:result.unresolved_count,news:result.news.length,registry:reg.status}));
}
