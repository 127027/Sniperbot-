import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {summarizeR29OperatingMeasurements} from '../src/v19-operating-measurements.mjs';

async function actual(){
 const root='research/feeds/2026-11-22/45044300013/';
 const [capture,advice,risk,ledger,ranking]=await Promise.all([
  readFile(root+'evidence.json','utf8'),
  readFile('research/state/dot1-cadence-advice.json','utf8'),
  readFile(root+'dot3-research-risk-status-preview.json','utf8'),
  readFile(root+'dot5-neutral-event-ledger.json','utf8'),
  readFile('research/observations/2026-11-22/45044300013-asof-ranking.json','utf8')
 ]);
 return {capture:JSON.parse(capture),cadenceAdvice:JSON.parse(advice),
  riskPreview:JSON.parse(risk),dot5Ledger:JSON.parse(ledger),
  ranking:JSON.parse(ranking),asOfUtc:'2026-11-22T16:40:00Z'};
}
test('SYS-14 actual run has measured 6 Gecko and 4 DEX calls, 9 HTTP200 and one 429',async()=>{
 const r=summarizeR29OperatingMeasurements(await actual());
 assert.equal(r.provider_attempts_measured,10);
 assert.equal(r.provider_http_200,9);
 assert.equal(r.provider_http_429,1);
 assert.equal(r.measured_source_requests_per_provider.GECKOTERMINAL.attempts,6);
 assert.equal(r.measured_source_requests_per_provider.GECKOTERMINAL.http_429,1);
 assert.equal(r.measured_source_requests_per_provider.DEXSCREENER.attempts,4);
 assert.equal(r.measured_source_requests_per_provider.DEXSCREENER.http_200,4);
 assert.equal(r.measured_source_requests_per_chain.ethereum.http_429,1);
 assert.equal(r.provider_start_minute_histogram['GECKOTERMINAL|2026-11-22T16:31Z'].attempts,6);
 assert.equal(r.provider_start_minute_histogram['DEXSCREENER|2026-11-22T16:31Z'].attempts,4);
 assert.equal(r.chain_utc_hour_histogram['ethereum|2026-11-22T16:00Z'].http_429,1);
 assert.ok(r.measured_provider_latency_p95_ms>=r.measured_provider_latency_p50_ms);
 assert.equal(r.provider_cost_usd,null);
 assert.equal(r.github_actions_cost_usd,null);
});
test('D1-06 Dot1 target twelve is not twelve executed GPT reviews',async()=>{
 const r=summarizeR29OperatingMeasurements(await actual());
 assert.equal(r.per_dot.length,5);
 assert.equal(r.per_dot[0].role,'dot-1-tempo');
 assert.equal(r.per_dot[0].recommended_full_reviews_per_day,12);
 assert.equal(r.per_dot[0].verified_gpt_reviews_this_capture,0);
 assert.equal(r.per_dot[0].skipped_gpt_reviews,null);
 assert.equal(r.per_dot[0].gpt_input_tokens,null);
 assert.equal(r.per_dot[0].gpt_cost_usd,null);
 assert.equal(r.no_gpt_run_inferred_from_http_capture,true);
});
test('D5-07 separate five Dot queues and unknown time/expense from actually measured evidence',async()=>{
 const r=summarizeR29OperatingMeasurements(await actual());
 assert.deepEqual(r.per_dot.map(x=>x.role),[
  'dot-1-tempo','dot-2-discovery','dot-3-risk','dot-4-strategy','dot-5-control']);
 assert.equal(r.per_dot[1].queue_count,77);
 assert.equal(r.per_dot[1].capture_runner_http_requests_for_this_stage,10);
 assert.equal(r.per_dot[1].task_failure_count,1);
 assert.ok(r.per_dot.every(x=>x.actual_dot_automation_invoked===false));
 assert.equal(r.per_dot[2].input_pool_activity_count,79);
 assert.equal(r.per_dot[3].input_pool_activity_count,1);
 assert.equal(r.per_dot[4].provider_source_integrity_records,10);
 assert.ok(r.per_dot.every(x=>x.verified_gpt_reviews_this_capture===0));
 assert.ok(r.per_dot.every(x=>x.gpt_cost_usd===null));
 assert.equal(r.actual_client_confirmed_paper_fills,0);
});
test('malformed or future fake provider timing is not included in measured throughput',async()=>{
 const v=await actual();
 const r=summarizeR29OperatingMeasurements({...v,capture:{...v.capture,api_evidence:[
  ...v.capture.api_evidence,{provider:'GECKOTERMINAL',url:'https://api.geckoterminal.com/api/v2/networks/base/new_pools',
   started_at_utc:'2026-11-23T00:00:00Z',received_at_utc:'2026-11-23T00:00:01Z',
   http_status:200,http_ok:true}
 ]}});
 assert.equal(r.provider_attempts_measured,10);
 assert.equal(r.provider_receipts_invalid.length,1);
 assert.equal(r.provider_http_200,9);
});
test('new runner writes a source-derived metrics artifact but never claims GPT/executed orders',async()=>{
 const s=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(s,/summarizeR29OperatingMeasurements/);
 assert.match(s,/v19-operating-measurements\.json/);
 assert.match(s,/operating_metrics_path:operatingMetricsPath/);
 assert.equal(s.includes('R29_LIVE_BUY_ENABLED=true'),false);
});
