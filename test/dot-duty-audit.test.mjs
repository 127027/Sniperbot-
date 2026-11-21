import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCurrentDotRoles,build24TrainingTimeline} from '../src/dot-duty-audit.mjs';
test('no false pass for missing contracts or receipts',()=>{
 const r=auditCurrentDotRoles({dot1:{target_per_24h:4,data_available:false},
 dot2:{candidate_count:6,candidates:[{pool:'0xab',contract:null}]},dot3:{counts:{ELIGIBLE:0}},
 dot4:{counts:{buy:0,sell:0}},dot5:{updated_at_utc:'2026-11-21T00:00:00Z',
 counts:{dot2_snapshots_verified_sha:4,receipt_files:0,confirmed_paper_filled:0}},signalIndex:{orders:[]}});
 assert.equal(r.all_roles_complete,false);assert.equal(r.roles[1].status,'DATA_GAP');
 assert.equal(r.roles[4].status,'DIAGNOSTIC_ACTIVE');assert.equal(r.confirmed_client_fills,0);
});
test('24 scans never claim experimental entries are actual Dot orders',()=>{
 const r=build24TrainingTimeline({day:'2026-10-12',
 sourceCandidates:[{symbol:'ARCHIVE'}],
 researchScans:[{decisions:[{symbol:'ARCHIVE',action:'BUY_EXPERIMENT',reason:'MOMENTUM'}]}]});
 assert.equal(r.scans.length,24);assert.equal(r.scans[0].research_buy,1);
 assert.equal(r.scans[0].actual_paper_buys,0);
 assert.equal(r.scans[23].germany_mesz_at,'01:35');
 assert.equal(r.verified_original_dot2_discoveries,0);
});
