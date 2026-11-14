import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSolanaMintHeader,LEGACY_TOKEN_PROGRAM,TOKEN_2022_PROGRAM} from './solana-mint-risk.mjs';
function mint({mint=0,freeze=0,owner=LEGACY_TOKEN_PROGRAM,space=82,
 initialized=1,decimals=9,supply=1000000n}={}){
 const b=Buffer.alloc(82);
 b.writeUInt32LE(mint,0);b.writeBigUInt64LE(supply,36);
 b[44]=decimals;b[45]=initialized;b.writeUInt32LE(freeze,46);
 return {owner,executable:false,space,data:[b.toString('base64'),'base64']};
}
test('legacy SPL mint+freeze revoked is ONLY header-level observation, never PASS',()=>{
 const r=analyzeSolanaMintHeader(mint());
 assert.equal(r.mint_program,'SPL_TOKEN_LEGACY');
 assert.equal(r.mint_authority,'REVOKED');
 assert.equal(r.freeze_authority,'REVOKED');
 assert.equal(r.initialized,true);
 assert.equal(r.decimals,9);
 assert.equal(r.supply_raw,'1000000');
 assert.equal(r.observed_risk,'HEADER_ONLY_NO_KNOWN_AUTHORITY');
 assert.equal(r.contract_security,'UNKNOWN');
 assert.equal(r.sellability,'UNKNOWN');
 assert.equal(r.paper_entry_authorized,false);
});
test('mint or freeze authority retained means CAUTION',()=>{
 for(const v of [{mint:1},{freeze:1},{mint:1,freeze:1}]){
  const r=analyzeSolanaMintHeader(mint(v));
  assert.equal(r.observed_risk,'CAUTION');
  assert.equal(r.paper_entry_authorized,false);
 }
});
test('Token-2022 extensions always require separate audit even if header revokes rights',()=>{
 const r=analyzeSolanaMintHeader(mint({owner:TOKEN_2022_PROGRAM,space:196}));
 assert.equal(r.mint_program,'TOKEN_2022');
 assert.equal(r.extension_audit,'REQUIRED');
 assert.equal(r.observed_risk,'CAUTION');
 assert.equal(r.contract_security,'UNKNOWN');
});
test('wrong owner, non mint, truncated base64, invalid option tags all fail closed',()=>{
 const cases=[
  {...mint(),owner:'11111111111111111111111111111111'},
  {...mint(),executable:true},
  {...mint(),data:['NO!','base64']},
  {...mint(),data:[Buffer.alloc(60).toString('base64'),'base64']},
  mint({mint:2}),mint({freeze:3}),mint({initialized:3}),mint({space:165}),
  mint({supply:0n}),null
 ];
 for(const c of cases){
  const r=analyzeSolanaMintHeader(c);
  assert.equal(r.paper_entry_authorized,false);
  assert.equal(r.contract_security,'UNKNOWN');
  assert.equal(r.sellability,'UNKNOWN');
  assert.notEqual(r.observed_risk,'HEADER_ONLY_NO_KNOWN_AUTHORITY');
 }
});
test('missing information never pretends revoked authority',()=>{
 const r=analyzeSolanaMintHeader({owner:LEGACY_TOKEN_PROGRAM,space:82,data:null});
 assert.equal(r.mint_authority,'UNKNOWN');
 assert.equal(r.freeze_authority,'UNKNOWN');
});
