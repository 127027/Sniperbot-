// BACKTEST ONLY. Verify a provider-signed capture manifest against an externally
// provisioned trust root. A signature proves the signer made the claim, not that
// the claim is true; do not provision a retrospective self-generated key.
import {createHash,createPublicKey,verify,generateKeyPairSync,sign} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(v,m)=>{if(!v)throw Error(m)};
const time=s=>{check(typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s)),'BAD_TIME');return Date.parse(s)};
export function verifySignedCapture({rawBytes,manifest,signatureBase64,virtualAsofUtc},trustedProviderKeys){
 check(rawBytes instanceof Uint8Array,'ORIGINAL_BYTES_REQUIRED');
 check(manifest&&Object.keys(manifest).sort().join(',')==='capturedAtUtc,keyId,providerId,sourceSha256','BAD_MANIFEST');
 const {providerId,keyId,capturedAtUtc,sourceSha256}=manifest;
 const root=trustedProviderKeys.get(JSON.stringify([providerId,keyId]));
 check(root,'UNTRUSTED_PROVIDER_KEY');
 check(time(capturedAtUtc)<=time(virtualAsofUtc),'FUTURE_CAPTURE');
 check(time(root.validFromUtc)<=time(capturedAtUtc)&&time(capturedAtUtc)<time(root.validUntilUtc),'KEY_OUTSIDE_VALIDITY');
 check(sha(rawBytes)===sourceSha256,'BYTE_HASH_MISMATCH');
 const key=createPublicKey(root.publicKeyPem);
 check(key.asymmetricKeyType==='ed25519','WRONG_KEY_TYPE');
 const bytes=Buffer.from(JSON.stringify(['R29_PROVIDER_CAPTURE_V1',providerId,keyId,capturedAtUtc,sourceSha256]));
 const sig=Buffer.from(signatureBase64||'','base64');
 check(sig.length===64&&verify(null,bytes,key,sig),'BAD_SIGNATURE');
 return {status:'PROVIDER_SIGNATURE_VERIFIED_CAPTURE_CLAIM_ONLY',sourceSha256,capturedAtUtc,providerId,keyId,
 historicalAvailabilityIndependentlyProven:false,modelInvocationAuthorized:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {publicKey,privateKey}=generateKeyPairSync('ed25519');
 const rawBytes=Buffer.from('synthetic fixture');
 const capturedAtUtc='2026-09-18T01:00:00Z',virtualAsofUtc='2026-09-18T01:20:00Z';
 const manifest={providerId:'fixture',keyId:'fixture',capturedAtUtc,sourceSha256:sha(rawBytes)};
 const roots=new Map([[JSON.stringify(['fixture','fixture']),{publicKeyPem:publicKey.export({type:'spki',format:'pem'}),validFromUtc:'2026-09-01T00:00:00Z',validUntilUtc:'2026-10-01T00:00:00Z'}]]);
 const signatureBase64=sign(null,Buffer.from(JSON.stringify(['R29_PROVIDER_CAPTURE_V1','fixture','fixture',capturedAtUtc,manifest.sourceSha256])),privateKey).toString('base64');
 const input={rawBytes,manifest,signatureBase64,virtualAsofUtc};
 verifySignedCapture(input,roots);
 const fail=(x,r,expected)=>{let caught;try{verifySignedCapture(x,r)}catch(e){caught=e.message}check(caught===expected,'TEST_FAILED_'+expected)};
 fail(input,new Map(),'UNTRUSTED_PROVIDER_KEY');
 fail({...input,rawBytes:Buffer.from('changed')},roots,'BYTE_HASH_MISMATCH');
 fail({...input,manifest:{...manifest,capturedAtUtc:'2026-09-18T01:01:00Z'}},roots,'BAD_SIGNATURE');
 fail({...input,virtualAsofUtc:'2026-09-18T00:59:00Z'},roots,'FUTURE_CAPTURE');
 console.log('SYNTHETIC_SIGNATURE_TESTS_PASS; NO HISTORICAL PROVIDER ATTESTED');
}
