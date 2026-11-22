import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditSixChainCaptureWindow,SIX_CHAINS}
 from '../src/v19-six-chain-capture-audit.mjs';

const manifest=JSON.parse(await readFile(
 'research/audits/v19-six-chain-originals-2026-11-22.json','utf8'));
async function sources(){
 return Promise.all(manifest.samples.map(async s=>{
  const [rawText,evidence]=await Promise.all([
   readFile(s.source_path,'utf8'),
   readFile(s.evidence_path,'utf8').then(JSON.parse)
  ]);
  const http=evidence.api_evidence.find(x=>x.body_path===s.source_path);
  assert.ok(http,'Original HTTP evidence must include exact source path');
  assert.equal(http.received_at_utc,s.reported_http_received_at_utc);
  assert.equal(evidence.kind,'DOT2_PUBLIC_CAPTURE_EVIDENCE');
  return {raw_path:s.source_path,raw_text:rawText,
   git_blob_sha1:s.expected_git_blob_sha1,http_evidence:http};
 }));
}
const check=(records,window)=>auditSixChainCaptureWindow({
 sources:records,windowStartUtc:window.start_utc,
 windowEndUtc:window.end_utc,
 asOfUtc:'2026-11-22T10:00:00.000Z'
});

test('the six original sources match TWO actual hashes per archived raw file',async()=>{
 const r=check(await sources(),manifest.window_24h);
 assert.equal(r.verified_chain_count,6);
 assert.equal(r.checked_source_count,6);
 assert.equal(r.all_six_chains_have_verified_http_samples,true);
 assert.deepEqual(r.required_chains,SIX_CHAINS);
 assert.ok(r.source_checks.every(x=>
  x.status==='ORIGINAL_HTTP_200_BYTES_AND_BLOB_VERIFIED'
  &&x.git_blob_id_verified===true&&/^[a-f0-9]{64}$/.test(x.original_http_sha256)));
 assert.equal(r.original_october_2026_dot2_capture_proven,false);
 assert.equal(r.every_page_and_pool_globally_observed,false);
});
test('a genuine 5h interval does NOT contain all six sources; Ethereum was later',async()=>{
 const r=check(await sources(),manifest.window_5h);
 assert.equal(r.verified_chain_count,5);
 assert.equal(r.all_six_chains_have_verified_http_samples,false);
 assert.equal(r.by_chain.find(x=>x.chain==='ethereum').status,
  'SOURCES_FAILED_OR_OUT_OF_WINDOW');
 assert.equal(r.by_chain.find(x=>x.chain==='solana').status,'CAPTURE_VERIFIED');
 assert.equal(r.by_chain.find(x=>x.chain==='robinhood').status,'CAPTURE_VERIFIED');
 assert.equal(r.earliest_sample_at_utc,'2026-11-22T03:18:32.933Z');
});
test('Cronos 200 response with zero pools counts as reached API, not 20 fictitious candidates',async()=>{
 const r=check(await sources(),manifest.window_24h);
 const cronos=r.by_chain.find(x=>x.chain==='cronos');
 assert.equal(cronos.status,'CAPTURE_VERIFIED');
 assert.equal(cronos.verified_http_sources,1);
 assert.equal(cronos.raw_pool_rows,0);
 assert.equal(cronos.nonempty_pool_response_verified,false);
 assert.equal(r.chains_with_nonempty_responses,5);
});
test('tampering with bytes, Git blob SHA or network URL cannot pass audit',async()=>{
 const original=await sources();
 const raw=original.map(x=>({...x}));
 raw[0].raw_text+=' ';
 const broken=check(raw,manifest.window_24h);
 assert.equal(broken.verified_chain_count,5);
 assert.equal(broken.all_six_chains_have_verified_http_samples,false);
 // Blob identity is checked before the separate SHA256 by the source auditor.
 assert.equal(broken.source_checks[0].status,'GIT_BLOB_ID_MISMATCH');
 const swap=original.map(x=>({...x}));
 swap[1].git_blob_sha1='f'.repeat(40);
 const corrupted=check(swap,manifest.window_24h);
 assert.equal(corrupted.source_checks[1].status,'GIT_BLOB_ID_MISMATCH');
 const wrongEndpoint=original.map(x=>({...x}));
 wrongEndpoint[2].http_evidence={...wrongEndpoint[2].http_evidence,
   url:wrongEndpoint[2].http_evidence.url.replace('/cro/','/base/')};
 const mismatch=check(wrongEndpoint,manifest.window_24h);
 assert.equal(mismatch.source_checks[2].status,'CHAIN_PAGE_URL_MISMATCH');
});
test('a success in the future cannot be retroactively claimed in an October backtest',async()=>{
 const r=auditSixChainCaptureWindow({sources:await sources(),
  windowStartUtc:'2026-10-11T19:00:00.000Z',
  windowEndUtc:'2026-10-13T00:00:00.000Z',
  asOfUtc:'2026-11-22T10:00:00.000Z'});
 assert.equal(r.verified_chain_count,0);
 assert.equal(r.original_october_2026_dot2_capture_proven,false);
 assert.equal(r.effective_paper_trading_authorized,false);
});
test('Unicode Gecko body: Node byte-length differs from JS UTF16 length',async()=>{
 const source=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(source,/raw_bytes_utf8:Buffer\.byteLength\(text,'utf8'\)/);
 const sample='{"name":"猫🚀"}';
 assert.ok(Buffer.byteLength(sample,'utf8')>sample.length);
});
test('invalid or future audit windows reject without inferring global coverage',()=>{
 assert.throws(()=>auditSixChainCaptureWindow({
  sources:[],windowStartUtc:'2026-11-23T00:00:00Z',
  windowEndUtc:'2026-11-22T00:00:00Z',asOfUtc:'2026-11-22T10:00:00Z'
 }),/INVALID_V19_CHAIN_AUDIT_WINDOW/);
 assert.throws(()=>auditSixChainCaptureWindow({
  sources:[],windowStartUtc:'2026-11-22T00:00:00Z',
  windowEndUtc:'2026-11-23T00:00:00Z',asOfUtc:'2026-11-22T10:00:00Z'
 }),/INVALID_V19_CHAIN_AUDIT_WINDOW/);
});
