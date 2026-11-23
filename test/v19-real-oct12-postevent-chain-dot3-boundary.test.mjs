import test from 'node:test';
import assert from 'node:assert/strict';
import {R29_OCT12_CHAIN_RESEARCH_TARGETS as targets}
 from '../src/v19-october-solana-chain-research.mjs';
import {assessDot3RiskStatus} from '../src/v19-dot3-risk-status.mjs';

const candidate=(t,captured)=>({
 chain:'solana',pool:t.pool,contract:t.mint,captured_at_utc:captured,
 source_class:'POST_EVENT_NEUTRAL_ARCHIVE_RESEARCH_ONLY'});
test('actual two onchain October mint and pool IDs cannot buy using November source capture',()=>{
 for(const t of targets){
  const out=assessDot3RiskStatus({
   candidate:candidate(t,'2026-11-23T08:40:52.000Z'),
   asOfUtc:t.scan_at_utc,mode:'HISTORICAL_ASOF'});
  assert.equal(out.status,'DATA_GAP');
  assert.equal(out.reason,'POOL_CAPTURE_MISSING_STALE_OR_FUTURE');
  assert.ok(out.missing_fields.includes('FRESH_ORIGINAL_POOL_CAPTURE'));
  assert.equal(out.trade_authorized,false);
  assert.equal(out.paper_filled,false);
  assert.equal(out.original_risk_evidence_verified,false);
  assert.equal(out.issuer_authentication_verified,false);
 }
});
test('rewriting November capture as fresh October timestamp still cannot fake issuer, quote, sellability',()=>{
 for(const t of targets){
  const out=assessDot3RiskStatus({asOfUtc:t.scan_at_utc,
   mode:'HISTORICAL_ASOF',
   candidate:{
    ...candidate(t,t.scan_at_utc),
    independent_price_liquidity_ready:true,
    primary_quote_usd:0.00001,second_source_price_usd:0.00001,
    primary_liquidity_usd:100000,second_source_liquidity_usd:100000
   }});
  assert.equal(out.status,'DATA_GAP');
  assert.equal(out.reason,'MISSING_RISK_ATTESTATION');
  assert.ok(out.missing_fields.includes('SECURITY_AND_SELLABILITY_ATTESTATIONS'));
  assert.ok(out.missing_fields.includes('VERIFIED_PROVIDER_QUOTE_TIMES'));
  assert.equal(out.trade_authorized,false);
  assert.equal(out.paper_filled,false);
 }
});
test('poisoned future-winner hints are quarantined even on valid Oct12 Solana pool IDs',()=>{
 const t=targets[1];
 const out=assessDot3RiskStatus({asOfUtc:t.scan_at_utc,
  mode:'HISTORICAL_ASOF',
  candidate:{...candidate(t,'2026-10-12T17:59:59.000Z'),
   future_winner_label:'+137.71%'}});
 assert.equal(out.status,'DATA_GAP');
 assert.equal(out.reason,'POST_EVENT_INPUT_QUARANTINED');
 assert.equal(out.trade_authorized,false);
});
