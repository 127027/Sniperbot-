// Cleanroom read-only market probe. No trading decisions, wallet, or order calls.
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import assert from 'node:assert/strict';
const now=()=>new Date().toISOString();
const num=x=>x!=null&&x!==''&&Number.isFinite(Number(x))?Number(x):null;
const str=x=>typeof x==='string'?x.slice(0,200):null;
const gecko='https://api.geckoterminal.com/api/v2/networks/';
const chains={solana:'solana',eth:'ethereum',bsc:'bsc',base:'base',arbitrum:'arbitrum',polygon_pos:'polygon'};
function pools(j,network){
 if(!Array.isArray(j?.data))throw Error('INVALID_POOL_RESPONSE');
 const included=new Map((j.included??[]).map(x=>[x.id,x.attributes]));
 return j.data.slice(0,30).map(x=>{
  const a=x.attributes??{},id=x.relationships?.base_token?.data?.id,t=included.get(id);
  return {chain:chains[network],contract:str(t?.address),symbol:str(t?.symbol),pool:str(a.address),name:str(a.name),price_usd:num(a.base_token_price_usd),liquidity_usd:num(a.reserve_in_usd),volume_1h_usd:num(a.volume_usd?.h1),change_1h_pct:num(a.price_change_percentage?.h1),buys_1h:num(a.transactions?.h1?.buys),sells_1h:num(a.transactions?.h1?.sells),pool_created_at:str(a.pool_created_at),provider_quote_time:null};
 });
}
function markets(j){if(!Array.isArray(j))throw Error('INVALID_MARKET_RESPONSE');return j.slice(0,100).map(x=>({id:str(x.id),symbol:str(x.symbol),price_eur:num(x.current_price),change_1h_pct:num(x.price_change_percentage_1h_in_currency),volume_24h_eur:num(x.total_volume),provider_quote_time:str(x.last_updated),contract:null,chain:null}));}
function profiles(j){if(!Array.isArray(j))throw Error('INVALID_PROFILES');return j.slice(0,50).map(x=>({chain:str(x.chainId),contract:str(x.tokenAddress),url:str(x.url),provider_quote_time:null}));}
async function request(name,url,parse,headers={}){
 const started=now();try{
 const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{accept:'application/json',...headers},redirect:'error'});
 if(!r.ok)return {name,url,started_at:started,finished_at:now(),status:'HTTP_'+r.status,rows:[]};
 const raw=await r.text();if(raw.length>4_000_000)throw Error('RESPONSE_TOO_LARGE');
 const rows=parse(JSON.parse(raw));return {name,url,started_at:started,finished_at:now(),status:'OK',rows};
 }catch(e){return {name,url,started_at:started,finished_at:now(),status:'ERROR',error:String(e.cause?.code??e.message).slice(0,160),rows:[]}}
}
async function collect(){
 const started=now(),sources=[];let prior={};try{prior=JSON.parse(await readFile(process.env.CLEANROOM_OUTPUT??'research/cleanroom/market-latest.json','utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
 const cgHeaders=process.env.COINGECKO_DEMO_KEY?{'x-cg-demo-api-key':process.env.COINGECKO_DEMO_KEY}:{};
 for(const network of Object.keys(chains)){
  sources.push(await request('GeckoTerminal '+network,gecko+network+'/new_pools?include=base_token,quote_token&page=1',j=>pools(j,network)));
 }
 sources.push(await request('DEX Screener profiles','https://api.dexscreener.com/token-profiles/latest/v1',profiles));
 sources.push(await request('CoinGecko EUR meme markets','https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&category=meme-token&per_page=100&page=1&price_change_percentage=1h',markets,process.env.COINGECKO_DEMO_KEY?{'x-cg-demo-api-key':process.env.COINGECKO_DEMO_KEY}:{}));
 const first=sources.find(s=>s.name==='CoinGecko EUR meme markets');let page=Number(prior.coverage_cursor?.next_market_page)||2;if(page<2||page>1000)page=2;let next=page;
 if(first?.status==='OK'){const extra=await request('CoinGecko EUR meme markets page '+page,'https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&category=meme-token&per_page=100&page='+page+'&price_change_percentage=1h',markets,cgHeaders);sources.push(extra);if(extra.status==='OK')next=extra.rows.length===100?page+1:2;}
 return {coverage_cursor:{next_market_page:next,attempted_market_page:first?.status==='OK'?page:null},schema:'cleanroom.market.probe.v1',mode:'RESEARCH_ONLY',started_at:started,finished_at:now(),coverage:'Bounded first page plus rotating extra market page, not global enumeration. Cursor advances only after successful page response. Pools/profiles are leads, not verified memecoins. No source quote timestamp inferred from retrieval time. No orders.',source_count:sources.length,successful_sources:sources.filter(x=>x.status==='OK').length,rows:sources.reduce((n,x)=>n+x.rows.length,0),sources};
}
if(process.argv.includes('--self-test')){
 assert.equal(num(null),null);assert.equal(num('1.23'),1.23);assert.equal(num(''),null);
 assert.equal(markets([{id:'fixture',current_price:2,last_updated:'2020-01-01T00:00:00Z'}])[0].provider_quote_time,'2020-01-01T00:00:00Z');
 const r=pools({data:[{attributes:{address:'pool',base_token_price_usd:'0.1'},relationships:{base_token:{data:{id:'solana_token'}}}}],included:[{id:'solana_token',attributes:{address:'token',symbol:'FIXTURE'}}]},'solana')[0];
 assert.equal(r.contract,'token');assert.equal(r.provider_quote_time,null);assert.equal(r.price_usd,0.1);assert.equal(profiles([{chainId:'solana',tokenAddress:'fixture'}])[0].contract,'fixture');console.log('Cleanroom parser fixtures passed');
}else{
 const dest=process.env.CLEANROOM_OUTPUT??'research/cleanroom/market-latest.json';
 const repeat=process.argv.includes('--continuous');
 do{const report=await collect();await mkdir(dirname(dest),{recursive:true});await writeFile(dest,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({started_at:report.started_at,finished_at:report.finished_at,successful_sources:report.successful_sources,rows:report.rows,sources:report.sources.map(({name,status})=>({name,status}))}));if(!repeat)break;await new Promise(r=>setTimeout(r,300000));}while(true);
}
