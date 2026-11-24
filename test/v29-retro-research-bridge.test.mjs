import test from 'node:test';
import assert from 'node:assert/strict';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {normalizeV29ResearchCandidateFrames}
 from '../src/v29-retro-research-bridge.mjs';
const mint='5LfEyHPKWGrsiWXYtjjRKywhhiJU9WWpjQFe2jjFpump';
function frames(){
 return Array.from({length:24},(_,h)=>{
  const at='2026-10-12T'+String(h).padStart(2,'0')+':00:00.000Z';
  const count=h===1?1:0;
  return {scan:h+1,at_utc:at,
   fresh_distinct_mints_in_last_10m_retro:200,
   cumulative_distinct_mints_retro:30_000+h*1_000,
   screen_pass_with_unknown_executable_quotes:count,
   top_research_candidates_not_orders:count?[{
    chain:'solana',mint,
    scan_at_utc:at,feature_at_utc:'2026-10-12T00:58:01.196Z',
    source_class:'RETRO_ASOF_RECONSTRUCTION',
    original_provider_delivery_authenticated:false,
    real_quote_buy_50usdc_authenticated:false,
    real_quote_sell_50usdc_authenticated:false,
    issuer_and_sellability_authenticated:false,
    allowed_live_or_backtest_order:false,
    screen_status:'SCREEN_PASS_REQUIRES_POOL_RISK_AND_TWO_WAY_QUOTES',
    screen_reasons:[],research_score:57.638,pool:null
   }]:[]};
 });
}
const base=()=>({schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',
 date:'2026-10-12',selected_from_future_winner_list:false,
 snapshots:[],activity_observations:[],research_only_candidate_frames:frames()});
test('24 true original strategy steps now display screened retro Dot2 candidate at 01, but strictly NO trade',()=>{
 const r=backtestOnRequest({date:'2026-10-12',manifest:base(),
  firstScanAtStart:true,forceHourlyDiagnostic:true});
 assert.equal(r.role_audit.dot2_discovery.retro_feature_screened_at_each_scan.length,24);
 assert.equal(r.retro_candidate_research_only_pass_occurrences,1);
 assert.equal(r.role_audit.dot3_risk.retro_screen_passes_awaiting_original_buy_sell_quote,1);
 assert.equal(r.role_audit.dot4_strategy.timeline.length,24);
 assert.equal(r.role_audit.dot4_strategy.timeline[1].dot2_research_only_candidate_review.representatives[0].mint,mint);
 assert.equal(r.role_audit.dot4_strategy.timeline[1].dot2_research_only_candidate_review.original_market_quote_snapshots_contributed,0);
 assert.equal(r.model_replay_summary.dataGap,24);
 assert.equal(r.model_replay_summary.buys,0);
 assert.equal(r.model_replay_summary.sells,0);
 assert.equal(r.confirmed_paper_orders,0);
 assert.equal(r.confirmed_paper_fills,0);
 assert.equal(r.historical_gpt_dot_runs,0);
});
test('changing postevent candidate into apparent original provider input is rejected',()=>{
 const f=frames();f[1].top_research_candidates_not_orders[0].source_class='ORIGINAL_CAPTURE';
 assert.throws(()=>normalizeV29ResearchCandidateFrames(f),
  /V29_RESEARCH_CANDIDATE_CANNOT_ENTER_BUY_GATE/);
});
test('forged 50USDC quote, risk eligibility or order permissions always rejected',()=>{
 for(const [key,value] of [['real_quote_buy_50usdc_authenticated',true],
  ['real_quote_sell_50usdc_authenticated',true],
  ['issuer_and_sellability_authenticated',true],
  ['allowed_live_or_backtest_order',true]]){
  const f=frames();f[1].top_research_candidates_not_orders[0][key]=value;
  assert.throws(()=>normalizeV29ResearchCandidateFrames(f),
   /V29_RESEARCH_CANDIDATE_CANNOT_ENTER_BUY_GATE/);
 }
});
test('future late feature and missing 60 sec finalization are rejected',()=>{
 const f=frames();f[1].top_research_candidates_not_orders[0].feature_at_utc='2026-10-12T00:59:59.900Z';
 assert.throws(()=>normalizeV29ResearchCandidateFrames(f),
  /V29_RESEARCH_CANDIDATE_CANNOT_ENTER_BUY_GATE/);
});
test('future winner labels and broken scan chronology are never usable as historical research candidate inputs',()=>{
 const f=frames();f[1].top_research_candidates_not_orders[0].reported_gain_pct=5000;
 assert.throws(()=>normalizeV29ResearchCandidateFrames(f),
  /V29_RESEARCH_CANDIDATE_CANNOT_ENTER_BUY_GATE/);
 const g=frames();g[2].at_utc='2026-10-12T01:00:00.000Z';
 assert.throws(()=>normalizeV29ResearchCandidateFrames(g),
  /V29_NON_CHRONOLOGICAL|V29_INVALID_RETRO_RESEARCH_FRAME/);
});
test('24-scan source cannot be replaced by short partial-selected winner set',()=>{
 assert.throws(()=>normalizeV29ResearchCandidateFrames(frames().slice(0,2)),
  /V29_RESEARCH_FRAMES_REQUIRE_ALL_24_OR_NONE/);
});
