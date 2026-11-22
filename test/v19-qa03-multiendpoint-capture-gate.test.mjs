import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {assessCaptureCompletion} from '../src/v19-capture-completion-gate.mjs';
const root='research/feeds/2026-11-22/45065920534/';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
async function evidence(){
 const [journal,evidence]=await Promise.all([
  read(root+'inflight-capture.json'),read(root+'evidence.json')
 ]);
 const request=await read(evidence.request_path);
 return {journal,evidence,request,runId:'45065920534'};
}
test('QA-03/D2-05: genuine Robinhood planned page, Solana trending and BSC OHLCV all HTTP200, no false overall failure',async()=>{
 const args=await evidence();
 const result=assessCaptureCompletion(args);
 assert.equal(result.status,'BOUNDED_SAMPLE_COMPLETE_COVERAGE_INCOMPLETE');
 assert.equal(result.workflow_may_report_success,true);
 assert.equal(result.planned_page_count,1);
 assert.equal(result.verified_http200_planned_pages,1);
 assert.deepEqual(result.reasons,[]);
 assert.equal(result.supplemental_gecko_receipts.length,1);
 assert.deepEqual(result.supplemental_gecko_receipts.map(x=>[x.chain,x.lane,x.status]),
  [['solana','TRENDING',200]]);
 assert.deepEqual(result.supplemental_gecko_http_failures,[]);
 assert.equal(result.global_market_coverage_proven,false);
 assert.equal(result.paper_orders_authorized,0);
 assert.equal(args.evidence.api_evidence.length,5);
 assert.ok(args.evidence.api_evidence.some(x=>x.provider==='GECKOTERMINAL_OHLCV'
  &&x.http_status===200));
 const cli=spawnSync(process.execPath,['scripts/v19-assert-capture-completion.mjs'],{
  encoding:'utf8',timeout:15000,env:{...process.env,GITHUB_RUN_ID:'45065920534'}
 });
 assert.equal(cli.status,0,cli.stderr);
 const prefix='DOT2_CAPTURE_COMPLETION_VERDICT ';
 const row=cli.stdout.split('\n').find(x=>x.startsWith(prefix));
 assert.ok(row);
 const verified=JSON.parse(row.slice(prefix.length));
 assert.equal(verified.raw_receipts_checked,5);
 assert.equal(verified.raw_receipt_integrity_errors,null);
 assert.equal(verified.verified_http200_planned_pages,1);
});
test('QA-03: malformed or 429 supplementary sources remain rejected, not hidden under planned-page success',async()=>{
 const original=await evidence();
 const bad=structuredClone(original);
 const extra=bad.journal.http_receipts.find(x=>x.body_path.includes('-trending-'));
 assert.ok(extra);
 extra.body_path=extra.body_path.replace('-trending-1h.raw.json','-bogus-1h.raw.json');
 let outcome=assessCaptureCompletion(bad);
 assert.equal(outcome.workflow_may_report_success,false);
 assert.ok(outcome.reasons.includes('UNVERIFIABLE_GECKO_RECEIPT'));
 const throttle=structuredClone(original);
 throttle.journal.http_receipts.find(x=>x.body_path.includes('-trending-')).http_status=429;
 outcome=assessCaptureCompletion(throttle);
 assert.equal(outcome.workflow_may_report_success,false);
 assert.ok(outcome.reasons.includes('SUPPLEMENTAL_GECKO_HTTP_FAILURE'));
});
test('QA-03: supplemental feed never counts as the originally required new-pools page',async()=>{
 const x=await evidence();
 x.journal=structuredClone(x.journal);
 x.journal.http_receipts=x.journal.http_receipts.filter(r=>!r.body_path.includes('-page3.raw.json'));
 const result=assessCaptureCompletion(x);
 assert.equal(result.verified_http200_planned_pages,0);
 assert.equal(result.status,'PARTIAL_OR_INVALID_CAPTURE');
 assert.equal(result.workflow_may_report_success,false);
 assert.ok(result.reasons.includes('PLANNED_PAGES_WITHOUT_HTTP200'));
});
