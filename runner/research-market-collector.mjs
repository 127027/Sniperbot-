// Local public-market research only. No order, wallet, fiat or publisher privileges.
// Provider responses are observations, NOT safety checks or executable quotes.
import {candidateId} from './research-watchlist.mjs';
import {writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const MARKETS=Object.freeze([
  {chain:'solana',gecko:'solana',dex:'solana'},
  {chain:'base',gecko:'base',dex:'base'},
  {chain:'bsc',gecko:'bsc',dex:'bsc'},
  {chain:'eth',gecko:'eth',dex:'ethereum'}
]);
const GT='https://api.geckoterminal.com/api/v2';
const DS='https://api.dexscreener.com';
const numeric=x=>x===undefined||x===null||x===''?null:(Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null);
const utc=x=>{const t=Date.parse(x);return Number.isFinite(t)&&t>0?new Date(t).toISOString():null};
const reason=e=>{
  if(e?.status===429)return 'HTTP_429_RATE_LIMIT';
  if(Number.isInteger(e?.status))return 'HTTP_'+e.status;
  const cause=String(e?.cause?.code||e?.code||'').toUpperCase();
  if(['ENOTFOUND','EAI_AGAIN','ECONNRESET','ECONNREFUSED'].includes(cause))return 'NETWORK_'+cause;
  if(e?.name==='AbortError'||e?.name==='TimeoutError')return 'TIMEOUT';
  return 'SOURCE_UNAVAILABLE';
};
async function getJson(url,fetcher){
  const u=new URL(url);
  if(u.protocol!=='https:'||!['api.geckoterminal.com','api.dexscreener.com'].includes(u.hostname))throw Error('Provider not allowed');
  const response=await fetcher(u.href,{headers:{accept:'application/json','user-agent':'MemeSniperResearchCollector/1.0'},
    signal:AbortSignal.timeout(12000)});
  if(!response?.ok){const e=Error('Provider HTTP error');e.status=response?.status;throw e}
  return response.json();
}
function identity(chain,token,pool){try{return candidateId(chain,token,pool)}catch{return null}}
function gtRecord(raw,m,now,url){
  const att=raw?.attributes,baseTokenId=raw?.relationships?.base_token?.data?.id;
  if(!att||typeof baseTokenId!=='string'||!baseTokenId.startsWith(m.gecko+'_'))return null;
  const token=baseTokenId.slice(m.gecko.length+1),pool=att.address;
  const id=identity(m.chain,token,pool);if(!id)return null;
  const [,canonToken,canonPool]=id.split(':');
  return {chain:m.chain,token_address:canonToken,pool_address:canonPool,candidate_id:id,
    observed_at_utc:now,pool_created_at_utc:utc(att.pool_created_at||att.created_at),
    liquidity_usd:numeric(att.reserve_in_usd),volume_m5_usd:numeric(att.volume_usd?.m5),
    price_usd:numeric(att.base_token_price_usd),buys_m5:numeric(att.transactions?.m5?.buys),
    sells_m5:numeric(att.transactions?.m5?.sells),
    source:'GECKOTERMINAL_NEW_POOLS',verification:'PROVIDER_ONLY',
    promotion_biased:false,source_urls:[url],
    unresolved_checks:['INDEPENDENT_PAIR_IDENTITY','CONTRACT','LIQUIDITY_RISK','SELLABILITY']};
}
function dexRecord(raw,m,now,urls){
  if(raw?.chainId!==m.dex)return null;
  const id=identity(m.chain,raw.baseToken?.address,raw.pairAddress);if(!id)return null;
  const [,token,pool]=id.split(':');
  const createdMs=Number(raw.pairCreatedAt);
  return {chain:m.chain,token_address:token,pool_address:pool,candidate_id:id,
    observed_at_utc:now,pool_created_at_utc:Number.isFinite(createdMs)&&createdMs>0?utc(createdMs):null,
    liquidity_usd:numeric(raw.liquidity?.usd),volume_m5_usd:numeric(raw.volume?.m5),
    price_usd:numeric(raw.priceUsd),buys_m5:numeric(raw.txns?.m5?.buys),
    sells_m5:numeric(raw.txns?.m5?.sells),
    source:'DEXSCREENER_PROMOTED_PROFILE_FALLBACK',verification:'PROVIDER_ONLY',
    promotion_biased:true,source_urls:urls,
    unresolved_checks:['INDEPENDENT_PAIR_IDENTITY','CONTRACT','LIQUIDITY_RISK','SELLABILITY','PAID_PROFILE_BIAS']};
}
const dedup=rows=>[...new Map(rows.map(row=>[row.candidate_id,row])).values()];
function crosscheckRecord(json,m,c){
  if(!Array.isArray(json?.pairs))return false;
  return json.pairs.some(pair=>pair.chainId===m.dex&&identity(m.chain,pair.baseToken?.address,pair.pairAddress)===c.candidate_id);
}
export async function collectSnapshot({fetcher=fetch,now=new Date().toISOString(),pages=2}={}){
  const timestamp=utc(now);if(timestamp!==now)throw Error('Invalid UTC time');
  const coverage=[],candidates=[],failed=[];
  // Page 1 alone drops many launches during rapid waves. Two bounded pages per
  // chain give wider coverage, NOT a complete history of all launches.
  if(!Number.isInteger(pages)||pages<1||pages>2)throw Error('Unzulässiges Discovery-Seitenlimit');
  const surveyed=await Promise.all(MARKETS.map(async m=>{
    const rows=[],failures=[];
    let count=0,successfulPages=0;
    for(let page=1;page<=pages;page++){
      const url=GT+'/networks/'+m.gecko+'/new_pools?page='+page;
      try{
        const data=await getJson(url,fetcher);
        if(!Array.isArray(data?.data))throw Error('Malformed pool data');
        successfulPages++;
        count+=data.data.length;
        rows.push(...data.data.map(p=>gtRecord(p,m,now,url)).filter(Boolean));
      }catch(e){
        failures.push(reason(e));
        // Never multiply 429 or other provider errors with unnecessary retries.
        if(e?.status===429)break;
      }
    }
    return {m,rows:dedup(rows).slice(0,24),count,successfulPages,failures};
  }));
  for(const item of surveyed){
    const {m,rows,count,successfulPages,failures}=item;
    candidates.push(...rows);
    const status=successfulPages===0?(failures[0]||'SOURCE_UNAVAILABLE'):
      failures.length?'PARTIAL':'OK';
    coverage.push({chain:m.chain,source:'GECKOTERMINAL',status,
      pages_ok:successfulPages,pages_requested:pages,provider_rows:count,valid_identities:rows.length,
      ...(failures.length?{failed_pages:failures}: {})});
    if(!successfulPages)failed.push(m);
  }
  // Limit independent pair lookups to two per chain to respect free provider rates.
  for(const m of MARKETS){
    for(const c of candidates.filter(x=>x.chain===m.chain).slice(0,2)){
      const url=DS+'/latest/dex/pairs/'+m.dex+'/'+encodeURIComponent(c.pool_address);
      try{
        const response=await getJson(url,fetcher);
        if(crosscheckRecord(response,m,c)){
          c.verification='CROSS_PROVIDER_IDENTITY';
          c.source_urls.push(url);
          c.unresolved_checks=c.unresolved_checks.filter(x=>x!=='INDEPENDENT_PAIR_IDENTITY');
        }
      }catch(e){c.unresolved_checks.push('PAIR_CHECK_'+reason(e))}
    }
  }
  // Only as a fallback: DEX token profiles can represent promoted/paid exposure.
  // Never claim organic discovery, and never infer a pool from token symbol.
  if(failed.length){
    const profileUrl=DS+'/token-profiles/latest/v1';
    try{
      const profiles=await getJson(profileUrl,fetcher);
      if(!Array.isArray(profiles))throw Error('Malformed profiles');
      for(const m of failed){
        let found=0;
        for(const profile of profiles.filter(x=>x?.chainId===m.dex).slice(0,2)){
          if(!identity(m.chain,profile.tokenAddress,profile.tokenAddress))continue;
          const url=DS+'/token-pairs/v1/'+m.dex+'/'+encodeURIComponent(profile.tokenAddress);
          try{
            const pairs=await getJson(url,fetcher);
            if(!Array.isArray(pairs))continue;
            for(const pair of pairs.slice(0,5)){
              const c=dexRecord(pair,m,now,[profileUrl,url]);
              if(c){candidates.push(c);found++}
            }
          }catch(e){/* Individual token-pair failures do not invalidate other data. */}
        }
        coverage.push({chain:m.chain,source:'DEXSCREENER_PROFILES_FALLBACK',
          status:found?'PROMOTED_PROFILES_ONLY':'NO_PAIR_IDENTITIES',provider_rows:found,valid_identities:found});
      }
    }catch(e){
      for(const m of failed)coverage.push({chain:m.chain,source:'DEXSCREENER_PROFILES_FALLBACK',
        status:reason(e),provider_rows:0,valid_identities:0});
    }
  }
  const found=dedup(candidates).slice(0,96);
  const reachable=coverage.some(x=>x.status==='OK'||x.status==='PARTIAL'||x.status==='PROMOTED_PROFILES_ONLY'||x.status==='NO_PAIR_IDENTITIES');
  return {
    schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
    producer:'Local read-only research market collector',published_at_utc:now,
    collection_status:reachable?'OBSERVED_OR_PARTIAL':'BLOCKED_RESEARCH_DATA_ACCESS',
    coverage,candidates:found,
    summary:{identities:found.length,discovery_cap_per_scan:96,pages_per_chain:pages,cross_checked:found.filter(x=>x.verification==='CROSS_PROVIDER_IDENTITY').length,
      promotional_only:found.filter(x=>x.promotion_biased).length,
      note:'Research only: prices are NOT executable quotes; Contract, LP and sellability remain UNKNOWN.'}
  };
}
export async function writeSnapshot(snapshot,filename){
  if(snapshot?.schema!=='research_market_snapshot.v1'||snapshot.paper_only!==true||snapshot.actionable!==false)throw Error('Non-tradable schema required');
  await mkdir(path.dirname(filename),{recursive:true});
  const tmp=filename+'.tmp-'+process.pid;
  await writeFile(tmp,JSON.stringify(snapshot,null,2)+'\n','utf8');
  await rename(tmp,filename);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const file=process.argv[2];
  if(!file){console.error('Usage: node runner/research-market-collector.mjs <path-to-output.json>');process.exitCode=2}
  else{
    const snapshot=await collectSnapshot().catch(()=>null);
    if(!snapshot||snapshot.collection_status==='BLOCKED_RESEARCH_DATA_ACCESS'){
      console.error('BLOCKED_RESEARCH_DATA_ACCESS: all providers unavailable, no valid observation replaced');
      process.exitCode=1;
    }else{
      await writeSnapshot(snapshot,file);
      console.log('Research snapshot: '+snapshot.summary.identities+' identities (not tradeable)');
      for(const row of snapshot.coverage)console.log(row.chain+' / '+row.source+' / '+row.status);
    }
  }
}
