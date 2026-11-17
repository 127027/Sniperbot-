import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildNeutralHistoricalModelInput,validateDetachedGptReview} from './blind-neutral-market-gpt-input.mjs';
const sha='a'.repeat(64),T='2026-10-15T12:00:00Z';
const event={event_id:'confirmed-sample-100',event_type:'TOKEN_CREATE',
  event_at_utc:'2026-10-15T11:57:00Z',provider_captured_at_utc:'2026-10-15T11:58:00Z',
  chain:'solana',token_address:'9'.repeat(44),pool_address:null,venue:'PUMPFUN',
  source_sha256:sha,source_id:'neutral-stream-hour-1',transaction_finality:'confirmed'};
const media={item_id:'archived-social-post',channel:'community',source_id:'public-archive-1',
 source_sha256:sha,url:'https://example.org/archived-post/1',published_at_utc:'2026-10-15T10:30:00Z',
 archived_at_utc:'2026-10-15T11:00:00Z',observed_at_utc:'2026-10-15T11:00:00Z',
 title:'Early public community discussion',body_excerpt:'discussion',
 source_archival_method:'IMMUTABLE_ORIGINAL_CAPTURE'};
const lesson={lesson_id:'lesson-before-scan-1',original_decision_id:'old',
 learned_at_utc:'2026-10-14T00:00:00Z',observation_at_utc:'2026-10-14T00:00:00Z',
 application_not_before_utc:'2026-10-14T00:00:00Z',
 source_sha256:sha,category:'MISSING_LIQUIDITY',lesson_de:'Never buy unverified pools'};
