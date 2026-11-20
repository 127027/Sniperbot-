// R29 V6.4: neutral, prospective, read-only public ranking *lead* discovery.
// No list of known winning coins, no BUY authority, no inferred pool/sell quote.
// Independent of GeckoTerminal; captures the time the page was ACTUALLY fetched.
// A ranking is retrospective at fetch time and is NOT proof of an early entry.
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {validTokenAddress} from './market.mjs';

export const RANKING_SOURCES=Object.freeze([
 {key:'SOLANA_NEW',chain:'solana',url:'https://sasapad.fun/top/new-solana-meme-coins/'},
 {key:'SOLANA_GAINERS',chain:'solana',url:'https://sasapad.fun/top/solana-meme-coin-gainers/'},
 {key:'BSC_NEW',chain:'bsc',url:'https://sasapad.fun/top/new-bnb-chain-meme-coins/'},
 {key:'BSC_GAINERS',chain:'bsc',url:'https://sasapad.fun/top/bnb-chain-meme-coin-gainers/'},
 {key:'BASE_NEW',chain:'base',url:'https://sasapad.fun/top/new-base-meme-coins/'},
 {key:'ETH_GAINERS',chain:'eth',url:'https://sasapad.fun/top/ethereum-meme-coin-gainers/'},
 {key:'ROBINHOOD_NEW',chain:'robinhood',url:'https://sasapad.fun/top/new-robinhood-chain-meme-coins/'},
 {key:'ARC_NEW',chain:'arc',url:'https://sasapad.fun/top/new-arc-meme-coins/'}
]);
export const RANKING_CACHE_MS=30*60_000;
const MAX_HTML=300000,MAX_PUBLIC=48;
const link=/href\s*=\s*["'](?:https:\/\/(?:www\.)?sasapad\.fun)?\/x\/(solana|base|bsc|eth|robinhood|arc)\/([A-Za-z0-9]{32,80})(?:\/|\?|["'])/gi;
const canonical=(chain,token)=>{
 if(!['solana','base','bsc','eth','robinhood','arc'].includes(chain))return null;
 if(chain==='robinhood'||chain==='arc')
  return /^0x[a-fA-F0-9]{40}$/.test(token)?token.toLowerCase():null;
 if(!validTokenAddress(chain,token))return null;
 return chain==='solana'?token:token.toLowerCase();
};
const utc=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s));
export function parseRankingPage(html,{chain,source,observed_at_utc}={}){
 if(typeof html!=='string'||html.length>MAX_HTML||!utc(observed_at_utc)||
  !RANKING_SOURCES.some(s=>s.key===source&&s.chain===chain))
  throw Error('RANKING_PAGE_INVALID_INPUT');
 const out=[],seen=new Set();
 const re=new RegExp(link.source,'gi');
 for(const match of html.matchAll(re)){
  if(match[1]!==chain)continue;
  const token=canonical(chain,match[2]);
  if(!token||seen.has(token))continue;
  seen.add(token);
  out.push({chain,token_address:token,observed_at_utc,
   source:'SASA_PUBLIC_RANKING_RESEARCH',source_key:source,
   source_url:RANKING_SOURCES.find(s=>s.key===source).url,
   token_url:'https://sasapad.fun/x/'+chain+'/'+token+'/',
   pool_address:null,candidate_id:null,
   contract_identity_independently_verified:false,
   pool_identity_verified:false,trade_safety_verified:false,
   paper_entry_authorized:false,paper_only:true,actionable:false,
   claim_status:'RANKING_TOKEN_LEAD_NOT_POOL_OR_EARLY_SIGNAL'});
  if(out.length>=40)break;
 }
 return out;
}
export async function collectPublicRankingResearch({fetcher=fetch,now=new Date().toISOString()}={}){
 if(!utc(now))throw Error('RANKING_TIME_INVALID');
 const groups=[],coverage=[];
 // Fixed neutral source list, never a retrospective winner-name query.
 for(const source of RANKING_SOURCES){
  try{
   const resp=await fetcher(source.url,{redirect:'error',signal:AbortSignal.timeout(10000),
    headers:{accept:'text/html','user-agent':'SniperPaperNeutralRankingResearch/1.0'}});
   if(!resp?.ok)throw Error('HTTP_'+(resp?.status||'UNKNOWN'));
   const declared=Number(resp.headers?.get?.('content-length')||0);
   if(declared>MAX_HTML)throw Error('RESPONSE_TOO_LARGE');
   const html=await resp.text();
   const leads=parseRankingPage(html,{chain:source.chain,source:source.key,observed_at_utc:now});
   groups.push(leads);
   coverage.push({source:source.key,status:leads.length?'OK':'NO_VALID_TOKEN_LINKS',
    token_leads:leads.length,observed_at_utc:now});
  }catch(e){
   groups.push([]);
   coverage.push({source:source.key,status:'SOURCE_UNAVAILABLE',
    reason_code:/^HTTP_[0-9]{3}$/.test(e?.message||'')?e.message:'SOURCE_FAILURE',
    token_leads:0,observed_at_utc:now});
  }
 }
 const seen=new Set(),leads=[];
 // Fair round robin ensures one popular chain never consumes all 48 slots.
 for(let i=0;i<40&&leads.length<MAX_PUBLIC;i++){
  let remaining=false;
  for(const group of groups){
   const l=group[i];if(!l)continue;
   remaining=true;
   const key=l.chain+':'+l.token_address;
   if(!seen.has(key)){seen.add(key);leads.push(l)}
   if(leads.length>=MAX_PUBLIC)break;
  }
  if(!remaining)break;
 }
 return {schema:'r29_public_ranking_research.v1',paper_only:true,actionable:false,
  checked_at_utc:now,leads,coverage,
  provider:'SASA_PUBLIC_HTML_RANKINGS_NOT_INDEPENDENT_SECURITY',
  warning:'A ranked token is a timestamped research lead; a later winner list is hindsight and does not prove early detection, pool identity, executable quotes, or BUY.'};
}
export async function updateLocalRankingResearch({filename,fetcher=fetch,now=new Date().toISOString()}={}){
 if(typeof filename!=='string'||!filename||!utc(now))throw Error('RANKING_CACHE_INVALID');
 try{
  const bytes=await readFile(filename);
  if(bytes.length>150000)throw Error('RANKING_CACHE_TOO_LARGE');
  const cached=JSON.parse(bytes.toString('utf8'));
  const age=Date.parse(now)-Date.parse(cached?.checked_at_utc);
  if(cached?.schema==='r29_public_ranking_research.v1'&&
   cached.paper_only===true&&cached.actionable===false&&
   Array.isArray(cached.leads)&&cached.leads.length<=MAX_PUBLIC&&
   Array.isArray(cached.coverage)&&cached.coverage.length===RANKING_SOURCES.length&&
   Number.isFinite(age)&&age>=0&&age<RANKING_CACHE_MS)
   return {...cached,cached:true};
 }catch(e){
  // A damaged local read-only cache must not disable prospective discovery.
  // Never edit portfolio state or any file outside this dedicated cache.
  if(e.code&&e.code!=='ENOENT')throw e;
 }
 const next=await collectPublicRankingResearch({fetcher,now});
 await mkdir(dirname(filename),{recursive:true});
 const tmp=filename+'.tmp-'+process.pid;
 await writeFile(tmp,JSON.stringify(next,null,2)+'\n','utf8');
 await rename(tmp,filename);
 return {...next,cached:false};
}
