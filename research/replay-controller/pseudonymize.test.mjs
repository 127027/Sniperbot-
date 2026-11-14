import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileAsOfCorpus} from './asof-feed.mjs';
import {pseudonymizeCohort} from './pseudonymize.mjs';
import {blindReadiness,frame,initialPortfolio} from './engine.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function input(){
 const now='2023-04-14T11:00:00Z';
 const proof=(id,kind)=>{
  const original='original-source-'+id;
  return {method:kind,original,sha256:sha(original),verified:true,
   ref:'private-source-'+id,...(kind==='ONCHAIN_LEDGER'?{
    block_time:now,historical_ledger_verified:true
   }:{published_at:now,captured_at:'2023-04-14T12:00:00Z'})};
 };
 const rows=[
  {id:'1',kind:'POOL',candidate_id:'ethereum:0xPEPE:0xPOOL1',event_at:now,
   proof:proof('1','ONCHAIN_LEDGER'),payload:{chain:'ethereum',token:'0xPEPE',pool:'0xPOOL1'}},
  {id:'2',kind:'SOCIAL',candidate_id:'ethereum:0xPEPE:0xPOOL1',event_at:now,
   proof:proof('2','CONTEMPORANEOUS_ARCHIVE'),payload:{body:'PEPE PEPE is trending',authors:2,interactions:10}},
  {id:'3',kind:'POOL',candidate_id:'ethereum:0xOTHER:0xPOOL2',event_at:now,
   proof:proof('3','ONCHAIN_LEDGER'),payload:{chain:'ethereum',token:'0xOTHER',pool:'0xPOOL2'}}
 ];
 const compiled=compileAsOfCorpus({schema:'asof_corpus.v1',window:{
   start:'2023-04-14T00:00:00Z',end:'2023-04-15T23:59:59Z'
  },universe:{selection:'ASOF_COHORT',provenance:'test multiple token listing'},sources:rows});
 const aliases={schema:'source_alias_manifest.v1',candidates:[
  {candidate_id:'ethereum:0xPEPE:0xPOOL1',aliases:['PEPE','0xPEPE','0xPOOL1']},
  {candidate_id:'ethereum:0xOTHER:0xPOOL2',aliases:['OTHER','0xOTHER','0xPOOL2']}
 ]};
 return {compiled,aliases};
}
test('pseudonyms hide original identities and replace social mentions',()=>{
 const {compiled,aliases}=input(),r=pseudonymizeCohort(compiled.dataset,aliases);
 const f=frame(r.dataset,0,initialPortfolio());
 const visible=JSON.stringify(f);
 assert.ok(!visible.includes('PEPE')&&!visible.includes('0xPOOL1'));
 assert.ok(!visible.includes('OTHER')&&!visible.includes('0xPOOL2'));
 assert.ok(visible.includes('candidate_00001'));
 assert.equal(new Set(r.dataset.events.map(e=>e.candidate_id)).size,2);
 assert.equal(r.privateMapping.candidates.length,2);
});
test('private deblinding map is never attached to agent frame',()=>{
 const {compiled,aliases}=input(),r=pseudonymizeCohort(compiled.dataset,aliases);
 const output=JSON.stringify(frame(r.dataset,0,initialPortfolio()));
 assert.ok(!output.includes('private_candidate_keyring'));
 assert.ok(!output.includes('ethereum:0xPEPE:0xPOOL1'));
 assert.ok(JSON.stringify(r.privateMapping).includes('ethereum:0xPEPE:0xPOOL1'));
});
test('masking alone cannot self-attest that model pretraining is controlled',()=>{
 const {compiled,aliases}=input(),r=pseudonymizeCohort(compiled.dataset,aliases);
 assert.equal(r.dataset.blinding.identities_pseudonymized,true);
 assert.equal(r.dataset.blinding.pretraining_leakage_reviewed,false);
 assert.ok(blindReadiness(r.dataset).reasons.includes('PRETRAINING_KNOWLEDGE_LEAKAGE_NOT_CONTROLLED'));
 assert.equal(blindReadiness(r.dataset).eligible,false);
});
test('all candidates require explicit alias declarations',()=>{
 const {compiled,aliases}=input();
 aliases.candidates.pop();
 assert.throws(()=>pseudonymizeCohort(compiled.dataset,aliases),/MISSING_CANDIDATE_ALIASES/);
});
