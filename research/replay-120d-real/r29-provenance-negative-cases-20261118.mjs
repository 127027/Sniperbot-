// R29 BACKTEST-ONLY. Negative-case regression; no model, network, wallet or orders.
// A successful negative test is NOT proof of independent provenance.
import {verifyDetachedEvidence} from './r29-trust-boundary-required.mjs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const frameBytes=Buffer.from('{"virtual_asof_utc":"2026-09-18T01:20:00Z"}');
const digest=createHash('sha256').update(frameBytes).digest('hex');
const sourceSha='a'.repeat(64);
const valid={
 frameBytes,virtualAsOfUtc:'2026-09-18T01:20:00Z',
 sourceClaims:[{sha256:sourceSha}],ledgerClaim:{},modelClaim:{},
 verifySource:async()=>({verified:true,trustedVerifier:true,sourceSha256:sourceSha}),
 verifyLedger:async()=>({verified:true,trustedVerifier:true,frameSha256:digest}),
 verifyModel:async()=>({verified:true,trustedVerifier:true,frameSha256:digest})
};
const rejects=async(name,change,expected)=>{
 let message='';
 try{await verifyDetachedEvidence({...valid,...change})}catch(e){message=e.message}
 assert.equal(message,expected,name);
 console.log('PASS negative:',name);
};
await rejects('missing independent verifiers',{verifySource:undefined},'INDEPENDENT_VERIFIERS_REQUIRED');
await rejects('future or malformed UTC',{virtualAsOfUtc:'2026-09-18T01:20:00+00:00'},'INVALID_ASOF');
await rejects('missing sources',{sourceClaims:[]},'SOURCES_REQUIRED');
await rejects('unverified source',{verifySource:async()=>({verified:false,trustedVerifier:true,sourceSha256:sourceSha})},'SOURCE_PROVENANCE_UNVERIFIED');
await rejects('source hash mismatch',{verifySource:async()=>({verified:true,trustedVerifier:true,sourceSha256:'b'.repeat(64)})},'SOURCE_PROVENANCE_UNVERIFIED');
await rejects('ledger hash mismatch',{verifyLedger:async()=>({verified:true,trustedVerifier:true,frameSha256:'b'.repeat(64)})},'LEDGER_PROVENANCE_UNVERIFIED');
await rejects('model hash mismatch',{verifyModel:async()=>({verified:true,trustedVerifier:true,frameSha256:'b'.repeat(64)})},'MODEL_PROVENANCE_UNVERIFIED');
console.log('NEGATIVE TESTS ONLY: caller-controlled forged callbacks can still bypass admission; no independent blindtest established.');
