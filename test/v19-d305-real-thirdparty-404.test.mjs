import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {classifyHoneypotResearchCapture}
 from '../src/v19-honeypot-risk-research.mjs';
import {verifyArchivedHttpBytes} from '../src/v19-source-integrity.mjs';
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
test('D3-05: first REAL free Honeypot.is source HTTP404 is intact, not fake positive or negative sellability',async()=>{
 const report=await read('research/feeds/2026-11-22/45066522539/honeypot-research-evidence.json');
 const request=await read(report.request_path),r=report.original_raw_receipt;
 assert.equal(report.kind,'R29_HONEYPOT_INDICATIVE_RISK_CAPTURE_EVIDENCE');
 assert.equal(report.workflow_run_id,'45066522539');
 assert.equal(report.status,'HTTP_404_ARCHIVED');
 assert.equal(report.actual_provider_requests,1);
 assert.equal(r.provider,'HONEYPOT_IS');
 assert.equal(r.http_status,404);
 assert.equal(r.http_ok,false);
 const raw=await readFile(r.body_path,'utf8');
 assert.equal(sha(raw),r.response_sha256);
 const proof=verifyArchivedHttpBytes({rawText:raw,evidence:r,sourcePath:r.body_path,
  asOfUtc:'2026-11-22T20:30:00.000Z'});
 assert.equal(proof.status,'HTTP_ERROR_ARCHIVED');
 const s=classifyHoneypotResearchCapture({request,rawText:raw,
  evidence:r,asOfUtc:'2026-11-22T20:30:00.000Z'});
 assert.equal(s.status,'DATA_GAP');
 assert.equal(s.trade_authorized,false);
 assert.equal(s.authentically_live_sell_route_proven,false);
 assert.equal(report.orders_published,0);
 assert.equal(report.actual_client_fills,0);
 assert.equal(report.security_issuer_authenticated,false);
});
test('D3-05: any future provider capture must not rewrite historical source evidence',async()=>{
 const report=await read('research/feeds/2026-11-22/45066522539/honeypot-research-evidence.json');
 const request=await read(report.request_path);
 const r=report.original_raw_receipt,raw=await readFile(r.body_path,'utf8');
 const s=classifyHoneypotResearchCapture({request,rawText:raw,evidence:r,
  asOfUtc:'2026-11-22T20:25:00.000Z'});
 assert.equal(s.status,'DATA_GAP');
 assert.equal(s.reason,'FUTURE_PROVIDER_CAPTURE_NOT_AVAILABLE_AT_ASOF');
});
test('D3-05: single-purpose API trigger and risk workflow never touch orders or initiate a backtest',async()=>{
 const yaml=await readFile('.github/workflows/cleanroom-dot3-honeypot-research.yml','utf8');
 assert.match(yaml,/research\/risk-requests\/\*\*/);
 assert.match(yaml,/git add research\/feeds\/ research\/risk\/state\//);
 assert.match(yaml,/test "\$\{\{ steps\.security_capture\.outcome \}\}" = "success"/);
 assert.doesNotMatch(yaml,/node scripts\/v18-backtest-on-demand\.mjs/);
 assert.doesNotMatch(yaml,/node scripts\/v19-offline-backtest-acceptance\.mjs/);
 const runner=await readFile('scripts/cloud-honeypot-risk-research.mjs','utf8');
 assert.match(runner,/signal:AbortSignal\.timeout\(14000\)/);
 assert.match(runner,/redirect:'error'/);
 assert.match(runner,/total_attempts\+\+/);
 assert.doesNotMatch(runner,/writeFile\(['"]signals\//);
});
