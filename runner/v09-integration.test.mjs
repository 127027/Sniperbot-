import test from 'node:test';
import assert from 'node:assert/strict';
import {buildV09Status,previewFundingV09} from './v09-integration.mjs';
const base=()=>({entriesEnabled:false,centralPaperFollow:false,
 minTrade:50,maxTrade:500,portfolioBudgetUsdc:500,cashUsdc:500,
 cashEur:0,positions:[]});
const snapshot=()=>({transport:'PUBLIC_GITHUB_PULL_ONLY',roles:[
 {stale:false,paper_only:true,actionable:false},
 {stale:false,paper_only:true,actionable:false},
 {stale:false,paper_only:true,actionable:false},
 {stale:false,paper_only:true,actionable:false},
 {stale:false,paper_only:true,actionable:false}
],advisories:{candidates:[{candidate_id:'untrusted',paper_entry_authorized:true,actionable:true}]}});
test('even five fresh role snapshots and an adversarial actionable advisory cannot grant buys',()=>{
 const before=base(),copy=structuredClone(before);
 const status=buildV09Status({state:before,network:snapshot()});
 assert.equal(status.role_snapshots_visible,5);
 assert.equal(status.candidates_visible,1);
 assert.equal(status.signed_quorum_verified,false);
 assert.equal(status.automated_external_paper_trading_enabled,false);
 assert.equal(status.live_enabled,false);
 assert.equal(status.wallet_created,false);
 assert.deepEqual(before,copy,'read-only status never mutates portfolio');
});
test('when research network unavailable the status remains explicit and fail-closed',()=>{
 const s=buildV09Status({state:base(),network:null});
 assert.equal(s.role_snapshots_visible,0);
 assert.equal(s.research_transport,'UNAVAILABLE');
 assert.equal(s.real_contract_validator_connected,false);
});
test('paper funding preview returns calculated amounts but never books cash',()=>{
 const before=base(),copy=structuredClone(before);
 const preview=previewFundingV09({amountEur:50,eurPerUsdc:0.92,
 providerFeeEur:1,spreadPct:1,networkFeeUsdc:0.2,now:Date.parse('2026-11-10T13:00:00Z')});
 assert.equal(preview.status,'PAPER_QUOTED');
 assert.equal(preview.payment_performed,false);
 assert.equal(preview.paper_only,true);
 assert(preview.expected_test_usdc>50);
 assert.deepEqual(before,copy);
});
test('bad input cannot cause a fake conversion',()=>{
 assert.equal(previewFundingV09({amountEur:'50',eurPerUsdc:0.92}).status,'BLOCKED');
 assert.equal(previewFundingV09({amountEur:50,eurPerUsdc:0}).status,'BLOCKED');
});
