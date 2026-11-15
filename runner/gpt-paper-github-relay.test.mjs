import test from 'node:test';
import assert from 'node:assert/strict';
import {archivePath,contentSha256,GPT_PAPER_DECISION_PATH,
 GPT_PAPER_RECEIPT_PATH} from './gpt-paper-protocol.mjs';
import {relayGptPaperDecision,readGptGithubFile,
 verifyGithubOwnerAttribution} from './gpt-paper-github-relay.mjs';
import {sanitizeGptPublicPositionContext} from './gpt-paper-position-publisher.mjs';

const now=Date.now(),iso=n=>new Date(n).toISOString();
const id='gpt_'+'a'.repeat(32);
const decision={schema:'sniper_r29_gpt_paper_decision.v1',mode:'PAPER_ONLY',
 strategy:'GPT_ONLY',decision_id:id,action:'NO_TRADE',chain:null,
 token_address:null,pool_address:null,amount_test_usdc:null,
 created_at_utc:iso(now),expires_at_utc:iso(now+3600000),
 source_review_sha256:'b'.repeat(64),
 source_observed_at_utc:iso(now-60000),
 evidence_ids:['research/r29/channel/dynamic-research-status.json',
  'research/r29/channel/dynamic-research-review.json'],
 security_assessment:'UNKNOWN',score_0_100:null,
 reason_de:'Contract security and independent sellability are not yet verified; therefore no simulated trade.',
 risk_level:'UNKNOWN',trade_type:'VIRTUAL_ONLY',real_trading_enabled:false};
const archive=JSON.stringify(decision,null,2)+'\n';
const ap=archivePath(id,decision.created_at_utc);
const pointer={schema:'sniper_r29_gpt_paper_pointer.v1',
 mode:'PAPER_ONLY',decision_id:id,archive_path:ap,
 archive_sha256:contentSha256(archive),
 published_at_utc:decision.created_at_utc,real_trading_enabled:false};
const owner='127027',SHA='c'.repeat(40),BLOB='a'.repeat(40);
const accessToken='github_pat_MOCK_TEST_SECRET_123456789012345';
const localCapability='f'.repeat(64);
function mockProvider({badOwner=false,badArchive=false}={}){
 const calls=[],fileBlob={};
 fileBlob[GPT_PAPER_DECISION_PATH]={text:JSON.stringify(pointer,null,2)+'\n',sha:'1'.repeat(40)};
 fileBlob[ap]={text:badArchive?archive.replace('NO_TRADE','WATCH'):archive,sha:'2'.repeat(40)};
 const fetcher=async(url,o)=>{
  calls.push({url,method:o.method});
  if(o.method==='PUT')return {ok:true,status:200,json:async()=>({commit:{sha:SHA}})};
  if(url.includes('/contents/'+GPT_PAPER_RECEIPT_PATH))
    return {ok:false,status:404};
  if(url.includes('/contents/')){
   const p=Object.keys(fileBlob).find(k=>url.includes('/contents/'+k+'?ref='));
   if(!p)return {ok:false,status:404};
   const f=fileBlob[p];
   return {ok:true,status:200,json:async()=>({type:'file',
    encoding:'base64',sha:f.sha,content:Buffer.from(f.text).toString('base64')})};
  }
  if(url.includes('/commits?')){
   const p=new URL(url).searchParams.get('path');
   if(!fileBlob[p])return {ok:false,status:404};
   return {ok:true,status:200,json:async()=>[{sha:SHA}]};
  }
  if(url.endsWith('/commits/'+SHA)){
   // Tests are path-local because a real GH commit modifies a single file.
   const pathToVerify=calls.at(-2)?.url&&new URL(calls.at(-2).url).searchParams.get('path');
   return {ok:true,status:200,json:async()=>({
    sha:SHA,author:{login:badOwner?'other':owner},
    committer:{login:owner},parents:[{sha:'d'.repeat(40)}],
    commit:{verification:{verified:false,reason:'unsigned'}},
    files:[{filename:pathToVerify,sha:fileBlob[pathToVerify]?.sha,status:'added'}]
   })};
  }
  throw Error('Unexpected URL: '+url);
 };
 return {fetcher,calls};
}
test('owner-linked immutable public NO_TRADE reaches localhost, never a real order',async()=>{
 const {fetcher,calls}=mockProvider();
 let localCalled=0,lastBody;
 const localFetcher=async(url,opts)=>{
  localCalled++;assert.equal(url,'http://127.0.0.1:3030/api/gpt/paper-decision');
  assert.equal(opts.headers['x-sniper-gpt-bridge'],localCapability);
  lastBody=JSON.parse(opts.body);
  return {ok:true,status:200,json:async()=>({ok:true,receipt:{
   status:'NO_TRADE',reason:'GPT_RESEARCH_NO_ORDER'}})};
 };
 const o=await relayGptPaperDecision({token:accessToken,localCapability,
  now,fetcher,localFetcher});
 assert.equal(o.status,'NO_TRADE');
 assert.equal(o.forwarded_to_local,true);
 assert.equal(o.owner_commit_verified,true);
 assert.equal(o.model_signature_verified,false);
 assert.equal(localCalled,1);
 assert.equal(lastBody.archive_sha256,pointer.archive_sha256);
 assert.equal(lastBody.github_owner_verified,true);
 assert(calls.some(x=>x.url.includes(GPT_PAPER_RECEIPT_PATH)&&x.method==='PUT'));
});
test('wrong owner or changed archive hash hard blocks before local paper endpoint',async()=>{
 for(const flags of [{badOwner:true},{badArchive:true}]){
  const {fetcher}=mockProvider(flags);let called=0;
  await assert.rejects(relayGptPaperDecision({
   token:accessToken,localCapability,now,fetcher,
   localFetcher:async()=>{called++;throw Error('UNSAFE')}},
  ),/GPT_GITHUB_OWNER_OR_BLOB_NOT_VERIFIED|GPT_RELAY_ARCHIVE_HASH_MISMATCH/);
  assert.equal(called,0);
 }
});
test('public position context strips any cash, wallet and quantities; no positions is legitimate',()=>{
 const positions=[{chain:'base',token_address:'0x'+'a'.repeat(40),
  pool_address:'0x'+'b'.repeat(40),opened_at_utc:iso(now-10000),
  entry_price_usd:0.004,indicative_price_usd:0.003,
  quote_at_utc:iso(now-2000),gpt_opened_paper_position:true,
  qty:500000,amount_test_usdc:50,private_seed:'SECRET'}];
 const c={ok:true,schema:'sniper_r29_gpt_public_position_context.v1',
  mode:'PAPER_ONLY',real_trading_enabled:false,account_balances_excluded:true,
  position_amounts_excluded:true,gpt_follow_enabled:false,
  paper_bot_enabled:true,as_of_utc:iso(now),positions};
 const output=sanitizeGptPublicPositionContext(c,{now});
 assert.equal(output.positions.length,1);
 assert.equal(output.positions[0].entry_price_usd,0.004);
 assert.equal(output.account_balances_published,false);
 const raw=JSON.stringify(output);
 for(const needle of ['private_seed','SECRET','qty','amount_test_usdc','wallet_address'])
  assert(!raw.includes(needle),needle);
 assert.throws(()=>sanitizeGptPublicPositionContext({
  ...c,positions:[{...positions[0],gpt_opened_paper_position:false}]},{now}),
  /INVALID_POSITION/);
});
