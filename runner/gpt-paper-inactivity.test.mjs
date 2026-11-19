import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseGptPaperInactivity} from './gpt-paper-inactivity.mjs';
const now=Date.parse('2026-11-19T10:00:00.000Z'),iso=x=>new Date(x).toISOString();
const id=n=>'gpt_'+String(n).repeat(32);
const decision=(n,ago,status,reason)=>[id(n),{
 at_utc:iso(now-ago*3600000),status,reason,
 archive_sha256:'a'.repeat(64)
}];
const base=()=>({entriesEnabled:true,gptPaperFollow:true,
 agentOrderReceipts:[],gptDecisionReplay:{}});
const receipt=(action,ago,extra={})=>({
 command_source:action==='BUY'?'GPT_GITHUB_LOCAL':'GPT_GITHUB_POLICY_EXIT',
 action,status:'PAPER_FILLED',synthetic_test:false,real_trade_executed:false,
 received_at_utc:iso(now-ago*3600000),closed_pnl_test_usdc:action==='SELL'?7.25:null,
 ...extra
});
test('V5.2 empty state means unknown historical coverage, never 10 days of proven 24/7 uptime',()=>{
 const r=diagnoseGptPaperInactivity(base(),{now});
 assert.equal(r.local_gpt_paper_buy_fills,0);
 assert.equal(r.local_gpt_paper_sell_fills,0);
 assert.equal(r.first_local_evidence_at_utc,null);
 assert.equal(r.review_priority,'OBSERVATION_WINDOW_NOT_ESTABLISHED');
 assert.equal(r.primary_local_explanation,'NO_RECEIVED_GPT_DECISIONS');
 assert(r.observed_inactivity_windows.every(w=>
  !w.no_local_gpt_paper_buy_since_baseline&&
  !w.complete_history_or_continuous_pc_uptime_proven));
 assert.equal(r.real_trading_enabled,false);
 assert.equal(r.local_only,true);
});
test('V5.2 clearly surfaces 24h, 72h, 10d thresholds ONLY as retained local journal evidence',()=>{
 const s=base();
 s.gptDecisionReplay=Object.fromEntries([
  decision('1',265,'NO_TRADE','GPT_RESEARCH_NO_ORDER'),
  decision('2',200,'BLOCKED','GPT_FRESH_PRIVATE_PAPER_CAPACITY_REJECTED'),
  decision('3',70,'BLOCKED','SOLANA_SECURITY_GATE_NOT_YET_SUPPORTED'),
  decision('4',1,'NO_TRADE','GPT_RESEARCH_NO_ORDER')
 ]);
 const r=diagnoseGptPaperInactivity(s,{now});
 assert.equal(r.received_gpt_decisions_with_valid_timestamps,4);
 assert.deepEqual(r.observed_inactivity_windows.map(w=>w.no_local_gpt_paper_buy_since_baseline),
  [true,true,true]);
 assert.equal(r.review_priority,'240H_LOCAL_NO_BUY_DIAGNOSIS');
 assert.equal(r.primary_local_explanation,'CHAIN_SECURITY_NOT_SUPPORTED',
  'when tied the deterministic category order is documented');
 assert.equal(r.local_blocked_decisions,2);
 assert.equal(r.local_research_decisions,2);
 assert.equal(r.continuous_service_availability_verified,false);
 assert.equal(r.retained_journal_complete_for_10_days,false);
});
test('V5.2 real local virtual BUY/SELL receipts counted separately and never as model-attested or live',()=>{
 const s=base();
 s.gptDecisionReplay=Object.fromEntries([decision('1',300,'NO_TRADE','GPT_RESEARCH_NO_ORDER')]);
 s.agentOrderReceipts=[
  receipt('BUY',40),receipt('SELL',20),receipt('BUY',10,{synthetic_test:true}),
  receipt('BUY',5,{command_source:'SIGNED_LOCAL_ADAPTER'}),
  receipt('BUY',4,{status:'BLOCKED'}),receipt('SELL',3,{closed_pnl_test_usdc:1.5})
 ];
 const r=diagnoseGptPaperInactivity(s,{now});
 assert.equal(r.local_gpt_paper_buy_fills,1);
 assert.equal(r.local_gpt_paper_sell_fills,2);
 assert.equal(r.locally_recorded_gpt_paper_sell_pnl_test_usdc,8.75);
 assert.equal(r.last_local_gpt_paper_buy_at_utc,iso(now-40*3600000));
 assert.equal(r.last_local_gpt_paper_sell_at_utc,iso(now-3*3600000));
 assert.equal(r.hours_since_last_local_gpt_paper_buy,40);
 assert.deepEqual(r.observed_inactivity_windows.map(w=>w.no_local_gpt_paper_buy_since_baseline),
  [true,false,false]);
 assert.equal(r.model_origin_for_local_fills_independently_attested,false);
 assert.equal(r.primary_local_explanation,'GPT_NO_TRADE_OR_WATCH_ONLY');
});
test('V5.2 unknown/stale/invalid local timestamps do not invent activity periods or PnL',()=>{
 const s=base();
 s.agentOrderReceipts=[receipt('BUY',2,{received_at_utc:'INVALID'}),
   receipt('SELL',1,{closed_pnl_test_usdc:null})];
 const r=diagnoseGptPaperInactivity(s,{now});
 assert.equal(r.local_gpt_paper_buy_fills,1);
 assert.equal(r.last_local_gpt_paper_buy_at_utc,null);
 assert.equal(r.local_receipts_with_missing_or_invalid_time,1);
 assert.equal(r.locally_recorded_gpt_paper_sell_pnl_test_usdc,null);
 assert.equal(r.review_priority,'OBSERVATION_WINDOW_NOT_ESTABLISHED');
 assert.throws(()=>diagnoseGptPaperInactivity({...s,agentOrderReceipts:null},{now}),
  /INPUT_INVALID/);
 assert.equal(diagnoseGptPaperInactivity({...s,gptDecisionReplay:undefined},{now})
  .received_gpt_decisions_with_valid_timestamps,0);
});
test('V5.2 Paper-entry pause and GPT Follow OFF are honest blockers, no forced trading',()=>{
 const stopped={...base(),entriesEnabled:false,
  gptDecisionReplay:Object.fromEntries([decision('7',30,'NO_TRADE','GPT_RESEARCH_NO_ORDER')])};
 assert.equal(diagnoseGptPaperInactivity(stopped,{now})
  .primary_local_explanation,'PAPER_ENTRIES_DISABLED');
 assert.equal(diagnoseGptPaperInactivity({...stopped,entriesEnabled:true,gptPaperFollow:false},{now})
  .primary_local_explanation,'GPT_FOLLOW_DISABLED');
});
