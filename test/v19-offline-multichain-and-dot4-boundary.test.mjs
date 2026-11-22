import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {replayArchivedSixChainEvidence} from '../src/v19-offline-multichain-replay.mjs';
import {auditOfflineDot4OrderBoundary} from '../src/v19-offline-dot4-order-boundary.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const asOf='2026-11-22T19:44:00.000Z';
async function originals(){
 const receipt=[],raw={};
 for(const id of ['45036887325','45044300013','45057658912']){
  const e=await read('research/feeds/2026-11-22/'+id+'/evidence.json');
  for(const r of e.api_evidence){
   receipt.push(r);raw[r.body_path]=await readFile(r.body_path,'utf8');
  }
 }
 return {apiEvidence:receipt,rawFiles:raw,asOfUtc:asOf};
}
test('D2-01: three authentic November captures replayed, all real original page timestamps and 429s preserved',async()=>{
 const a=await originals(),r=replayArchivedSixChainEvidence(a);
 assert.equal(r.chains.length,6);
 assert.equal(r.chains_with_at_least_one_prior_real_http200,6);
 assert.equal(r.total_original_http200_pages,15);
 assert.equal(r.total_original_http429_pages,3);
 assert.equal(r.archive_failures.length,0);
 assert.equal(r.historical_price_sample_window_is_november_only,true);
 assert.equal(r.full_market_coverage_pct,null);
 assert.equal(r.actual_network_requests,0);
 assert.equal(r.orders_authorized,0);
 assert.ok(r.pages_replayed.every(x=>!x.original_received_at_utc||
  x.original_received_at_utc.startsWith('2026-11-22')));
});
test('D2-04: actual previously recorded price observations are paired ONLY across time and pool',async()=>{
 const a=await originals(),r=replayArchivedSixChainEvidence(a);
 assert.ok(r.unique_pool_keys_from_these_replayed_pages>=1);
 assert.ok(r.research_pairs.length<=100);
 assert.ok(r.research_pairs.every(x=>x.gap_minutes>=5&&x.gap_minutes<=240
  &&x.original_october_information_not_available&&x.paper_buy_authorized===false
  &&x.observed_quote_not_executable));
 const bad=structuredClone(a);
 bad.apiEvidence[0].received_at_utc='2026-11-24T00:00:00.000Z';
 const denied=replayArchivedSixChainEvidence(bad);
 assert.ok(denied.archive_failures.some(x=>x.reason==='RESPONSE_WAS_NOT_AVAILABLE_AT_VIRTUAL_TIME'));
 assert.ok(denied.total_original_http200_pages<r.total_original_http200_pages);
});
test('D4-01: shared BUY decision passes in both modes but synthetic or untrusted Dot3 cannot create paper order',async()=>{
 const manifest=await read('research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json');
 const first=manifest.snapshots.find(x=>x.observed_at_utc==='2026-10-12T05:34:00.000Z');
 const second=manifest.snapshots.find(x=>x.observed_at_utc==='2026-10-12T06:34:00.000Z');
 const request={id:'untrusted-buypacket-01',action:'BUY',coin:second.coin};
 const result=await auditOfflineDot4OrderBoundary({
  snapshot:second,asOfUtc:'2026-10-12T06:35:00.000Z',
  priorObservation:{at_utc:first.observed_at_utc,price_usd:.001},
  fullReviewDue:true,syntheticRegressionOnly:true,proposedOrder:request
 });
 assert.equal(result.action,'BUY');
 assert.equal(result.both_evaluation_modes_identical,true);
 assert.equal(result.independent_dot3_status,'BLOCKED');
 assert.equal(result.independent_dot3_failure_code,'ORDER_PROOF_POINTER_MISSING_OR_INVALID');
 assert.equal(result.orders_published,0);
 assert.equal(result.client_fills_verified,0);
 assert.equal(result.paper_order_authorized,false);
 const live=await auditOfflineDot4OrderBoundary({
  snapshot:second,asOfUtc:'2026-10-12T06:35:00.000Z',
  priorObservation:{at_utc:first.observed_at_utc,price_usd:.001},
  fullReviewDue:true,syntheticRegressionOnly:false
 });
 assert.equal(live.action,'WATCH');
 assert.equal(live.paper_order_authorized,false);
});
test('D4-01: model SELL is also read-only and wrong action/contract cannot be promoted',async()=>{
 const m=await read('research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json');
 const third=m.snapshots.at(-1);
 const r=await auditOfflineDot4OrderBoundary({snapshot:third,
  asOfUtc:'2026-10-12T07:35:00.000Z',
  position:{entryPrice:.0011},fullReviewDue:false,
  syntheticRegressionOnly:true});
 assert.equal(r.action,'SELL');
 assert.equal(r.paper_order_authorized,false);
 await assert.rejects(auditOfflineDot4OrderBoundary({snapshot:third,
  asOfUtc:'2026-10-12T07:35:00.000Z',
  position:{entryPrice:.0011},fullReviewDue:false,
  syntheticRegressionOnly:true,
  proposedOrder:{action:'BUY',coin:third.coin,id:'forge-lot-01'}}),
  /D4_ORDER_INTENT_NOT_FROM_SHARED_DECISION/);
});
