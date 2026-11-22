import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {auditR29EightHourCaptures}
 from '../src/v19-eight-hour-source-capture-audit.mjs';

const at='2026-11-23T06:10:00.000Z';
const reqPath='research/requests/2026-11-22/20261122T221200000Z-dot2test.json';
const rawPath='research/feeds/2026-11-22/98765432101/gecko-solana-page1.raw.json';
const raw='{"data":[]}';
const digest=createHash('sha256').update(raw).digest('hex');
const fixture=()=>({
 asOfUtc:at,
 requests:[{path:reqPath,data:{
  schema:1,kind:'DOT2_DISCOVERY_CAPTURE_REQUEST',
  mode:'PAPER_RESEARCH_ONLY',requested_by:'dot-2-discovery',
  created_at_utc:'2026-11-22T22:12:00.000Z',do_not_publish_orders:true}}],
 captures:[{evidence_path:'research/feeds/2026-11-22/98765432101/evidence.json',
  evidence:{schema:1,kind:'DOT2_PUBLIC_CAPTURE_EVIDENCE',
   mode:'PAPER_RESEARCH_ONLY',request_path:reqPath,
   captured_completed_at_utc:'2026-11-22T22:12:25.000Z',
   published_paper_orders:0,verified_client_fills:0},
  completion:{kind:'R29_V19_CAPTURE_COMPLETION_GATE',
   workflow_may_report_success:true,verified_http200_planned_pages:1,
   provider_http_failures:[]},
  inflight:{kind:'R29_V19_INFLIGHT_CAPTURE_JOURNAL',
   run_id:'98765432101',http_receipts:[{
    provider:'GECKOTERMINAL',http_status:200,
    body_path:rawPath,response_sha256:digest}]},
  rawBodiesByPath:{[rawPath]:raw}}]
});
test('one completed source capture with independent original SHA satisfies one of eight hours',()=>{
 const input=fixture(),before=JSON.stringify(input);
 const x=auditR29EightHourCaptures(input);
 assert.equal(x.intended_hourly_dot2_wakes,8);
 assert.equal(x.verified_bounded_capture_hours,1);
 assert.equal(x.remaining_unverified_hours,7);
 assert.equal(x.hours[0].status,'BOUNDED_HTTP_CAPTURE_VERIFIED');
 assert.equal(x.eight_source_captures_really_verified,false);
 assert.equal(x.independently_authenticated_gpt_reviews,0);
 assert.equal(x.windows_live_client_scans_proven,0);
 assert.equal(x.paper_orders_written_by_audit,0);
 assert.equal(JSON.stringify(input),before);
});
test('missing raw bytes, altered bytes, or incomplete provider verdict never counts as actual scan',()=>{
 const f=fixture();
 for(const damage of [
  c=>{c.rawBodiesByPath={}},
  c=>{c.rawBodiesByPath[rawPath]='{"data":[1]}'},
  c=>{c.completion.workflow_may_report_success=false},
  c=>{c.completion.verified_http200_planned_pages=0},
  c=>{c.inflight.http_receipts[0].http_status=429}
 ]){
  const x=structuredClone(f);damage(x.captures[0]);
  const out=auditR29EightHourCaptures(x);
  assert.equal(out.verified_bounded_capture_hours,0);
  assert.equal(out.hours[0].status,'REQUEST_PRESENT_CAPTURE_PROOF_PENDING');
 }
});
test('future source timestamps and wrong requests do not pass source-only eight-hour proof',()=>{
 const f=fixture();
 f.asOfUtc='2026-11-22T22:00:00.000Z';
 let a=auditR29EightHourCaptures(f);
 assert.equal(a.hours[0].status,'NO_ARCHIVED_DOT2_REQUEST');
 assert.equal(a.verified_bounded_capture_hours,0);
 f.asOfUtc=at;f.captures[0].evidence.request_path='research/requests/2026-11-23/mismatched.json';
 a=auditR29EightHourCaptures(f);
 assert.equal(a.verified_bounded_capture_hours,0);
});
test('CLI reports eight slots from checked-in evidence without HTTP, orders or replay',()=>{
 const r=spawnSync(process.execPath,['scripts/v19-eight-hour-source-capture-progress.mjs'],
  {encoding:'utf8',timeout:30000});
 assert.equal(r.status,0,r.stderr);
 const line=r.stdout.split('\n').find(x=>x.startsWith('R29_EIGHT_HOUR_REAL_CAPTURE_EVIDENCE '));
 assert.ok(line);
 const s=JSON.parse(line.slice('R29_EIGHT_HOUR_REAL_CAPTURE_EVIDENCE '.length));
 assert.equal(s.planned_hours,8);
 assert.ok(s.truly_verified_bounded_capture_hours<=8);
 assert.equal(s.orders_written,0);
 assert.equal(s.backtest_triggered,false);
 assert.equal(s.independent_gpt_reviews_proven,0);
});
