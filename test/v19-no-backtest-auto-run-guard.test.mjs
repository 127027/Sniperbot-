import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile('.github/workflows/'+path,'utf8');
test('R29 user scope: source-only CI cannot automatically invoke any formal 29h backtest CLI',async()=>{
 const ci=await read('cleanroom-v19-ci.yml');
 assert.doesNotMatch(ci,/^\s*node scripts\/v19-offline-backtest-acceptance\.mjs\s*$/m);
 assert.doesNotMatch(ci,/^\s*node scripts\/v18-backtest-on-demand\.mjs\s*$/m);
 assert.ok(ci.includes('node scripts/v19-audit-all-partials-and-backtest-readiness.mjs'));
 assert.match(ci,/npm test/);
 assert.match(ci,/TEST_ONLY_NO_SIGNAL_WRITE/);
});
test('R29 user scope: legacy historical training/replay jobs run ONLY on explicit manual opt-in',async()=>{
 const ci=await read('cleanroom-tests.yml');
 const gate="if: ${{ github.event_name == 'workflow_dispatch' && inputs.run_training_replays == true }}";
 assert.match(ci,/run_training_replays:[\s\S]*?default: false/);
 for(const name of [
  'V1.3 prospective temporal learning audit',
  'V1.6 Oracle ZIP historical research',
  'V1.5 frozen Oct 12 paired news-vs-no-news',
  'V1.2 frozen six-pool Dot3',
  'Oct 12 training - 24 hourly',
  'V1.1 first full as-of scan',
  'V0.9 compare repeated 24 hourly'
 ]){
  const at=ci.indexOf('- name: '+name);
  assert.ok(at>0,name+' missing');
  const next=ci.indexOf('\n      - name:',at+7);
  const chunk=ci.slice(at,next>=0?next:undefined);
  assert.ok(chunk.includes(gate),'AUTO_REPLAY_NOT_GATED: '+name);
 }
 assert.match(ci,/run_provider_probes:[\s\S]*?default: false/);
});
test('R29 user scope: explicit 29h workflows require isolated request-path or manual trigger',async()=>{
 const [req,manual]=await Promise.all([
  read('cleanroom-v19-explicit-offline-request.yml'),
  read('cleanroom-v19-manual-backtest.yml')
 ]);
 assert.match(req,/research\/offline-backtest-requests\/\*\*/);
 assert.doesNotMatch(req,/^\s*schedule:/m);
 assert.match(manual,/workflow_dispatch:/);
 assert.doesNotMatch(manual,/^\s*push:/m);
 assert.doesNotMatch(manual,/^\s*schedule:/m);
 const capture=await read('cleanroom-dot2-capture.yml');
 assert.match(capture,/research\/requests\/\*\*/);
 assert.doesNotMatch(capture,/research\/offline-backtest-requests/);
});

test('Backtest is blocked by strict 61/61 evidence gate in BOTH standalone workflows and training replay opt-in',async()=>{
 const [explicit,manual,training]=await Promise.all([
  read('cleanroom-v19-explicit-offline-request.yml'),
  read('cleanroom-v19-manual-backtest.yml'),
  read('cleanroom-tests.yml')
 ]);
 const line='node scripts/v19-verify-100pct-before-backtest.mjs --require-ready';
 for(const [name,s,execution] of [
  ['explicit request',explicit,'node scripts/v19-explicit-offline-backtest-request.mjs'],
  ['manual',manual,'node scripts/v18-backtest-on-demand.mjs'],
  ['training',training,'node scripts/replay-v16-oracle.mjs']
 ]){
  const gate=s.indexOf(line),run=s.indexOf(execution);
  assert.ok(gate>0,name+' missing release gate');
  assert.ok(run>gate,name+' gate MUST execute before any historical replay');
 }
 const ci=await read('cleanroom-v19-ci.yml');
 assert.ok(ci.includes('node scripts/v19-verify-100pct-before-backtest.mjs'));
 assert.ok(!ci.includes('node scripts/v19-verify-100pct-before-backtest.mjs --require-ready'),
  'regular CI must report NOT_READY rather than fail just because external proofs are missing');
});
