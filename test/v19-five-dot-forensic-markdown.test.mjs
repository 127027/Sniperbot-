import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildFiveDotForensicReport} from '../src/v19-five-dot-forensic-trace.mjs';
import {renderR29FiveDotForensicMarkdown}
 from '../src/v19-five-dot-forensic-markdown.mjs';
const start='2026-10-12T00:00:00.000Z',end='2026-10-13T00:00:00.000Z';
const runId='forensic-md-test';
const coin={chain:'base',contract:'0x'+'a'.repeat(40),
 pool:'0x'+'b'.repeat(40)};
const event={schema:1,kind:'R29_V19_FIVE_DOT_FORENSIC_EVENT',
 event_id:'event-pool-01',run_id:runId,role:'dot-2-discovery',
 phase:'BLIND',at_utc:start,activity:'OBSERVATION',scope:'POOL',
 market:coin,action:'DISCOVERED',
 what_was_done:'Identified exact pool in synthetic source fixture',
 why_this_action:'Two original event timestamps available in fixture',
 alternatives_considered:['REJECTED','DATA_GAP'],
 missing_evidence:[],linked_event_ids:[],
 input_refs:[{source_class:'SYNTHETIC_TEST',
  path:'research/feeds/2026-10-11/synthetic.json',
  git_blob_sha:'a'.repeat(40),provider:'TEST_FIXTURE',
  event_at_utc:'2026-10-11T23:58:00.000Z',
  captured_at_utc:'2026-10-11T23:59:00.000Z',
  available_at_utc:'2026-10-11T23:59:00.000Z'}],
 execution_origin:'DETERMINISTIC_MODEL'};
const build=entries=>buildFiveDotForensicReport({
 entries,startUtc:start,endUtc:end,runId,warmupHours:5});

test('forensic Markdown report shows all 29 hours and role gaps without inventing activity',()=>{
 const text=renderR29FiveDotForensicMarkdown(build([]));
 assert.match(text,/29h-Zeitleiste/);
 assert.match(text,/2026-10-11T19:00:00.000Z/);
 assert.match(text,/2026-10-12T00:00:00.000Z/);
 assert.match(text,/2026-10-12T23:00:00.000Z/);
 assert.match(text,/dot-5-control/);
 assert.match(text,/Keine verifizierten Pool-Lebensläufe/);
 assert.match(text,/Unabhängig bestätigte historische GPT-Reviews: 0/);
 assert.match(text,/65 rückblickende Coin-/Pool-Meldungen/);
 assert.doesNotMatch(text,/Paper-Gewinn: [1-9]/);
});

test('per-pool report preserves exact contract, pool, UTC and complete what/why/alternatives/source',()=>{
 const report=build([event]);
 const md=renderR29FiveDotForensicMarkdown(report);
 assert.match(md,/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
 assert.match(md,/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/);
 assert.match(md,/Identified exact pool in synthetic source fixture/);
 assert.match(md,/Two original event timestamps available in fixture/);
 assert.match(md,/REJECTED; DATA_GAP/);
 assert.match(md,/research\/feeds\/2026-10-11\/synthetic.json/);
 assert.match(md,/No Trade/i);
 assert.equal(report.genuine_gpt_reviews_independently_verified,0);
});

test('renderer refuses malformed or self-certified fake real execution',()=>{
 const report=build([]);
 assert.throws(()=>renderR29FiveDotForensicMarkdown({
  ...report,client_fills_independently_verified:3}),
  /INVALID_R29_FORENSIC_DIAGNOSTIC_REPORT/);
 assert.throws(()=>renderR29FiveDotForensicMarkdown({
  ...report,kind:'WINNERS_CERTIFIED'}),
  /INVALID_R29_FORENSIC_DIAGNOSTIC_REPORT/);
});

test('offline CLI only reads explicit research trace input and writes probe-artifacts',async()=>{
 const source=await readFile('scripts/v19-render-five-dot-forensic-report.mjs','utf8');
 assert.match(source,/buildFiveDotForensicReport/);
 assert.match(source,/renderR29FiveDotForensicMarkdown/);
 assert.match(source,/research\\\/audits/);
 assert.match(source,/probe-artifacts/);
 assert.doesNotMatch(source,/publishPaperOrder|settlePaper|GITHUB_TOKEN|fetch\(|backtestOnRequest/);
 assert.doesNotMatch(source,/signals\/orders\/|signals\/index\.json/);
});
