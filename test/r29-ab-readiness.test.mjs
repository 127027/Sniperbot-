import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectHistoricalABReadiness} from '../src/r29-ab-readiness.mjs';
const input={vault:{kind:'R29_USER_REQUESTED_BACKTEST_START_PREFLIGHT',preparation_status:'READY_FOR_DECLARED_SCOPE',rows:Array.from({length:24},(_,i)=>({scan:i+1,status:'PREPARED_VERIFIED'}))},packets:{kind:'R29_PREDECISION_EVIDENCE_PACKETS',prepared_trade_inputs:3,inventory_count:100,evidence_jobs:0},register:{predecision_preparation:{state:'READY_FOR_DECLARED_SCOPE'}}};
test('archive preflight can advance to provenance verification but never claim a completed replay',()=>{
 const r=inspectHistoricalABReadiness(input);assert.equal(r.status,'READY_FOR_SEALED_VERIFICATION');assert.equal(r.actual_valid_scans,0);assert.equal(r.pnl,null);assert.deepEqual(r.blockers,['SEALED_MARKET_AND_REVIEW_PROVENANCE_REQUIRED']);
});
test('incomplete historical frames or no verified inputs cannot advance',()=>{
 const x=structuredClone(input);x.vault.rows[5].status='PARTIAL';x.packets.prepared_trade_inputs=0;
 const r=inspectHistoricalABReadiness(x);assert.equal(r.status,'BLOCKED_PENDING_VERIFIED_SEALED_INPUTS');assert.ok(r.blockers.includes('PARTIAL_OR_UNVERIFIED_HOURLY_FRAMES'));assert.ok(r.blockers.includes('NO_VERIFIED_TRADE_INPUTS_IN_CURRENT_ARCHIVE'));
});
