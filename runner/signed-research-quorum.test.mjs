import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {attestationPayload,verifySignedResearchQuorum} from './signed-research-quorum.mjs';
const roles=['news_discovery','social_acceleration','onchain_liquidity',
 'contract_security','opportunity_qa','risk_controller'];
const now=Date.parse('2026-11-10T14:00:00Z');
const token='0x'+'a'.repeat(40),pool='0x'+'b'.repeat(40);
const candidate={chain:'base',token_address:token,pool_address:pool,
 candidate_id:'base:'+token+':'+pool};
function fixture(){
 const keys=[],attestations=[],privates=[];
 for(let i=0;i<roles.length;i++){
  const pair=generateKeyPairSync('ed25519');privates.push(pair.privateKey);
  keys.push({role:roles[i],issuer:'issuer_'+String(i).padStart(5,'0'),
   key_id:'key_'+String(i).padStart(5,'0'),scope:'paper_research',revoked:false,
   public_key_pem:pair.publicKey.export({format:'pem',type:'spki'})});
  const a={schema:'research_attestation.v1',paper_only:true,actionable:false,
   candidate_id:candidate.candidate_id,role:roles[i],
   verdict:roles[i]==='risk_controller'?'PASS':'YES',
   published_at_utc:new Date(now).toISOString(),
   expires_at_utc:new Date(now+90000).toISOString(),
   issuer:keys[i].issuer,key_id:keys[i].key_id,
   evidence_sha256:'a'.repeat(64),
   source_url:'https://independent'+i+'.example.org/proof'};
  attestations.push({...a,signature:sign(null,Buffer.from(attestationPayload(a)),
   pair.privateKey).toString('base64')});
 }
 return {keys,attestations,privates};
}
test('six independent Ed25519 signatures prove claims but NEVER make external paper executable',()=>{
 const f=fixture();
 const x=verifySignedResearchQuorum({
  candidate,attestations:f.attestations,trustedPublicKeys:f.keys,now});
 assert.equal(x.quorum_verified,true,x.reason);
 assert.equal(x.signed_claims_verified,6);
 assert.equal(x.independent_market_risk_verified,false);
 assert.equal(x.amount_specific_sell_route_verified,false);
 assert.equal(x.external_paper_entry_authorized,false);
});
test('signature tampering and duplicate signing principal fail closed',()=>{
 const f=fixture();
 const changed=f.attestations.map(x=>({...x}));
 changed[0]={...changed[0],evidence_sha256:'b'.repeat(64)};
 assert.equal(verifySignedResearchQuorum({candidate,attestations:changed,
  trustedPublicKeys:f.keys,now}).quorum_verified,false);
 const duplicate=f.keys.map(x=>({...x}));
 duplicate[1].public_key_pem=duplicate[0].public_key_pem;
 assert.equal(verifySignedResearchQuorum({candidate,attestations:f.attestations,
  trustedPublicKeys:duplicate,now}).quorum_verified,false);
});
test('revoked key, missing vote, stale and non independent sources fail closed',()=>{
 const f=fixture();
 const revoked=f.keys.map(x=>({...x}));revoked[0].revoked=true;
 assert.equal(verifySignedResearchQuorum({candidate,attestations:f.attestations,
  trustedPublicKeys:revoked,now}).quorum_verified,false);
 assert.equal(verifySignedResearchQuorum({candidate,attestations:f.attestations.slice(0,5),
  trustedPublicKeys:f.keys,now}).reason,'SIX_INDEPENDENT_ATTESTATIONS_REQUIRED');
 assert.equal(verifySignedResearchQuorum({candidate,attestations:f.attestations,
  trustedPublicKeys:f.keys,now:now+301000}).quorum_verified,false);
 const copied=f.attestations.map(x=>({...x}));
 copied[1].source_url=copied[0].source_url;
 assert.equal(verifySignedResearchQuorum({candidate,attestations:copied,
  trustedPublicKeys:f.keys,now}).quorum_verified,false);
});
test('explicit independent VETO or risk FAIL are never quorum approved',()=>{
 const f=fixture();
 for(const [idx,verdict] of [[3,'VETO'],[5,'FAIL']]){
  const list=f.attestations.map(x=>({...x}));
  list[idx].verdict=verdict;
  list[idx].signature=sign(null,Buffer.from(attestationPayload(list[idx])),
   f.privates[idx]).toString('base64');
  const r=verifySignedResearchQuorum({candidate,attestations:list,
   trustedPublicKeys:f.keys,now});
  assert.equal(r.quorum_verified,false);
  assert.equal(r.reason,'VETO_OR_NON_YES');
 }
});
