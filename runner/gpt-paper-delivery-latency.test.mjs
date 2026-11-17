import test from 'node:test';
import assert from 'node:assert/strict';
import {auditGptPaperDelivery} from './gpt-paper-delivery-latency.mjs';
const decision={
 schema:'sniper_r29_gpt_paper_decision.v1',mode:'PAPER_ONLY',strategy:'GPT_ONLY',
 decision_id:'gpt_e7c715480f009a0dd80040fa78c186a7',
 action:'NO_TRADE',chain:null,token_address:null,pool_address:null,
 amount_test_usdc:null,created_at_utc:'2026-11-17T17:58:12.581Z',
 expires_at_utc:'2026-11-17T19:58:12.581Z',
 source_review_sha256:'8b0ce65bd2f2a28d93aa43b2bd13d6d69e61d444f83be5dc83fdb5dcc0dc403b',
 source_observed_at_utc:'2026-11-17T17:14:43.691Z',
 evidence_ids:['research/r29/channel/dynamic-research-review.json'],
 security_assessment:'UNKNOWN',score_0_100:null,
 reason_de:'Fehlende unabhängige Sicherheit und Quote; deshalb NO_TRADE.',
 risk_level:'HIGH',trade_type:'VIRTUAL_ONLY',real_trading_enabled:false
};
const receipt={
 schema:'sniper_r29_public_gpt_paper_receipt.v1',mode:'PAPER_ONLY',
 real_trading_enabled:false,account_balance_or_wallet_published:false,
 actionable:false,decision_id:decision.decision_id,action:'NO_TRADE',
 received_at_utc:'2026-11-17T17:58:45.322Z',status:'NO_TRADE',
 reason:'GPT_RESEARCH_NO_ORDER',submitted_by:'GITHUB_OWNER_ATTRIBUTED_GPT_RELAY',
 origin_model_signature_verified:false,wallet_touched:false,
 account_balance_published:false,note:'No trade'
};
const now=Date.parse('2026-11-17T18:00:00Z');
test('actual archived forward GPT NO_TRADE decision-to-bot receipt is 32.741 seconds, NOT buy latency',()=>{
 const result=auditGptPaperDelivery(decision,receipt,{now});
 assert.equal(result.delivery_verified,true);
 assert.equal(result.decision_to_bot_receipt_ms,32741);
 assert.equal(result.latency_class,'BETWEEN_15_AND_60_SECONDS');
 assert.equal(result.no_trade_does_not_establish_buy_latency,true);
 assert.equal(result.genuine_live_paper_fill_verified,false);
 assert.equal(result.discovered_event_to_fill_ms,null);
 assert.equal(result.actual_model_signature_verified,false);
 assert.equal(result.paper_account_balance_read,false);
});
test('false signatures, mismatched IDs, future/reversed timestamps and fabricated fills blocked',()=>{
 for(const forged of [
  {...receipt,decision_id:'gpt_'+'f'.repeat(32)},
  {...receipt,origin_model_signature_verified:true},
  {...receipt,action:'BUY'},
  {...receipt,received_at_utc:'2026-11-17T17:57:45.322Z'},
  {...receipt,received_at_utc:'2026-11-18T17:57:45.322Z'},
  {...receipt,status:'PAPER_FILLED'},
  {...receipt,wallet_touched:true},
  {...receipt,account_balance_or_wallet_published:true}
 ]){
  const result=auditGptPaperDelivery(decision,forged,{now});
  assert.equal(result.delivery_verified,false);
  assert.equal(result.genuine_live_paper_fill_verified,false);
  assert.equal(result.decision_to_bot_receipt_ms,null);
 }
});
test('partial or invalid decision never produces fake successful latency',()=>{
 const d={...decision,decision_id:'foo',created_at_utc:'tomorrow'};
 const result=auditGptPaperDelivery(d,receipt,{now});
 assert.equal(result.delivery_verified,false);
});
