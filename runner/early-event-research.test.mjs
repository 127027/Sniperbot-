import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {decodeFreeSolanaStreamEvent} from './solana-live-events.mjs';
import {detectFirstSeenRecentPoolLeads} from './research-hype-triggers.mjs';
import {earlyEventResearchLeads} from './early-event-research.mjs';
import {adaptiveActivity,planAdaptiveReview,buildAdaptiveReview}
 from './dynamic-research-scheduler.mjs';
import {sanitizedAdaptiveReview} from './r29-adaptive-publisher.mjs';

const at='2026-11-17T17:30:00.000Z',now=Date.parse(at);
const mint='9'.repeat(44),pool='8'.repeat(44);
const candidateId='solana:'+mint+':'+pool;
const solana={
 candidate_id:candidateId,chain:'solana',token_address:mint,pool_address:pool,
 price_usd:0.00001,liquidity_usd:5000,volume_m5_usd:50,
 buys_m5:3,sells_m5:1,source:'GECKOTERMINAL_NEW_POOLS',
 source_urls:['https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=1'],
 promotion_biased:false,pool_created_at_utc:'2026-11-17T17:29:00.000Z'
};
const dominant=i=>{
 const a='0x'+i.toString(16).padStart(40,'0');
 return {candidate_id:'base:'+a+':'+a,chain:'base',token_address:a,pool_address:a,
  price_usd:0.0002,liquidity_usd:90000,volume_m5_usd:90000-i,
  buys_m5:30,sells_m5:12,source:'GECKOTERMINAL_NEW_POOLS',
  promotion_biased:false,pool_created_at_utc:'2026-11-16T12:00:00.000Z'};
};
function frame(extraAlerts=[]){
 const candidates=[{...solana,source_urls:[...solana.source_urls]},...Array.from({length:13},(_,i)=>dominant(i+1))];
 return {schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
  collection_status:'OBSERVED_OR_PARTIAL',published_at_utc:at,
  candidates,research_alerts:extraAlerts};
}
const migration=()=>decodeFreeSolanaStreamEvent({
 txType:'migrate',mint,poolId:pool,signature:'2'.repeat(88)
},{receivedAtUtc:at});
const newToken=()=>decodeFreeSolanaStreamEvent({
 txType:'create',mint:'7'.repeat(44),signature:'3'.repeat(88)
},{receivedAtUtc:at});
const firstSeen=()=>{
 const s=frame();
 return detectFirstSeenRecentPoolLeads(null,s).events.find(
  e=>e.candidate_id===candidateId);
};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

test('new pool and migration beat old high-volume coins without inventing buy signals',()=>{
 const s=frame([migration(),firstSeen()]);
 const early=earlyEventResearchLeads(s,{now});
 assert.equal(early.observed_event_count,2);
 assert.equal(early.leads[0].event_type,'SOLANA_STREAM_MIGRATION');
 assert.equal(early.leads[0].candidate_id,candidateId);
 assert.equal(early.leads[1].event_type,'NEW_POOL_FIRST_OBSERVED');
 assert.equal(early.leads.every(x=>x.buy_sell_quotes_verified===false),true);
 const activity=adaptiveActivity(s,{now});
 assert.equal(activity.matching_migration_pool_count,1);
 assert.equal(activity.frequency_per_day,4);
 const p=planAdaptiveReview(s);
 assert.equal(p.due,true);
 const review=buildAdaptiveReview(s,p);
 assert.equal(review.candidates.length,12);
 const earlyCoin=review.candidates.find(c=>c.candidate_id===candidateId);
 assert(earlyCoin);
 assert.equal(earlyCoin.selection,'EARLY_EVENT_PRIORITY');
 assert.equal(earlyCoin.gpt_action,'NO_ORDER_UNVERIFIED_SECURITY');
 assert.equal(review.early_event_leads.length,2);
 assert.equal(review.actual_gpt_model_invocations_verified,false);
 const status={last_review_sha256:review.sha256_payload,last_review_at_utc:at};
 const published=sanitizedAdaptiveReview(review,status);
 assert.equal(published.early_event_leads.length,2);
 assert.equal(published.early_event_leads[0].recommendation,
  'INDEPENDENT_GPT_RESEARCH_NOT_BUY');
 assert.equal(published.candidates.find(c=>c.candidate_id===candidateId).selection,
  'EARLY_EVENT_PRIORITY');
 assert.equal(published.security_verified,false);
 assert.equal(published.actual_gpt_model_invocations_verified,false);
 assert(!JSON.stringify(published).includes('stake_test_usdc'));
});
test('unpaired new token is a research watch lead only; cannot auto raise buy cadence',()=>{
 const s=frame([newToken()]);
 const early=earlyEventResearchLeads(s,{now});
 assert.equal(early.leads.length,1);
 assert.equal(early.leads[0].candidate_id,null);
 assert.equal(early.leads[0].pool_address,null);
 assert.equal(adaptiveActivity(s,{now}).frequency_per_day,1);
 assert.equal(buildAdaptiveReview(s,planAdaptiveReview(s))
  .early_event_leads[0].actionable,false);
});
test('future, stale, tampered, paid and duplicate events cannot manufacture fresh signal',()=>{
 const e=migration();
 for(const variant of [
  {...e,observed_at_utc:'2026-11-17T17:31:00Z'},
  {...e,observed_at_utc:'2026-11-17T17:00:00Z'},
  {...e,actionable:true},
  {...e,probability_pct:99},
  {...e,recommended_action:'BUY'},
  {...e,provider:'FAKE_PROVIDER'},
  {...e,transaction_signature:'not_a_solana_tx'}
 ]){
  const x=earlyEventResearchLeads(frame([variant]),{now});
  assert.equal(x.leads.length,0);
  assert.equal(adaptiveActivity(frame([variant]),{now}).frequency_per_day,1);
 }
 const withDuplicates=earlyEventResearchLeads(frame([e,e]),{now});
 assert.equal(withDuplicates.leads.length,1);
 const poisoned=frame([e]);poisoned.candidates[0].promotion_biased=true;
 assert.equal(earlyEventResearchLeads(poisoned,{now}).leads[0].candidate_id,null);
 const dataGap=frame([e]);dataGap.collection_status='BLOCKED_RESEARCH_DATA_ACCESS';
 assert.equal(adaptiveActivity(dataGap,{now}).frequency_per_day,1);
});
test('tampered public early event is rejected, even if an attacker recomputes local hash',()=>{
 const s=frame([migration()]);
 const review=buildAdaptiveReview(s,planAdaptiveReview(s));
 const changed=structuredClone(review);
 changed.early_event_leads[0].recommended_action='BUY_NOW';
 const {sha256_payload,...body}=changed;
 changed.sha256_payload=hash(body);
 assert.throws(()=>sanitizedAdaptiveReview(changed,{
  last_review_sha256:changed.sha256_payload,last_review_at_utc:at
 }),/EARLY_LEAD_UNTRUSTED/);
 const changed2=structuredClone(review);
 changed2.early_event_leads[0].extra_wallet_private_key='secret';
 const {sha256_payload:_,...body2}=changed2;
 changed2.sha256_payload=hash(body2);
 assert.throws(()=>sanitizedAdaptiveReview(changed2,{
  last_review_sha256:changed2.sha256_payload,last_review_at_utc:at
 }),/EARLY_LEAD_UNTRUSTED/);
});
