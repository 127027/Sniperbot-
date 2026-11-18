// R29 BACKTEST-ONLY. Offline cryptographic receipt-contract regression.
// Test keys are generated in-process; NEVER use these keys as production trust anchors.
// No GPT, network, wallet, order, historical price or fill execution.
import {generateKeyPairSync,sign,verify,createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const sha256=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>JSON.stringify(x);
const strictUtc=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().replace('.000Z','Z')===s;
const asof='2026-09-18T01:20:00Z';
const frame=Buffer.from('{"virtual_asof_utc":"2026-09-18T01:20:00Z"}');
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const {publicKey:otherKey}=generateKeyPairSync('ed25519');
const receipt={
 schema:'r29-detached-receipt-v1',scope:'BACKTEST_ONLY',
 virtual_asof_utc:asof,original_capture_at_utc:'2026-09-18T01:19:00Z',
 frame_sha256:sha256(frame),source_sha256:'a'.repeat(64),
 ledger_sha256:'b'.repeat(64),model_request_sha256:'c'.repeat(64),
 model_response_sha256:'d'.repeat(64),model_invocation_id:'fixture-only-not-a-real-call',
 model_called_at_utc:'2026-11-18T20:00:00Z'
};
const signature=sign(null,Buffer.from(canonical(receipt)),privateKey);
function validate(r,sig,trustAnchor,expectedFrameSha){
 if(r?.schema!=='r29-detached-receipt-v1'||r.scope!=='BACKTEST_ONLY')return false;
 if(![r.virtual_asof_utc,r.original_capture_at_utc,r.model_called_at_utc].every(strictUtc))return false;
 if(Date.parse(r.original_capture_at_utc)>Date.parse(r.virtual_asof_utc))return false;
 if(Date.parse(r.model_called_at_utc)<Date.parse(r.virtual_asof_utc))return false;
 if(r.frame_sha256!==expectedFrameSha)return false;
 if(![r.source_sha256,r.ledger_sha256,r.model_request_sha256,r.model_response_sha256].every(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)))return false;
 if(typeof r.model_invocation_id!=='string'||!r.model_invocation_id.length)return false;
 return verify(null,Buffer.from(canonical(r)),trustAnchor,sig);
}
const valid=()=>validate(receipt,signature,publicKey,sha256(frame));
assert.equal(valid(),true,'signed fixture should pass');
assert.equal(validate(receipt,signature,otherKey,sha256(frame)),false,'unknown key rejected');
assert.equal(validate({...receipt,frame_sha256:'e'.repeat(64)},signature,publicKey,sha256(frame)),false,'frame tampering rejected');
assert.equal(validate({...receipt,original_capture_at_utc:'2026-09-18T01:21:00Z'},signature,publicKey,sha256(frame)),false,'future capture rejected');
assert.equal(validate({...receipt,model_invocation_id:'forged'},signature,publicKey,sha256(frame)),false,'invocation tampering rejected');
assert.equal(validate({...receipt,model_called_at_utc:'2026-09-18T00:00:00Z'},signature,publicKey,sha256(frame)),false,'backdated call rejected');
assert.equal(validate(receipt,signature,publicKey,'f'.repeat(64)),false,'different frame rejected');
assert.equal(validate(receipt,Buffer.alloc(signature.length),publicKey,sha256(frame)),false,'unsigned receipt rejected');
console.log('PASS: 1 synthetic signed fixture and 7 negative cases. NO real provenance, model call, quote or fill established.');
// IMPORTANT: This contract is only a unit test. Real deployment must pin public keys
// outside the repository/caller, independently verify provider capture and ledger,
// and obtain authenticated model invocation receipts from a separate trusted process.
