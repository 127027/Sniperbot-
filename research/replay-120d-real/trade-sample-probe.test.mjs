import test from 'node:test';
import assert from 'node:assert/strict';
import {SAMPLE_DAY,WRAPPED_SOL,sanitizeTradeRow,visibleTradeEvents,
 safeHistoricalTradeReview,probeRealFreeSample}
 from './trade-sample-probe.mjs';

const at='2026-10-15T00:01:00Z';
function event(t,side='buy',failed=false){
 return {ts:Date.parse(t)/1000,slot:457030039,idx:106,seq:0,
  venue:'curve',side,failed,
  mint:'4yssA3q3qSDvFPFb1EJQopg3xfQtyLNXG9saNEvfRoot',
  pool:null,sol_lamports:361213150,
  token_amount:2893532145701,quote_mint:WRAPPED_SOL,
  quote_amount:361213150};
}
test('real-world documented Pump.fun sample is accepted only as an event, never an executable quote',()=>{
 const r=sanitizeTradeRow(event('2026-10-15T00:00:00Z','sell'));
 assert.equal(r.at_utc,'2026-10-15T00:00:00.000Z');
 assert.equal(r.venue,'curve');
 assert.equal(r.side,'sell');
 assert.equal(r.failed,false);
 assert(r.approximate_sol_per_raw_token>0);
 assert.equal(r.historically_executable_again,false);
 assert.equal(r.independently_verified_onchain_signature,false);
});
test('future event timestamp cannot contaminate historical BUY/HOLD decision input',()=>{
 const past=sanitizeTradeRow(event('2026-10-15T00:00:00Z'));
 const future=sanitizeTradeRow(event('2026-10-15T00:02:00Z','sell'));
 const visible=visibleTradeEvents([past,future],{asof_utc:at});
 assert.equal(visible.length,1);
 assert.equal(visible[0].side,'buy');
 const review=safeHistoricalTradeReview([past,future],
  {desired_mint:past.mint,asof_utc:at});
 assert.equal(review.evidence_events,1);
 assert.equal(review.sell_events_observed,0);
 assert.equal(review.claimed_total_organic_buyers,null);
 assert.equal(review.action_for_safety_gate,'NO_TRADE_DATA_GAP');
});
test('invalid other-day trade timestamp and failed execution prohibit false fill',()=>{
 assert.throws(()=>sanitizeTradeRow(event('2026-10-16T00:00:00Z')),/OTHER_DAY/);
 const row=event('2026-10-15T00:01:00Z');
 row.failed=true;
 const r=sanitizeTradeRow(row);
 assert.equal(r.approximate_sol_per_raw_token,null);
 assert.equal(safeHistoricalTradeReview([r],{
   desired_mint:r.mint,asof_utc:'2026-10-15T00:02:00Z'}).successful_events,0);
});
test('failed on-chain transaction may have null executed values but is never counted as actual price',()=>{
 const failed=event('2026-10-15T00:00:30Z','buy',true);
 failed.sol_lamports=null;failed.token_amount=null;failed.quote_amount=null;
 const row=sanitizeTradeRow(failed);
 assert.equal(row.failed,true);
 assert.equal(row.sol_lamports,null);
 assert.equal(row.raw_token_amount,null);
 assert.equal(row.quote_amount_raw,null);
 assert.equal(row.approximate_sol_per_raw_token,null);
 const review=safeHistoricalTradeReview([row],{
  desired_mint:row.mint,asof_utc:'2026-10-15T00:01:00Z'});
 assert.equal(review.evidence_events,1);
 assert.equal(review.successful_events,0);
 assert.equal(review.buy_events_observed,0);
});
test('successful historical trade with non-SOL quote token remains valid but has no fabricated SOL or USDC price',()=>{
 const row=event('2026-10-15T00:00:00Z','sell',false);
 row.sol_lamports=null;
 row.quote_mint='33jENUQnjoitkMFpvNJcSHyLAHFWJuHwT6E3E8CNpump';
 row.quote_amount=92744223642;
 const r=sanitizeTradeRow(row);
 assert.equal(r.failed,false);
 assert.equal(r.quote_is_wrapped_SOL,false);
 assert.equal(r.sol_lamports,null);
 assert.equal(r.quote_amount_raw,92744223642);
 assert.equal(r.approximate_sol_per_raw_token,null);
 assert.equal(r.historically_executable_again,false);
});
test('free real source probe explicitly returns no fake fills and retains source checksum',async()=>{
 const first=event('2026-10-15T00:00:00Z','buy',false);
 const second=event('2026-10-15T00:01:00Z','sell',true);
 const data=JSON.stringify({rows:[{row:first},{row:second}]});
 const fetcher=async()=>({ok:true,status:200,text:async()=>data});
 const result=await probeRealFreeSample({fetcher});
 assert.equal(result.preview_rows,2);
 assert.equal(result.distinct_mints_in_preview,1);
 assert.equal(result.no_trade_fills,true);
 assert.equal(result.no_historical_GPT_model_orders,true);
 assert.equal(result.source_sample_is_first_page_not_random_or_complete,true);
 assert.equal(result.executed_rows_in_preview,1);
 assert.equal(result.failed_rows_in_preview,1);
 assert.equal(result.sha256_raw_http_response.length,64);
 assert.equal(result.asof_safe_preliminary_reviews[0].action_for_safety_gate,
 'NO_TRADE_DATA_GAP');
});
