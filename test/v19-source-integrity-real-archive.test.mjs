import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {verifyArchivedHttpBytes} from '../src/v19-source-integrity.mjs';
const rawPath='research/feeds/2026-11-22/44997708364/gecko-base-page3.raw.json';
const evidencePath='research/feeds/2026-11-22/44997708364/evidence.json';
const immutableGitBlob='b078886e87fe35e538403844de24f19d1601b2a5';
test('archived original 20-pool Base page has matching SHA256 and actual Git blob content identity',async()=>{
 const [raw,evidence]=await Promise.all([readFile(rawPath,'utf8'),
  readFile(evidencePath,'utf8').then(JSON.parse)]);
 const recorded=evidence.api_evidence.find(x=>x.body_path===rawPath);
 assert.ok(recorded,'matching provider HTTP record exists');
 const verify=verifyArchivedHttpBytes({rawText:raw,evidence:recorded,
  sourcePath:rawPath,asOfUtc:'2026-11-22T08:00:00.000Z',
  expectedGitBlobSha1:immutableGitBlob});
 assert.equal(verify.status,'SOURCE_BYTES_VERIFIED');
 assert.equal(verify.calculated_git_blob_sha1,immutableGitBlob);
 assert.equal(verify.git_blob_sha_matched_independent_reference,true);
 assert.equal(verify.original_source_capture_time_independently_attested,false);
 assert.equal(verify.paper_buy_authorized,false);
});
test('same November source can never be presented as available on 12 October',async()=>{
 const [raw,evidence]=await Promise.all([readFile(rawPath,'utf8'),
  readFile(evidencePath,'utf8').then(JSON.parse)]);
 const recorded=evidence.api_evidence.find(x=>x.body_path===rawPath);
 const verification=verifyArchivedHttpBytes({rawText:raw,evidence:recorded,
  sourcePath:rawPath,asOfUtc:'2026-10-12T09:35:00.000Z',
  expectedGitBlobSha1:immutableGitBlob});
 assert.equal(verification.status,'POST_ASOF_ONLY');
 assert.equal(verification.paper_buy_authorized,false);
});
test('wrong Git object identity never passes even when raw SHA256 is self-consistent',async()=>{
 const [raw,evidence]=await Promise.all([readFile(rawPath,'utf8'),
  readFile(evidencePath,'utf8').then(JSON.parse)]);
 const recorded=evidence.api_evidence.find(x=>x.body_path===rawPath);
 const verification=verifyArchivedHttpBytes({rawText:raw,evidence:recorded,
  sourcePath:rawPath,asOfUtc:'2026-11-22T08:00:00.000Z',
  expectedGitBlobSha1:'a'.repeat(40)});
 assert.equal(verification.status,'REJECTED');
 assert.equal(verification.reason,'GIT_BLOB_ID_MISMATCH');
});
