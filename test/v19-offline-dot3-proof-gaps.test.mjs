import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditOfflineDot3TrustAndSellability} from '../src/v19-offline-risk-verification-gaps.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const path='research/feeds/2026-11-22/45057658912/';
test('D3-04/05: all 79 actual Dot2 candidates retain provider and onchain proof gaps, no fake issuer',async()=>{
 const [handoff,riskPreview]=await Promise.all([
  read(path+'dot2-to-dot3-handoff.json'),
  read(path+'dot3-research-risk-status-preview.json')]);
 const a=auditOfflineDot3TrustAndSellability({handoff,riskPreview,
  asOfUtc:'2026-11-22T19:44:00.000Z'});
 assert.equal(a.source_unchanged_archived_handoff_count,79);
 assert.equal(a.paired_with_risk_model_count,79);
 assert.equal(a.missing_risk_model_entries.length,0);
 assert.equal(a.independent_dot3_issuer_verifications_completed,0);
 assert.equal(a.unverified_sellability_count,79);
 assert.equal(a.orders_authorized,0);
 assert.equal(a.onchain_sells_or_simulations_executed,0);
 assert.equal(a.actual_paper_client_fills,0);
 assert.ok(a.rows.every(r=>r.risk_attestation_signature_verified===false
  &&r.actual_onchain_sell_route_verified===false
  &&r.paper_order_authorized===false));
 const altered=structuredClone(handoff);
 altered.candidates[0].captured_at_utc='2026-11-24T00:00:00.000Z';
 assert.throws(()=>auditOfflineDot3TrustAndSellability({
  handoff:altered,riskPreview,asOfUtc:'2026-11-22T19:44:00.000Z'}),
  /UNTRUSTED_FUTURE_OR_PRETEND_CLIENT_RISK_STATUS/);
});
test('D3-04/05: a forged locally marked PAPER_ELIGIBLE is never silently trusted',async()=>{
 const [handoff,riskPreview]=await Promise.all([
  read(path+'dot2-to-dot3-handoff.json'),
  read(path+'dot3-research-risk-status-preview.json')]);
 const spoof=structuredClone(riskPreview);
 spoof.candidates[0].trade_authorized=true;
 assert.throws(()=>auditOfflineDot3TrustAndSellability({
  handoff,riskPreview:spoof,asOfUtc:'2026-11-22T19:44:00.000Z'}),
  /UNTRUSTED_FUTURE_OR_PRETEND_CLIENT_RISK_STATUS/);
});
