// R29 BACKTEST-ONLY — negative security demonstration, not a blind-test admission.
// A signed receipt is cryptographically consistent even if model_invocation_id is
// a synthetic string, because no independent invocation registry is consulted.
// This is a fail-closed admission requirement for the future trusted runner.
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {verifyPinnedReceipt} from './r29-pinned-ed25519-receipt-verifier.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const asof='2026-09-18T01:20:00Z';
const frame=Buffer.from('synthetic frame, not market data');
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const receipt={schema:'r29-detached-receipt-v1',scope:'BACKTEST_ONLY',virtual_asof_utc:asof,original_capture_at_utc:'2026-09-18T01:19:00Z',model_called_at_utc:'2026-11-19T00:00:00Z',frame_sha256:hash(frame),source_sha256:hash('synthetic source'),ledger_sha256:hash('synthetic ledger'),model_request_sha256:hash('synthetic request'),model_response_sha256:hash('synthetic response'),model_invocation_id:'SYNTHETIC-NO-ACTUAL-GPT-CALL'};
const signatureBase64=sign(null,Buffer.from(JSON.stringify(receipt)),privateKey).toString('base64');
const result=verifyPinnedReceipt({frameBytes:frame,receipt,signatureBase64,pinnedPublicKeyPem:publicKey.export({type:'spki',format:'pem'}),expectedAsOfUtc:asof,expectedLedgerSha256:receipt.ledger_sha256,expectedModelRequestSha256:receipt.model_request_sha256,expectedSourceSha256:receipt.source_sha256,expectedModelResponseSha256:receipt.model_response_sha256});
assert.equal(result.verified,true,'expected cryptographic consistency only');
assert.match(result.scope,/not proof/i);
// This MUST NOT be converted into an admitted blind-test decision.
const independentModelInvocationAttested=false;
const independentHistoricalCaptureAttested=false;
const externallyPinnedTrustAnchor=false;
const admitted=Boolean(result.verified&&independentModelInvocationAttested&&independentHistoricalCaptureAttested&&externallyPinnedTrustAnchor);
assert.equal(admitted,false,'synthetic invocation cannot enter historical decision journal');
console.log('PASS: synthetic signed receipt verifies cryptographically but blind-test admission stays BLOCKED; no actual model call, fills or PnL.');
