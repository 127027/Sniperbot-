import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const networks={solana:'solana',ethereum:'eth',base:'base',bsc:'bsc',optimism:'optimism',arbitrum:'arbitrum',polygon:'polygon_pos',avalanche:'avax'};
const same=(c,a,b)=>typeof a==='string'&&typeof b==='string'&&(c==='solana'?a===b:a.toLowerCase()===b.toLowerCase());
const valid=(c,a)=>Object.hasOwn(networks,c)&&typeof a==='string'&&(c==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a):/^0x[0-9a-fA-F]{40}$/.test(a));
const positive=x=>Number.isFinite(Number(x))&&Number(x)>0;
export function dexRows(j,c,a){
 if(!Array.isArray(j))throw Error('DEX_SCHEMA');
 return j.filter(p=>p.chainId===c&&same(c,p.baseToken?.address,a)&&typeof p.pairAddress==='string'&&positive(p.priceUsd)&&positive(p.liquidity?.usd)).map(p=>({chain:c,contract:p.baseToken.address,pool:p.pairAddress,price_usd:Number(p.priceUsd),liquidity_usd:Number(p.liquidity.usd),volume_1h_usd:p.volume?.h1??null,change_1h_pct:p.priceChange?.h1??null,provider_quote_time:null}));
}
export function geckoRows(j,c,a){
 if(!Array.isArray(j?.data))throw Error('GECKO_SCHEMA');
 const n=networks[c]+'_';
 return j.data.filter(p=>p.type==='pool'&&p.id===n+p.attributes?.address&&typeof p.relationships?.base_token?.data?.id==='string'&&p.relationships.base_token.data.id.startsWith(n)&&same(c,p.relationships.base_token.data.id.slice(n.length),a)&&positive(p.attributes?.base_token_price_usd)&&positive(p.attributes?.reserve_in_usd)).map(p=>({chain:c,contract:p.relationships.base_token.data.id.slice(n.length),pool:p.attributes.address,price_usd:Number(p.attributes.base_token_price_usd),liquidity_usd:Number(p.attributes.reserve_in_usd),volume_1h_usd:p.attributes.volume_usd?.h1??null,change_1h_pct:p.attributes.price_change_percentage?.h1??null,provider_quote_time:null}));
}
async function request(provider,url,parse,c,a,fetcher){
 const started_at=new Date().toISOString();let http_status=null,response_sha256=null,response_bytes=null;
 try{
  const r=await fetcher(url,{signal:AbortSignal.timeout(12000),headers:{accept:'application/json'},redirect:'error'});
  http_status=r.status;
  const chunks=[];let size=0;
  if(r.body){for await(const chunk of r.body){size+=chunk.byteLength;if(size>2*1024*1024)throw Error('RESPONSE_TOO_LARGE');chunks.push(Buffer.from(chunk));}}
  const bytes=Buffer.concat(chunks);response_bytes=bytes.length;response_sha256=createHash('sha256').update(bytes).digest('hex');
  if(!r.ok)return {provider,url,started_at,finished_at:new Date().toISOString(),http_status,response_sha256,response_bytes,status:'HTTP_ERROR',error:'HTTP_'+r.status,retry_after:r.headers.get('retry-after'),rows:[]};
  const j=JSON.parse(bytes.toString('utf8')),rows=parse(j,c,a);
  return {provider,url,started_at,finished_at:new Date().toISOString(),http_status,response_sha256,response_bytes,status:rows.length?'EXACT_POOL_MATCH':'NO_EXACT_POOL',error:null,rows};
 }catch(e){return {provider,url,started_at,finished_at:new Date().toISOString(),http_status,response_sha256,response_bytes,status:'REQUEST_OR_PARSE_ERROR',error:String(e.name)+': '+String(e.message).slice(0,250),rows:[]}}
}
export async function lookup(c,a,fetcher=fetch){
 if(!valid(c,a))throw Error('INVALID_CHAIN_OR_CONTRACT');
 const d=await request('DexScreener','https://api.dexscreener.com/tokens/v1/'+c+'/'+a,dexRows,c,a,fetcher);
 const g=await request('GeckoTerminal','https://api.geckoterminal.com/api/v2/networks/'+networks[c]+'/tokens/'+a+'/pools',geckoRows,c,a,fetcher);
 return {schema:'r31.exact-contract-probe.v1',mode:'RESEARCH_ONLY',non_executable:true,chain:c,contract:a,attempts:[d,g],exact_pool_matches:d.rows.length+g.rows.length,quote_scope:'MARKET_OBSERVATION_ONLY',qualified_buys:0,limitations:'Retrieval timestamp is not provider trade timestamp. No size-specific quote, sellability, security or complete costs implied.'};
}
async function test(){
 const a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),p={chainId:'ethereum',baseToken:{address:a},pairAddress:b,priceUsd:'1',liquidity:{usd:100}};
 assert.equal(dexRows([p,{...p,chainId:'base'},{...p,baseToken:{address:b}}],'ethereum',a).length,1);
 const g={type:'pool',id:'eth_'+b,attributes:{address:b,base_token_price_usd:'1',reserve_in_usd:'100'},relationships:{base_token:{data:{id:'eth_'+a}}}};
 assert.equal(geckoRows({data:[g,{...g,id:'base_'+b}]},'ethereum',a).length,1);
 assert.equal(geckoRows({data:[g]},'ethereum',b).length,0);
 let calls=0;const r=await lookup('ethereum',a,async()=>{calls++;return calls===1?new Response('rate limit',{status:429}):Response.json({data:[g]})});
 assert.equal(r.attempts[0].http_status,429);assert.equal(r.attempts[0].response_sha256,createHash('sha256').update('rate limit').digest('hex'));assert.equal(r.exact_pool_matches,1);assert.equal(r.qualified_buys,0);
 await assert.rejects(()=>lookup('ethereum','bad'),/INVALID_CHAIN/);
 console.log('Exact lookup fixtures passed: chain/address mismatch, fallback after 429, no implied BUY');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.includes('--self-test'))await test();else{const args=process.argv.slice(2);for(let i=0;i<args.length;i+=2)console.log(JSON.stringify(await lookup(args[i],args[i+1])))}}
