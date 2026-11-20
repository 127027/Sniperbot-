// V6.11 - A deliberately INDICATIVE web-observation PAPER-only price contract.
// GPT produces a Github-archived record from at least two independent public
// HTML pages. No provider API is called by Windows. This is NOT an executable
// quote, verified onchain trade, independently verified sellability or real PnL.
// Invalid/future/contradictory records must never authorize a Paper ledger fill.
import {validTokenAddress} from './market.mjs';

export const GPT_WEB_PRICE_SCHEMA='sniper_r29_gpt_web_price_evidence.v1';
const allowedHost=new Set([
 'dexscreener.com','www.dexscreener.com',
 'geckoterminal.com','www.geckoterminal.com',
 'dexview.com','www.dexview.com',
 'dextools.io','www.dextools.io',
 'birdeye.so','www.birdeye.so',
 'trenchie.trade','www.trenchie.trade',
 'defined.fi','www.defined.fi'
]);
const hostRoot=h=>h.replace(/^www\./,'');
const exactKeys=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===[...keys].sort().join('|');
const finitePos=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const obs=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(s)&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
export function validateGptWebPriceEvidence(e,{chain,token,pool,now=Date.now()}={}){
 if(!Number.isFinite(now)||!['solana','base','bsc','eth'].includes(chain)||
   !validTokenAddress(chain,token)||!validTokenAddress(chain,pool)||
   !exactKeys(e,['schema','mode','chain','token_address','pool_address',
     'observed_at_utc','price_usd','liquidity_usd','sources',
     'quote_quality','sellability_verified','executable_quote_verified'])||
   e.schema!==GPT_WEB_PRICE_SCHEMA||e.mode!=='PAPER_ONLY'||
   e.chain!==chain||String(e.token_address).toLowerCase()!==token.toLowerCase()||
   String(e.pool_address).toLowerCase()!==pool.toLowerCase()||
   e.quote_quality!=='INDICATIVE_WEB_ONLY'||e.sellability_verified!==false||
   e.executable_quote_verified!==false||!finitePos(e.price_usd)||
   e.price_usd>=1e9||!finitePos(e.liquidity_usd)||e.liquidity_usd<10000||
   !Array.isArray(e.sources)||e.sources.length<2||e.sources.length>3)
  throw Error('GPT_WEB_PRICE_SCHEMA_OR_IDENTITY_INVALID');
 const at=obs(e.observed_at_utc);
 if(at===null||at>now||now-at>120000)
  throw Error('GPT_WEB_PRICE_STALE_OR_FUTURE');
 const sites=new Set();
 for(const s of e.sources){
  if(!exactKeys(s,['url','observed_at_utc','price_usd','liquidity_usd'])||
   !finitePos(s.price_usd)||!finitePos(s.liquidity_usd))
   throw Error('GPT_WEB_SOURCE_FIELDS_INVALID');
  const observed=obs(s.observed_at_utc);
  if(observed===null||observed>now||now-observed>120000||
   Math.abs(observed-at)>90000)
   throw Error('GPT_WEB_SOURCE_STALE_OR_FUTURE');
  if(s.price_usd/e.price_usd<0.9||s.price_usd/e.price_usd>1.1||
   s.liquidity_usd/e.liquidity_usd<0.6||
   s.liquidity_usd/e.liquidity_usd>1.5)
   throw Error('GPT_WEB_SOURCES_CONTRADICT_QUOTE');
  let u;
  try{u=new URL(s.url)}catch{throw Error('GPT_WEB_SOURCE_URL_INVALID')}
  if(u.protocol!=='https:'||u.port||u.username||u.password||
   u.href.length>500||!allowedHost.has(u.hostname)||u.hash)
   throw Error('GPT_WEB_SOURCE_URL_NOT_ALLOWED');
  const text=(u.pathname+u.search).toLowerCase();
  if(!text.includes(token.toLowerCase())&&!text.includes(pool.toLowerCase()))
   throw Error('GPT_WEB_SOURCE_LACKS_EXACT_TOKEN_OR_POOL');
  const host=hostRoot(u.hostname);
  if(sites.has(host))throw Error('GPT_WEB_SOURCES_NOT_INDEPENDENT_HOSTS');
  sites.add(host);
 }
 return {schema:GPT_WEB_PRICE_SCHEMA,mode:'PAPER_ONLY',
  chain,token_address:token,pool_address:pool,
  priceUsd:e.price_usd,liquidityUsd:e.liquidity_usd,
  asOf:e.observed_at_utc,source:'GPT_WEB_PRICE_INDICATIVE',
  symbol:token.slice(0,Math.min(8,token.length)),
  name:'GPT web-beobachteter Coin',
  sourceCount:e.sources.length,sellability_verified:false,
  executable_quote_verified:false,provenance_urls:e.sources.map(x=>x.url)};
}
