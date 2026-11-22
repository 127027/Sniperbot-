import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged,
 makeResearchOnlyReplayReceipt} from '../src/v19-replay-isolation.mjs';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';

test('real files remain byte-for-byte unchanged by an isolated October replay',async()=>{
 const root=await mkdtemp(join(tmpdir(),'r29-v19-iso-'));
 try{
  const realState=join(root,'state.json'),realIndex=join(root,'signals-index.json');
  const stateContent='{"mode":"PAPER_ONLY","cash":4999.01,"positions":{"x":1}}\n';
  const indexContent='{"schema":1,"mode":"PAPER","orders":[]}\n';
  await writeFile(realState,stateContent);await writeFile(realIndex,indexContent);
  const protectedPaths=[realState,realIndex];
  const before=await fingerprintProtectedFiles(protectedPaths);
  const replay=backtestOnRequest({date:'2026-10-12'});
  const receipt=makeResearchOnlyReplayReceipt({report:replay,runId:'test-20261012'});
  const after=await fingerprintProtectedFiles(protectedPaths);
  assert.equal(assertProtectedFilesUnchanged(before,after).status,'UNCHANGED');
  assert.equal(await readFile(realState,'utf8'),stateContent);
  assert.equal(await readFile(realIndex,'utf8'),indexContent);
  assert.equal(receipt.id,'research-test-20261012');
  assert.equal(receipt.model_start_cash_test_usdc,5000);
  assert.equal(receipt.amount_per_coin_test_usdc,50);
  assert.equal(receipt.actual_client_paper_fills,0);
  assert.equal(receipt.never_post_to_github_signals,true);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('guard aborts when protected state changes, even if cash is unchanged',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'r29-v19-corrupt-'));
 try{
  const file=join(dir,'state.json');
  await writeFile(file,'{"cash":5000,"positions":{}}');
  const before=await fingerprintProtectedFiles([file]);
  await writeFile(file,'{"cash":5000,"positions":{"hidden":42}}');
  await assert.rejects(async()=>{
   assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles([file]));
  },/PROTECTED_PAPER_STATE_CHANGED_ABORT_REPORT/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('missing existing Windows state file is observed, never created',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'r29-v19-missing-'));
 try{
  const file=join(dir,'user-paper-account-not-present.json');
  const before=await fingerprintProtectedFiles([file]);
  assert.equal(before.files[0].exists,false);
  assert.equal(assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles([file])).status,
   'UNCHANGED');
  await assert.rejects(readFile(file));
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('state proof checks file identity, bytes, and digests; duplicate inputs rejected',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'r29-v19-invalid-'));
 try{
  const file=join(dir,'state.json');
  await writeFile(file,'{}');
  await assert.rejects(fingerprintProtectedFiles([file,file]),/INVALID_PROTECTED_PAPER_FILE_PATHS/);
  const first=await fingerprintProtectedFiles([file]),second=await fingerprintProtectedFiles([file]);
  assert.equal(first.files[0].sha256,second.files[0].sha256);
  second.files[0].sha256='0'.repeat(64);
  assert.throws(()=>assertProtectedFilesUnchanged(first,second),/PROTECTED_PAPER_STATE_CHANGED_ABORT_REPORT/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('manual CLI has a research-only output directory and protects state + order inbox',async()=>{
 const s=await readFile('scripts/v18-backtest-on-demand.mjs','utf8');
 assert.ok(s.includes("resolve('signals/index.json')"));
 assert.ok(s.includes("R29_STATE_DIR"));
 assert.ok(s.includes("assertProtectedFilesUnchanged(paperBefore"));
 assert.ok(s.includes("makeResearchOnlyReplayReceipt"));
 assert.ok(s.includes("OUTSIDE_PROBE_ARTIFACTS_DIRECTORY"));
});
