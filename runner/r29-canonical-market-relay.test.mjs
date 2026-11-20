import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {decodeFreeSolanaStreamEvent} from './solana-live-events.mjs';
import {detectFirstSeenRecentPoolLeads} from './research-hype-triggers.mjs';
import {
 canonicalPublicMarketProjection,mirrorFreshLocalMarketToCanonical,
 CANONICAL_MARKET_BRANCH,CANONICAL_MARKET_PATH,CANONICAL_MARKET_URL
} from './r29-canonical-market-relay.mjs';

const at='2026-11-17T18:00:00.000Z',now=Date.parse(at);
const mint='9'.repeat(44),pool='8'.repeat(44),candidateId='solana:'+mint+':'+pool;
const candidate={
 chain:'solana',token_address:mint,pool_address:pool,candidate_id:candidateId,
 observed_at_utc:at,pool_created_at_utc:'2026-11-17T17:59:00.000Z',
 liquidity_usd:25000,volume_m5_usd:3600,price_usd:0.00007,
 buys_m5:33,sells_m5:14,
 source:'GECKOTERMINAL_NEW_POOLS',verification:'CROSS_PROVIDER_IDENTITY',
 promotion_biased:false,
 source_urls:['https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=1',
  'https://api.dexscreener.com/latest/dex/pairs/solana/'+pool],
 unresolved_checks:['INDEPENDENT_PAIR_IDENTITY','CONTRACT','LIQUIDITY_RISK','SELLABILITY']
};
const snapshot=()=>({
 schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
 producer:'Local read-only research market collector',published_at_utc:at,
 collection_status:'OBSERVED_OR_PARTIAL',
 candidates:[structuredClone(candidate)],
 coverage:[{chain:'solana',source:'GECKOTERMINAL',status:'OK',
  provider_rows:22,valid_identities:8}],
 summary:{identities:1,cross_checked:1,discovery_cap_per_scan:96}
});
const ws=()=>decodeFreeSolanaStreamEvent({txType:'migrate',
 mint,signature:'2'.repeat(88),poolId:pool},{receivedAtUtc:at});
const token='github_pat_FAKE_TEST_TOKEN_123456789012345';

test('canonical R29 projection prioritizes source-checked fresh token and migration evidence but never trading',()=>{
 const s=snapshot();
 s.research_alerts=[ws(),...detectFirstSeenRecentPoolLeads(null,s).events];
 const v=canonicalPublicMarketProjection(s,{now});
 assert.equal(v.candidates.length,1);
 assert.equal(v.candidates[0].candidate_id,candidateId);
 assert.equal(v.research_alerts.length,2);
 assert(v.research_alerts.some(x=>x.event_type==='SOLANA_STREAM_MIGRATION'));
 assert(v.research_alerts.some(x=>x.event_type==='NEW_POOL_FIRST_OBSERVED'));
 assert.equal(v.actionable,false);
 assert.equal(v.paper_only,true);
 assert(v.candidates[0].unresolved_checks.includes('SELLABILITY'));
 assert.equal(v.research_alerts.every(x=>x.actionable===false),true);
 assert.equal(Object.hasOwn(v,'orders'),false);
});

test('local untrusted extra private fields cannot flow into the canonical public research file',()=>{
 const s=snapshot();
 s.secret_token='github_pat_NEVER_EXPORT';
 s.user_paper_cash=4999;
 s.candidates[0].private_wallet_key='SUPER_SECRET_WALLET';
 s.candidates[0].user_cash_value=4999;
 s.candidates[0].source_urls.push('https://evil.invalid/private-wallet-key');
 s.coverage[0].local_user_id='LOCAL_PERSONAL_DATA';
 const v=canonicalPublicMarketProjection(s,{now});
 const raw=JSON.stringify(v);
 for(const q of ['github_pat_NEVER_EXPORT','SUPER_SECRET_WALLET','4999',
  'evil.invalid','LOCAL_PERSONAL_DATA','private_wallet_key','user_paper_cash'])
  assert(!raw.includes(q));
 assert.equal(v.candidates[0].source_urls.length,2);
});

