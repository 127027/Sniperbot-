// On-demand public JSON discovery, GitHub Action artifact only, no order publishing.
// One page per chain + one independent pair lookup per chain (sampling, NOT total coverage).
import {mkdir,writeFile} from 'node:fs/promises';
import {decodeGeckoNewPools,crossCheckDexPair} from '../src/live-pool-discovery.mjs';
const networks=['solana','base','eth','bsc','robinhood','cro'];
const rotation=(Number(process.env.GITHUB_RUN_NUMBER)||0)%networks.length;
const nets=[...networks.slice(rotation),...networks.slice(0,rotation)];
let stoppedByRateLimit=false;
const report={schema:1,kind:'LIVE_DISCOVERY_SOURCE_DIAGNOSTIC',captured_at_utc:new Date().toISOString(),
 sample_scope:'6_CHAINS_ONE_PAGE_EACH_NOT_EXHAUSTIVE',not_historical:true,paper_orders_generated:0,client_receipts_generated:0,results:[]};
async function get(url){
 const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(14000)});
 if(!r.ok)throw Error('HTTP_'+r.status);
 return r.json();
}
await mkdir('probe-artifacts',{recursive:true});
for(const network of nets){
 const result={requested_network:network};
 if(stoppedByRateLimit){
  result.status='DEFERRED_DUE_TO_SHARED_PROVIDER_RATE_LIMIT';
  report.results.push(result);
  continue;
 }
 try{
  const url='https://api.geckoterminal.com/api/v2/networks/'+network+'/new_pools?include=base_token,quote_token&page=1';
  const data=await get(url);
  const decoded=decodeGeckoNewPools({network,response:data,capturedAtUtc:new Date().toISOString(),page:1});
  result.fetched_count=decoded.found_count;result.full_contract_count=decoded.with_full_contract;
  result.example_full_contract_candidates=decoded.candidates.filter(c=>c.contract).slice(0,2);
  const sample=decoded.candidates.find(c=>c.contract&&c.pool);
  if(sample){
   const chain=sample.chain;
   const url2='https://api.dexscreener.com/latest/dex/pairs/'+chain+'/'+sample.pool;
   try{result.independent_pair_check=crossCheckDexPair({candidate:sample,response:await get(url2),checkedAtUtc:new Date().toISOString()});}
   catch(err){result.independent_pair_error=String(err.message||err).slice(0,160);}
  }
  result.source_url=url;result.status='GOT_PUBLIC_JSON';result.full_page_saved=true;
  await writeFile('probe-artifacts/live-discovery-'+network+'.json',JSON.stringify(decoded,null,2)+'\n');
 }catch(err){
  result.error=String(err.message||err).slice(0,160);
  result.status=result.error==='HTTP_429'?'RATE_LIMIT_BACKOFF':'SOURCE_ERROR';
  if(result.status==='RATE_LIMIT_BACKOFF')stoppedByRateLimit=true;
 }
 report.results.push(result);
 const shown={...result,example_full_contract_candidates:result.example_full_contract_candidates?.map(c=>({chain:c.chain,pool:c.pool,contract:c.contract,liquidity_usd:c.liquidity_usd}))};
 console.log('DISCOVERY_SAMPLE',JSON.stringify(shown));
}
await writeFile('probe-artifacts/live-discovery-summary.json',JSON.stringify(report,null,2)+'\n');
console.log('DISCOVERY_SUMMARY',JSON.stringify({rotation,rate_limited:stoppedByRateLimit,networks:report.results.length,
 responded:report.results.filter(x=>x.status==='GOT_PUBLIC_JSON').length,
 total_pools:report.results.reduce((s,x)=>s+(x.fetched_count||0),0),
 with_full_contracts:report.results.reduce((s,x)=>s+(x.full_contract_count||0),0),
 independent_matched:report.results.filter(x=>x.independent_pair_check?.matched).length,orders:0}));
