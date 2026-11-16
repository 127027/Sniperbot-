// R29 public GPT research: bounded, FREE, read-only EVM security checks.
// Never signs orders, sees a wallet, uses paid APIs or touches the Paper ledger.
// A provider "approved" result is only a historical research fact, NOT a trade.
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sanitizedAdaptiveReview,localDynamicStatusFile} from './r29-adaptive-publisher.mjs';
import {readLocalPaperMarketSnapshot} from './live-paper-autopilot.mjs';
import {collectEvmSecurity} from './live-paper-security.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REPO='127027/Sniperbot-',BRANCH='codex/r29-chatgpt-github-paper-cycle-20261115';
export const GPT_PUBLIC_SECURITY_PATH='research/r29/channel/gpt-paper-security.json';
const ENDPOINT='https://api.github.com/repos/'+REPO+'/contents/'+GPT_PUBLIC_SECURITY_PATH;
const DIGEST=/^[a-f0-9]{64}$/,ADDRESS=/^0x[a-f0-9]{40}$/;
const allowed=new Set(['eth','base','bsc']);
const time=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&s.endsWith('Z');
const tokenValid=t=>typeof t==='string'&&/^(?:github_pat_|ghp_)[A-Za-z0-9_]{15,}$/.test(t);
const localDir=()=>path.join(process.env.LOCALAPPDATA||path.join(ROOT,'.local'),
 'MemeSniperPaper','gpt-paper','security-research');
