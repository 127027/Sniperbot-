// R27: public-only FIRST-SEEN market/narrative/acceleration inputs,
 // pulled from the existing 2-minute local collector. Never accepts
 // portfolios, secrets, unverified remote orders or current-hindsight claims.
import {readFile} from 'node:fs/promises';
import {validTokenAddress} from './market.mjs';
const MAX_AGE=200000,MAX_BYTES=600000;
const chains=new Set(['solana','eth','base','bsc']);
const valid=(x)=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const uid=(c)=>c?.chain+':'+c?.pool_address;
const idOf=x=>x?.chain+':'+x?.poolAddress;
export function sanitizeR27CollectorSnapshot(record,{now=Date.now()}={}){
 const empty={status:'NO_FRESH_PUBLIC_LOCAL_SNAPSHOT',candidates:[],
  alerts:[],narratives:[],coverage:[],independently_verified_social:false,
  sellability_verified:false};
 if(!record||record.schema!=='research_market_snapshot.v1'||
  record.paper_only!==true||record.actionable!==false||
  !Array.isArray(record.candidates)||record.candidates.length>200||
  !Number.isFinite(Date.parse(record.published_at_utc))||
  Date.parse(record.published_at_utc)>now||
  now-Date.parse(record.published_at_utc)>MAX_AGE)return empty;
 const out=[],allow=new Set();
 for(const c of record.candidates){
  if(!chains.has(c?.chain)||!validTokenAddress(c.chain,c.token_address)||
   !validTokenAddress(c.chain,c.pool_address)||!valid(c.price_usd)||c.price_usd<=0||
   !valid(c.liquidity_usd)||!valid(c.volume_m5_usd))continue;
  const identity=idOf({chain:c.chain,poolAddress:c.pool_address});
  if(allow.has(identity))continue;
  const row={chain:c.chain,tokenAddress:c.token_address,poolAddress:c.pool_address,
   symbol:c.token_address.slice(0,9),name:'Recently observed DEX pool',
   priceUsd:c.price_usd,liquidityUsd:c.liquidity_usd,volume5mUsd:c.volume_m5_usd,
   buys5m:valid(c.buys_m5)?c.buys_m5:null,
   sells5m:valid(c.sells_m5)?c.sells_m5:null,
   score:0,asOf:record.published_at_utc,isDemo:false,
   research_only:true,independent_provider_identity:c.verification==='CROSS_PROVIDER_IDENTITY'};
  out.push(row);allow.add(identity);
 }
 const url=s=>typeof s==='string'&&s.startsWith('https://')&&s.length<=900?s:null;
 const alerts=(record.research_alerts||[]).filter(a=>a?.actionable===false&&
  a.paper_only===true&&chains.has(a.chain)&&
  Number.isFinite(Date.parse(a.observed_at_utc))&&
  now-Date.parse(a.observed_at_utc)>=0&&now-Date.parse(a.observed_at_utc)<=3600000&&
  allow.has(a.chain+':'+a.pool_address)).slice(0,24).map(a=>({
   candidate_id:a.chain+':'+a.pool_address,
   type:'PROVIDER_ACTIVITY_ACCELERATION_NOT_ORGANIC_PROOF',
   observed_at_utc:a.observed_at_utc,
   volume_ratio:valid(a.m5_volume_ratio)?a.m5_volume_ratio:null,
   liquidity_usd:valid(a.current_liquidity_usd)?a.current_liquidity_usd:null,
   source_urls:(a.source_urls||[]).map(url).filter(Boolean).slice(0,3),
   valid_historical_social_proof:false}));
 const narratives=(record.narrative_leads||[]).filter(a=>a?.actionable===false&&
  a.paper_only===true&&a.candidate_id&&a.pool_address&&
  allow.has(a.chain+':'+a.pool_address)).slice(0,24).map(a=>({
   candidate_id:a.chain+':'+a.pool_address,
   signal_categories:(a.signal_categories||[]).filter(s=>typeof s==='string').slice(0,4),
   paid_promotion:a.paid_promotion_seen===true,
   organic_social_verified:false,
   source_urls:(a.source_urls||[]).map(url).filter(Boolean).slice(0,3)}));
 return {...empty,status:'FRESH_PUBLIC_LOCAL_SNAPSHOT',candidates:out.slice(0,96),
  alerts,narratives,
  coverage:(record.coverage||[]).slice(0,8).map(c=>({
   chain:c.chain,source:c.source,status:c.status,pages_ok:c.pages_ok||0})),
  snapshot_at_utc:record.published_at_utc};
}
export async function loadR27EarlyContext({filename,now=Date.now()}={}){
 try{
  const bytes=await readFile(filename);
  if(bytes.length>MAX_BYTES)throw Error('R27_LOCAL_CONTEXT_OVERSIZED');
  return sanitizeR27CollectorSnapshot(JSON.parse(bytes.toString('utf8')),{now});
 }catch(e){return {status:'UNAVAILABLE_'+(e.code||e.message||'UNKNOWN').slice(0,60),
  candidates:[],alerts:[],narratives:[],coverage:[],
  independently_verified_social:false,sellability_verified:false}}
}
export function mergeR27Candidates(existing,early){
 const by=new Map();
 for(const c of [...(existing||[]),...(early?.candidates||[])]){
  if(!c||!chains.has(c.chain)||!validTokenAddress(c.chain,c.tokenAddress)||
   !validTokenAddress(c.chain,c.poolAddress))continue;
  const k=idOf(c);
  const old=by.get(k);
  if(!old||Date.parse(c.asOf)>Date.parse(old.asOf))by.set(k,c);
 }
 return [...by.values()].slice(0,100);
}
