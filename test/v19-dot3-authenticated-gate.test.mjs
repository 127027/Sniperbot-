import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {dot3SignatureMessage,inspectSignedDot3Binding,
 validateDot3OrderBeforePublish} from '../src/v19-dot3-authenticated-gate.mjs';
import {publishPaperOrder} from '../src/publisher.mjs';

const nowUtc='2026-11-22T10:00:00.000Z';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const publicPem=publicKey.export({type:'spki',format:'pem'});
const {privateKey:wrongPrivate,publicKey:wrongPublic}=generateKeyPairSync('ed25519');
const wrongPem=wrongPublic.export({type:'spki',format:'pem'});
const coin={chain:'base',contract:'0x'+'a'.repeat(40),
 pool:'0x'+'b'.repeat(40),pool_kind:null,symbol:'TEST'};
const order=()=>({id:'paper-buy-0001',mode:'PAPER',action:'BUY',authority:'dot-4-strategy',
 coin,dots:['dot-2-discovery','dot-3-risk','dot-4-strategy'],
 reason:'Verified Dot3 research gate must be examined before a paper buy',
 dot3_auth:{binding_path:'research/risk/bindings/riskbind-01.json',
  binding_sha:'a'.repeat(40),
  risk_path:'research/risk/attestations/riskdoc-01.json',
  risk_sha:'b'.repeat(40)}});
const quote=(provider,blob)=>({chain:'base',contract:coin.contract,pool:coin.pool,
 source_url:provider==='GECKO'?'https://www.geckoterminal.com/base/pools/'+coin.pool:
  'https://dexscreener.com/base/'+coin.pool,
 captured_at_utc:'2026-11-22T09:59:45.000Z',
 provider_quote_asof_utc:'2026-11-22T09:59:40.000Z',
 price_usdc:1,liquidity_usdc:20000,snapshot_blob_sha:blob});
const attestation=()=>({
 schema:1,kind:'DOT3_PAPER_RISK_ATTESTATION',mode:'PAPER',status:'ELIGIBLE',
 issued_by:'dot-3-risk',coin,
 issued_at_utc:'2026-11-22T09:59:40.000Z',
 expires_at_utc:'2026-11-22T10:02:00.000Z',
 quotes:[quote('GECKO','1'.repeat(40)),quote('DEX','2'.repeat(40))],
 sellability:{verified:true,method:'synthetic-sell-route',checked_at_utc:'2026-11-22T09:59:30.000Z',
  evidence_blob_sha:'3'.repeat(40)},
 security:{verified:true,evidence_blob_sha:'4'.repeat(40)}
});
const payload=(o=order())=>({schema:1,kind:'R29_DOT3_AUTH_BINDING',
 issuer:'dot-3-risk',purpose:'PAPER_ONLY',key_id:'dot3-local-v1',
 order_id:o.id,order_action:o.action,coin:o.coin,
 risk_path:o.dot3_auth.risk_path,risk_blob_sha:o.dot3_auth.risk_sha,
 issued_at_utc:'2026-11-22T09:59:30.000Z',
 expires_at_utc:'2026-11-22T10:01:30.000Z'});
const signed=(p=payload(),priv=privateKey)=>({payload:p,
 signature:{algorithm:'Ed25519',signature_base64:sign(null,dot3SignatureMessage(p),priv).toString('base64')}});
const check=(args={})=>{
 const o=order();return inspectSignedDot3Binding({order:o,binding:signed(),
  attestation:attestation(),fetchedBindingSha:o.dot3_auth.binding_sha,
  fetchedRiskSha:o.dot3_auth.risk_sha,nowUtc,
  trustedPublicKeyPem:publicPem,trustedKeyId:'dot3-local-v1',...args});
};
test('valid Ed25519 issuer + matched Git blob pointers pass ONLY issuer and structure',()=>{
 const v=check();
 assert.equal(v.status,'SIGNED_RISK_PACKET_RESEARCH_ONLY');
 assert.equal(v.signature_verified,true);
 assert.equal(v.git_blob_pointers_verified,true);
 assert.equal(v.trade_authorized,false);
 assert.equal(v.sellability_independently_attested,false);
});
test('self-reported dot strings cannot authorize paper trade',()=>{
 const o=order();delete o.dot3_auth;
 const v=inspectSignedDot3Binding({order:o,nowUtc,
  trustedPublicKeyPem:publicPem,trustedKeyId:'dot3-local-v1'});
 assert.equal(v.code,'ORDER_PROOF_POINTER_MISSING_OR_INVALID');
 assert.equal(v.trade_authorized,false);
});
test('incorrect public key, spoofed issuer, tampered signed payload rejected',()=>{
 assert.equal(check({trustedPublicKeyPem:wrongPem}).code,'DOT3_ISSUER_SIGNATURE_INVALID');
 assert.equal(check({trustedPublicKeyPem:null}).code,'EXTERNAL_TRUST_ANCHOR_MISSING_OR_MISMATCH');
 const p=payload();const changed={...p,order_action:'SELL'};
 assert.equal(check({binding:signed(changed)}).code,'BINDING_ORDER_OR_COIN_MISMATCH');
 const unsigned={...signed(),payload:{...p,order_id:'another-order-01'}};
 assert.equal(check({binding:unsigned}).code,'BINDING_ORDER_OR_COIN_MISMATCH');
});
test('swapped Git blob SHA or mismatched risk pointer fails before issuer acceptance',()=>{
 assert.equal(check({fetchedRiskSha:'c'.repeat(40)}).code,'GITHUB_BLOB_IDENTITY_MISMATCH');
 const o=order();o.dot3_auth.risk_sha='c'.repeat(40);
 assert.equal(check({order:o}).code,'BINDING_ORDER_OR_COIN_MISMATCH');
});
test('expired/future binding and invalid risk attestation fail closed',()=>{
 const p=payload();p.expires_at_utc='2026-11-22T09:58:00.000Z';
 assert.equal(check({binding:signed(p)}).code,'BINDING_EXPIRED_OR_FUTURE');
 const risk=attestation();risk.quotes[0].provider_quote_asof_utc=null;
 const v=check({attestation:risk});
 assert.equal(v.signature_verified,true);
 assert.equal(v.code,'DOT3_RISK_ATTESTATION_QUOTE_TIME_UNKNOWN_OR_STALE');
 assert.equal(v.trade_authorized,false);
});
test('independently fetched risk blobs still never grant BUY without provider/sellability proof',async()=>{
 const o=order(),b=signed(),a=attestation();
 const mockRead=async(path,sha)=>({data:path===o.dot3_auth.binding_path?b:a,sha});
 const v=await validateDot3OrderBeforePublish({order:o,read:mockRead,
  trustedPublicKeyPem:publicPem,trustedKeyId:'dot3-local-v1',nowUtc});
 assert.equal(v.signature_verified,true);
 assert.equal(v.trade_authorized,false);
});
test('publisher refuses to write order or index for order with only dot names',async()=>{
 let writes=0;
 const fake={read:async()=>{throw Error('should not read unsigned risk');},
  request:async()=>{writes++;throw Error('no write allowed');}};
 await assert.rejects(publishPaperOrder(fake,{...order(),dot3_auth:undefined}),
  /DOT3_AUTH_NOT_VERIFIED/);
 assert.equal(writes,0);
});
