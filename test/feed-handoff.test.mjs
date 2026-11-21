import test from 'node:test';
import assert from 'node:assert/strict';
import {makeResearchHandoff} from '../src/feed-handoff.mjs';
const p='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',c='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const t='2026-11-21T17:03:50Z';
const evidence={kind:'DOT2_PUBLIC_CAPTURE_EVIDENCE',mode:'PAPER_RESEARCH_ONLY',
 request_path:'research/requests/2026-11-21/example.json',
 captured_completed_at_utc:t,
 gecko:{candidates:[{chain:'base',pool:p,contract:c,symbol:'A',observed_at_utc:t,
   observed_price_usd:0.001,liquidity_usd:12000}]},
 dex_checks:[{chain:'base',pool:p,matched:true,status:'TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY',
 dexscreener_price_usd:0.00101,dexscreener_liquidity_usd:13000,price_divergence_pct:0.995,
 checked_at_utc:t}],dex_fallback_candidates:[]};
test('two-domain price agreement moves to risk review, not automatic BUY',()=>{
 const r=makeResearchHandoff({evidence,atUtc:'2026-11-21T17:04:00Z'});
 assert.equal(r.counts.independently_quote_matched,1);
 assert.equal(r.candidates[0].BUY_AUTHORIZED,false);
 assert.equal(r.counts.trade_eligible,0);
});
test('only one DEX source can recover contract but cannot become two provider quote',()=>{
 const r=makeResearchHandoff({evidence:{...evidence,gecko:{candidates:[]},dex_checks:[],
 dex_fallback_candidates:[{chain:'base',pool:p,contract:c,symbol:'A',observed_at_utc:t}]},atUtc:'2026-11-21T17:04:00Z'});
 assert.equal(r.counts.full_contracts,1);
 assert.equal(r.counts.independently_quote_matched,0);
 assert.equal(r.candidates[0].research_level,'SINGLE_PROVIDER_CONTRACT_ONLY');
});
test('stale or future evidence never enters live risk eligibility',()=>{
 const later=makeResearchHandoff({evidence,atUtc:'2026-11-21T17:25:00Z'});
 assert.equal(later.live_capture_fresh,false);
 assert.equal(later.candidates[0].qualified_for_risk_review,false);
 const before=makeResearchHandoff({evidence,atUtc:'2026-11-21T17:02:00Z'});
 assert.equal(before.counts.risk_review_candidates,0);
});
test('duplicate same pool never counted twice',()=>{
 const r=makeResearchHandoff({evidence:{...evidence,dex_fallback_candidates:[{chain:'base',pool:p,contract:c}]},
 atUtc:'2026-11-21T17:04:00Z'});
 assert.equal(r.counts.unique_pools,1);
});
