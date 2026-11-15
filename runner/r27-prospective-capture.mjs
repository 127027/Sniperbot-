// R27 durable first-observed PUBLIC research captures, no private wallet,
// secrets, order submitters or historical truth invented from later metadata.
// Local append-only journal. Its timestamps are local observations, NOT
// independently audited archives or a guarantee of complete DEX coverage.
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {validTokenAddress} from './market.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const ts=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&s.endsWith('Z')?Date.parse(s):NaN;
const bounded=(x,max)=>typeof x==='string'&&x.length<=max?x:null;
const safeUrl=s=>{
 try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=900?u.href:null}
 catch{return null}
};
const availableChain=new Set(['solana','eth','base','bsc']);
function marketRecord(c,now){
 if(!c||!availableChain.has(c.chain)||!validTokenAddress(c.chain,c.token_address)||
  !validTokenAddress(c.chain,c.pool_address)||typeof c.candidate_id!=='string'||
  !c.candidate_id.startsWith(c.chain+':'))return null;
 const numeric=(n)=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;
 return {kind:'POOL_OBSERVATION',candidate_id:c.candidate_id,
  chain:c.chain,token_address:c.token_address,pool_address:c.pool_address,
  provider:bounded(c.source,100),verification:bounded(c.verification,100),
  advertised_pool_created_at_utc:Number.isFinite(ts(c.pool_created_at_utc))?
   c.pool_created_at_utc:null,
  first_local_observed_at_utc:now,
  original_provider_observed_at_utc:bounded(c.observed_at_utc,40),
  price_usd:numeric(c.price_usd),liquidity_usd:numeric(c.liquidity_usd),
  volume_m5_usd:numeric(c.volume_m5_usd),buys_m5:numeric(c.buys_m5),
  sells_m5:numeric(c.sells_m5),
  advertised_promotion_bias:c.promotion_biased===true,
  source_urls:(c.source_urls||[]).slice(0,3).map(safeUrl).filter(Boolean),
  contract_security_verified:false,sellability_verified:false,
  complete_pool_universe:false,paper_only:true,actionable:false};
}
function newsRecord(n,now){
 const url=safeUrl(n?.source_url);
 if(!url||typeof n?.event_id!=='string'||!/^news-[0-9a-f]{32}$/.test(n.event_id))return null;
 const original=ts(n.original_published_at_utc);
 if(!Number.isFinite(original)||original>Date.parse(now))return null;
 return {kind:'NEWS_HEADLINE_FIRST_SEEN',event_id:n.event_id,
  source_url:url,source_name:bounded(n.source_name,80),
  headline:bounded(n.title,700),
  claimed_published_at_utc:n.original_published_at_utc,
  first_local_observed_at_utc:now,source_claim_unverified:true,
  candidate_id:null,post_content_independently_verified:false,
  paper_only:true,actionable:false};
}
export function buildR27Capture(snapshot,news,{now=new Date().toISOString()}={}){
 if(!Number.isFinite(ts(now))||snapshot?.schema!=='research_market_snapshot.v1'||
  snapshot.paper_only!==true||snapshot.actionable!==false||
  !Array.isArray(snapshot.candidates)||snapshot.candidates.length>200||
  !Array.isArray(news?.leads)||news.leads.length>200)
  throw Error('R27_CAPTURE_SOURCE_INVALID');
 const market=snapshot.candidates.map(c=>marketRecord(c,now)).filter(Boolean).slice(0,96);
 const newsRows=news.leads.map(n=>newsRecord(n,now)).filter(Boolean).slice(0,40);
 const data={schema:'r27_public_first_observed_capture.v1',
  first_local_capture_at_utc:now,
  independent_external_asof_attestation:false,
  coverage_complete:false,
  market_source_status:snapshot.collection_status,
  market_sources:snapshot.coverage,
  news_source_coverage:news.coverage,
  public_pool_observations:market,
  public_news_headlines:newsRows,
  warning:'Local first-seen only; not a independently timestamped historical archive, contract security proof, sellability proof or trade signal.'};
 return {...data,sha256_payload:sha(JSON.stringify(data))};
}
export async function appendR27Capture(snapshot,news,{
 folder,now=new Date().toISOString(),maxBytes=450000
}={}){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||
  !Number.isInteger(maxBytes)||maxBytes<2048||maxBytes>2000000)
  throw Error('R27_BAD_OUTPUT_FOLDER');
 const observation=buildR27Capture(snapshot,news,{now});
 const body=JSON.stringify(observation)+'\n';
 if(Buffer.byteLength(body)>maxBytes)throw Error('R27_PUBLIC_CAPTURE_TOO_LARGE');
 const day=now.slice(0,10).replace(/-/g,'');
 const basename=now.replace(/[-:.]/g,'').replace(/Z$/,'Z')+
  '-'+observation.sha256_payload.slice(0,16)+'.json';
 const directory=path.join(folder,day);
 await mkdir(directory,{recursive:true});
 const filename=path.join(directory,basename);
 try{await writeFile(filename,body,{flag:'wx',mode:0o600});}
 catch(e){
  if(e.code!=='EEXIST')throw e;
  // Existing immutable record must be the exact same bytes. No overwrites.
  const old=await readFile(filename,'utf8');
  if(old!==body)throw Error('R27_CAPTURE_FILENAME_CONFLICT');
  return {created:false,filename,sha256_payload:observation.sha256_payload,
   pools:observation.public_pool_observations.length,headlines:observation.public_news_headlines.length};
 }
 return {created:true,filename,sha256_payload:observation.sha256_payload,
  pools:observation.public_pool_observations.length,headlines:observation.public_news_headlines.length};
}