const readJson=async filename=>{
 const bytes=await readFile(filename);
 if(bytes.length>50000)throw Error('GPT_SECURITY_SOURCE_FILE_TOO_BIG');
 return JSON.parse(bytes.toString('utf8'));
};
const recent=(s,now,max)=>time(s)&&Date.parse(s)<=now&&now-Date.parse(s)<=max;
// The hourly review is a SHORT, volume-ranked sample. It must not exclude
// independent safety checks of newly observed viable EVM pools in the actual
// 2-minute local market feed. Both feeds remain research-only.
function prepareSecurityCandidate(c,now){
 if(!allowed.has(c?.chain)||
   !/^((eth)|(base)|(bsc)):0x[a-f0-9]{40}:0x[a-f0-9]{40}$/.test(c.candidate_id||'')||
   c.candidate_id!==c.chain+':'+c.token_address+':'+c.pool_address||
   c.source!=='GECKOTERMINAL_NEW_POOLS'||
   c.verification!=='CROSS_PROVIDER_IDENTITY'||
   c.promotion_biased!==false||
   !recent(c.observed_at_utc,now,300000)||
   !(Number.isFinite(c.liquidity_usd)&&c.liquidity_usd>=20000)||
   !(Number.isFinite(c.volume_m5_usd)&&c.volume_m5_usd>=1000&&
      c.volume_m5_usd<=c.liquidity_usd*2))
  return null;
 return {chain:c.chain,token_address:c.token_address,
  pool_address:c.pool_address,candidate_id:c.candidate_id,
  liquidity_usd:c.liquidity_usd,volume_m5_usd:c.volume_m5_usd,
  observed_at_utc:c.observed_at_utc,
  source:'FRESH_CROSS_PROVIDER_LOCAL_MARKET'};
}
export function selectSecurityResearchCandidates(review,market,{now=Date.now(),limit=2}={}){
 if(review?.schema!=='sniper_r29_public_dynamic_review.v1'||
  !DIGEST.test(review.review_sha256||'')||
  !Array.isArray(review.candidates)||review.candidates.length>12||
  market?.schema!=='research_market_snapshot.v1'||
  market.paper_only!==true||market.actionable!==false||
  market.collection_status!=='OBSERVED_OR_PARTIAL'||
  !Array.isArray(market.candidates)||market.candidates.length>96||
  !recent(market.published_at_utc,now,300000)||
  !Number.isInteger(limit)||limit<0||limit>2)return [];
 return [...new Map(market.candidates.map(c=>prepareSecurityCandidate(c,now))
  .filter(Boolean).map(c=>[c.candidate_id,c])).values()]
  .sort((a,b)=>b.liquidity_usd-a.liquidity_usd||
    b.volume_m5_usd-a.volume_m5_usd||
    a.candidate_id.localeCompare(b.candidate_id)).slice(0,limit);
}
export function publicSecurityResearchReport({review,market=null,findings=[],now=Date.now()}={}){
 if(review?.schema!=='sniper_r29_public_dynamic_review.v1'||
  !DIGEST.test(review.review_sha256||'')||!time(review.observed_at_utc)||
  !Array.isArray(findings)||findings.length>2)throw Error('GPT_SECURITY_INVALID_REVIEW');
 const out=findings.map(x=>{
  const chain=x.chain,token=x.token_address?.toLowerCase(),
   pool=x.pool_address?.toLowerCase(),gate=x.gate;
  if(!allowed.has(chain)||!ADDRESS.test(token||'')||!ADDRESS.test(pool||'')||
   !(market?
     market.schema==='research_market_snapshot.v1'&&market.paper_only===true&&
     market.actionable===false&&
     recent(market.published_at_utc,now,300000)&&
     market.candidates?.some(c=>c.candidate_id===chain+':'+token+':'+pool&&
      c.source==='GECKOTERMINAL_NEW_POOLS'&&
      c.verification==='CROSS_PROVIDER_IDENTITY'&&
      c.promotion_biased===false&&
      recent(c.observed_at_utc,now,300000)):
     review.candidates.some(c=>c.candidate_id===chain+':'+token+':'+pool))||
   gate?.schema!=='r29_public_evm_security_gate.v1'||
   gate.paper_only!==true||gate.mode!=='PAPER_ONLY'||
   gate.chain!==chain||gate.token_address!==token||
   gate.pool_address!==pool||!time(gate.checked_at_utc)||
   gate.security_is_guaranteed!==false||
   gate.independent_executable_quote_verified!==false||
   !Array.isArray(gate.risk_flags)||gate.risk_flags.length>30||
   gate.risk_flags.some(y=>typeof y!=='string'||!/^([A-Za-z0-9_]{3,100})$/.test(y))||
   !Array.isArray(gate.provider_names)||
   gate.provider_names.join(',')!=='GoPlus,Honeypot.is'||
   typeof gate.approved!=='boolean')
   throw Error('GPT_SECURITY_PROVIDER_FACTS_INVALID');
  return {candidate_id:chain+':'+token+':'+pool,
   chain,token_address:token,pool_address:pool,
   checked_at_utc:gate.checked_at_utc,
   verified_pool_observed_at_utc:market?.published_at_utc||review.observed_at_utc,
   source_scope:market?'FRESH_CROSS_PROVIDER_LOCAL_MARKET':'HOURLY_REVIEW_SAMPLE',
   also_listed_in_hourly_review:review.candidates.some(
    c=>c.candidate_id===chain+':'+token+':'+pool),
   independent_provider_names:['GoPlus','Honeypot.is'],
   goplus_evaluated:gate.goplus_evaluated===true,
   honeypot_simulation_ok:gate.honeypot_simulation_ok===true,
   contract_authorities_ok:gate.contract_authorities_ok===true,
   token_and_pool_matched:gate.exact_token_and_pair_verified===true,
   basic_contract_and_sell_simulation_pass:gate.approved===true,
   risk_codes:gate.risk_flags.map(y=>y.toUpperCase()),
   source_goplus:'https://api.gopluslabs.io/api/v1/token_security',
   source_honeypot:'https://api.honeypot.is/v2/IsHoneypot',
   independent_wallet_adoption_verified:false,
   independent_liquidity_redeemability_verified:false,
   cost_and_slippage_executable_verified:false,
   full_gpt_buy_gate_passed:false};
 });
 return {schema:'sniper_r29_public_gpt_security_research.v1',
  mode:'PAPER_RESEARCH_ONLY',actionable:false,
  authorizes_paper_orders:false,live_trading_enabled:false,
  wallet_or_account_data_included:false,
  review_sha256:review.review_sha256,review_observed_at_utc:review.observed_at_utc,
  market_snapshot_observed_at_utc:market?.published_at_utc||null,
  market_snapshot_is_order_authority:false,
  checked_at_utc:new Date(now).toISOString(),
  candidate_check_count:out.length,
  status:out.length?'PARTIAL_SECURITY_RESEARCH_ONLY':'DATA_GAP_NO_MATCHING_FRESH_EVM_CANDIDATE',
  candidates:out,
  note:'Fresh cross-provider market identity plus basic contract/honeypot indicators ONLY. The hourly review is only a sample; independent wallet adoption, LP redemption, executable quotes and full GPT buy approval remain unverified.'};
}
export async function syncGptPaperSecurityResearch({token,fetcher=fetch,
 securityCheck=collectEvmSecurity,now=Date.now(),
 dynamicFile=localDynamicStatusFile(),
 marketFile=path.join(ROOT,'.local','research-market','latest.json'),
 folder=localDir()}={}){
 if(!tokenValid(token))throw Error('GPT_SECURITY_GITHUB_TOKEN_REQUIRED');
 const status=await readJson(dynamicFile).catch(e=>{
  if(e.code==='ENOENT')return null;throw e;
 });
 if(!status)return {status:'WAITING_FOR_LOCAL_RESEARCH',published:false};
 const valid=()=>status?.schema==='sniper_r29_dynamic_research_status.v1'&&
  status.paper_only===true&&status.actionable===false&&
  DIGEST.test(status.last_review_sha256||'')&&
  time(status.last_review_at_utc)&&
  typeof status.last_review_filename==='string'&&
  /^[0-9]{8}T[0-9]{9}Z-[a-f0-9]{16}\.json$/.test(status.last_review_filename)&&
  /^\d{4}-\d\d-\d\d$/.test(status.day_utc);
 if(!valid())throw Error('GPT_SECURITY_LOCAL_STATUS_INVALID');
 await mkdir(folder,{recursive:true});
 const checkpoint=path.join(folder,'checkpoint.json');
 let last=null;try{last=await readJson(checkpoint)}catch(e){if(e.code!=='ENOENT')throw e;}
 // A review is merely an hourly sample. Reusing its SHA as the scan key would
 // suppress newer pools even when 2-minute market data changed.
 // At most two checks per 60m, avoiding unexpected free API rate/cost changes.
 if(last&&recent(last.checked_at_utc,now,3600000))
  return {status:'RATE_LIMIT_1_HOUR',published:false};
 const rv=await readJson(path.join(path.dirname(dynamicFile),'reviews',
  status.day_utc,status.last_review_filename));
 const review=sanitizedAdaptiveReview(rv,status);
 const market=readLocalPaperMarketSnapshot(marketFile,{now});
 const possible=market.ok?selectSecurityResearchCandidates(review,market.snapshot,{now}):[];
 const results=[];
 for(const c of possible){
  let gate;
  try{gate=await securityCheck({
   chain:c.chain,token:c.token_address,pool:c.pool_address,now});
  }catch{continue} // never synthesize a safe result
  results.push({...c,gate});
 }
 const report=publicSecurityResearchReport({review,market:market.ok?market.snapshot:null,findings:results,now});
 const headers={authorization:'Bearer '+token,accept:'application/vnd.github+json',
  'content-type':'application/json','X-GitHub-Api-Version':'2022-11-28',
  'user-agent':'SniperR29PublicSecurityResearch/1'};
 const get=await fetcher(ENDPOINT+'?ref='+encodeURIComponent(BRANCH),{
  method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(12000)});
 let sha=null;
 if(get.status===200){
  const file=await get.json();
  if(file?.type!=='file'||!/^([a-f0-9]{40})$/.test(file.sha||'')||
    file.encoding!=='base64')throw Error('GPT_SECURITY_GITHUB_READ_INVALID');
  sha=file.sha;
 }else if(get.status!==404)throw Error('GPT_SECURITY_GITHUB_GET_HTTP_'+get.status);
 const data={message:'research(r29): independent read-only GPT contract security facts',
  branch:BRANCH,content:Buffer.from(JSON.stringify(report,null,2)+'\n').toString('base64')};
 if(sha)data.sha=sha;
 const put=await fetcher(ENDPOINT,{method:'PUT',headers,redirect:'error',
  body:JSON.stringify(data),signal:AbortSignal.timeout(12000)});
 if(!put.ok)throw Error('GPT_SECURITY_GITHUB_PUT_HTTP_'+put.status);
 const done=await put.json();
 if(!/^([a-f0-9]{40})$/.test(done?.commit?.sha||''))
  throw Error('GPT_SECURITY_GITHUB_COMMIT_INVALID');
 const temp=checkpoint+'.pending-'+process.pid;
 await writeFile(temp,JSON.stringify({review_sha256:report.review_sha256,
  checked_at_utc:report.checked_at_utc,status:report.status})+'\n',{mode:0o600});
 await rename(temp,checkpoint);
 return {status:'PUBLISHED',published:true,checks:report.candidate_check_count,
  public:report,commit_sha:done.commit.sha};
}
