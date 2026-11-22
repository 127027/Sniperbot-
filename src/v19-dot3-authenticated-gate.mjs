// R29 V1.9 D3-04. A name/string like "dot-3-risk" is NOT authentication.
// This verification checks GitHub content-addressed blobs + a locally pinned
// Ed25519 public key. It is deliberately FAIL-CLOSED for active PAPER orders
// until independent provider / security / sellability proofs are implemented.
// No private signing keys, API keys or live trading functionality in this file.
import {createPublicKey,verify as verifySignature} from 'node:crypto';
import {inspectDot3Attestation} from './risk-authorization-v18.mjs';
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';

const SHA=/^[a-f0-9]{40}$/;
const B64=/^(?:[A-Za-z0-9+/]{4}){21}[A-Za-z0-9+/]{2}==$/;
const pathOk=(p,kind)=>typeof p==='string'
 &&new RegExp('^research/risk/'+kind+'/[A-Za-z0-9_-]{8,100}\\.json$').test(p);
const clock=t=>typeof t==='string'&&Number.isFinite(Date.parse(t))?Date.parse(t):null;
const canon=(c,v)=>c==='solana'?String(v):String(v).toLowerCase();
const failure=(code,details={})=>({schema:1,kind:'R29_V19_DOT3_AUTH_GATE',
 status:'BLOCKED',code,signature_verified:false,
 source_quotes_independently_attested:false,sellability_independently_attested:false,
 trade_authorized:false,...details});

export function dot3SignatureMessage(payload){
 if(payload?.schema!==1||payload.kind!=='R29_DOT3_AUTH_BINDING'
   ||payload.issuer!=='dot-3-risk'||payload.purpose!=='PAPER_ONLY'
   ||typeof payload.order_id!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(payload.order_id)
   ||!['BUY','SELL'].includes(payload.order_action)
   ||!SHA.test(payload.risk_blob_sha||'')||!pathOk(payload.risk_path,'attestations')
   ||!Number.isFinite(clock(payload.issued_at_utc))
   ||!Number.isFinite(clock(payload.expires_at_utc))
   ||!['solana','ethereum','base','bsc','robinhood','cronos'].includes(payload.coin?.chain)
   ||!tokenValid(payload.coin.chain,payload.coin.contract)
   ||!poolValid(payload.coin.chain,payload.coin.pool,payload.coin.pool_kind)
   ||typeof payload.key_id!=='string'
   ||!/^[A-Za-z0-9_-]{8,80}$/.test(payload.key_id))
  throw Error('INVALID_DOT3_BINDING_PAYLOAD');
 // Flat, fixed-field signing message, avoiding object key-order ambiguity.
 // Null vs empty and explicit V4 pool_kind are cryptographically bound.
 const c=payload.coin;
 return Buffer.from(JSON.stringify(['R29_DOT3_PAPER_V1',payload.key_id,
  payload.order_id,payload.order_action,payload.risk_path,payload.risk_blob_sha,
  c.chain,canon(c.chain,c.contract),canon(c.chain,c.pool),
  c.pool_kind??null,payload.issued_at_utc,payload.expires_at_utc]),'utf8');
}

