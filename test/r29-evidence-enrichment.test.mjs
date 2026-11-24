import test from 'node:test';import assert from 'node:assert/strict';import {prioritizeEvidence,selectSustainedEvidencePilot,selectNextLiquidityEvidencePilot,selectActiveHistoryPilot,planStagedHistory} from '../src/r29-evidence-enrichment.mjs';
const tickUtc='2026-10-12T00:00:00Z',w={reported_buys:2,reported_sells:1,reported_quote_buy_volume:2,reported_quote_sell_volume:1,observed_mark_change_pct:3},p={pool:'p',quote_mint:'So11111111111111111111111111111111111111112',protocols:['pump.fun'],windows:{m10:w,m60:w},latest_observed_at:'2026-10-11T23:58:00Z',latest_signature:'s'};
test('retains recent one-sided and unsupported candidates, pilot uses fresh bounded history',()=>{const x=prioritizeEvidence([{mint:'m',priority:'RECENT_TWO_SIDED',pools:[p]},{mint:'z',priority:'RECENT_ONE_SIDED',pools:[]}],new Map([['m',{source_event_at_utc:'2026-10-11T23:55:00Z'}]]),{tickUtc});assert.equal(x.rows.length,2);assert.equal(x.pilot.mint,'m');assert.equal(x.rows[0].status,'PENDING_EVIDENCE');});
test('previously reviewed and future launches cannot be reused as fresh pilots',()=>{const c=[{mint:'m',priority:'RECENT_TWO_SIDED',pools:[p]}];assert.equal(prioritizeEvidence(c,new Map([['m',{source_event_at_utc:'2026-10-11T23:55:00Z'}]]),{tickUtc,excluded:['m']}).pilot,null);assert.throws(()=>prioritizeEvidence(c,new Map([['m',{source_event_at_utc:tickUtc}]]),{tickUtc}),/FUTURE/);});

test('new pilot excludes previously inspected token and prioritizes higher activity without promoting it to a buy',()=>{const p={pool:'p',two_sided:true,sol_quote_reported:true,pump_curve_reported:true,latest_signature:'s',age_seconds:90,activity:5,observed_swaps_60m:6,reported_mark_change_pct:2,priority_score:8};const rows=[{mint:'old',launch_age_seconds:240,pools:[p]},{mint:'new',launch_age_seconds:300,pools:[p]},{mint:'weak',launch_age_seconds:300,pools:[{...p,observed_swaps_60m:2}]}];const r=selectSustainedEvidencePilot(rows,{excluded:['old']});assert.equal(r.eligible_pilot_count,1);assert.equal(r.pilot.mint,'new');});

test('liquidity research priority excludes BOTH previously reviewed mints, favors less depleted reported reserve and is not risk clearance',()=>{
 const pool={pool:'p',two_sided:true,sol_quote_reported:true,pump_curve_reported:true,latest_signature:'s',age_seconds:90,activity:5,observed_swaps_60m:6,priority_score:8,latest_reported_reserve:30.01};
 const rows=[{mint:'old1',launch_age_seconds:200,pools:[{...pool,latest_reported_reserve:50}]},{mint:'old2',launch_age_seconds:200,pools:[{...pool,latest_reported_reserve:60}]},{mint:'fresh-depleted',launch_age_seconds:200,pools:[pool]},{mint:'fresh-active',launch_age_seconds:300,pools:[{...pool,latest_reported_reserve:33}]},{mint:'too-many',launch_age_seconds:300,pools:[{...pool,latest_reported_reserve:70,observed_swaps_60m:20}]}];
 const r=selectNextLiquidityEvidencePilot(rows,{excluded:['old1','old2']});
 assert.equal(r.eligible_pilot_count,2);assert.equal(r.pilot.mint,'fresh-active');assert.equal(r.ranking_is_not_buy_signal,true);assert.equal(r.reported_reserve_is_not_verified_liquidity,true);
});

test('active-history selection avoids Mayhem proxy, accepts more than seven swaps',()=>{
 const p={pool:'p',protocols:['PUMPFUN'],two_sided:true,sol_quote_reported:true,pump_curve_reported:true,latest_signature:'s',age_seconds:90,activity:20,observed_swaps_60m:50,priority_score:8,reported_quote_turnover:10};
 const rows=[{mint:'mayhem',launch_age_seconds:200,pools:[{...p,protocols:['PUMPFUN_MAYHEM'],reported_quote_turnover:1000}]},{mint:'old',launch_age_seconds:200,pools:[{...p,reported_quote_turnover:100}]},{mint:'active',launch_age_seconds:300,pools:[p]}];
 const r=selectActiveHistoryPilot(rows,{excluded:['old']});assert.equal(r.pilot.mint,'active');assert.equal(r.eligible_pilot_count,1);assert.equal(r.ranking_is_not_buy_signal,true);
});
test('staged history reuses original receipts, prioritizes boundaries and advances to middle without duplicate new calls',()=>{
 const signatures=['a','b','c','d','e','f','g','h','i','j'];
 const first=planStagedHistory(signatures,[],{budget:4});assert.deepEqual(first.newRequests,['a','j','i','h']);assert.equal(first.complete,false);
 const second=planStagedHistory(signatures,first.selected,{budget:4});assert.deepEqual(second.newRequests,['g','f','e','d']);assert.deepEqual(second.remaining,['c','b']);
 const last=planStagedHistory(signatures,second.selected,{budget:2});assert.equal(last.selected.length,10);assert.equal(new Set(last.selected).size,10);assert.equal(planStagedHistory(signatures,last.selected).complete,true);
});
