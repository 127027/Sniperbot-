// R29 BACKTEST-ONLY: adversarial trust-boundary regression.
// This intentionally demonstrates that caller-supplied callbacks can forge "trusted"
// results. It is NOT a successful admission proof and never calls GPT or trades.
import {createHash} from 'node:crypto';
import {verifyDetachedEvidence} from './r29-trust-boundary-required.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const frameBytes=Buffer.from('{"virtual_asof_utc":"2026-09-18T01:20:00Z"}');
const digest=hash(frameBytes);
const sourceSha='a'.repeat(64);
const virtualAsOfUtc='2026-09-18T01:20:00Z';
const forged={
 frameBytes,virtualAsOfUtc,sourceClaims:[{sha256:sourceSha}],
 ledgerClaim:{},modelClaim:{},
 verifySource:async()=>({verified:true,trustedVerifier:true,sourceSha256:sourceSha,originalCaptureAtUtc:'2026-09-18T01:19:00Z'}),
 verifyLedger:async()=>({verified:true,trustedVerifier:true,frameSha256:digest}),
 verifyModel:async()=>({verified:true,trustedVerifier:true,frameSha256:digest})
};
// The forged capture timestamp is deliberately fabricated by the caller; it is NOT evidence.
const admitted=await verifyDetachedEvidence(forged);
if(admitted.admitted!==true)throw Error('EXPECTED_CALLBACK_BYPASS_NOT_REPRODUCED');
console.log('EXPECTED VULNERABILITY REPRODUCED: forged callbacks admit frame; NOT independent provenance, NOT GPT execution');
console.log('REMEDIATION: pin trust anchors outside caller-controlled code; verify signed receipts and actual invocation identifiers in separate process; reject unsigned/unknown receipts.');