export function inspectSignedDot3Binding({order,binding,attestation,
 fetchedBindingSha,fetchedRiskSha,nowUtc,
 trustedPublicKeyPem=null,trustedKeyId=null}={}){
 const now=clock(nowUtc),p=order?.dot3_auth;
 if(now===null||!order||!['BUY','SELL'].includes(order.action)
   ||!p||!pathOk(p.binding_path,'bindings')||!SHA.test(p.binding_sha||'')
   ||!pathOk(p.risk_path,'attestations')||!SHA.test(p.risk_sha||''))
  return failure('ORDER_PROOF_POINTER_MISSING_OR_INVALID');
 if(fetchedBindingSha!==p.binding_sha||fetchedRiskSha!==p.risk_sha)
  return failure('GITHUB_BLOB_IDENTITY_MISMATCH');
 if(!binding||typeof binding!=='object'||!attestation
   ||binding?.signature?.algorithm!=='Ed25519'
   ||!B64.test(binding?.signature?.signature_base64||''))
  return failure('INVALID_SIGNED_BINDING');
 const payload=binding.payload;
 let message;
 try{message=dot3SignatureMessage(payload)}
 catch{return failure('INVALID_BINDING_PAYLOAD');}
 const bc=payload.coin,oc=order.coin,chain=canonicalChain(oc?.chain);
 if(!chain||chain!==bc.chain
   ||canon(chain,oc?.pool)!==canon(chain,bc.pool)
   ||canon(chain,oc?.contract)!==canon(chain,bc.contract)
   ||(oc?.pool_kind??null)!==(bc.pool_kind??null)
   ||payload.order_id!==order.id||payload.order_action!==order.action
   ||payload.risk_path!==p.risk_path||payload.risk_blob_sha!==p.risk_sha)
  return failure('BINDING_ORDER_OR_COIN_MISMATCH');
 const issued=clock(payload.issued_at_utc),expiry=clock(payload.expires_at_utc);
 if(issued>now||expiry<now||expiry<=issued||expiry-issued>300000)
  return failure('BINDING_EXPIRED_OR_FUTURE');
 if(typeof trustedPublicKeyPem!=='string'||!trustedPublicKeyPem.trim()
   ||typeof trustedKeyId!=='string'||trustedKeyId!==payload.key_id)
  return failure('EXTERNAL_TRUST_ANCHOR_MISSING_OR_MISMATCH');
 let valid=false;
 try{
  const key=createPublicKey(trustedPublicKeyPem);
  if(key.asymmetricKeyType==='ed25519'){
   const raw=Buffer.from(binding.signature.signature_base64,'base64');
   valid=raw.length===64&&verifySignature(null,message,key,raw);
  }
 }catch{return failure('INVALID_PINNED_ISSUER_PUBLIC_KEY');}
 if(!valid)return failure('DOT3_ISSUER_SIGNATURE_INVALID');
 const structure=inspectDot3Attestation({
  attestation,order,nowUtc,expectedBlobSha:p.risk_sha});
 if(structure.status!=='STRUCTURAL_PASS_EXTERNAL_VERIFICATION_REQUIRED')
  return failure('DOT3_RISK_ATTESTATION_'+(structure.code||'INCOMPLETE'),{
   signature_verified:true,structural_status:structure.status});
 // CRITICAL: signature authenticates the issuer's claim, not the source's
 // true quote timestamp, on-chain sell route or security. Remain closed.
 return {schema:1,kind:'R29_V19_DOT3_AUTH_GATE',
  status:'SIGNED_RISK_PACKET_RESEARCH_ONLY',
  code:'INDEPENDENT_PROVIDER_AND_SELLABILITY_PROOF_NOT_VERIFIED',
  signature_verified:true,git_blob_pointers_verified:true,
  issuer_key_id:payload.key_id,structural_status:structure.status,
  source_quotes_independently_attested:false,
  sellability_independently_attested:false,
  trade_authorized:false,
  next_requirements:['INDEPENDENT_HTTP_SOURCE_PROOF','CHAIN_SELLABILITY_ATTESTATION',
   'SEPARATE_PROSPECTIVE_ISSUER_ALLOWLIST_AND_ORDER_GATES']};
}

export async function validateDot3OrderBeforePublish({order,read,
 nowUtc,trustedPublicKeyPem=null,trustedKeyId=null}={}){
 const p=order?.dot3_auth;
 if(!p||!pathOk(p.binding_path,'bindings')||!SHA.test(p.binding_sha||'')
   ||!pathOk(p.risk_path,'attestations')||!SHA.test(p.risk_sha||''))
  return failure('ORDER_PROOF_POINTER_MISSING_OR_INVALID');
 if(typeof read!=='function')return failure('INDEPENDENT_GITHUB_READ_REQUIRED');
 let bound,risk;
 try{
  [bound,risk]=await Promise.all([
   read(p.binding_path,p.binding_sha),read(p.risk_path,p.risk_sha)]);
 }catch{return failure('GITHUB_RISK_BLOB_UNAVAILABLE_OR_UNVERIFIED');}
 return inspectSignedDot3Binding({order,binding:bound?.data,
  attestation:risk?.data,fetchedBindingSha:bound?.sha,
  fetchedRiskSha:risk?.sha,nowUtc,trustedPublicKeyPem,trustedKeyId});
}
