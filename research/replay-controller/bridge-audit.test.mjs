import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROLES,frame,initialPortfolio,digest} from './engine.mjs';
import {assessBridge,inspectBridge} from './bridge-audit.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
function emptyFrame(){
 return frame({schema:'isolated_replay.v1',data_class:'HISTORICAL',
  ticks:['2023-03-14T23:59:59Z'],events:[]},0,initialPortfolio());
}
function fullVotes(f){
 return Object.fromEntries(ROLES.map(role=>[role,{
  role,run_id:'synthetic-'+role,index:f.index,at:f.at,input_hash:f.input_hash,reviews:[],orders:[]
 }]));
}
function states(){
 return Object.fromEntries(ROLES.map(role=>[role,{role,run_id:'synthetic-'+role,
  candidate:{selection:'UNSPECIFIED'},status:'NO_PROGRESS'}]));
}
test('current real bridge is missing four role votes and NEVER earns a blind pass',()=>{
 const d=inspectBridge({frameDirectory:path.join(here,'bridge','diagnostic-first-frame'),mode:'BLIND'});
 assert.deepEqual(d.missing_roles,['social','onchain','security','qa']);
 assert.equal(d.vote_count,1);
 assert.equal(d.ready_for_controller_advance,false);
 assert.equal(d.ready_for_blind_evaluation,false);
 assert.equal(d.historic_discovery_verified,false);
 assert.equal(d.status,'BLIND_BLOCKED');
 assert.ok(d.known_target_exposed_roles.includes('scout'));
 assert.ok(d.corpus_reasons.includes('SINGLE_TARGET_SELECTION'));
});
test('no vote is manufactured when a role is absent',()=>{
 const f=emptyFrame(),v=fullVotes(f);delete v.onchain;
 const d=assessBridge({frame:f,votes:v,roleStates:states()});
 assert.deepEqual(d.missing_roles,['onchain']);
 assert.equal(d.ready_for_controller_advance,false);
 assert.equal(d.cross_role_validation,null);
});
test('stale hash and mismatched simulated frame are refused',()=>{
 const f=emptyFrame(),v=fullVotes(f);v.social.input_hash='WRONG';
 const d=assessBridge({frame:f,votes:v,roleStates:states()});
 assert.equal(d.invalid_votes[0].reason,'STALE_OR_WRONG_FRAME');
 assert.equal(d.ready_for_controller_advance,false);
 const mutated=structuredClone(f);mutated.index=1;
 assert.throws(()=>assessBridge({frame:mutated,votes:fullVotes(f),roleStates:states()}),/FRAME_HASH_MISMATCH/);
});
test('no lookahead event can be smuggled into a frame',()=>{
 const f=emptyFrame(),event={id:'synthetic_future',kind:'SOCIAL',candidate_id:'fictional_coin',
  event_at:'2023-03-15T00:00:00Z',available_at:'2023-03-15T00:00:00Z'};
 f.events.push(event);const {input_hash,...base}=f;f.input_hash=digest(base);
 assert.throws(()=>assessBridge({frame:f,votes:fullVotes(f),roleStates:states()}),/FUTURE_OR_INVALID_VISIBLE_EVENT/);
});
test('non-QA role cannot inject an order even with complete votes',()=>{
 const f=emptyFrame(),v=fullVotes(f);
 v.scout.orders=[{action:'BUY',candidate_id:'fictional_coin',amount_quote:100}];
 const d=assessBridge({frame:f,votes:v,roleStates:states()});
 assert.equal(d.invalid_votes[0].reason,'ONLY_QA_MAY_ORDER');
 assert.equal(d.ready_for_controller_advance,false);
});
test('even all five valid files are not authenticated independent model work',()=>{
 const f=emptyFrame(),v=fullVotes(f),d=assessBridge({frame:f,votes:v,roleStates:states()});
 assert.equal(d.ready_for_controller_advance,true);
 assert.equal(d.status,'STRUCTURALLY_READY_DIAGNOSTIC_ONLY');
 assert.equal(d.ready_for_blind_evaluation,false);
 assert.equal(d.independent_role_authorship_verified,false);
 assert.equal(d.hypothetical_trades_verified,false);
});
test('known winner pre-exposure is separately recorded as a blind blocker',()=>{
 const f=emptyFrame(),s=states(),v=fullVotes(f);
 s.qa.candidate.selection='KNOWN_WINNER_DIAGNOSTIC_NOT_DISCOVERY';
 const d=assessBridge({frame:f,votes:v,roleStates:s,mode:'BLIND',
  corpusAudit:{readiness:{reasons:['NO_DOCUMENTED_ASOF_COHORT']}}});
 assert.equal(d.ready_for_controller_advance,true);
 assert.equal(d.ready_for_blind_evaluation,false);
 assert.equal(d.status,'BLIND_BLOCKED');
 assert.ok(d.blockers.includes('KNOWN_TARGET_IN_CONTEXT:qa'));
 assert.ok(d.blockers.includes('DATASET:NO_DOCUMENTED_ASOF_COHORT'));
});
test('invalid evidence references fail without writing files or creating trades',()=>{
 const f=emptyFrame(),v=fullVotes(f);
 v.social.reviews=[{candidate_id:'fictional_coin',verdict:'YES',evidence_ids:['future_event']}];
 const d=assessBridge({frame:f,votes:v,roleStates:states()});
 assert.equal(d.invalid_votes[0].reason,'INVALID_OR_FUTURE_REVIEW_EVIDENCE');
 assert.equal(d.ready_for_controller_advance,false);
});
