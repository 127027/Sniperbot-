import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const standardCi = readFileSync(new URL('../.github/workflows/cleanroom-tests.yml', import.meta.url), 'utf8');
const sourceOnlyCi = readFileSync(new URL('../.github/workflows/cleanroom-v19-ci.yml', import.meta.url), 'utf8');

test('QA-06: provider probes require manual dispatch with an explicitly false-by-default opt-in', () => {
  assert.match(standardCi, /workflow_dispatch:\s*\n\s*inputs:\s*\n\s*run_provider_probes:/);
  assert.match(standardCi, /run_provider_probes:[\s\S]*?default: false/);
  const requiredGate = "if: ${{ github.event_name == 'workflow_dispatch' && inputs.run_provider_probes == true && github.ref == 'refs/heads/codex/r29-cleanroom-paper-20261121' }}";
  for (const name of [
    'Non-trading historical GeckoTerminal probe (informational only)',
    'Live public JSON discovery probe (research only)'
  ]) {
    const marker = '- name: ' + name;
    const offset = standardCi.indexOf(marker);
    assert.notEqual(offset, -1, 'provider probe missing: ' + name);
    const step = standardCi.slice(offset, standardCi.indexOf('\n      - name:', offset + marker.length) < 0
      ? undefined : standardCi.indexOf('\n      - name:', offset + marker.length));
    assert.ok(step.includes(requiredGate), 'probe may run on push: ' + name);
  }
});

test('QA-06: always-on source CI never directly calls the live provider probe scripts', () => {
  for (const script of ['probe-live-discovery.mjs', 'forensic-probe-15nov.mjs', 'cloud-discovery-runner.mjs']) {
    assert.equal(sourceOnlyCi.includes('node scripts/' + script), false, 'unguarded live script: ' + script);
  }
});
