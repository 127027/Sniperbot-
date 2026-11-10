// V0.6 public, outbound-only narrative discovery. This supplements price charts
// with NEW token profiles, public community-takeover claims and paid boost events.
// Nothing here is an independent social-post verification, organic demand proof,
// authenticated five-Dot vote, swap route, order or buy signal.
import {validTokenAddress} from './market.mjs';
const BASE='https://api.dexscreener.com';
const SOURCES=[
 {path:'/token-profiles/latest/v1',tag:'NEW_TOKEN_PROFILE',paid:false},
 {path:'/community-takeovers/latest/v1',tag:'COMMUNITY_TAKEOVER_UNVERIFIED',paid:false},
 {path:'/token-boosts/latest/v1',tag:'PAID_BOOST',paid:true}
];
const CHAINS={solana:'solana',base:'base',bsc:'bsc',ethereum:'eth',eth:'eth'};
const normalize=(chain,token)=>{
 const ch=CHAINS[String(chain||'').toLowerCase()];
 if(!ch||typeof token!=='string'||!validTokenAddress(ch,token))return null;
 return {chain:ch,token_address:ch==='solana'?token:token.toLowerCase()};
};
function poolLookup(pools){
 const map=new Map();
 for(const p of pools||[]){
  const id=normalize(p?.chain,p?.token_address);
  if(!id||typeof p?.candidate_id!=='string'||typeof p?.pool_address!=='string')continue;
  const key=id.chain+':'+id.token_address;
  const arr=map.get(key)||[];
  arr.push({candidate_id:p.candidate_id,pool_address:p.pool_address});
  map.set(key,arr);
 }
 return map;
}
async function readLatest({fetcher,url}){
 const response=await fetcher(url,{headers:{accept:'application/json','user-agent':'MemeSniperPublicNarrativeRadar/1.0'},
  redirect:'error',signal:AbortSignal.timeout(9500)});
 if(!response?.ok)throw Error('HTTP_'+(response?.status||'UNKNOWN'));
 const declared=Number(response.headers?.get?.('content-length')||0);
 if(declared>180000)throw Error('RESPONSE_TOO_LARGE');
 const json=await response.json();
 if(!Array.isArray(json)||json.length>400)throw Error('PROVIDER_SCHEMA_UNKNOWN');
 return json;
}
export async function collectNarrativeLeads({fetcher=fetch,now=new Date().toISOString(),pools=[]}={}){
 if(!Number.isFinite(Date.parse(now))||!Array.isArray(pools))throw Error('INVALID_NARRATIVE_INPUT');
 const linked=poolLookup(pools),found=new Map(),coverage=[];
 for(const source of SOURCES){
  try{
   const rows=await readLatest({fetcher,url:BASE+source.path});
   let valid=0;
   for(const r of rows.slice(0,120)){
    const id=normalize(r?.chainId,r?.tokenAddress);
    if(!id)continue;
    valid++;
    const key=id.chain+':'+id.token_address;
    if(!found.has(key))found.set(key,{...id,observed_at_utc:now,
      origin:'DEXSCREENER_METADATA_ONLY',source_urls:[],signal_categories:[],
      paid_promotion_seen:false,organic_social_verified:false,
      candidate_id:null,pool_address:null,paper_only:true,actionable:false,
      probability_pct:null,claim_status:'UNVERIFIED_COIN_OR_NARRATIVE'});
    const lead=found.get(key);
    lead.signal_categories.push(source.tag);
    lead.source_urls.push(BASE+source.path);
    lead.paid_promotion_seen ||= source.paid;
    const matches=linked.get(key)||[];
    if(matches.length===1){
     lead.candidate_id=matches[0].candidate_id;
     lead.pool_address=matches[0].pool_address;
     lead.claim_status='SAME_CHAIN_TOKEN_POOL_LINK_NOT_SAFETY_VALIDATED';
    }else if(matches.length>1)lead.claim_status='MULTIPLE_POOLS_REQUIRE_REVIEW';
  }
   coverage.push({source:source.tag,status:'OK',rows_received:rows.length,valid_chain_token_records:valid});
  }catch(e){
   coverage.push({source:source.tag,status:'SOURCE_UNAVAILABLE',
     error_code:String(e?.message||'SOURCE_UNAVAILABLE').slice(0,75)});
  }
 }
 const leads=[...found.values()].map(l=>({...l,
  signal_categories:[...new Set(l.signal_categories)],source_urls:[...new Set(l.source_urls)]}))
 .sort((a,b)=>(!!b.candidate_id)-(!!a.candidate_id)||
  b.signal_categories.length-a.signal_categories.length||
  (a.chain+':'+a.token_address).localeCompare(b.chain+':'+b.token_address))
 .slice(0,24);
 return {schema:'research_narrative_leads.v1',paper_only:true,actionable:false,
  observed_at_utc:now,leads,coverage,
  warning:'DEX Screener profiles/boosts are metadata or PAID promotions, not first-party social proof, not an early breakout forecast, and never executable Paper BUY.'};
}
