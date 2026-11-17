import test from 'node:test';
import assert from 'node:assert/strict';
import {auditUnknownWinnerAfterFreeze} from './r29-postfreeze-unknown-winner-audit.mjs';
const T='2026-09-01T00:00:00.000Z';
const freeze='2026-09-02T00:00:00.000Z';
const next=iso=>new Date(Date.parse(T)+iso*60000).toISOString();
const sample=()=>({
 chain_contract_id:'solana:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 source_first_available_at_utc:T,
 technical_scanner_observed:true,
 decisions:[{action:'BUY',at_utc:next(30),source_asof_utc:next(15),
   model_response_id:'resp_syntheticFixture_123456789',
   actual_gpt_call_externally_attested:true,
   independent_paper_fill_evidence_verified:false}],
 price_observations:[{observed_at_utc:next(0),price_usd:1,
   independently_verified:true,bidirectional_executable_quote_verified:false},
  {observed_at_utc:next(30),price_usd:1.2,
   independently_verified:true,bidirectional_executable_quote_verified:false},
  {observed_at_utc:next(120),price_usd:5.0,
   independently_verified:true,bidirectional_executable_quote_verified:false}]
});
test('post-freeze only metrics show pre-buy rise and remaining upside but NEVER scanner-hit => true trade',()=>{
 const result=auditUnknownWinnerAfterFreeze(sample(),{freeze_at_utc:freeze});
 assert.equal(result.technical_scanner_observed,true);
 assert.equal(result.actual_GPT_early_signal_independently_proven,false);
 assert.equal(result.price_rise_already_seen_before_buy_multiplier,1.2);
 assert(Math.abs(result.remaining_observed_peak_after_buy_multiplier-5/1.2)<1e-8);
 assert.equal(result.realized_net_pnl_test_usdc,null);
 assert.match(result.pnl_status,/UNVERIFIED/);
});
test('Genuine model response cannot be after the sealed decision time',()=>{
 const c=sample();c.decisions[0].at_utc=next(1500);
 assert.throws(()=>auditUnknownWinnerAfterFreeze(c,{freeze_at_utc:freeze}),/GPT_TIMELINE/);
});
test('model cannot cite a future source event even with a valid response ID',()=>{
 const c=sample();c.decisions[0].source_asof_utc=next(90);
 assert.throws(()=>auditUnknownWinnerAfterFreeze(c,{freeze_at_utc:freeze}),/GPT_TIMELINE/);
});
test('even DECLARED buy/sell/quotes/fees cannot become verified realized PnL without external receipts',()=>{
 const c=sample();c.price_observations[1].bidirectional_executable_quote_verified=true;
 c.price_observations.push({observed_at_utc:next(60),price_usd:1.5,
  independently_verified:true,bidirectional_executable_quote_verified:true});
 c.decisions[0].independent_paper_fill_evidence_verified=true;
 c.decisions[0].paper_buy_fill_usdc=100;
 c.decisions.push({action:'SELL',at_utc:next(60),source_asof_utc:next(59),
  model_response_id:'resp_syntheticFixture_123456790',
  actual_gpt_call_externally_attested:true,
  independent_paper_fill_evidence_verified:true,
  paper_sell_proceeds_usdc:125,total_fees_usdc:3});
 const x=auditUnknownWinnerAfterFreeze(c,{freeze_at_utc:freeze});
 assert.equal(x.declared_net_pnl_if_external_fills_verified_test_usdc,22);
 assert.equal(x.realized_net_pnl_test_usdc,null);
 assert.match(x.pnl_status,/DECLARED_RECEIPTS/);
});
test('price claims without independently verified time-series remain UNKNOWN, not zero',()=>{
 const c=sample();for(const x of c.price_observations)x.independently_verified=false;
 const result=auditUnknownWinnerAfterFreeze(c,{freeze_at_utc:freeze});
 assert.equal(result.price_rise_already_seen_before_buy_multiplier,null);
 assert.equal(result.remaining_observed_peak_after_buy_multiplier,null);
});
