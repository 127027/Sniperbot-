import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildWinnerBlindResearchPacket,verifyGptResearchIntent} from './gpt-winner-blind-discovery-and-intent-20261117.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const mint='N3KETcYwAHZtTVb7gdoVwMW4uNksU99NXgK55zRpump';
const pool='3hUrvQZGtRcFn969bHLjkgDVTmsYxeVPdGozamguAqxU';
const source='a'.repeat(64);
const original=()=>({
 schema:'r29_neutral_hour_1_first_20min_detached_gpt_candidate_frame.v1',
 virtual_asof_utc:'2026-09-18T01:20:00.000Z',
 neutral_eligible_source_hour:'https://replay.shrine.trade/pump/2026/09/18/01.jsonl.zst',
 source_prefix_asof_event_lines_sha256:source,
 source_future_coin_winners_used:false,
 known_winner_names_supplied:false,
 stream_stopped_at_first_later_event:true,
 no_later_than_virtual_asof_events_in_candidate_frame:true,
 // Fields intentionally included that may encode future knowledge. Must be DROPPED.
 future_ath_percent:1000000,posthoc_success_label:true,
 ranked_neutral_cohort_not_all_market:[{
  chain:'solana',token_address:mint,pool_address:pool,
  first_observed_at_utc:'2026-09-18T01:00:03.000Z',
  last_observed_at_utc:'2026-09-18T01:18:45.000Z',
  quote_currency:'SOL',observed_buys:1461,observed_sells:55,
  unique_buyers_observed:1395,unique_sellers_observed:19,
  buy_quote_volume_original_asset:1122.025242235,
  sell_quote_volume_original_asset:11.969208527,
  latest_pool_quote_reserves_original_asset:1180.60207039,
  most_recent_trade_price_original_quote:0.00008029151,
  mint_or_freeze_authority_verified_absent:false,
  later_peak_multiplier:9999,
  coin_name:'POSTHOC WINNER NAME SHOULD NOT LEAK'
 }]
});
test('real asof neutral 01:20 source can become isolated GPT-only research packet',()=>{
 const r=buildWinnerBlindResearchPacket(original(),{scan_index_in_utc_day:2,
  available_cash_test_usdc:5000});
 assert.equal(r.packet.phase,'BLIND_TEST');
 assert.equal(r.packet.candidates.length,1);
 assert.equal(r.packet.candidates[0].observed_unique_buyers,1395);
 assert.equal(r.packet.candidates[0].creator_wallet_concentration_verified,false);
 assert.equal(r.packet.candidates[0].independently_executable_bidirectional_order_quote_verified,false);
 assert.equal(r.packet.max_requested_buy_test_usdc,5000);
 assert.equal(r.created_executable_order,false);
 assert.equal(r.verified_pnl_test_usdc,null);
 const payload=JSON.stringify(r.packet);
 assert.equal(payload.includes('future_ath_percent'),false);
 assert.equal(payload.includes('later_peak_multiplier'),false);
 assert.equal(payload.includes('POSTHOC WINNER'),false);
 assert.equal(payload.includes('posthoc_success_label'),false);
 assert.equal(payload.includes('coin_name'),false);
});
test('future events and source archive date swaps are rejected fail closed',()=>{
 const f=original();
 f.ranked_neutral_cohort_not_all_market[0].last_observed_at_utc='2026-09-18T02:30:00Z';
 assert.throws(()=>buildWinnerBlindResearchPacket(f),/FUTURE_CANDIDATE/);
 const g=original();g.neutral_eligible_source_hour='https://replay.shrine.trade/pump/2026/09/19/01.jsonl.zst';
 assert.throws(()=>buildWinnerBlindResearchPacket(g),/ASOF_SOURCE_HOUR_MISMATCH/);
 const h=original();h.stream_stopped_at_first_later_event=false;
 assert.throws(()=>buildWinnerBlindResearchPacket(h),/SOURCE_NOT_PROVEN_CUTOFF/);
});
test('training phase cannot allow BUY and cannot use holdout events',()=>{
 const f=original();
 f.schema='r29_neutral_training_asof_daily_5min_source_frame_v1';
 f.virtual_asof_utc='2026-07-20T00:05:00.000Z';
 f.archive_source_url='https://replay.pumpapi.io/2026/07/20/00.jsonl.zst';
 f.original_source_first5_prefix_sha256=source;
 f.no_prior_future_gainers_used=true;
 f.complete_five_minute_original_capture_stream=true;
 f.no_later_rug_or_price_outcomes_seen=true;
 f.neutral_ranked_solana_pools_in_frame=[];
 const e=buildWinnerBlindResearchPacket(f);
 assert.equal(e.packet.phase,'LEARN_ASOF');
 assert.deepEqual(e.packet.permitted_actions,['WATCH','NO_TRADE']);
 const response={action:'BUY',token_address:mint,pool_address:pool,stake_test_usdc:50,
  position_id:null,next_scan_tier:4,reason_de:'Potential signal with independent source check',
  source_payload_sha256:e.payload_sha256};
 assert.throws(()=>verifyGptResearchIntent(e,response,{model_called_at_utc:'2026-11-17T15:00:00Z',
  actual_model_output_sha256:sha(JSON.stringify(response))}),/CANNOT_BUY_IN_TRAINING/);
});
test('GPT BUY intent is visible even when executor blocks unverified quote, never silently NO_TRADE',()=>{
 const e=buildWinnerBlindResearchPacket(original(),{available_cash_test_usdc:5000});
 const d={action:'BUY',token_address:mint,pool_address:pool,stake_test_usdc:250,
  position_id:null,next_scan_tier:24,
  reason_de:'Unusual verified buyer adoption warrants paper BUY INTENT, execution must verify safety and exit',
  source_payload_sha256:e.payload_sha256};
 const r=verifyGptResearchIntent(e,d,{model_called_at_utc:'2026-11-17T15:00:00Z',
  actual_model_output_sha256:sha(JSON.stringify(d))});
 assert.equal(r.action,'BUY');
 assert.equal(r.model_detected_buy_opportunity,true);
 assert.equal(r.buy_intent_blocked_for_missing_cash_or_quote,true);
 assert.equal(r.execution_status,'BLOCKED_REQUIRES_INDEPENDENT_EXECUTOR_QUOTE_AND_ORDER_RECEIPT');
 assert.equal(r.actual_buys_filled,0);
 assert.equal(r.realized_pnl_test_usdc,null);
 assert.equal(r.clean_model_origin_verification,'NOT_ATTESTED');
});
test('historically unverified cash cannot create spendable balance',()=>{
 const e=buildWinnerBlindResearchPacket(original(),{available_cash_test_usdc:null});
 const d={action:'BUY',token_address:mint,pool_address:pool,stake_test_usdc:50,
  position_id:null,next_scan_tier:12,reason_de:'High early adoption, capital not yet confirmed',
  source_payload_sha256:e.payload_sha256};
 const r=verifyGptResearchIntent(e,d,{
  model_called_at_utc:'2026-11-17T15:00:00Z',
  actual_model_output_sha256:sha(JSON.stringify(d))});
 assert.equal(r.model_detected_buy_opportunity,true);
 assert.equal(r.buy_intent_blocked_for_missing_cash_or_quote,true);
 assert.equal(r.actual_buys_filled,0);
});
test('model cannot hallucinate a prior position for SELL or HOLD',()=>{
 const e=buildWinnerBlindResearchPacket(original(),{available_cash_test_usdc:5000});
 for(const action of ['SELL','HOLD']){
  const d={action,token_address:mint,pool_address:pool,stake_test_usdc:null,
   position_id:'never-filled',next_scan_tier:4,
   reason_de:'This position must have a prior verified paper fill',
   source_payload_sha256:e.payload_sha256};
  assert.throws(()=>verifyGptResearchIntent(e,d,{
   model_called_at_utc:'2026-11-17T15:00:00Z',
   actual_model_output_sha256:sha(JSON.stringify(d))
  }),/GPT_MAY_ONLY_MANAGE_REAL_VERIFIED/);
 }
});
test('fake later lessons and surprise winners cannot be inserted to past',()=>{
 const f=original();
 const future={lesson_id:'after outcome',learned_at_utc:'2026-09-19T10:00:00Z',
  observation_at_utc:'2026-09-19T09:00:00Z',
  application_not_before_utc:'2026-09-19T10:00:00Z',
  evidence_sha256:source,lesson_de:'Winner was huge, buy this symbol'};
 assert.throws(()=>buildWinnerBlindResearchPacket(f,{lessons:[future]}),/FUTURE_LESSON/);
 assert.throws(()=>buildWinnerBlindResearchPacket({...f,known_winner_names_supplied:true}),
 /HINDSIGHT_EXAMPLE/);
});
test('only actually observed neutral candidate can be bought, with stakes 50 to 5000',()=>{
 const e=buildWinnerBlindResearchPacket(original(),{available_cash_test_usdc:5000});
 const base={action:'BUY',token_address:mint,pool_address:pool,stake_test_usdc:5000,
  position_id:null,next_scan_tier:1,reason_de:'Candidate is early and has to be independently verified before fill',
  source_payload_sha256:e.payload_sha256};
 for(const [patch,error] of [
 [{token_address:'9'.repeat(44)},/GPT_CANNOT_BUY_NONNEUTRAL/],
 [{stake_test_usdc:5001},/GPT_BUY_STAKE/],
 [{stake_test_usdc:49},/GPT_BUY_STAKE/],
 [{next_scan_tier:25},/GPT_RESPONSE_MUST_BE/]
 ]) {
  const d={...base,...patch};
  assert.throws(()=>verifyGptResearchIntent(e,d,{model_called_at_utc:'2026-11-17T15:00:00Z',
   actual_model_output_sha256:sha(JSON.stringify(d))}),error);
 }
});
