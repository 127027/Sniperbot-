// R29 BACKTEST-ONLY: verify detached receipts using a pinned public key supplied by trusted runner.
// No callbacks, orders, wallets, network, or model calls. Does not itself prove key custody.
import {createHash,createPublicKey,verify} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const utc=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().replace('.000Z','Z')===s;
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const fail=m=>{throw Error(m)};
export function verifyPinnedReceipt({frameBytes,receipt,signatureBase64,pinnedPublicKeyPem,expectedAsOfUtc,expectedLedgerSha256,expectedModelRequestSha256,expectedSourceSha256,expectedModelResponseSha256,expectedModelInvocationId}){
 if(!Buffer.isBuffer(frameBytes))fail('FRAME_BYTES_REQUIRED');
 if(!pinnedPublicKeyPem||typeof pinnedPublicKeyPem!=='string')fail('TRUST_ANCHOR_REQUIRED');
 if(!utc(expectedAsOfUtc)||receipt?.virtual_asof_utc!==expectedAsOfUtc)fail('ASOF_MISMATCH');
 if(receipt.schema!=='r29-detached-receipt-v1'||receipt.scope!=='BACKTEST_ONLY')fail('SCOPE_MISMATCH');
 if(!utc(receipt.original_capture_at_utc)||Date.parse(receipt.original_capture_at_utc)>Date.parse(expectedAsOfUtc))fail('CAPTURE_UNPROVEN');
 if(!utc(receipt.model_called_at_utc)||Date.parse(receipt.model_called_at_utc)<Date.parse(expectedAsOfUtc))fail('MODEL_TIME_INVALID');
 if(receipt.frame_sha256!==sha(frameBytes))fail('FRAME_HASH_MISMATCH');
 if(!hex(expectedLedgerSha256)||receipt.ledger_sha256!==expectedLedgerSha256)fail('LEDGER_MISMATCH');
 if(!hex(expectedModelRequestSha256)||receipt.model_request_sha256!==expectedModelRequestSha256)fail('MODEL_REQUEST_MISMATCH');
 if(!hex(expectedSourceSha256)||receipt.source_sha256!==expectedSourceSha256)fail('SOURCE_BINDING_MISMATCH');
 if(!hex(expectedModelResponseSha256)||receipt.model_response_sha256!==expectedModelResponseSha256)fail('MODEL_RESPONSE_BINDING_MISMATCH');
 if(typeof expectedModelInvocationId!=='string'||!expectedModelInvocationId.trim()||receipt.model_invocation_id!==expectedModelInvocationId)fail('INVOCATION_BINDING_MISMATCH');
 if(typeof signatureBase64!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(signatureBase64))fail('SIGNATURE_FORMAT');
 const sig=Buffer.from(signatureBase64,'base64');
 if(sig.length!==64)fail('SIGNATURE_LENGTH');
 const key=createPublicKey(pinnedPublicKeyPem);
 if(key.asymmetricKeyType!=='ed25519')fail('KEY_TYPE');
 if(!verify(null,Buffer.from(JSON.stringify(receipt)),key,sig))fail('SIGNATURE_INVALID');
 return {verified:true,frame_sha256:sha(frameBytes),scope:'cryptographic consistency only; not proof of original historical capture, trusted key custody, actual GPT invocation or fills'};
}
// The trusted runner MUST pin the key outside the repo, bind expected hashes to
// independent source/ledger/model records and prevent caller substitution.
// No production trust anchor is embedded here. Never admit a blindtest from this
// function alone.
