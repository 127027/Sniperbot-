import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {selectSecurityResearchCandidates,publicSecurityResearchReport,
 syncGptPaperSecurityResearch,GPT_PUBLIC_SECURITY_PATH} from './gpt-paper-security-research.mjs';
import {assessEvmSecurityRaw} from './live-paper-security.mjs';

const at=Date.now(),iso=new Date(at).toISOString(),day=iso.slice(0,10);
const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40),id='base:'+token+':'+pool;
const modelReview={schema:'sniper_r29_public_dynamic_review.v1',
 review_sha256:'e'.repeat(64),observed_at_utc:iso,
 paper_only:true,actionable:false,candidates:[
  {chain:'base',candidate_id:id,selection:'MARKET_ACTIVITY_SAMPLE',
   paid_promotion_bias:false}]};
const market={schema:'research_market_snapshot.v1',paper_only:true,
 actionable:false,collection_status:'OBSERVED_OR_PARTIAL',
 published_at_utc:iso,candidates:[{
  chain:'base',token_address:token,pool_address:pool,candidate_id:id,
  source:'GECKOTERMINAL_NEW_POOLS',verification:'CROSS_PROVIDER_IDENTITY',
  promotion_biased:false,liquidity_usd:120000,volume_m5_usd:16000,
  observed_at_utc:iso,price_usd:0.02}]};
const facts=()=>assessEvmSecurityRaw({chain:'base',token,pool,now:at,
 goplus:null,honeypot:null});
