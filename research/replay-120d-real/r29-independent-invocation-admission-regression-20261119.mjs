// R29 BACKTEST-ONLY: admission gate rejects untrusted/missing attestations.
// Pure synthetic tests. Passing fixtures do NOT establish real external trust.
import assert from 'node:assert/strict';
import {admitHistoricalDecision} from './r29-independent-invocation-admission-20261119.mjs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const receipt={source_sha256:sha('source'),ledger_sha256:sha('ledger'),model_request_sha256:sha('request'),model_response_sha256:sha('response'),model_invocation_id:'fixture'};
const good=()=>({receipt,source:{attested:true,sha256:receipt.source_sha256,original_capture_verified:true},ledger:{attested:true,sha256:receipt.ledger_sha256,fill_only:true},invocation:{attested:true,provider_verified:true,synthetic:false,id:'fixture',request_sha256:receipt.model_request_sha256,response_sha256:receipt.model_response_sha256},keyCustody:{attested:true,externally_pinned:true,runner_isolated:true}});
const verification={verified:true};
assert.throws(()=>admitHistoricalDecision({verification}),/INDEPENDENT_ATTESTATION_REQUIRED/);
assert.throws(()=>admitHistoricalDecision({verification:{verified:false},independentEvidence:good()}),/CRYPTO_VERIFICATION_REQUIRED/);
for(const mutate of [
 e=>e.invocation.synthetic=true,
 e=>e.invocation.provider_verified=false,
 e=>e.invocation.id='different',
 e=>e.source.sha256=sha('different'),
 e=>e.ledger.sha256=sha('different'),
 e=>e.invocation.request_sha256=sha('different'),
 e=>e.invocation.response_sha256=sha('different'),
 e=>e.source.original_capture_verified=false,
 e=>e.keyCustody.externally_pinned=false,
 e=>e.keyCustody.runner_isolated=false,
 e=>e.ledger.fill_only=false,
 e=>delete e.ledger.fill_only,
 e=>e.invocation.attested=false
]){const e=good();mutate(e);assert.throws(()=>admitHistoricalDecision({verification,independentEvidence:e}));}
const structural=admitHistoricalDecision({verification,independentEvidence:good()});
assert.equal(structural.structural_checks_passed,true);
assert.equal(structural.admitted,false,'synthetic evidence must never claim independent admission');
console.log('PASS: 15 negative cases and 1 synthetic structural positive; NO real model invocation or historical blind-test admission.');
