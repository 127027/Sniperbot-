import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeCaptureObservationBatch,scoreAsOf}
 from '../src/forward-learning.mjs';
const coin={chain:'base',pool:'0x'+'b'.repeat(40),
 contract:'0x'+'a'.repeat(40),symbol:'ORIGINAL',liquidity_usd:10000,
 volume_24h_usd:12345,observed_price_usd:.001};
const path=(id)=>'research/feeds/2026-11-22/'+id+'/gecko-base-page1.raw.json';
const captured=(id,time,rawSha,price=.001)=>makeCaptureObservationBatch({
 capturedAtUtc:time,sourcePath:'research/feeds/2026-11-22/'+id+'/evidence.json',
 geckoCandidates:[{...coin,observed_at_utc:time,
  observed_price_usd:price,source_raw_path:path(id),
  source_raw_sha256:rawSha}]
});
test('D2-04: two HTTP200 captures with the SAME immutable raw SHA do not count as fresh momentum',()=>{
 const t1='2026-11-22T20:00:00.000Z',t2='2026-11-22T20:10:00.000Z';
 const one=captured('one',t1,'a'.repeat(64)),two=captured('two',t2,'a'.repeat(64));
 assert.equal(one.observations[0].source_raw_sha256,'a'.repeat(64));
 assert.equal(one.observations[0].provider_quote_origin_time_verified,false);
 const report=scoreAsOf({batches:[one,two],asOfUtc:t2});
 const candidate=report.candidates[0];
 assert.equal(candidate.distinct_http_capture_times,2);
 assert.equal(candidate.duplicated_original_provider_raw_captures_suppressed,1);
 assert.equal(candidate.evidence_batches,1);
 assert.equal(candidate.prior_price_capture_at_utc,null);
 assert.equal(candidate.score,null);
 assert.equal(candidate.status,'WATCH_INSUFFICIENT_REPEATED_EVIDENCE');
 assert.equal(candidate.trade_authorized,false);
 assert.equal(report.counts.research_rankable,0);
});
test('D2-04: only separately recorded DIFFERENT original raw responses count as distinct model observations',()=>{
 const a=captured('a','2026-11-22T20:00:00.000Z','a'.repeat(64));
 const b=captured('b','2026-11-22T20:10:00.000Z','a'.repeat(64));
 const c=captured('c','2026-11-22T20:20:00.000Z','b'.repeat(64),.0012);
 const report=scoreAsOf({batches:[a,b,c],asOfUtc:'2026-11-22T20:20:00.000Z'});
 assert.equal(report.candidates[0].distinct_http_capture_times,3);
 assert.equal(report.candidates[0].evidence_batches,2);
 assert.equal(report.candidates[0].duplicated_original_provider_raw_captures_suppressed,1);
 assert.equal(report.candidates[0].observed_price_change_pct,20);
 assert.equal(report.candidates[0].status,'RESEARCH_PRIORITY_ONLY_NOT_RISK_APPROVED');
 assert.equal(report.candidates[0].trade_authorized,false);
 assert.equal(report.orders,0);
 assert.equal(report.candidates[0].independent_provider_quote_time_verified,false);
});
test('Legacy missing hash retains old historical research semantics but can never claim verified upstream quote time',()=>{
 const first=captured('x','2026-11-22T20:00:00.000Z',null);
 const second=captured('y','2026-11-22T20:10:00.000Z',null,.0011);
 const r=scoreAsOf({batches:[first,second],asOfUtc:'2026-11-22T20:10:00.000Z'});
 assert.equal(r.candidates[0].evidence_batches,2);
 assert.equal(r.candidates[0].independent_provider_quote_time_verified,false);
 assert.equal(r.candidates[0].trade_authorized,false);
});
test('Full actual Dot2 runner passes immutable raw SHA to newly-created Gecko and DEX observation rows',async()=>{
 const s=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(s,/source_raw_sha256:x\.sourceSha256/);
 assert.match(s,/source_raw_sha256:data\.evidence\.response_sha256/);
 assert.match(s,/source_raw_sha256:p\.sourceSha256/);
 assert.match(s,/makeCaptureObservationBatch\(/);
 assert.doesNotMatch(s,/signals\/orders\/.*writeFile/);
});
