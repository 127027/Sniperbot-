import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('QA-03: real archived 5/6 run CLI verifies raw SHA and exits nonzero AFTER archival, without network',()=>{
 const run=spawnSync(process.execPath,['scripts/v19-assert-capture-completion.mjs'],{
  encoding:'utf8',env:{...process.env,GITHUB_RUN_ID:'45057658912'},
  timeout:12000
 });
 assert.equal(run.signal,null);
 assert.equal(run.status,1,'previous partial HTTP429 archive must fail completion');
 const entry=run.stdout.split('\n').find(s=>s.startsWith('DOT2_CAPTURE_COMPLETION_VERDICT '));
 assert.ok(entry,'a structured completion verdict must be logged');
 const verdict=JSON.parse(entry.slice('DOT2_CAPTURE_COMPLETION_VERDICT '.length));
 assert.equal(verdict.run_id,'45057658912');
 assert.equal(verdict.status,'PARTIAL_OR_INVALID_CAPTURE');
 assert.equal(verdict.verified_http200_planned_pages,5);
 assert.deepEqual(verdict.missing_requested_chains,['base']);
 assert.equal(verdict.raw_receipts_checked,8);
 assert.equal(verdict.raw_receipt_integrity_errors,null,'all original 200/429/DEX raw SHAs must match');
 assert.equal(verdict.evidence_committed_before_verification,true);
 assert.equal(verdict.paper_orders_authorized,0);
});
test('QA-03: malformed run IDs fail closed without any provider activity',()=>{
 const run=spawnSync(process.execPath,['scripts/v19-assert-capture-completion.mjs'],{
  encoding:'utf8',env:{...process.env,GITHUB_RUN_ID:'../tampered'},
  timeout:12000
 });
 assert.equal(run.signal,null);
 assert.notEqual(run.status,0);
 assert.match(run.stderr,/MISSING_GITHUB_CAPTURE_RUN_ID/);
});
