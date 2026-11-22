import test from 'node:test';
import assert from 'node:assert/strict';
import {makeResearchHandoff} from '../src/feed-handoff.mjs';
import {summarizeDot3RiskStatuses} from '../src/v19-dot3-risk-status.mjs';
import {planDot3EvidenceRechecks} from '../src/v19-dot3-recheck-scheduler.mjs';

const at='2026-11-22T10:00:00.000Z',pool='0x'+'b'.repeat(40),contract='0x'+'a'.repeat(40);
const source={kind:'DOT2_PUBLIC_CAPTURE_EVIDENCE',mode:'PAPER_RESEARCH_ONLY',
 captured_completed_at_utc:at,request_path:'research/requests/2026-11-22/test.json',
 gecko:{candidates:[{chain:'base',pool,contract,observed_at_utc:'2026-11-22T09:59:45.000Z',
  source_url:'https://www.geckoterminal.com/base/pools/'+pool,
  observed_price_usd:1,liquidity_usd:20000}]},
 dex_checks:[{chain:'base',pool,matched:true,
  status:'TWO_DOMAIN_INDICATIVE_RESEARCH_ONLY',
  dexscreener_price_usd:1.01,dexscreener_liquidity_usd:21000,
  price_divergence_pct:.995,checked_at_utc:'2026-11-22T09:59:46.000Z'}],
 dex_fallback_candidates:[]};
test('existing Dot2 handoff has two time-labeled sources and NO invented provider quote as-of',()=>{
 const h=makeResearchHandoff({evidence:source,atUtc:at}),row=h.candidates[0];
 assert.equal(row.source_observations.length,2);
 assert.ok(row.source_observations.every(x=>x.provider_quote_asof_utc===null));
 assert.ok(row.source_observations.every(x=>x.source_archive_blob_sha===null));
 const risk=summarizeDot3RiskStatuses({handoff:h,asOfUtc:at});
 assert.equal(risk.candidates[0].source_pair_audit.status,'TWO_DOMAIN_INDICATIVE_ONLY');
 assert.equal(risk.candidates[0].source_pair_audit.real_upstream_independence_proven,false);
 assert.equal(risk.counts.DATA_GAP,1);
 assert.equal(risk.order_authorized_count,0);
});
test('Dot3 recheck preserves upstream gap, even when prices from two domains agree',()=>{
 const h=makeResearchHandoff({evidence:source,atUtc:at});
 const recheck=planDot3EvidenceRechecks({handoff:h,asOfUtc:at,maxRequests:1});
 assert.equal(recheck.selected_count,1);
 assert.equal(recheck.selected[0].next_action,'VERIFY_UPSTREAM_PROVIDER_TIMES_SELLABILITY');
 assert.ok(recheck.selected[0].missing_fields.includes('PROVIDER_UPSTREAM_INDEPENDENCE_NOT_VERIFIED'));
 assert.ok(recheck.selected[0].missing_fields.includes('INDEPENDENT_PROVIDER_QUOTE_TIME_NOT_VERIFIED'));
 assert.equal(recheck.actual_paper_orders,0);
});
test('replayed source time cannot be backdated into prior historical as-of',()=>{
 const h=makeResearchHandoff({evidence:source,atUtc:at});
 const prev=summarizeDot3RiskStatuses({handoff:h,asOfUtc:'2026-11-22T09:58:00.000Z'});
 assert.equal(prev.candidates[0].status,'DATA_GAP');
 assert.equal(prev.order_authorized_count,0);
});
