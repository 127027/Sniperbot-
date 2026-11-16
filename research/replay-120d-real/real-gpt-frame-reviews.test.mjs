import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {assessHistoricalPreflight} from './historical-evidence-gate.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const report=JSON.parse(readFileSync(
 path.join(HERE,'reviews/2026-10-15-six-neutral-real-frames-current-gpt.json'),'utf8'));
test('actual provider-sourced as-of six candidate reports have independent UTC clocks',()=>{
 assert.equal(report.decisions.length,6);
 assert.equal(report.type,'CURRENT_GPT_RETROSPECTIVE_RESEARCH_ONLY');
 assert.equal(report.is_it_fully_blind_without_pretraining_memory,false);
 assert.equal(report.historical_paper_fills,0);
 for(const r of report.decisions){
  assert.equal(r.chain,'solana');
  assert(Date.parse(r.launch_time_utc)<Date.parse(r.virtual_decision_at_utc));
  assert(Date.parse(r.virtual_decision_at_utc)<Date.parse(report.authored_now_utc));
  const o=r.observed_at_time;
  assert.equal(o.review_at_utc,r.virtual_decision_at_utc);
  assert.equal(o.observed_events,
   o.successful_buys+o.successful_sells+o.failed_swaps);
  assert(o.distinct_observed_buyer_wallets<=o.successful_buys);
  assert(o.distinct_observed_seller_wallets<=o.successful_sells);
  assert.equal(o.historical_GPT_calls_made_in_replay,0);
  assert.equal(o.independent_historic_onchain_security,false);
  assert.equal(o.contemporaneously_executable_costed_swap_quote,false);
  assert.equal(r.order_to_local_paper_bot,null);
  assert(['WATCH','NO_TRADE'].includes(r.research_verdict));
 }
 assert.equal(report.decisions.filter(x=>x.research_verdict==='WATCH').length,2);
 assert.equal(report.decisions.filter(x=>x.research_verdict==='NO_TRADE').length,4);
});
test('all six real as-of frame candidates fail honest independent six-proof trade gate',()=>{
 for(const r of report.decisions){
  const x=assessHistoricalPreflight({
   asof_utc:r.virtual_decision_at_utc,chain:'solana',
   token_address:r.mint,evidence:[]});
  assert.equal(x.permission,'NO_ORDER_EVIDENCE_GAP');
  assert.equal(x.missing_required_proofs.length,6);
  assert.equal(x.actual_historical_buy_or_sell_fill,false);
  assert.equal(x.gpt_buy_decision,null);
 }
});
