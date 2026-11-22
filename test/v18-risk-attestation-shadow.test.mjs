import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectDot3Attestation} from '../src/risk-authorization-v18.mjs';

const nowUtc='2026-11-22T08:00:00Z',blob='a'.repeat(40);
const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40),symbol:'SHADOW'};
const order={coin};
const q=(provider,source_url,sha)=>({...coin,provider_id:provider,source_url,
 captured_at_utc:'2026-11-22T07:59:45Z',provider_quote_asof_utc:'2026-11-22T07:59:40Z',
 price_usdc:.01,liquidity_usdc:20000,snapshot_blob_sha:sha});
const a=()=>({schema:1,kind:'DOT3_PAPER_RISK_ATTESTATION',mode:'PAPER',status:'ELIGIBLE',issued_by:'dot-3-risk',
 coin,issued_at_utc:'2026-11-22T07:59:40Z',expires_at_utc:'2026-11-22T08:02:00Z',
 quotes:[q('gecko','https://www.geckoterminal.com/base/pools/'+coin.pool,'1'.repeat(40)),
   q('dex','https://dexscreener.com/base/'+coin.pool,'2'.repeat(40))],
 sellability:{verified:true,method:'observed simulated sell route',checked_at_utc:'2026-11-22T07:59:30Z',evidence_blob_sha:'3'.repeat(40)},
 security:{verified:true,evidence_blob_sha:'4'.repeat(40)}});
const check=(x=a(),o=order)=>inspectDot3Attestation({attestation:x,order:o,nowUtc,expectedBlobSha:blob});
test('even complete structural evidence cannot authorize PAPER without independent blob/authenticity checks',()=>{
 const out=check();
 assert.equal(out.status,'STRUCTURAL_PASS_EXTERNAL_VERIFICATION_REQUIRED');
 assert.equal(out.trade_authorized,false);
 assert.equal(out.source_blobs_actually_verified,false);
});
test('missing sellability, low liquidity or mismatched pool is blocked',()=>{
 assert.equal(check({...a(),sellability:{verified:false}}).code,'SELLABILITY_NOT_PROVEN');
 const low=a();low.quotes[1].liquidity_usdc=250;
 assert.equal(check(low).code,'LOW_LIQUIDITY');
 const wrong=a();wrong.quotes[1].pool='0x'+'c'.repeat(40);
 assert.equal(check(wrong).code,'QUOTE_IDENTITY_OR_ORIGIN_MISMATCH');
});
test('stale provider quotes and self-declared role cannot bypass attestation',()=>{
 const stale=a();stale.quotes[0].provider_quote_asof_utc='2026-11-22T07:55:00Z';
 assert.equal(check(stale).code,'QUOTE_TIME_UNKNOWN_OR_STALE');
 const other=a();other.issued_by='dot-4-strategy';
 assert.equal(check(other).code,'NO_DOT3_APPROVAL');
 const bad=a();bad.quotes[1].source_url=bad.quotes[0].source_url;
 assert.equal(check(bad).code,'QUOTE_IDENTITY_OR_ORIGIN_MISMATCH');
});
