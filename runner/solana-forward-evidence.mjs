// Solana R29 read-only prospective GPT research: finalize mint evidence,
// optional 2-way indicative Jupiter quotes. NEVER authorizes a BUY/SELL.
// No private wallets, market orders, payment or signing endpoints are used.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeBase58} from './local-solana-vault.mjs';
import {SOLANA_MAINNET_RPC} from './local-solana-balance.mjs';
import {analyzeSolanaMintHeader} from './solana-mint-risk.mjs';
import {previewSolanaSwapRoundtrip} from './solana-swap-roundtrip.mjs';
import {candidateId} from './research-watchlist.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MAX_MS=5*60_000;
const MAX_RPC=20_000;
const MEME_REVIEW_SCHEMA='sniper_r29_solana_forward_evidence.v1';
export const PUBLIC_SOLANA_EVIDENCE_PATH='research/r29/channel/solana-forward-evidence.json';
const ENDPOINT='https://api.github.com/repos/127027/Sniperbot-/contents/'+PUBLIC_SOLANA_EVIDENCE_PATH;
const BRANCH='codex/r29-chatgpt-github-paper-cycle-20261115';
const HASH=/^[0-9a-f]{40}$/;
const iso=x=>typeof x==='string'&&x.endsWith('Z')&&Number.isFinite(Date.parse(x));
const age=(x,now)=>iso(x)&&Date.parse(x)<=now&&now-Date.parse(x)<=MAX_MS;
function safePublicMint(mint){
 try{if(decodeBase58(mint).length!==32)return false}catch{return false}
 return true;
}
const hostOk=x=>{
 try{const u=new URL(x);return u.protocol==='https:'&&
  ['api.geckoterminal.com','api.dexscreener.com'].includes(u.hostname)&&
  !u.username&&!u.password&&!u.port}catch{return false}
};
const failure=e=>e?.name==='AbortError'||e?.name==='TimeoutError'?'PROVIDER_TIMEOUT':
 typeof e?.message==='string'&&e.message==='JUPITER_QUOTE_UNAVAILABLE'?'QUOTE_PROVIDER_UNAVAILABLE':
 'READ_ONLY_PROVIDER_OR_PROVENANCE_FAILED';

