// Ed25519 signature/quorum verifier for a FUTURE research publisher.
// No signing keys are generated, stored or sent by this module.
// Five authentic YES claims + separate risk-controller PASS are NOT executable
// evidence: independent on-chain validation and amount-specific sell quotes
// still require a separate trusted local adapter.
import {createPublicKey,verify,createHash} from 'node:crypto';
import {candidateId} from './research-watchlist.mjs';

export const RESEARCH_ROLES=Object.freeze([
 'news_discovery','social_acceleration','onchain_liquidity',
 'contract_security','opportunity_qa'
]);
const ALL=[...RESEARCH_ROLES,'risk_controller'];
const domain='MemeSniper/research_attestation.v1\n';
const known=new Set(['schema','paper_only','actionable','candidate_id',
 'role','verdict','published_at_utc','expires_at_utc','issuer','key_id',
 'evidence_sha256','source_url','signature']);
function canonical(v){
 if(v===null||typeof v!=='object')return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
}
export function attestationPayload(a){
 if(!a||typeof a!=='object'||Array.isArray(a))throw Error('INVALID_ATTESTATION');
 const {signature,...unsigned}=a;
 return domain+canonical(unsigned);
}
function clean(a,now,id){
 if(!a||typeof a!=='object'||Array.isArray(a)||
  Object.keys(a).length!==known.size||
  Object.keys(a).some(k=>!known.has(k)))throw Error('ATTESTATION_FIELDS_INVALID');
 if(a.schema!=='research_attestation.v1'||a.paper_only!==true||
  a.actionable!==false||a.candidate_id!==id||!ALL.includes(a.role))
  throw Error('ATTESTATION_IDENTITY_INVALID');
 if(!['YES','NO','ABSTAIN','VETO'].includes(a.verdict)&&a.role!=='risk_controller')
  throw Error('ATTESTATION_VERDICT_INVALID');
 if(a.role==='risk_controller'&&!['PASS','FAIL','UNKNOWN'].includes(a.verdict))
  throw Error('ATTESTATION_VERDICT_INVALID');
 const start=Date.parse(a.published_at_utc),end=Date.parse(a.expires_at_utc);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>now+5000||
  start<now-300000||end<=now||end-start>180000)
  throw Error('ATTESTATION_STALE');
 if(typeof a.issuer!=='string'||!/^[-\w]{8,100}$/.test(a.issuer)||
  typeof a.key_id!=='string'||!/^[-\w]{8,100}$/.test(a.key_id)||
  !/^[a-f0-9]{64}$/.test(a.evidence_sha256)||
  typeof a.signature!=='string'||!/^[a-zA-Z0-9+/]+={0,2}$/.test(a.signature)||
  typeof a.source_url!=='string')
  throw Error('ATTESTATION_PROVENANCE_INVALID');
 let url;
 try{url=new URL(a.source_url)}catch{throw Error('ATTESTATION_PROVENANCE_INVALID')}
 if(url.protocol!=='https:'||url.username||url.password||a.source_url.length>900)
  throw Error('ATTESTATION_PROVENANCE_INVALID');
 return url.hostname.toLowerCase();
}
const result=(reason,claims=0)=>({schema:'research_signed_quorum_check.v1',
 paper_only:true,actionable:false,quorum_verified:false,
 signed_claims_verified:claims,independent_market_risk_verified:false,
 amount_specific_sell_route_verified:false,external_paper_entry_authorized:false,
 reason});
export function verifySignedResearchQuorum({
 candidate,attestations=[],trustedPublicKeys=[],now=Date.now()
}={}){
 let id;
 try{id=candidateId(candidate?.chain,candidate?.token_address,candidate?.pool_address)}
 catch{return result('INVALID_CANDIDATE')}
 if(candidate.candidate_id!==id||!Array.isArray(attestations)||!Array.isArray(trustedPublicKeys))
  return result('INVALID_QUORUM_INPUT');
 if(attestations.length!==6||trustedPublicKeys.length<6||trustedPublicKeys.length>30)
  return result('SIX_INDEPENDENT_ATTESTATIONS_REQUIRED');
 const usedRoles=new Set(),usedIssuers=new Set(),usedKeys=new Set(),hosts=new Set();
 let verified=0,hasVeto=false;
 for(const a of attestations){
  try{
   const host=clean(a,now,id);
   const matching=trustedPublicKeys.filter(k=>k?.role===a.role&&
    k?.issuer===a.issuer&&k?.key_id===a.key_id&&k?.scope==='paper_research'&&!k.revoked);
   if(matching.length!==1)throw Error('UNKNOWN_TRUSTED_PRINCIPAL');
   const key=createPublicKey(matching[0].public_key_pem);
   if(key.asymmetricKeyType!=='ed25519')throw Error('NOT_ED25519');
   const fingerprint=createHash('sha256').update(key.export({format:'der',type:'spki'})).digest('hex');
   if(usedRoles.has(a.role)||usedIssuers.has(a.issuer)||usedKeys.has(fingerprint)||
      hosts.has(host))throw Error('NON_INDEPENDENT_REVIEWERS');
   if(!verify(null,Buffer.from(attestationPayload(a)),key,
      Buffer.from(a.signature,'base64')))throw Error('ATTESTATION_SIGNATURE_INVALID');
   usedRoles.add(a.role);usedIssuers.add(a.issuer);
   usedKeys.add(fingerprint);hosts.add(host);verified++;
   if(a.role==='risk_controller'?a.verdict!=='PASS':a.verdict!=='YES')hasVeto=true;
  }catch(e){return result(String(e.message||'ATTESTATION_INVALID'),verified)}
 }
 if(usedRoles.size!==ALL.length)return result('MISSING_REQUIRED_ROLE',verified);
 if(hasVeto)return result('VETO_OR_NON_YES',verified);
 return {schema:'research_signed_quorum_check.v1',paper_only:true,actionable:false,
  quorum_verified:true,signed_claims_verified:verified,
  independent_market_risk_verified:false,
  amount_specific_sell_route_verified:false,
  external_paper_entry_authorized:false,
  reason:'SIX_AUTHENTIC_CLAIMS_ONLY_EXTERNAL_VALIDATOR_STILL_REQUIRED'};
}
