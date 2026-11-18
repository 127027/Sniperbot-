import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeR27CollectorSnapshot,mergeR27Candidates} from './r27-early-bridge.mjs';
import {planR29ModelPolling} from './central-ai-coordinator.mjs';
const now=Date.parse('2026-11-15T09:10:00Z');
const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40);
const rec={schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
 published_at_utc:'2026-11-15T09:09:00Z',
 candidates:[{chain:'eth',candidate_id:'eth:'+token+':'+pool,
 token_address:token,pool_address:pool,price_usd:.2,liquidity_usd:56000,
 volume_m5_usd:7000,buys_m5:50,sells_m5:20,verification:'CROSS_PROVIDER_IDENTITY'}],
 research_alerts:[{paper_only:true,actionable:false,chain:'eth',pool_address:pool,
 candidate_id:'eth:'+token+':'+pool,observed_at_utc:'2026-11-15T09:09:00Z',
 m5_volume_ratio:3.2,current_liquidity_usd:56000,
 source_urls:['https://api.geckoterminal.com/api/v2']}],
 narrative_leads:[{paper_only:true,actionable:false,chain:'eth',pool_address:pool,
 candidate_id:'eth:'+token+':'+pool,signal_categories:['PAID_BOOST'],
 paid_promotion_seen:true,source_urls:['https://api.dexscreener.com/token-boosts/latest/v1']}],
 coverage:[{chain:'eth',source:'GECKOTERMINAL',status:'OK',pages_ok:2}],
 WALLET_SECRET:'MUST_NEVER_APPEAR'};
test('public-only early context links identical chain+pool, not ticker or paid boost proof',()=>{
 const r=sanitizeR27CollectorSnapshot(rec,{now});
 assert.equal(r.status,'FRESH_PUBLIC_LOCAL_SNAPSHOT');
 assert.equal(r.candidates.length,1);
 assert.equal(r.candidates[0].independent_provider_identity,true);
 assert.equal(r.alerts[0].candidate_id,'eth:'+pool);
 assert.equal(r.narratives[0].paid_promotion,true);
 assert.equal(r.narratives[0].organic_social_verified,false);
 assert.equal(r.sellability_verified,false);
 assert(!JSON.stringify(r).includes('MUST_NEVER_APPEAR'));
});
test('stale data or wrong chain/pool cannot create AI candidate',()=>{
 assert.equal(sanitizeR27CollectorSnapshot(rec,{now:now+6*60000}).candidates.length,0);
 const corrupt=structuredClone(rec);
 corrupt.candidates[0].pool_address='bad';
 assert.equal(sanitizeR27CollectorSnapshot(corrupt,{now}).candidates.length,0);
 const untrusted={...rec,actionable:true};
 assert.equal(sanitizeR27CollectorSnapshot(untrusted,{now}).candidates.length,0);
});
test('freshest exact identity wins when consolidating hourly and 2-minute candidates',()=>{
 const newList=sanitizeR27CollectorSnapshot(rec,{now});
 const old=[{chain:'eth',tokenAddress:token,poolAddress:pool,
 asOf:'2026-11-15T09:08:00Z',liquidityUsd:15000,priceUsd:.1}];
 const merged=mergeR27Candidates(old,newList);
 assert.equal(merged.length,1);
 assert.equal(merged[0].priceUsd,.2);
});

test('V4.3: validated first-seen pool identity reaches event-triggered GPT input',()=>{
 const raw=structuredClone(rec);
 const at=raw.published_at_utc;
 const eventId='research-alert-'+'a'.repeat(32);
 raw.candidates[0].source='GECKOTERMINAL_NEW_POOLS';
 raw.candidates[0].promotion_biased=false;
 raw.research_alerts=[{
  event_id:eventId,event_type:'NEW_POOL_FIRST_OBSERVED',
  paper_only:true,actionable:false,probability_pct:null,
  recommended_action:'INDEPENDENT_FIVE_ROLE_REVIEW',
  chain:'eth',token_address:token,pool_address:pool,
  candidate_id:'eth:'+token+':'+pool,
  observed_at_utc:at,pool_created_at_utc:'2026-11-15T09:08:00Z',
  provider_creation_age_at_observation_ms:60000,
  source_urls:['https://api.geckoterminal.com/api/v2']
 }];
 const context=sanitizeR27CollectorSnapshot(raw,{now});
 assert.equal(context.alerts.length,1);
 assert.equal(context.alerts[0].event_id,eventId);
 assert.equal(context.alerts[0].event_type,'NEW_POOL_FIRST_OBSERVED');
 assert.equal(context.alerts[0].candidate_id,'eth:'+pool);
 assert.equal(context.alerts[0].paper_only,true);
 const modelInput={paper:{positions:[]},candidates:[],news:{leads:[]},
  early_discovery:context};
 const plan=planR29ModelPolling(modelInput,{
  last_model_attempt_utc:'2026-11-15T09:05:00Z',
  reviewed_urgent_events:[]},'2026-11-15T09:10:00Z');
 assert.equal(plan.due,true);
 assert.equal(plan.reason,'NEW_EARLY_EVENT');
 assert.equal(plan.unreviewed_event_ids[0],eventId);
 const duplicate=planR29ModelPolling(modelInput,{
  last_model_attempt_utc:'2026-11-15T09:05:00Z',
  reviewed_urgent_events:[eventId]},'2026-11-15T09:10:00Z');
 assert.equal(duplicate.due,false);
});
test('V4.3: unverified or malformed event identity never triggers expedited GPT',()=>{
 const bad=structuredClone(rec);
 bad.research_alerts=[{...bad.research_alerts[0],
  event_id:'research-alert-'+'b'.repeat(32),event_type:'NEW_POOL_FIRST_OBSERVED'}];
 const context=sanitizeR27CollectorSnapshot(bad,{now});
 assert.equal(context.alerts.some(x=>x.event_id),false);
 assert.equal(planR29ModelPolling({paper:{positions:[]},candidates:[],news:{leads:[]},
   early_discovery:context},{
   last_model_attempt_utc:'2026-11-15T09:05:00Z',
   reviewed_urgent_events:[]},'2026-11-15T09:10:00Z').due,false);
});
