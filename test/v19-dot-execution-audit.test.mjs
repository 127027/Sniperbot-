import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFiveDotExecution,FIVE_R29_ROLES} from '../src/v19-dot-execution-audit.mjs';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';

const at='2026-10-13T00:00:00.000Z';
const event={at_utc:'2026-10-12T00:35:00.000Z',full_review:true,
 target_per_24h:4,actions:[{action:'BUY',reason:'POSITIVE_OBSERVED_MOMENTUM'}]};
test('all five roles are explicitly SIMULATED even for a synthetic model BUY',()=>{
 const a=auditFiveDotExecution({events:[event],asOfUtc:at});
 assert.deepEqual(a.per_role.map(x=>x.role),FIVE_R29_ROLES);
 assert.equal(a.simulated_role_step_count,5);
 assert.equal(a.genuine_gpt_invocations,0);
 assert.equal(a.verified_gpt_run_count,0);
 assert.equal(a.published_paper_orders,0);
 assert.equal(a.verified_paper_fills,0);
 assert.equal(a.ticks[0].modeled_actions[0].not_an_actual_paper_fill,true);
 assert.equal(a.ticks[0].modeled_actions[0].not_an_actual_gpt_decision,true);
});
test('fake self-reported GPT execution and future run cannot manufacture a real Dot',()=>{
 const a=auditFiveDotExecution({events:[event],asOfUtc:at,claimedGptJournals:[
  {role:'dot-4-strategy',executed_at_utc:'2026-10-12T00:35:00Z',
   self_reported_verified:true,claimed_orders:3},
  {role:'dot-4-strategy',executed_at_utc:'2026-10-14T00:35:00Z',
   self_reported_verified:true}]});
 assert.equal(a.claimed_gpt_journal_count,2);
 assert.equal(a.unauthenticated_gpt_claims[0].status,'UNVERIFIED_GPT_EXECUTION_CLAIM');
 assert.equal(a.unauthenticated_gpt_claims[1].status,'INVALID_OR_FUTURE_CLAIM');
 assert.equal(a.verified_gpt_run_count,0);
});
test('future replay tick refuses to cross requested as-of boundary',()=>{
 assert.throws(()=>auditFiveDotExecution({events:[{...event,
  at_utc:'2026-10-13T00:35:00.000Z'}],asOfUtc:at}),/REPLAY_EVENT_AFTER_ASOF/);
});
test('full on-demand backtest includes 24*5 simulated role audits, zero real GPTs',()=>{
 const report=backtestOnRequest({date:'2026-10-12'});
 const audit=report.role_execution_provenance;
 assert.equal(audit.per_role.length,5);
 assert.equal(audit.model_tick_count,24);
 assert.equal(audit.simulated_role_step_count,120);
 assert.equal(audit.full_review_due_count,4);
 assert.equal(audit.verified_gpt_run_count,0);
 assert.equal(audit.verified_paper_fills,0);
 assert.equal(report.historical_gpt_dot_runs,0);
 assert.equal(report.confirmed_paper_fills,0);
});
test('optional claimed GPT journals remain unverified in complete report',()=>{
 const report=backtestOnRequest({date:'2026-10-12',
  manifest:{schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',date:'2026-10-12',
   selected_from_future_winner_list:false,snapshots:[],activity_observations:[],
   claimed_gpt_journals:[{role:'dot-1-tempo',
    executed_at_utc:'2026-10-12T08:00:00.000Z',verified:true}]}});
 assert.equal(report.role_execution_provenance.claimed_gpt_journal_count,1);
 assert.equal(report.role_execution_provenance.verified_gpt_run_count,0);
});