const tokenString='github_pat_TEST_TOKEN_123456789012345';
test('only same pool, independently cross-checked and unpromoted EVM candidates are reviewed',()=>{
 assert.equal(selectSecurityResearchCandidates(modelReview,market,{now:at}).length,1);
 assert.equal(selectSecurityResearchCandidates(modelReview,{
  ...market,candidates:[{...market.candidates[0],verification:'PROVIDER_ONLY'}]
 },{now:at}).length,0);
 assert.equal(selectSecurityResearchCandidates(modelReview,{
  ...market,candidates:[{...market.candidates[0],promotion_biased:true}]
 },{now:at}).length,0);
 assert.equal(selectSecurityResearchCandidates(modelReview,market,{now:at+600001}).length,0);
});
test('a fresh cross-provider EVM pool absent from the hourly sample remains independently researchable',()=>{
 const poolNew='0x'+'c'.repeat(40),tokenNew='0x'+'d'.repeat(40);
 const newer={...market,candidates:[
  {...market.candidates[0],candidate_id:'base:'+tokenNew+':'+poolNew,
   token_address:tokenNew,pool_address:poolNew,
   liquidity_usd:80000,volume_m5_usd:12000}]};
 const picks=selectSecurityResearchCandidates(modelReview,newer,{now:at});
 assert.equal(picks.length,1);
 assert.equal(picks[0].pool_address,poolNew);
 assert.equal(picks[0].source,'FRESH_CROSS_PROVIDER_LOCAL_MARKET');
 // Corresponding independent provider result must match the actual pair,
 // not just the outdated hourly sample or a same-symbol pool.
 const gate=assessEvmSecurityRaw({chain:'base',token:tokenNew,pool:poolNew,now:at,
  goplus:null,honeypot:null});
 const report=publicSecurityResearchReport({review:modelReview,market:newer,
  findings:[{...picks[0],gate}],now:at});
 assert.equal(report.candidates.length,1);
 assert.equal(report.candidates[0].also_listed_in_hourly_review,false);
 assert.equal(report.candidates[0].source_scope,'FRESH_CROSS_PROVIDER_LOCAL_MARKET');
 assert.equal(report.market_snapshot_observed_at_utc,iso);
 assert.equal(report.candidates[0].full_gpt_buy_gate_passed,false);
 assert.equal(report.authorizes_paper_orders,false);
 assert.throws(()=>publicSecurityResearchReport({review:modelReview,market:newer,
  findings:[{...picks[0],gate:{...gate,pool_address:pool}}],now:at}),/INVALID/);
});
test('security reports whitelist only public facts; unknown stays non-buy',()=>{
 const report=publicSecurityResearchReport({review:modelReview,
  findings:[{chain:'base',token_address:token,pool_address:pool,gate:facts()}],now:at});
 assert.equal(report.actionable,false);
 assert.equal(report.authorizes_paper_orders,false);
 assert.equal(report.candidate_check_count,1);
 assert.equal(report.candidates[0].basic_contract_and_sell_simulation_pass,false);
 assert.equal(report.candidates[0].full_gpt_buy_gate_passed,false);
 assert(report.candidates[0].risk_codes.some(x=>x.startsWith('GOPLUS_')));
 const raw=JSON.stringify(report);
 assert(!raw.includes('private_key'));
 assert(!raw.includes('cash_test_usdc'));
 assert(!raw.includes('wallet_address'));
 assert.throws(()=>publicSecurityResearchReport({review:modelReview,findings:[
  {chain:'base',token_address:token,pool_address:'0x'+'c'.repeat(40),gate:facts()}
 ],now:at}),/INVALID/);
});
test('local research security -> GitHub only new review hashes, hourly hard cap',async()=>{
 const folder=mkdtempSync(path.join(tmpdir(),'gpt-paper-security-'));
 try{
  const dynamicFile=path.join(folder,'dynamic','status.json');
  const marketFile=path.join(folder,'market','latest.json');
  const output=path.join(folder,'gpt','security-research');
  mkdirSync(path.dirname(dynamicFile),{recursive:true});
  mkdirSync(path.dirname(marketFile),{recursive:true});
  writeFileSync(marketFile,JSON.stringify(market));
  const body={
   schema:'sniper_r29_dynamic_research_review.v1',paper_only:true,
   actionable:false,decision:'OBSERVE_ONLY_EVIDENCE_GAP',
   validated_buy_count:0,validated_sell_count:0,simulated_pnl:null,
   contract_security_verified:false,sellability_verified:false,
   quote_executable:false,at_utc:iso,
   candidates:[{
    chain:'base',candidate_id:id,
    selection:'MARKET_ACTIVITY_SAMPLE',
    price_usd:0.02,liquidity_usd:120000,volume_m5_usd:16000,
    buys_m5:60,sells_m5:20,promo_bias:false,
    contract_security:'UNKNOWN',sellability:'UNKNOWN',
    gpt_action:'NO_ORDER_UNVERIFIED_SECURITY'
   }],experiment_phase:'OBSERVATION_WARMUP_30_DAYS',cadence_per_day:4
  };
  const digest=createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const filename='20261115T194155995Z-'+digest.slice(0,16)+'.json';
  const dir=path.join(path.dirname(dynamicFile),'reviews',day);
  mkdirSync(dir,{recursive:true});
  writeFileSync(path.join(dir,filename),JSON.stringify({...body,sha256_payload:digest}));
  const status={schema:'sniper_r29_dynamic_research_status.v1',paper_only:true,
   actionable:false,real_trading_enabled:false,can_authorize_trades:false,
   account_balances_included:false,
   first_seen_at_utc:iso,last_review_at_utc:iso,
   next_due_at_utc:new Date(at+2*3600000).toISOString(),
   day_utc:day,day_review_count:1,total_review_count:1,frequency_per_day:4,
   experiment_day_index:0,experiment_phase:'OBSERVATION_WARMUP_30_DAYS',
   last_review_sha256:digest,last_review_filename:filename};
  writeFileSync(dynamicFile,JSON.stringify(status));
  let securityCalls=0,githubPuts=0;
  const fakeProvider=async()=>{securityCalls++;return facts()};
  const fakeGithub=async(url,o)=>{
   assert(url.includes(GPT_PUBLIC_SECURITY_PATH));
   if(o.method==='GET')return {status:404,ok:false};
   githubPuts++;
   const request=JSON.parse(o.body);
   const report=JSON.parse(Buffer.from(request.content,'base64').toString('utf8'));
   assert.equal(report.actionable,false);
   assert.equal(report.review_sha256,digest);
   assert.equal(report.candidate_check_count,1);
   return {ok:true,status:201,json:async()=>({commit:{sha:'c'.repeat(40)}})};
  };
  const opts={token:tokenString,now:at,dynamicFile,marketFile,folder:output,
   securityCheck:fakeProvider,fetcher:fakeGithub};
  const first=await syncGptPaperSecurityResearch(opts);
  assert.equal(first.status,'PUBLISHED');
  assert.equal(first.checks,1);
  assert.equal(securityCalls,1);
  assert.equal(githubPuts,1);
  const second=await syncGptPaperSecurityResearch(opts);
  assert.equal(second.status,'RATE_LIMIT_1_HOUR');
  assert.equal(securityCalls,1);
  // A distinct review within same hour must be deferred (no external API spam).
  const changedDigest='f'.repeat(64);
  const changed={...status,last_review_sha256:changedDigest};
  writeFileSync(dynamicFile,JSON.stringify(changed));
  const third=await syncGptPaperSecurityResearch(opts);
  assert.equal(third.status,'RATE_LIMIT_1_HOUR');
  assert.equal(securityCalls,1);
  assert.equal(githubPuts,1);
 }finally{rmSync(folder,{recursive:true,force:true})}
});