export async function readFinalizedSolanaMint(mint,{fetcher=fetch,now=Date.now()}={}){
 if(!safePublicMint(mint)||!Number.isFinite(now))
  throw Error('SOLANA_MINT_READ_INVALID_IDENTITY');
 const response=await fetcher(SOLANA_MAINNET_RPC,{method:'POST',
  redirect:'error',headers:{accept:'application/json','content-type':'application/json'},
  body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getAccountInfo',
   params:[mint,{encoding:'base64',commitment:'finalized'}]}),
  signal:AbortSignal.timeout(10000)});
 if(!response?.ok||Number(response.headers?.get?.('content-length')||0)>MAX_RPC)
  throw Error('SOLANA_MINT_RPC_NOT_AVAILABLE');
 const raw=await response.text();
 if(Buffer.byteLength(raw,'utf8')>MAX_RPC)throw Error('SOLANA_MINT_RPC_TOO_LARGE');
 const data=JSON.parse(raw);
 if(data?.jsonrpc!=='2.0'||data.id!==1||data.error||
  !Number.isSafeInteger(data.result?.context?.slot)||data.result.context.slot<0||
  !data.result.value||typeof data.result.value!=='object')
  throw Error('SOLANA_MINT_RPC_INVALID_RESPONSE');
 const observed=analyzeSolanaMintHeader(data.result.value);
 return {
  schema:'sniper_r29_solana_finalized_mint_observation.v1',network:'solana-mainnet',
  mint_address:mint,observed_at_utc:new Date(now).toISOString(),
  finalized_account_slot:data.result.context.slot,
  mint_program:observed.mint_program,
  mint_authority:observed.mint_authority,
  freeze_authority:observed.freeze_authority,
  mint_initialized:observed.initialized,
  extension_audit:observed.extension_audit,
  observed_risk:observed.observed_risk,
  reason:observed.reason,
  contract_safety_verified:false,sellability_verified:false,
  holder_concentration_verified:false,lp_control_verified:false,
  paper_entry_authorized:false,real_trading_enabled:false
 };
}
export function selectForwardSolanaCandidate(snapshot,{now=Date.now()}={}){
 if(snapshot?.schema!=='research_market_snapshot.v1'||
  snapshot.paper_only!==true||snapshot.actionable!==false||
  snapshot.collection_status!=='OBSERVED_OR_PARTIAL'||
  !age(snapshot.published_at_utc,now)||
  !Array.isArray(snapshot.candidates)||snapshot.candidates.length>96)
  return {candidate:null,reason:'MARKET_SNAPSHOT_NOT_FRESH'};
 // Source selection is a technical credibility gate, not a buying strategy.
 // GPT controls whether and when the selected lead should be traded.
 const ranked=snapshot.candidates.filter(c=>{
  if(!c||c.chain!=='solana'||c.promotion_biased!==false||
   c.source!=='GECKOTERMINAL_NEW_POOLS'||
   c.verification!=='CROSS_PROVIDER_IDENTITY'||
   !age(c.observed_at_utc,now)||!safePublicMint(c.token_address)||
   !safePublicMint(c.pool_address)||
   !Array.isArray(c.source_urls)||c.source_urls.length<2||
   !c.source_urls.every(hostOk)||!c.source_urls.some(x=>x.includes('api.geckoterminal.com'))||
   !c.source_urls.some(x=>x.includes('api.dexscreener.com')))
   return false;
  try{return candidateId(c.chain,c.token_address,c.pool_address)===c.candidate_id}
  catch{return false}
 });
 // Most recently observed pool first; no invented breakout probability.
 ranked.sort((a,b)=>Date.parse(b.observed_at_utc)-Date.parse(a.observed_at_utc)||
  a.candidate_id.localeCompare(b.candidate_id));
 if(!ranked.length)return {candidate:null,reason:'NO_FRESH_CROSS_PROVIDER_SOLANA_POOL'};
 const c=ranked[0];
 return {candidate:{
  chain:'solana',token_address:c.token_address,pool_address:c.pool_address,
  candidate_id:c.candidate_id,observed_at_utc:c.observed_at_utc,
  pool_created_at_utc:c.pool_created_at_utc||null,
  source_names:['GECKOTERMINAL','DEXSCREENER'],
  reported_liquidity_usd:Number.isFinite(c.liquidity_usd)?c.liquidity_usd:null,
  reported_volume_m5_usd:Number.isFinite(c.volume_m5_usd)?c.volume_m5_usd:null
 },reason:'FRESH_CROSS_PROVIDER_RESEARCH_LEAD_ONLY'};
}
export async function evaluateForwardSolanaResearch({
 snapshot,now=Date.now(),rpcFetcher=fetch,
 quoteFetcher=fetch,wait=async()=>{},apiKey=process.env.JUPITER_API_KEY||null,
 researchAmountLamports='10000000'
}={}){
 if(!Number.isFinite(now)||!typeof researchAmountLamports==='string')
  throw Error('SOLANA_FORWARD_CLOCK_INVALID');
 const selection=selectForwardSolanaCandidate(snapshot,{now});
 const result={schema:MEME_REVIEW_SCHEMA,mode:'PAPER_ONLY',paper_only:true,
  actionable:false,real_trading_enabled:false,
  observed_at_utc:new Date(now).toISOString(),
  research_target:selection.candidate,selection_reason:selection.reason,
  finalized_mint_observation:null,mint_check_status:'NOT_CHECKED',
  quote_roundtrip:null,quote_status:'NOT_CHECKED',
  preview_sol_lamports:researchAmountLamports,
  capital_in_test_usdc:null,entry_cost_test_usdc:null,
  exit_proceeds_test_usdc:null,forward_breakout_probability:null,
  contract_security_verified:false,holder_concentration_verified:false,
  lp_control_verified:false,executable_buy_quote_verified:false,
  executable_sell_quote_verified:false,sellability_verified:false,
  gpt_buy_approved:false,paper_order_created:false,paper_fill_received:false,
  next_step:'RESEARCH_ONLY_NO_PAPER_BUY'};
 if(!selection.candidate)return result;
 try{
  result.finalized_mint_observation=await readFinalizedSolanaMint(
   selection.candidate.token_address,{fetcher:rpcFetcher,now});
  result.mint_check_status='FINALIZED_MINT_HEADER_OBSERVED';
 }catch(e){result.mint_check_status=failure(e)}
 try{
  const q=await previewSolanaSwapRoundtrip({
   targetMint:selection.candidate.token_address,
   amountLamports:researchAmountLamports,
   now:()=>new Date(now).toISOString(),wait,
   fetcher:(url,opts)=>quoteFetcher(url,{
    ...opts,headers:{...opts.headers,
     ...(apiKey?{'x-api-key':apiKey}:{})}
   })
  });
  result.quote_status=q.status==='TWO_QUOTES_OBSERVED'?
   'INDICATIVE_TWO_WAY_PRICES_ONLY':'QUOTE_DATA_GAP';
  result.quote_roundtrip={
   status:q.status,reason:q.reason||null,
   buy_quote_checked_at_utc:q.buy_quote_checked_at_utc||null,
   sell_quote_checked_at_utc:q.sell_quote_checked_at_utc||null,
   roundtrip_change_bps:Number.isFinite(q.approximate_roundtrip_change_bps)?
    q.approximate_roundtrip_change_bps:null,
   buy_fee_bps:Number.isFinite(q.buy_fee_bps)?q.buy_fee_bps:null,
   sell_fee_bps:Number.isFinite(q.sell_fee_bps)?q.sell_fee_bps:null,
   sellability_verified:false,
   executable_buy_quote_verified:false,
   executable_sell_quote_verified:false,
   trade_executed:false
  };
 }catch(e){result.quote_status=failure(e)}
 return result;
}
function access(token){
 if(typeof token!=='string'||!/^(?:github_pat_|ghp_)[A-Za-z0-9_]{15,}$/.test(token))
  throw Error('SOLANA_FORWARD_RESEARCH_GITHUB_TOKEN_REQUIRED');
 return {authorization:'Bearer '+token,accept:'application/vnd.github+json',
  'content-type':'application/json','X-GitHub-Api-Version':'2022-11-28',
  'user-agent':'R29-Forward-Solana-Research'};
}
export async function syncPublicForwardSolanaResearch({
 token,now=Date.now(),fetcher=fetch,rpcFetcher=fetch,quoteFetcher=fetch,
 wait=async()=>{},filename=path.join(ROOT,'.local','research-market','latest.json')
}={}){
 const headers=access(token);
 let raw;
 try{raw=await readFile(filename)}
 catch(e){if(e.code==='ENOENT')return {published:false,status:'LOCAL_MARKET_NOT_AVAILABLE'};
  throw e}
 if(raw.length>300_000)throw Error('SOLANA_FORWARD_MARKET_FILE_TOO_LARGE');
 const report=await evaluateForwardSolanaResearch({
  snapshot:JSON.parse(raw.toString('utf8')),now,rpcFetcher,quoteFetcher,wait});
 if(!report.research_target)
  return {published:false,status:report.selection_reason};
 const old=await fetcher(ENDPOINT+'?ref='+encodeURIComponent(BRANCH),{
  method:'GET',redirect:'error',headers,signal:AbortSignal.timeout(12000)});
 let sha=null,prev=null;
 if(old.status===200){
  const j=await old.json();
  if(j.type!=='file'||!HASH.test(j.sha||'')||j.encoding!=='base64'||
   typeof j.content!=='string'||j.content.length>50000)
   throw Error('SOLANA_FORWARD_PUBLIC_FILE_INVALID');
  sha=j.sha;
  prev=JSON.parse(Buffer.from(j.content.replace(/\s/g,''),'base64').toString('utf8'));
 }else if(old.status!==404)throw Error('SOLANA_FORWARD_PUBLIC_READ_FAILED');
 if(prev?.schema===MEME_REVIEW_SCHEMA&&iso(prev.observed_at_utc)&&
  Date.parse(prev.observed_at_utc)>=Date.parse(report.observed_at_utc))
  return {published:false,status:'FORWARD_EVIDENCE_NOT_NEWER'};
 const payload={
  message:'research(r29): readonly finalized SPL mint and indicative roundtrip evidence',
  branch:BRANCH,content:Buffer.from(JSON.stringify(report,null,2)+'\n').toString('base64')
 };
 if(sha)payload.sha=sha;
 const write=await fetcher(ENDPOINT,{method:'PUT',redirect:'error',
  headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
 if(!write?.ok)throw Error('SOLANA_FORWARD_PUBLIC_WRITE_FAILED');
 const j=await write.json();
 if(!HASH.test(j?.commit?.sha||''))
  throw Error('SOLANA_FORWARD_PUBLIC_COMMIT_MISSING');
 return {published:true,status:'PUBLIC_READ_ONLY_FORWARD_SOLANA_EVIDENCE',
  commit_sha:j.commit.sha,mint_status:report.mint_check_status,
  quote_status:report.quote_status,trade_executed:false};
}