test('stale, invalid, promoted-only, missing source identity, and incorrect timestamps fail closed',()=>{
 const stale=snapshot();stale.published_at_utc='2026-11-17T17:00:00.000Z';
 assert.throws(()=>canonicalPublicMarketProjection(stale,{now}),/STALE_OR_UNAVAILABLE/);
 const future=snapshot();future.published_at_utc='2026-11-17T18:01:00.000Z';
 assert.throws(()=>canonicalPublicMarketProjection(future,{now}),/STALE_OR_UNAVAILABLE/);
 const untrusted=snapshot();untrusted.candidates[0].pool_address='https://evil.example';
 assert.throws(()=>canonicalPublicMarketProjection(untrusted,{now}),/NO_TRUSTED_POOL_IDENTITIES/);
 const onlyPaid=snapshot();onlyPaid.candidates[0].promotion_biased=true;
 assert.throws(()=>canonicalPublicMarketProjection(onlyPaid,{now}),/NO_TRUSTED_POOL_IDENTITIES/);
 const bad=snapshot();bad.actionable=true;
 assert.throws(()=>canonicalPublicMarketProjection(bad,{now}),/Unsafe market research/);
});

test('single canonical GitHub write, idempotent and no transfer; source must be newer',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'r29-canonical-market-'));
 const file=path.join(dir,'latest.json');
 try{
  const snap=snapshot();snap.research_alerts=[ws()];
  await writeFile(file,JSON.stringify(snap),'utf8');
  let remote=null,numberOfWrites=0,numberOfPosts=0;
  const fetcher=async(url,opt)=>{
   assert(url.startsWith(CANONICAL_MARKET_URL));
   assert.equal(new URL(url).origin,'https://api.github.com');
   assert(['GET','PUT'].includes(opt.method));
   assert.equal((opt.headers.authorization||'').startsWith('Bearer '),true);
   assert(!JSON.stringify(opt).includes('wallet_key'));
   if(opt.method==='GET'){
    assert(url.includes('ref='+encodeURIComponent(CANONICAL_MARKET_BRANCH)));
    return !remote?{status:404,ok:false}:{status:200,ok:true,json:async()=>({
     type:'file',sha:'a'.repeat(40),encoding:'base64',
     content:Buffer.from(JSON.stringify(remote)).toString('base64')})};
   }
   numberOfPosts++;numberOfWrites++;
   const payload=JSON.parse(opt.body);
   assert.equal(payload.branch,CANONICAL_MARKET_BRANCH);
   remote=JSON.parse(Buffer.from(payload.content,'base64').toString('utf8'));
   assert(!JSON.stringify(remote).includes('gptPaperFollow'));
   return {status:201,ok:true,json:async()=>({commit:{sha:'b'.repeat(40)}})};
  };
  const result=await mirrorFreshLocalMarketToCanonical({
   token,fetcher,now,filename:file});
  assert.equal(result.published,true);
  assert.equal(result.paper_order_created,false);
  assert.equal(result.market_candidates,1);
  assert.equal(result.early_events,1);
  assert.equal(result.branch,CANONICAL_MARKET_BRANCH);
  assert.equal(CANONICAL_MARKET_PATH,'research/market/latest.json');
  const again=await mirrorFreshLocalMarketToCanonical({
   token,fetcher,now,filename:file});
  assert.equal(again.published,false);
  assert.equal(again.status,'CAPTURE_NOT_NEWER');
  assert.equal(numberOfWrites,1);
  assert.equal(numberOfPosts,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('no capture, no auth and stale frame never reach GitHub',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'r29-canonical-market-empty-'));
 const file=path.join(dir,'empty.json');
 try{
  const never=async()=>{throw Error('MUST_NOT_CONTACT_GITHUB')};
  await assert.rejects(mirrorFreshLocalMarketToCanonical({
   token:'',fetcher:never,filename:file,now
  }),/TOKEN_REQUIRED/);
  const missing=await mirrorFreshLocalMarketToCanonical({
   token,fetcher:never,filename:file,now});
  assert.equal(missing.status,'NO_LOCAL_CAPTURE');
  const outdated=snapshot();outdated.published_at_utc='2026-11-17T15:00:00Z';
  await writeFile(file,JSON.stringify(outdated));
  await assert.rejects(mirrorFreshLocalMarketToCanonical({
   token,fetcher:never,filename:file,now
  }),/STALE_OR_UNAVAILABLE/);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('timestamped general news and token-profile catalysts survive relay as non-trading leads',()=>{
 const s=snapshot();
 s.news_leads=[{
  event_id:'news-'+'a'.repeat(32),source_name:'BBCWorld',
  source_url:'https://www.bbc.com/news/articles/public-event',
  title:'Beloved zoo hippo dies',original_published_at_utc:'2026-11-17T17:50:00.000Z',
  first_observed_at_utc:at,
  source_timestamp_quality:'RSS_PUBLISHER_CLAIM_NOT_INDEPENDENTLY_ARCHIVED',
  signal_categories:['GENERAL_EVENT_CATALYST_CANDIDATE','MEME_CULTURE_CANDIDATE'],
  chain:null,token_address:null,pool_address:null,candidate_id:null,
  original_post_content_independently_verified:false,paper_only:true,actionable:false
 }];
 s.narrative_leads=[{
  chain:'solana',token_address:mint,observed_at_utc:at,
  origin:'DEXSCREENER_METADATA_ONLY',
  source_urls:['https://api.dexscreener.com/token-profiles/latest/v1'],
  signal_categories:['NEW_TOKEN_PROFILE'],paid_promotion_seen:false,
  organic_social_verified:false,candidate_id:candidateId,pool_address:pool,
  paper_only:true,actionable:false,probability_pct:null,
  claim_status:'SAME_CHAIN_TOKEN_POOL_LINK_NOT_SAFETY_VALIDATED'
 }];
 s.news_coverage=[{feed:'BBCWorld',status:'OK',internal_secret:'NEVER_PUBLISH'}];
 s.narrative_coverage=[{source:'NEW_TOKEN_PROFILE',status:'OK',local_wallet:'NEVER_PUBLISH'}];
 const v=canonicalPublicMarketProjection(s,{now});
 assert.equal(v.news_leads.length,1);
 assert.equal(v.narrative_leads.length,1);
 assert.equal(v.news_leads[0].candidate_id,null);
 assert.equal(v.narrative_leads[0].candidate_id,candidateId);
 assert.equal(v.narrative_leads[0].organic_social_verified,false);
 assert.equal(v.narrative_leads[0].probability_pct,null);
 assert.equal(v.actionable,false);
 assert.equal(v.summary.news_events_available,1);
 assert.equal(v.summary.narrative_tokens_available,1);
 assert(!JSON.stringify(v).includes('NEVER_PUBLISH'));
});
test('future headlines and unlinked paid token profiles cannot become BUY signals',()=>{
 const s=snapshot();
 s.news_leads=[{
  event_id:'news-'+'b'.repeat(32),source_name:'BBCWorld',
  source_url:'https://example.org/record',title:'New zoo animal report',
  original_published_at_utc:'2026-11-17T18:30:00.000Z',
  first_observed_at_utc:at,source_timestamp_quality:'RSS_PUBLISHER_CLAIM_NOT_INDEPENDENTLY_ARCHIVED',
  signal_categories:['GENERAL_EVENT_CATALYST_CANDIDATE'],
  chain:null,token_address:null,pool_address:null,candidate_id:null,
  original_post_content_independently_verified:false,paper_only:true,actionable:false
 }];
 const otherMint='7'.repeat(44);
 s.narrative_leads=[{
  chain:'solana',token_address:otherMint,observed_at_utc:at,
  origin:'DEXSCREENER_METADATA_ONLY',
  source_urls:['https://api.dexscreener.com/token-boosts/latest/v1'],
  signal_categories:['PAID_BOOST'],paid_promotion_seen:true,
  organic_social_verified:false,candidate_id:null,pool_address:null,
  paper_only:true,actionable:false,probability_pct:null,
  claim_status:'UNVERIFIED_COIN_OR_NARRATIVE'
 }];
 const v=canonicalPublicMarketProjection(s,{now});
 assert.equal(v.news_leads.length,0,'publisher dates later than first observation rejected');
 assert.equal(v.narrative_leads.length,1);
 assert.equal(v.narrative_leads[0].candidate_id,null);
 assert.equal(v.narrative_leads[0].paid_promotion_seen,true);
 assert.equal(v.narrative_leads[0].actionable,false);
});
