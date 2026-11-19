// R29 BACKTEST-ONLY. Fail-closed admission gate, not an invocation attestation service.
// The trusted runner must independently provide and verify the source, ledger,
// model invocation and key-custody attestations. Never derive these from receipt.
import {verifyPinnedReceipt} from './r29-pinned-ed25519-receipt-verifier.mjs';
const fail=code=>{throw Error(code)};
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function admitHistoricalDecision({verification,independentEvidence}={}){
 if(!verification||verification.verified!==true)fail('CRYPTO_VERIFICATION_REQUIRED');
 const e=independentEvidence;
 if(!e||e.source?.attested!==true||e.ledger?.attested!==true||e.invocation?.attested!==true||e.keyCustody?.attested!==true)fail('INDEPENDENT_ATTESTATION_REQUIRED');
 if(e.invocation.synthetic===true||e.invocation.provider_verified!==true)fail('REAL_MODEL_INVOCATION_REQUIRED');
 if(!hex(e.source.sha256)||!hex(e.ledger.sha256)||!hex(e.invocation.request_sha256)||!hex(e.invocation.response_sha256))fail('INDEPENDENT_HASH_REQUIRED');
 if(e.source.sha256!==e.receipt?.source_sha256||e.ledger.sha256!==e.receipt?.ledger_sha256||e.invocation.request_sha256!==e.receipt?.model_request_sha256||e.invocation.response_sha256!==e.receipt?.model_response_sha256)fail('INDEPENDENT_BINDING_MISMATCH');
 if(typeof e.invocation.id!=='string'||!e.invocation.id||e.invocation.id!==e.receipt?.model_invocation_id)fail('INDEPENDENT_INVOCATION_ID_MISMATCH');
 if(e.keyCustody.externally_pinned!==true||e.keyCustody.runner_isolated!==true||e.source.original_capture_verified!==true||e.ledger.fill_only===false)fail('TRUST_BOUNDARY_UNPROVEN');
 // The independentEvidence object must be created by a separately trusted
 // service. Caller-supplied booleans are NOT proof: do not expose this as a
 // public admission endpoint or interpret a passing unit test as a blind test.
 return {admitted:true,scope:'conditional structural gate only; requires independent trusted runner'};
}
export function verifyAndAdmitHistoricalDecision({receiptVerificationArgs,independentEvidence}={}){
 const verification=verifyPinnedReceipt(receiptVerificationArgs||{});
 return admitHistoricalDecision({verification,independentEvidence});
}
