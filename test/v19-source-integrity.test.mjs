import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyArchivedHttpBytes,auditCaptureEvidenceBundle}
 from '../src/v19-source-integrity.mjs';
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const path='research/feeds/2026-11-22/123/gecko-base-page1.raw.json';
const raw='{"data":[1,2,3]}';
const start='2026-11-22T10:00:00.000Z',end='2026-11-22T10:00:01.000Z';
const source={provider:'GECKOTERMINAL',url:'https://api.geckoterminal.com/api/v2/networks/base/new_pools?page=1',
 started_at_utc:start,received_at_utc:end,body_path:path,
 response_sha256:sha(raw),http_status:200,http_ok:true};
test('SHA-256 matches archived bytes, but captures do not claim independent historical timestamp authority',()=>{
 const v=verifyArchivedHttpBytes({rawText:raw,evidence:source,
  sourcePath:path,asOfUtc:'2026-11-22T10:05:00.000Z'});
 assert.equal(v.status,'SOURCE_BYTES_VERIFIED');
 assert.equal(v.actual_sha256,sha(raw));
 assert.equal(v.original_source_capture_time_independently_attested,false);
 assert.equal(v.historical_dot_discovery_proven,false);
 assert.equal(v.paper_buy_authorized,false);
});
test('a changed archived byte rejects the whole source, even with plausible metadata',()=>{
 const v=verifyArchivedHttpBytes({rawText:raw+' ',evidence:source,
  sourcePath:path,asOfUtc:'2026-11-22T10:05:00.000Z'});
 assert.equal(v.status,'REJECTED');
 assert.equal(v.reason,'ORIGINAL_RAW_SHA256_MISMATCH');
});
test('replay cannot backdate November fetch as an October original',()=>{
 const v=verifyArchivedHttpBytes({rawText:raw,evidence:source,
  sourcePath:path,asOfUtc:'2026-10-12T09:35:00.000Z'});
 assert.equal(v.status,'POST_ASOF_ONLY');
 assert.equal(v.reason,'RESPONSE_WAS_NOT_AVAILABLE_AT_VIRTUAL_TIME');
});
test('path mismatch, forged vendor hostname and invalid capture sequence all reject',()=>{
 const args={rawText:raw,evidence:source,sourcePath:path,asOfUtc:'2026-11-22T10:05:00.000Z'};
 assert.equal(verifyArchivedHttpBytes({...args,sourcePath:path.replace('page1','page2')}).status,'REJECTED');
 assert.equal(verifyArchivedHttpBytes({...args,evidence:{...source,
  url:'https://api.geckoterminal.com.evil.example/api/v2/pools'}}).reason,'UNVERIFIED_PROVIDER_ENDPOINT');
 assert.equal(verifyArchivedHttpBytes({...args,evidence:{...source,
  received_at_utc:'2026-11-22T09:59:59.000Z'}}).reason,'INVALID_CAPTURE_SEQUENCE');
});
test('429 original body remains an error archive and never proves a market quote',()=>{
 const s={...source,provider:'DEXSCREENER',
  url:'https://api.dexscreener.com/latest/dex/pairs/base/'+('0x'+'a'.repeat(40)),
  http_status:429,http_ok:false};
 const r=verifyArchivedHttpBytes({rawText:raw,evidence:s,sourcePath:path,
  asOfUtc:'2026-11-22T10:05:00.000Z'});
 assert.equal(r.status,'HTTP_ERROR_ARCHIVED');
 assert.equal(r.paper_buy_authorized,false);
});
test('bundle requires the actual original body for every HTTP evidence row',()=>{
 const r=auditCaptureEvidenceBundle({rawFiles:{[path]:raw},
  apiEvidence:[source,{...source,body_path:path.replace('page1','page2')}],
  asOfUtc:'2026-11-22T10:05:00.000Z'});
 assert.equal(r.checked,2);
 assert.equal(r.bytes_verified,1);
 assert.equal(r.errors_or_rejected,1);
 assert.equal(r.trade_authorized,false);
});
