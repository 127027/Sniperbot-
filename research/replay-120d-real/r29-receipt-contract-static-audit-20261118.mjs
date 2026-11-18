// R29 BACKTEST-ONLY: static audit of the signed-receipt fixture.
// This audit deliberately never reads posthoc research, contacts providers or executes orders.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('./',import.meta.url);
const fixture=readFileSync(new URL('r29-signed-receipt-contract-regression-20261118.mjs',root),'utf8');
const boundary=readFileSync(new URL('r29-trust-boundary-required.mjs',root),'utf8');
const checks=[
 ['fixture declares synthetic invocation',/fixture-only-not-a-real-call/.test(fixture)],
 ['fixture uses ephemeral generated keys',/generateKeyPairSync\('ed25519'\)/.test(fixture)],
 ['fixture does not export a reusable validator',!/export\s+(?:function|const|\{)/.test(fixture)],
 ['boundary accepts caller-supplied verifier callbacks',/verifySource,verifyLedger,verifyModel/.test(boundary)],
 ['boundary explicitly disclaims independent trust',/caller could forge callbacks/.test(boundary)],
 ['source capture time checked against asof',/SOURCE_CAPTURE_TIME_UNPROVEN/.test(boundary)]
];
for(const [name,ok] of checks){assert.equal(ok,true,name);console.log('PASS:',name)}
console.log('AUDIT: synthetic signed fixture is not an operational trust boundary; no isolated GPT call, verified quote, fill, or PnL is established.');
