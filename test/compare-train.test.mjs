import test from 'node:test';
import assert from 'node:assert/strict';
import {compareTrain} from '../src/compare-train.mjs';
const old={scans:24,historical_pool_tapes:[{}],strategies:[{preset:'exploratory',buy_experiments:2,sell_experiments:1,realized_model_pnl:-5}]};
const newReplay={scans:24,source_eligible_pool_tapes:1,model_experiments:{exploratory:{counts:{buys:2,sells:1},hypothetical_realized_test_usdc:50}}};
test('current cloud full-contract gains not confused with historical profit',()=>{
 const r=compareTrain({oldReplay:old,newReplay,dot2:{updated_at_utc:'2026-11-21T17:20:00Z',
 candidates:[{chain:'bsc',contract:'0x'+'a'.repeat(40)}],feed_evidence_path:'evidence'},
 feed:{evidence_path:'evidence',handoff_counts:{full_contracts:1,independently_quote_matched:0}},
 dot3:{updated_at_utc:'2026-11-21T16:20:00Z',counts:{ELIGIBLE:0}},index:{orders:[]}});
 assert.equal(r.current_cloud_dot2.current_full_contracts,1);
 assert.equal(r.current_cloud_dot2.actual_feed_consumed,true);
 assert.equal(r.role_chain.dot3_after_current_dot2,false);
 assert.equal(r.model_research_only[0].performance_delta_valid,false);
 assert.equal(r.historical_actual_dot_orders,0);
});
test('must refuse 4-only incomplete replay',()=>assert.throws(()=>compareTrain({oldReplay:{scans:4},newReplay}),/24_SCANS/));
