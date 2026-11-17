import test from 'node:test';
import assert from 'node:assert/strict';
import {publishResearchSnapshot} from './research-market-publisher.mjs';
import {decodeFreeSolanaStreamEvent} from './solana-live-events.mjs';
import {candidateId} from './research-watchlist.mjs';
import {detectFirstSeenRecentPoolLeads} from './research-hype-triggers.mjs';

const at='2026-11-17T15:00:00.000Z',mint='9'.repeat(44),pool='8'.repeat(44);
const event=()=>decodeFreeSolanaStreamEvent({
 txType:'migrate',mint,signature:'2'.repeat(88),poolId:pool
},{receivedAtUtc:at});
const snapshot=(alerts)=>({
 schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
 published_at_utc:at,candidates:[],research_alerts:alerts
});
const fakeSend=async(url,opts)=>opts.method==='GET'?
 {status:404,ok:false,json:async()=>({})}:
 {status:201,ok:true,json:async()=>({commit:{sha:'test-research-only'}})};
const publish=s=>publishResearchSnapshot(s,{token:'fake-token-for-ci-not-real',fetcher:fakeSend});
test('sanitized, no-wallet real-time migration lead can be delivered to existing Dot GitHub market feed',async()=>{
 const e=event();
 const result=await publish(snapshot([e]));
 assert.equal(result.branch,'codex/research-gateway-v04');
 assert.equal(result.path,'research/market/latest.json');
 assert.equal(e.chain_finality,'UNVERIFIED_PROVIDER_EVENT');
 assert.equal(e.actionable,false);
});
test('Dot GitHub publisher denies stream-embedded fake orders, unverified identity and future observations',async()=>{
 const e=event();
 for(const x of [
  {...e,action:'BUY'},
  {...e,stake_test_usdc:5000},
  {...e,chain_finality:'CONFIRMED'},
  {...e,paper_only:false},
  {...e,probability_pct:99},
  {...e,observed_at_utc:'2026-11-18T15:00:00Z'}
 ])await assert.rejects(publish(snapshot([x])),/Unsafe/);
});
test('new-pool first-observed alert from existing collector is publishable without fake tradability',async()=>{
 const c={chain:'solana',token_address:mint,pool_address:pool,
  candidate_id:candidateId('solana',mint,pool),
  source:'GECKOTERMINAL_NEW_POOLS',promotion_biased:false,
  pool_created_at_utc:'2026-11-17T14:58:30.000Z',
  liquidity_usd:2500,source_urls:['https://api.geckoterminal.com/verified']};
 const s={...snapshot([]),candidates:[c]};
 const e=detectFirstSeenRecentPoolLeads(null,s).events[0];
 assert.equal(e.event_type,'NEW_POOL_FIRST_OBSERVED');
 assert.equal(e.actionable,false);
 const timestamp=Date.parse(at),eventTime=Date.parse(e.observed_at_utc),
  createdTime=Date.parse(e.pool_created_at_utc);
 console.log('NEW_POOL_DIAGNOSTIC',JSON.stringify({
  event:e,ts:timestamp,eventTime,createdTime,
  age:e.provider_creation_age_at_observation_ms,
  expectedAge:eventTime-createdTime,
  validSources:e.source_urls?.map(u=>{
    try{const v=new URL(u);return v.protocol==='https:'&&!!v.hostname&&!v.username&&!v.password}
    catch{return false}
  })
 }));
 const result=await publish(snapshot([e]));
 assert.equal(result.path,'research/market/latest.json');
 await assert.rejects(publish(snapshot([{...e,source_urls:['http://evil.invalid']}]))
  ,/Unsafe/);
});