const base=()=>({
 virtual_asof_utc:T,phase:'TRADE_TEST',discovery_mode:'NEUTRAL_ALL_AVAILABLE_EVENTS',
 candidate_source:'CHRONOLOGICAL_SOURCE_STREAM',
 current_user_conversation_included:false,retrospective_winners_supplied:false,
 market_events:[event],media_items:[media],prior_lessons:[lesson],open_positions:[],
 reviews_completed_today:2,missing_source_categories:['no second independent venue quote']
});
test('clean neutral market/media input has no winner list and no position',()=>{
 const x=buildNeutralHistoricalModelInput(base());
 assert.equal(x.payload.market_events.length,1);
 assert.equal(x.payload.media_items.length,1);
 assert.equal(x.payload.prior_lessons.length,1);
 assert.equal(x.payload.user_supplied_winner_examples_excluded,true);
 assert.equal(x.payload.complete_market_and_media_universe_claimed,false);
 assert.equal(x.payload.trading_and_wallet_actions_permitted,false);
 assert.match(x.payload_sha256,/^[a-f0-9]{64}$/);
});
test('current conversation and posthoc shortlist cannot enter detached model input',()=>{
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),current_user_conversation_included:true}),/CONVERSATION_WINNER_LEAK/);
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),retrospective_winners_supplied:true}),/CONVERSATION_WINNER_LEAK/);
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),candidate_source:'POSTHOC_WINNER_LIST'}),/WINNER_SHORTLIST/);
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),discovery_mode:'SELECTED_BIG_GAINERS'}),/WINNER_SHORTLIST/);
});
test('future events, delayed-provider observations and hindsight labels are rejected',()=>{
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),market_events:[{...event,event_at_utc:'2026-10-16T00:00:00Z'}]}),/FUTURE_MARKET_EVENT/);
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),market_events:[{...event,provider_captured_at_utc:'2026-10-16T00:00:00Z'}]}),/MARKET_DATA_CAPTURED_AFTER_DECISION/);
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),market_events:[{...event,future_peak_percent:99999}]}),/UNTRUSTED_OR_FUTURE_FIELD/);
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),market_events:[{...event,provider_captured_at_utc:'2026-10-15T11:50:00Z'}]}),/PROVIDER_EVENT_TIME_INCONSISTENT/);
});
test('historic news/social must have been published AND archived before scan',()=>{
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),media_items:[{...media,published_at_utc:'2026-10-16T10:00:00Z'}]}),/FUTURE_MEDIA_POST/);
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),media_items:[{...media,archived_at_utc:'2026-11-16T10:00:00Z'}]}),/RETROSPECTIVE_MEDIA_CAPTURE_NOT_ASOF/);
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),media_items:[{...media,engagement_metrics:{likes:10000},metrics_observed_at_utc:'2026-10-16T10:00:00Z'}]}),/ENGAGEMENT_METRICS_FROM_FUTURE/);
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),media_items:[{...media,edited_at_utc:'2026-10-16T10:00:00Z'}]}),/POST_EDITED_IN_FUTURE/);
});
test('later learning events must never influence earlier decisions',()=>{
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),prior_lessons:[{...lesson,learned_at_utc:'2026-11-17T10:00:00Z'}]}),/LESSON_LEARNED_AFTER_DECISION/);
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),prior_lessons:[{...lesson,application_not_before_utc:'2026-11-17T10:00:00Z'}]}),/LESSON_RETROFIT_TO_PAST/);
});
test('future portfolio positions and completed 24 daily GPT scans cannot be replayed',()=>{
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),reviews_completed_today:24}),/DAILY_SCAN_LIMIT_REACHED/);
 const p={position_id:'prior-paper-fill',opened_fill_id:'fill-1',opened_at_utc:'2026-10-16T00:00:00Z',
 asof_context_at_utc:T,chain:'solana',token_address:'9'.repeat(44),pool_address:'8'.repeat(44)};
 assert.throws(()=>buildNeutralHistoricalModelInput({...base(),open_positions:[p]}),/FUTURE_POSITION/);
});
test('actual GPT-replay transcript is required before counting decision, not a rule proxy',()=>{
 const source=buildNeutralHistoricalModelInput(base());
 const decision={action:'NO_TRADE',next_scan_tier:24,reason_de:'Insufficient independent, executable buy/sell quotes'};
 const response=JSON.stringify(decision);
 const out=validateDetachedGptReview(source,decision,{
  model_called_at_utc:'2026-11-17T10:00:00Z',
  model_response_json:response,model_response_sha256:createHash('sha256').update(response).digest('hex')
 });
 assert.equal(out.action,'NO_TRADE');
 assert.equal(out.next_scan_tier,24);
 assert.equal(out.paper_fill_test_usdc,null);
 assert.equal(out.realized_pnl_test_usdc,null);
 assert.equal(out.actual_historical_gpt_call_claimed,false);
 assert.throws(()=>validateDetachedGptReview(source,decision,{
   model_called_at_utc:'2026-10-14T00:00:00Z',
   model_response_json:response,model_response_sha256:createHash('sha256').update(response).digest('hex')
  }),/GPT_CALL_CANNOT_BE_BACKDATED/);
});
test('GPT can only buy neutrally observed coin and only manage an actual filled open position',()=>{
 const f=buildNeutralHistoricalModelInput(base());
 const d={action:'BUY',next_scan_tier:12,reason_de:'Market activity',
  stake_test_usdc:50,chain:'solana',token_address:'8'.repeat(44),pool_address:'7'.repeat(44)};
 const response=JSON.stringify(d),run={
 model_called_at_utc:'2026-11-17T10:00:00Z',model_response_json:response,
 model_response_sha256:createHash('sha256').update(response).digest('hex')
 };
 assert.throws(()=>validateDetachedGptReview(f,d,run),/GPT_MUST_BUY_DISCOVERED_SOURCE_CANDIDATE/);
 const hold={action:'HOLD',position_id:'fake-open-position',next_scan_tier:4,reason_de:'Hold'};
 const h=JSON.stringify(hold);
 assert.throws(()=>validateDetachedGptReview(f,hold,{
  model_called_at_utc:'2026-11-17T10:00:00Z',model_response_json:h,
  model_response_sha256:createHash('sha256').update(h).digest('hex')
 }),/GPT_MUST_MANAGE_ACTUALLY_OPEN_POSITION/);
});
