// R29 BACKTEST-ONLY. Fail-closed provenance boundary; no orders or model calls.
// Caller-supplied booleans are NEVER evidence of independent attestation.
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const check=(x,m)=>{if(!x)throw Error(m)};
const strictUtc=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().replace('.000Z','Z')===s;
export async function verifyDetachedEvidence({frameBytes,virtualAsOfUtc,sourceClaims,ledgerClaim,modelClaim,verifySource,verifyLedger,verifyModel}){
 check(Buffer.isBuffer(frameBytes),'FRAME_BYTES_REQUIRED');
 check(typeof virtualAsOfUtc==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(virtualAsOfUtc)&&Number.isFinite(Date.parse(virtualAsOfUtc))&&new Date(virtualAsOfUtc).toISOString().replace('.000Z','Z')===virtualAsOfUtc,'INVALID_ASOF');
 check(Array.isArray(sourceClaims)&&sourceClaims.length>0,'SOURCES_REQUIRED');
 check(typeof verifySource==='function'&&typeof verifyLedger==='function'&&typeof verifyModel==='function','INDEPENDENT_VERIFIERS_REQUIRED');
 const digest=sha(frameBytes);
 // Verifier functions must be supplied by a trusted execution boundary, not by the frame.
 for(const claim of sourceClaims){
  check(claim?.sha256&&/^[a-f0-9]{64}$/i.test(claim.sha256),'INVALID_SOURCE_DIGEST');
  const proof=await verifySource(claim,virtualAsOfUtc);
  check(proof?.verified===true&&proof?.trustedVerifier===true&&proof?.sourceSha256===claim.sha256,'SOURCE_PROVENANCE_UNVERIFIED');
  // A source hash alone says nothing about whether its contents existed at virtual as-of.
  // The trusted verifier must independently attest original capture time, not merely event time.
  check(strictUtc(proof.originalCaptureAtUtc)&&Date.parse(proof.originalCaptureAtUtc)<=Date.parse(virtualAsOfUtc),'SOURCE_CAPTURE_TIME_UNPROVEN');
 }
 const ledger=await verifyLedger(ledgerClaim,virtualAsOfUtc,digest);
 check(ledger?.verified===true&&ledger?.trustedVerifier===true&&ledger?.frameSha256===digest,'LEDGER_PROVENANCE_UNVERIFIED');
 const model=await verifyModel(modelClaim,virtualAsOfUtc,digest);
 check(model?.verified===true&&model?.trustedVerifier===true&&model?.frameSha256===digest,'MODEL_PROVENANCE_UNVERIFIED');
 return {admitted:true,frame_sha256:digest,virtual_asof_utc:virtualAsOfUtc,scope:'provenance checks only; does not prove actual model call, historical quotes or fills'};
}
// This module is NOT an independent trust anchor: a caller could forge callbacks.
// Deployment must inject verifiers from a separately trusted process with pinned keys,
// and bind model request/response hashes to an independently logged invocation receipt.
if(process.argv[1]?.endsWith('r29-trust-boundary-required.mjs')){
 const frameBytes=Buffer.from('{}'),virtualAsOfUtc='2026-09-18T01:20:00Z';
 const claims={frameBytes,virtualAsOfUtc,sourceClaims:[{sha256:'a'.repeat(64),historicalAvailabilityIndependentlyProven:true}],ledgerClaim:{independentlyVerified:true},modelClaim:{independent_model_context_purity_proven:true}};
 let rejected=false;
 try{await verifyDetachedEvidence(claims)}catch(e){rejected=e.message==='INDEPENDENT_VERIFIERS_REQUIRED'}
 check(rejected,'UNTRUSTED_BOOLEAN_REGRESSION');
 console.log('PASS: forged truth flags alone cannot admit a frame; no GPT call or fill executed');
}
