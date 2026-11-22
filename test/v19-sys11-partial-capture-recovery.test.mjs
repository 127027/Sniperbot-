import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {emptyPageCoverage,updatePageCoverage} from '../src/v19-page-coverage.mjs';
import {planMultiChainCapture} from '../src/v19-discovery-budget-plan.mjs';
import {stagePendingCapture,appendPartialHttpReceipt,closePartialCapture}
 from '../src/v19-partial-capture-durability.mjs';
import {emptyProviderBudgetState,reserveProviderRequest,inspectProviderBudget}
 from '../src/v19-provider-budget.mjs';
const now='2026-11-22T18:45:00.000Z';
const nets=['solana','base','ethereum','bsc','robinhood','cronos'];
test('QA-03: abrupt crash after one of six Chain/page HTTP attempts retains all five unfinished pages',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'r29-partial-failure-'));
 try{
  const tasks=planMultiChainCapture({networks:nets,budget:6,asOfUtc:now}).tasks;
  const staged=stagePendingCapture({pageCoverage:emptyPageCoverage(),tasks,
   atUtc:now,runId:'450777001'});
  assert.equal(staged.journal.state,'STARTED_NOT_FINALIZED');
  assert.equal(staged.journal.status_is_not_successful_capture,true);
  assert.equal(staged.pageCoverage.chains.ethereum.pending_pages[0],1);
  const file=join(dir,'page-coverage.json'),journalFile=join(dir,'inflight.json');
  await writeFile(file,JSON.stringify(staged.pageCoverage),'utf8');
  const first=tasks[0];
  const rawPath='research/feeds/2026-11-22/450777001/gecko-solana-page1.raw.json';
  const evidence={provider:'GECKOTERMINAL',http_status:200,body_path:rawPath,
   response_sha256:'a'.repeat(64),started_at_utc:now,received_at_utc:now};
  const journal=appendPartialHttpReceipt(staged.journal,{evidence,atUtc:now});
  await writeFile(journalFile,JSON.stringify(journal),'utf8');
  // Process died here; no final HTTP200 decoder / page success proof exists.
  const restarted=JSON.parse(await readFile(file,'utf8'));
  const provenance=JSON.parse(await readFile(journalFile,'utf8'));
  assert.equal(provenance.http_receipts.length,1);
  assert.equal(provenance.source_http_successes,1);
  assert.equal(provenance.state,'STARTED_NOT_FINALIZED');
  assert.equal(Object.keys(restarted.chains).length,6);
  assert.ok(Object.values(restarted.chains).every(x=>x.pending_pages.includes(1)));
  assert.ok(Object.values(restarted.chains).every(x=>Object.keys(x.pages).length===0));
  // Only an independently verified decoded raw page can clear the pending cursor.
  const confirmed=updatePageCoverage(restarted,{asOfUtc:now,
    successes:[{chain:first.chain,page:first.page,captured_at_utc:now,
     source_path:rawPath,source_sha256:'a'.repeat(64),candidates:[]}]}).updated_memory;
  assert.equal(confirmed.chains[first.chain].pending_pages.length,0);
  assert.equal(Object.values(confirmed.chains)
    .reduce((n,x)=>n+x.pending_pages.length,0),5);
  assert.equal(provenance.status_is_not_successful_capture,true);
  assert.equal(closePartialCapture(provenance,{atUtc:now,
    finalCoverage:confirmed}).state,'FINALIZED_BY_RUNNER');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('SYS-11: crash after reservation without response still conservatively counts the request start',()=>{
 const original=emptyProviderBudgetState();
 const reservation=reserveProviderRequest({state:original,provider:'GECKOTERMINAL',
  lane:'NEW_POOLS',asOfUtc:now,requestId:'run450777001:gecko:page1'});
 assert.equal(reservation.gate.allowed,true);
 const fromDisk=JSON.parse(JSON.stringify(reservation.state));
 assert.equal(fromDisk.providers.GECKOTERMINAL.recent_starts[0].http_status,null);
 const same=inspectProviderBudget({state:fromDisk,provider:'GECKOTERMINAL',
  lane:'NEW_POOLS',asOfUtc:now,requestId:'run450777001:gecko:page1'});
 assert.equal(same.reason,'REQUEST_ALREADY_RESERVED');
 assert.equal(same.allowed,false);
 const next=inspectProviderBudget({state:fromDisk,provider:'GECKOTERMINAL',
  lane:'NEW_POOLS',asOfUtc:new Date(Date.parse(now)+10).toISOString(),
  requestId:'run450777002:gecko:page1'});
 assert.equal(next.rolling_provider_starts,1);
});
test('QA-03: journal is append-only per response and a 429 never counts as success',()=>{
 const p=stagePendingCapture({pageCoverage:emptyPageCoverage(),
  tasks:[{chain:'ethereum',page:2}],runId:'450777003',atUtc:now});
 const one={provider:'GECKOTERMINAL',http_status:429,
  body_path:'research/feeds/2026-11-22/450777003/eth-page2.json',
  response_sha256:'b'.repeat(64),started_at_utc:now,received_at_utc:now};
 const journal=appendPartialHttpReceipt(p.journal,{evidence:one,atUtc:now});
 assert.equal(journal.source_http_successes,0);
 assert.equal(journal.http_receipts[0].http_status,429);
 assert.equal(journal.state,'STARTED_NOT_FINALIZED');
 assert.throws(()=>appendPartialHttpReceipt(journal,{evidence:one,atUtc:now}),
  /DUPLICATE_PARTIAL_HTTP_RECEIPT/);
 assert.equal(p.journal.http_receipts.length,0);
});
test('QA-03: real capture persists in-flight plan and provider state before any HTTP network start',async()=>{
 const runner=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 const guard=runner.indexOf('const stagedCapture=stagePendingCapture');
 const call=runner.indexOf('const got=await fetchRaw(');
 assert.ok(guard>=0&&call>guard);
 assert.match(runner,/await writeFile\(coverageStatePath,JSON\.stringify\(pageCoverage/);
 assert.match(runner,/await persistPartial\(\)/);
 assert.match(runner,/await persistBudget\(\)/);
 assert.match(runner,/partialJournal=appendPartialHttpReceipt\(partialJournal/);
 assert.match(runner,/partialJournal=closePartialCapture\(partialJournal/);
 assert.doesNotMatch(runner,/writeFile\('signals\//);
});
test('QA-03: failed GitHub capture commits partial recovery evidence, but job remains failed',async()=>{
 const yaml=await readFile('.github/workflows/cleanroom-dot2-capture.yml','utf8');
 assert.match(yaml,/id: dot2_capture/);
 assert.match(yaml,/continue-on-error: true/);
 assert.match(yaml,/if: \$\{\{ always\(\) && steps\.dot2_capture\.outcome != 'skipped' \}\}/);
 assert.match(yaml,/git add research\/feeds\/ research\/state\//);
 assert.match(yaml,/Report incomplete or failed research capture honestly/);
 assert.match(yaml,/test "\$\{\{ steps\.dot2_capture\.outcome \}\}" = "success"/);
 assert.match(yaml,/test "\$\{\{ steps\.media_capture\.outcome \}\}" = "success"/);
 assert.match(yaml,/group: r29-cleanroom-dot2-capture/);
 assert.doesNotMatch(yaml,/signals\//);
});
