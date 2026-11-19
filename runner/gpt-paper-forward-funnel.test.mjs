import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeLocalGptFunnel} from './gpt-paper-forward-funnel.mjs';
const now=Date.parse('2026-11-19T10:00:00.000Z'),iso=n=>new Date(n).toISOString();
const collector=()=>({
 schema:'research_market_collector_status.v1',paper_only:true,actionable:false,
 last_check_at_utc:iso(now-2*60000),candidate_count:56,
 private_key:'DO_NOT_INCLUDE_PRIVATE_KEY_IN_SUMMARY'
});
const security=()=>({
 schema:'sniper_r29_public_gpt_security_research.v1',
 mode:'PAPER_RESEARCH_ONLY',actionable:false,authorizes_paper_orders:false,
 checked_at_utc:iso(now-40*60000),candidate_check_count:2,
 candidates:[{full_gpt_buy_gate_passed:false,secret_key:'NEVER_EXPORT'},
  {full_gpt_buy_gate_passed:false,wallet:'NEVER_EXPORT'}],
 selection_diagnostic:{
  schema:'sniper_r29_security_candidate_diagnostic.v1',
  evm_market_rows:36,potential_research_candidates:3,
  first_failure_reason_counts:{
   NON_EVM_CHAIN:20,INDEPENDENT_PAIR_IDENTITY_NOT_CONFIRMED:30,
   POOL_LIQUIDITY_LT_20000_OR_UNKNOWN:2,
   LEAK_THIS_RAW_API_TOKEN:99
  }
 }
});
test('R29 V5.2 research funnel shows actual separate 2m market and hourly safety evidence, never a BUY',()=>{
 const r=summarizeLocalGptFunnel({collector:collector(),security:security(),now});
 assert.equal(r.collection_recent,true);
 assert.equal(r.observed_candidate_count,56);
 assert.equal(r.independent_security_research_recent,true);
 assert.equal(r.last_security_sample_evm_candidates,36);
 assert.equal(r.last_security_sample_research_eligible_evm,3);
 assert.equal(r.last_security_sample_actually_checked,2);
 assert.equal(r.last_security_sample_failed_full_trade_proof,2);
 assert.equal(r.complete_buy_sell_execution_quotes_verified,false);
 assert.equal(r.authorized_gpt_buy_count,null);
 assert.equal(r.paper_only,true);
 assert.equal(r.actionable,false);
 assert.equal(r.real_trading_enabled,false);
 assert(!JSON.stringify(r).includes('DO_NOT_INCLUDE_PRIVATE_KEY_IN_SUMMARY'));
 assert(!JSON.stringify(r).includes('NEVER_EXPORT'));
 assert(!JSON.stringify(r).includes('LEAK_THIS_RAW_API_TOKEN'));
 assert.equal(r.last_security_sample_missing_reasons[0].code,'INDEPENDENT_PAIR_IDENTITY_NOT_CONFIRMED');
 assert.equal(r.last_security_sample_missing_reasons[0].count,30);
});
test('R29 V5.2 stale, absent, forged and oversized research must fail closed to UNKNOWN, not zero',()=>{
 const empty=summarizeLocalGptFunnel({now});
 assert.equal(empty.collection_recent,false);
 assert.equal(empty.observed_candidate_count,null);
 assert.equal(empty.last_security_sample_actually_checked,null);
 assert.equal(empty.confidence,'INCOMPLETE_OR_STALE_LOCAL_RESEARCH');
 const stale=summarizeLocalGptFunnel({collector:{...collector(),
  last_check_at_utc:iso(now-11*60000)},security:{...security(),
  checked_at_utc:iso(now-121*60000)},now});
 assert.equal(stale.observed_candidate_count,null);
 assert.equal(stale.last_security_sample_research_eligible_evm,null);
 assert.equal(stale.last_security_sample_failed_full_trade_proof,null);
 const forged=summarizeLocalGptFunnel({collector:collector(),security:{
  ...security(),authorizes_paper_orders:true},now});
 assert.equal(forged.independent_security_research_recent,false);
 assert.equal(forged.last_security_sample_actually_checked,null);
 const huge=summarizeLocalGptFunnel({collector:{...collector(),candidate_count:9999},
  security:{...security(),candidate_check_count:9999},now});
 assert.equal(huge.observed_candidate_count,null);
 assert.equal(huge.last_security_sample_actually_checked,null);
});
