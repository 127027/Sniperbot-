// R29 V6.5: resolve bounded V6.4 ranking TOKEN leads into independently
// identical GeckoTerminal + DexScreener pools, as-of the real fetch time.
// Rankings can be hindsight-biased; a matching pool is research, never a BUY.
import {candidateId} from './research-watchlist.mjs';
import {validTokenAddress,DS_CHAIN} from './market.mjs';

export const RESOLVED_RANKING_SOURCE='R29_RANKING_CROSS_PROVIDER_POOL';
const CHAINS=['solana','base','bsc','eth'];
const GT='https://api.geckoterminal.com/api/v2';
const DS='https://api.dexscreener.com';
const n=x=>x===null||x===undefined||x===''?null:
 (Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null);
const goodTime=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s));
function same(chain,a,b){return typeof a==='string'&&typeof b==='string'&&
 (chain==='solana'?a===b:a.toLowerCase()===b.toLowerCase());}
async function getJson(url,fetcher){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||!['api.geckoterminal.com','api.dexscreener.com'].includes(parsed.hostname))
  throw Error('R29_RANKING_POOL_HOST_DENIED');
 const r=await fetcher(url,{redirect:'error',
  headers:{accept:'application/json','user-agent':'R29BoundedRankingPoolResearch/1'},
  signal:AbortSignal.timeout(8500)});
 if(!r?.ok)throw Error('HTTP_'+(r?.status||'UNKNOWN'));
 if(Number(r.headers?.get?.('content-length')||0)>300000)
  throw Error('RESPONSE_TOO_LARGE');
 return r.json();
}
export function chooseRankingPoolSlots(leads,candidates,{now,limit=2}={}){
 if(!Array.isArray(leads)||!Array.isArray(candidates)||
  !goodTime(now)||!Number.isInteger(limit)||limit<0||limit>4)
  throw Error('R29_RANKING_SELECTION_INVALID');
 const at=Date.parse(now),remaining=new Map();
 for(const lead of leads){
  if(!CHAINS.includes(lead?.chain)||!validTokenAddress(lead.chain,lead.token_address)||
    lead.paper_only!==true||lead.actionable!==false||
    lead.pool_address!==null||lead.candidate_id!==null||
    lead.source!=='SASA_PUBLIC_RANKING_RESEARCH'||
    !goodTime(lead.observed_at_utc)||Date.parse(lead.observed_at_utc)>at||
    at-Date.parse(lead.observed_at_utc)>60*60_000)continue;
  // A ranking is not yet a pool; existing current market identities are enough.
  if(candidates.some(c=>c.chain===lead.chain&&same(c.chain,c.token_address,lead.token_address)))
   continue;
  const key=lead.chain+':'+lead.token_address;
  if(!remaining.has(key))remaining.set(key,lead);
 }
 // Rotate fairly through chains and leads, without a fixed retrospectively known winner.
 const bucket=Math.floor(at/120000),picks=[],order=CHAINS.map((_,i)=>CHAINS[(i+bucket)%CHAINS.length]);
 const groups=new Map(order.map(chain=>[chain,[...remaining.values()].filter(l=>l.chain===chain)]));
 for(let offset=0;picks.length<limit&&offset<48;offset++){
  let any=false;
  for(const chain of order){
   const group=groups.get(chain);
   if(!group?.length)continue;
   any=true;
   const selected=group[(bucket+offset)%group.length];
   if(!picks.some(x=>x.chain===chain&&same(chain,x.token_address,selected.token_address)))
    picks.push(selected);
   if(picks.length>=limit)break;
  }
  if(!any)break;
 }
 return picks;
}
export async function resolveRankingPoolCandidates({leads=[],candidates=[],fetcher=fetch,
 now=new Date().toISOString(),limit=2}={}){
 const slots=chooseRankingPoolSlots(leads,candidates,{now,limit}),resolved=[],checks=[];
 for(const lead of slots){
  const chain=lead.chain,token=lead.token_address,gecko=chain;
  const dsUrl=DS+'/token-pairs/v1/'+DS_CHAIN[chain]+'/'+encodeURIComponent(token);
  const gtUrl=GT+'/networks/'+gecko+'/tokens/'+encodeURIComponent(token)+'/pools?page=1';
  try{
   const [dex,geckoResponse]=await Promise.all([
    getJson(dsUrl,fetcher),getJson(gtUrl,fetcher)]);
   if(!Array.isArray(dex)||dex.length>300||
     !Array.isArray(geckoResponse?.data)||geckoResponse.data.length>100)
    throw Error('R29_RANKING_PROVIDER_SCHEMA_INVALID');
   const dsPairs=dex.filter(p=>p?.chainId===DS_CHAIN[chain]&&
    same(chain,p.baseToken?.address,token)&&
    typeof p.pairAddress==='string'&&Number.isFinite(n(p.liquidity?.usd)))
    .sort((a,b)=>(n(b.liquidity?.usd)||0)-(n(a.liquidity?.usd)||0)).slice(0,15);
   let exact=null;
   for(const p of dsPairs){
    const matched=geckoResponse.data.find(g=>same(chain,g?.attributes?.address,p.pairAddress)&&
     same(chain,(g?.relationships?.base_token?.data?.id||'').replace(new RegExp('^'+gecko+'_'),''),token));
    if(matched){exact={p,g:matched};break;}
   }
   if(!exact){checks.push({chain,status:'POOL_IDENTITY_NOT_CROSS_PROVIDER_CONFIRMED'});continue;}
   const pool=exact.p.pairAddress,attributes=exact.g.attributes;
   let id;try{id=candidateId(chain,token,pool)}catch{
    checks.push({chain,status:'POOL_ADDRESS_INVALID'});continue;
   }
   const poolCreated=Date.parse(attributes.pool_created_at||'');
   const price=n(attributes.base_token_price_usd),
    liq=n(attributes.reserve_in_usd),vol=n(attributes.volume_usd?.m5);
   if(price===null||price<=0||liq===null||liq<1000||
    n(exact.p.priceUsd)===null||n(exact.p.priceUsd)<=0){
    checks.push({chain,status:'POOL_PRICE_OR_LIQUIDITY_UNAVAILABLE'});continue;
   }
   const dsPrice=n(exact.p.priceUsd);
   if(dsPrice/price<0.85||dsPrice/price>1.15){
    checks.push({chain,status:'CROSS_PROVIDER_PRICE_MISMATCH'});continue;
   }
   const c={chain,token_address:token,pool_address:chain==='solana'?pool:pool.toLowerCase(),
    candidate_id:id,observed_at_utc:now,
    pool_created_at_utc:Number.isFinite(poolCreated)&&poolCreated<=Date.parse(now)?
     new Date(poolCreated).toISOString():null,
    price_usd:price,liquidity_usd:liq,volume_m5_usd:vol,
    buys_m5:n(attributes.transactions?.m5?.buys),
    sells_m5:n(attributes.transactions?.m5?.sells),
    source:RESOLVED_RANKING_SOURCE,verification:'CROSS_PROVIDER_IDENTITY',
    promotion_biased:false,source_urls:[gtUrl,dsUrl],
    unresolved_checks:['CONTRACT','LIQUIDITY_RISK','SELLABILITY']};
   if(c.candidate_id!==c.chain+':'+c.token_address+':'+c.pool_address){
    checks.push({chain,status:'POOL_CANONICAL_ID_MISMATCH'});continue;
   }
   resolved.push(c);checks.push({chain,status:'RESEARCH_POOL_MATCHED_NOT_TRADE_APPROVED'});
  }catch(e){
   checks.push({chain,status:/^HTTP_429$/.test(e?.message||'')?
    'RATE_LIMITED':'PROVIDER_UNAVAILABLE_OR_INVALID'});
  }
 }
 return {schema:'r29_ranked_pool_research.v1',paper_only:true,actionable:false,
  observed_at_utc:now,resolved,checks,source:'CROSS_PROVIDER_EXACT_TOKEN_POOL_MATCH',
  warning:'Ranks may be hindsight biased. Two provider pool identity does not prove organic adoption, contract safety, sellability, or executable quotes.'};
}
