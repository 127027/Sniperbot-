// V1.8 read-only provider sampler for eventual local shadow monitoring.
// This does NOT persist evidence, attest provider quote times, trade or publish orders.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
const nowIso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const number=x=>{const n=Number(x);return x==null||x===''||!Number.isFinite(n)?null:n};
const eq=(c,a,b)=>c==='solana'?a===b:String(a).toLowerCase()===String(b).toLowerCase();
const gap=(code)=>({status:'DATA_GAP',code});
const net=(c,type)=>type==='gecko'?(c==='ethereum'?'eth':c==='cronos'?'cro':c)
 :(c==='ethereum'?'ethereum':c==='cronos'?'cronos':c);
async function defaultFetchJson(url){
 const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('HTTP_'+response.status);
 return response.json();
}
export async function observePositionShadow({coin,observedAtUtc,fetchJson=defaultFetchJson}={}){
 const ch=canonicalChain(coin?.chain),at=nowIso(observedAtUtc);
 if(!at||!ch||!tokenValid(ch,coin?.contract)||!poolValid(ch,coin?.pool,coin?.pool_kind))
   throw Error('INVALID_SHADOW_MARKET_IDENTITY');
 if(typeof fetchJson!=='function')throw Error('INVALID_SHADOW_FETCHER');
 const geckoUrl='https://api.geckoterminal.com/api/v2/networks/'+net(ch,'gecko')+'/pools/'+encodeURIComponent(coin.pool)+'?include=base_token';
 const dexUrl='https://api.dexscreener.com/latest/dex/pairs/'+net(ch,'dex')+'/'+encodeURIComponent(coin.pool);
 const jobs=await Promise.allSettled([fetchJson(geckoUrl),fetchJson(dexUrl)]);
 const observations=[],gaps=[];
 for(let i=0;i<jobs.length;i++){
   if(jobs[i].status!=='fulfilled'){gaps.push({provider:i===0?'GECKOTERMINAL':'DEXSCREENER',
     code:String(jobs[i].reason?.message||jobs[i].reason).slice(0,100)});continue;}
   const data=jobs[i].value;
   if(i===0){
     const pool=data?.data?.attributes?.address;
     const id=data?.data?.relationships?.base_token?.data?.id;
     const base=(data?.included||[]).find(x=>x.id===id);
     const contract=base?.attributes?.address;
     if(!eq(ch,pool,coin.pool)||!eq(ch,contract,coin.contract)){
       gaps.push({provider:'GECKOTERMINAL',code:'EXACT_POOL_TOKEN_MISMATCH'});continue;
     }
     const price=number(data.data.attributes.base_token_price_usd),liq=number(data.data.attributes.reserve_in_usd);
     if(!(price>0)||!(liq>=0)){gaps.push({provider:'GECKOTERMINAL',code:'PRICE_OR_LIQUIDITY_MISSING'});continue;}
     observations.push({chain:ch,pool:coin.pool,contract:coin.contract,provider_id:'GECKOTERMINAL',
       source_url:'https://www.geckoterminal.com/'+net(ch,'gecko')+'/pools/'+coin.pool,
       captured_at_utc:at,provider_quote_asof_utc:null,price_usdc:price,liquidity_usdc:liq,
       source_archive_blob_sha:null,origin:'UNARCHIVED_HTTP_CAPTURE'});
   }else{
     const pair=(Array.isArray(data?.pairs)?data.pairs:[]).find(x=>
       canonicalChain(x?.chainId)===ch&&eq(ch,x?.pairAddress,coin.pool)
       &&eq(ch,x?.baseToken?.address,coin.contract));
     if(!pair){gaps.push({provider:'DEXSCREENER',code:'EXACT_POOL_TOKEN_MISMATCH'});continue;}
     const price=number(pair.priceUsd),liq=number(pair.liquidity?.usd);
     if(!(price>0)||!(liq>=0)){gaps.push({provider:'DEXSCREENER',code:'PRICE_OR_LIQUIDITY_MISSING'});continue;}
     observations.push({chain:ch,pool:coin.pool,contract:coin.contract,provider_id:'DEXSCREENER',
       source_url:'https://dexscreener.com/'+net(ch,'dex')+'/'+coin.pool,
       captured_at_utc:at,provider_quote_asof_utc:null,price_usdc:price,liquidity_usdc:liq,
       source_archive_blob_sha:null,origin:'UNARCHIVED_HTTP_CAPTURE'});
   }
 }
 return {schema:1,kind:'R29_V18_SHADOW_MARKET_SAMPLE',mode:'SHADOW_ONLY',
  observed_at_utc:at,coin,observations,gaps,independent_provider_observations:observations.length,
  provider_quote_times_verified:false,raw_response_blobs_archived:false,
  trade_authorized:false,paper_filled:false,
  caution:'HTTP capture time is not provider quote as-of. Requires immutable capture, source timestamps and risk review before executable PAPER exits.'};
}
