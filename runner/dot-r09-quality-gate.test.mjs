import test from 'node:test';
import assert from 'node:assert/strict';
import {assessR09Independence,readR09RoleReports} from './dot-r09-quality-gate.mjs';
test('R09 provisional results do not imply independent dot success',()=>{
 const r=assessR09Independence(readR09RoleReports());
 assert.equal(r.peer_reports_completed,4);
 assert.equal(r.peer_reports_independently_attested,0);
 assert.equal(r.qa_allowed_to_claim_independent_validation,false);
 assert.equal(r.has_any_strict_asof_detection,false);
 assert.equal(r.historical_recall_denominator_known,false);
 assert.equal(r.historical_buy_advisory_count,0);
 assert(r.unique_provisional_symbol_names_from_peer_reports.includes('MAU'));
});
test('duplicate mentions among roles cannot inflate unique token names',()=>{
 const r=assessR09Independence(readR09RoleReports());
 assert.equal(new Set(r.unique_provisional_symbol_names_from_peer_reports).size,
  r.unique_provisional_symbol_names_from_peer_reports.length);
 assert.equal(r.unique_provisional_symbol_names_from_peer_reports.filter(v=>v==='HORSEMEAT').length,1);
});
test('QA gate is blocked when one peer report is only an inline analysis',()=>{
 const roles=readR09RoleReports().map(r=>structuredClone(r));
 for(const r of roles)if(r.role!=='opportunity_qa')r.execution_provenance='INDEPENDENT_SCHEDULED_DOT_RUN';
 const social=roles.find(r=>r.role==='social_acceleration');
 social.execution_provenance='INLINE_RUN_IN_THIS_CHAT_NOT_INDEPENDENT_CLOUD_DOT';
 assert.equal(assessR09Independence(roles).qa_allowed_to_claim_independent_validation,false);
 social.execution_provenance='INDEPENDENT_SCHEDULED_DOT_RUN';
 assert.equal(assessR09Independence(roles).qa_allowed_to_claim_independent_validation,true);
});
test('source findings alone do not establish a price prediction, even with attestation',()=>{
 const roles=readR09RoleReports().map(r=>structuredClone(r));
 for(const r of roles)if(r.role!=='opportunity_qa')r.execution_provenance='INDEPENDENT_SCHEDULED_DOT_RUN';
 const status=assessR09Independence(roles);
 assert.equal(status.strictly_historical_predicative_test_passed,false);
 assert.equal(status.conclusion,'ONLY_PROVISIONAL_EXTRACTION_NOT_VERIFIED_FIVE_DOT_EARLY_DETECTION');
});
test('missing or duplicated roles cannot be scored',()=>{
 const input=readR09RoleReports();
 assert.throws(()=>assessR09Independence(input.slice(1)),/INVALID_R09_ROLE_SET/);
 assert.throws(()=>assessR09Independence([input[0],input[0],...input.slice(2)]),/INVALID_R09_ROLE_SET/);
});
