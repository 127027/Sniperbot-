// BACKTEST-ONLY: synthetic capture-time admission regression, no network/model/orders.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyDetachedEvidence} from './r29-trust-boundary-required.mjs';
const frameBytes=Buffer.from('{"synthetic":true}');
const digest=createHash('sha256').update(frameBytes).digest('hex');
const sourceSha='a'.repeat(64);
const asof='2026-09-18T01:20:00Z';
const base={
 frameBytes,virtualAsOfUtc:asof,sourceClaims:[{sha256:sourceSha}],ledgerClaim:{},modelClaim:{},
 verifyLedger:async()=>({verified:true,trustedVerifier:true,frameSha256:digest}),
 verifyModel:async()=>({verified:true,trustedVerifier:true,frameSha256:digest})
};
async function run(label,capture,expected){
 const verifySource=async()=>({verified:true,trustedVerifier:true,sourceSha256:sourceSha,originalCaptureAtUtc:capture});
 let outcome='ADMITTED';
 try {await verifyDetachedEvidence({...base,verifySource})}catch(e){outcome=e.message}
 assert.equal(outcome,expected,label);console.log('PASS',label,outcome);
}
await run('missing capture',undefined,'SOURCE_CAPTURE_TIME_UNPROVEN');
await run('future capture','2026-09-18T01:20:01Z','SOURCE_CAPTURE_TIME_UNPROVEN');
await run('impossible calendar','2026-02-30T00:00:00Z','SOURCE_CAPTURE_TIME_UNPROVEN');
await run('non UTC offset','2026-09-18T01:19:00+00:00','SOURCE_CAPTURE_TIME_UNPROVEN');
await run('earlier capture','2026-09-18T01:19:59Z','ADMITTED');
console.log('SYNTHETIC ONLY: caller-controlled callbacks are not independent provenance.');
