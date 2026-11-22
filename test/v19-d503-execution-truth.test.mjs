import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {buildDotExecutionTruth} from '../src/v19-dot5-execution-truth.mjs';
test('D5-03 empty historical universe still reports 120 modeled roles but no real GPT, cost or token claims',()=>{
 const r=backtestOnRequest({date:'2026-10-12'});
 const e=r.dot_execution_truth;
 assert.equal(e.kind,'R29_D5_03_EXECUTION_TRUTH_REPORT');
 assert.equal(e.modeled_role_steps,120);
 assert.equal(e.modeled_review_due_count,4);
 assert.equal(e.verified_real_gpt_reviews,0);
 assert.equal(e.actual_gpt_review_cost_usd,null);
 assert.equal(e.actual_gpt_input_tokens,null);
 assert.equal(e.actual_gpt_output_tokens,null);
 assert.equal(e.per_dot.length,5);
 assert.ok(e.per_dot.every(x=>x.execution_type==='DETERMINISTIC_ROLE_SIMULATION_ONLY'));
 assert.ok(e.per_dot.every(x=>x.actual_gpt_inputs===null&&x.actual_gpt_outputs===null));
 assert.equal(e.actual_client_confirmed_paper_fills,0);
});
test('D5-03 real November HTTP receipts are DATA CAPTURE not independent GPT invocations',async()=>{
 const capture=JSON.parse(await readFile('research/feeds/2026-11-22/45044300013/evidence.json','utf8'));
 const report=backtestOnRequest({date:'2026-10-12'});
 const e=buildDotExecutionTruth({
  roleAudit:report.role_execution_provenance,
  asOfUtc:'2026-11-22T16:40:00Z',sourceCapture:capture});
 assert.equal(e.provider_http_response_count,10);
 assert.equal(e.provider_http_success_count,9);
 assert.equal(e.verified_real_gpt_reviews,0);
 assert.equal(e.http_captures_are_not_gpt_reviews,true);
 assert.equal(e.actual_client_confirmed_paper_fills,0);
});
test('D5-03 forged GPT journal cannot supply authenticated decisions or invented cost',()=>{
 const r=backtestOnRequest({date:'2026-10-12',manifest:{
  schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',date:'2026-10-12',
  selected_from_future_winner_list:false,snapshots:[],activity_observations:[],
  claimed_gpt_journals:[{role:'dot-4-strategy',executed_at_utc:'2026-10-12T12:00:00Z',
   verified:true,gpt_input_tokens:10000,reported_profit:9000}]
 }});
 const e=r.dot_execution_truth;
 assert.equal(e.self_reported_gpt_claims_excluded,1);
 assert.equal(e.verified_real_gpt_reviews,0);
 assert.equal(e.actual_gpt_review_cost_usd,null);
 assert.equal(e.actual_gpt_input_tokens,null);
});
