import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {auditUserWinnersAgainstAsOfCaptures} from './r29-v5-posthoc-audit.mjs';

const folder=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(readFileSync(path.join(folder,
 'R29_V5_USER_SUPPLIED_36_MOVERS_POSTHOC_ONLY.json'),'utf8'));
const amd=manifest.rows[0],mame=manifest.rows[1];
const capture=(at,row,firstAt=at)=>({
 schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
 published_at_utc:at,candidates:[{
  candidate_id:'solana:'+row.external_contract_candidate+':POOL_TEST_A',
  chain:'solana',token_address:row.external_contract_candidate,
  pool_address:'POOL_TEST_A',observed_at_utc:firstAt
 }]});
test('V5 imports the exact 36 unverified users benchmark labels, not a forward winner watchlist',()=>{
 assert.equal(manifest.rows.length,36);
 assert.equal(manifest.total_rows,36);
 assert.equal(manifest.never_include_in_forward_model_input,true);
 assert(manifest.rows.every(r=>r.benchmark_only===true&&
  r.reported_gain_independently_verified===false));
 assert.equal(manifest.rows.filter(r=>r.external_contract_candidate).length,14);
 assert.equal(manifest.rows[0].reported_pct,72843);
 assert.equal(manifest.rows[1].reported_pct,52441);
 assert.equal(manifest.rows[35].display_name,'DogWifJob (JOB)');
 // Guard production GPT input from importing the posthoc manifest.
 for(const f of [
  '../../../../runner/dynamic-research-scheduler.mjs',
  '../../../../runner/research-market-daemon.mjs',
  '../../../../runner/gpt-paper-protocol.mjs',
  '../../../../runner/r29-canonical-market-relay.mjs'
 ]){
  const source=readFileSync(path.resolve(folder,f),'utf8');
  assert(!source.includes('R29_V5_USER_SUPPLIED_36_MOVERS_POSTHOC_ONLY'),
   'future winner manifest must not appear in forward code '+f);
 }
});
test('V5 never treats retrospective article date or first pool claim as first bot observation',()=>{
 const none=auditUserWinnersAgainstAsOfCaptures({manifest});
 assert.equal(none.benchmark_rows,36);
 assert.equal(none.first_seen_before_target,0);
 assert.equal(none.proven_model_watches_or_buys,0);
 assert.equal(none.personal_paper_buy_fills,0);
 assert(none.results.every(r=>r.realizable_net_pnl_test_usdc===null));
 const late=auditUserWinnersAgainstAsOfCaptures({
  manifest,captures:[capture('2026-11-17T14:00:00.000Z',amd,
   '2026-11-03T21:21:00.000Z')]
 });
 assert.equal(late.first_seen_before_target,0,
  'backdated creator metadata cannot replace actual late capture');
 assert.equal(late.results[0].classification,
  'ONLY_OBSERVED_AFTER_REPORTED_MEASURE_END');
 const asof=auditUserWinnersAgainstAsOfCaptures({
  manifest,captures:[capture('2026-11-03T22:00:00.000Z',amd),
   capture('2026-11-02T12:00:00.000Z',mame)]
 });
 assert.equal(asof.first_seen_before_target,2);
 assert.equal(asof.proven_model_watches_or_buys,0,
  'early local market capture alone is NOT proof of GPT strategy');
});
test('V5 rejects fabricated GPT reviews; authentic reviews need attestation and own prior capture',()=>{
 const snap=capture('2026-11-03T22:00:00.000Z',amd);
 const cid=snap.candidates[0].candidate_id;
 const maybe={model_call_attested:false,at_utc:'2026-11-03T22:02:00.000Z',
  action:'BUY',candidate_ids:[cid],decision_id:'gpt_'+'a'.repeat(32)};
 const falseHistory=auditUserWinnersAgainstAsOfCaptures({
  manifest,captures:[snap],modelReviews:[maybe],
  receipts:[{...maybe,status:'PAPER_FILLED',
   local_paper_ledger_verified:false,filled_at_utc:maybe.at_utc}]
 });
 assert.equal(falseHistory.proven_model_watches_or_buys,0);
 assert.equal(falseHistory.personal_paper_buy_fills,0);
 const realReview={...maybe,model_call_attested:true};
 const found=auditUserWinnersAgainstAsOfCaptures({
  manifest,captures:[snap],modelReviews:[realReview],
  receipts:[{...realReview,status:'PAPER_FILLED',
   action:'BUY',chain:'solana',token_address:amd.external_contract_candidate,
   local_paper_ledger_verified:true,filled_at_utc:'2026-11-03T22:04:00.000Z',
   position_id:'paper-test'}]
 });
 assert.equal(found.proven_model_watches_or_buys,1);
 assert.equal(found.personal_paper_buy_fills,1);
 assert.equal(found.personal_paper_sell_fills,0);
 assert.equal(found.results[0].realizable_net_pnl_test_usdc,null);
 assert.equal(found.no_hindsight_winner_labels_in_model,true);
});
