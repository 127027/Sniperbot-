import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeTwoPoolGeckoResearchPlan,evaluateGeckoPoolAndOldCandles}
 from '../src/v19-postrun-two-pool-gecko-crosscheck.mjs';

const WSOL='So11111111111111111111111111111111111111112';
const a={scan:3,mint:'3nXL1jYC4rTL9hWnEYz1w4WkbbKceFmb5jxX7RL5pump',
 pool:'CTemNiKyDcmqrYMB2EF6fp4LcRprYm7LeCBoM14228sT'};
const b={scan:19,mint:'28FFbG2j5d5XGvyuLSdDixAgQnmN4YDZqmSVbbzJpump',
 pool:'8TgpUYKfnG2UM43rFQMV9v3XRiciAqqDSp8BgXSBcq7P'};
const report=()=>{
 const rows=Array.from({length:192},()=>({
  scan:0,mint:'',current_provider_pool_pair_count:0,current_provider_token_pairs:[]
 }));
 for(const q of [a,b]){
  rows[q.scan-1]={scan:q.scan,mint:q.mint,
   scan_at_utc:'2026-10-12T'+String(q.scan-1).padStart(2,'0')+':00:00.000Z',
   current_provider_pool_pair_count:1,
   current_provider_token_pairs:[{
     pool_address:q.pool,quote_asset_address:WSOL,
     original_october_quote_verified:false,original_october_sellability_verified:false,
     permitted_as_2026_10_12_live_quote:false}]
  };
 }
 return {kind:'R29_V19_POSTRUN_DEX_MINT_POOL_IDENTITY_RESEARCH_ONLY',
  never_eligible_to_seed_historical_discovery:true,
  never_eligible_for_entry_or_exit_quotes:true,
  current_provider_mints_with_any_pool:2,currently_reported_pool_hints:2,
  original_neutral_sample_count:192,candidate_rows:rows};
};
const mkPages=(p)=>{
 const plan=makeTwoPoolGeckoResearchPlan(p);
 return plan.map(q=>{
  const r=q.kind==='CURRENT_POOL_IDENTITY'
    ?{data:{attributes:{address:q.pool},
      relationships:{
       base_token:{data:{id:'solana_'+q.mint}},
       quote_token:{data:{id:'solana_'+WSOL}}
      }}}
    :{data:{attributes:{ohlcv_list:[
      [Math.floor(Date.parse(q.scan_at_utc)/1000)-60,1,1.2,.9,1.1,320],
      [Math.floor(Date.parse(q.scan_at_utc)/1000)+60,1,1.5,1,1.4,320]
    ]}}};
  const raw_text=JSON.stringify(r);
  return {index:q.index,url:q.url,mint:q.mint,pool:q.pool,
   kind:q.kind,http_status:200,captured_at_utc:'2026-11-23T08:30:00.000Z',
   raw_text,sha256:createHash('sha256').update(raw_text).digest('hex')};
 });
};
test('exact 2 neutral pool hints create only 4 bounded current/provider and historic candle requests',()=>{
 const queries=makeTwoPoolGeckoResearchPlan(report());
 assert.equal(queries.length,4);
 assert.deepEqual(queries.map(x=>x.kind),[
  'CURRENT_POOL_IDENTITY','RETROSPECTIVE_MINUTE_OHLCV',
  'CURRENT_POOL_IDENTITY','RETROSPECTIVE_MINUTE_OHLCV']);
 assert.ok(queries.every(x=>x.url.startsWith('https://api.geckoterminal.com/api/v2/')));
 assert.ok(queries[1].url.includes('before_timestamp='));
});
test('valid exact second provider mint+pool produces current-domain corroboration but never historic executable quotes',()=>{
 const dex=report(),pages=mkPages(dex);
 const v=evaluateGeckoPoolAndOldCandles({dexReport:dex,pages});
 assert.equal(v.currently_crossprovider_exact_pool_mint_quote_matches,2);
 assert.equal(v.postevent_candle_rows_in_two_query_windows,2);
 assert.equal(v.results[0].latest_eligible_closed_minute_candle_posthoc.minute_closed_utc,
  '2026-10-12T02:00:00.000Z');
 assert.equal(v.results[0].historical_50_usdc_buy_sell_quote_verified,false);
 assert.equal(v.safely_historical_provider_attested_candles,0);
 assert.equal(v.historically_executable_buy_quote_count,0);
 assert.equal(v.independently_authenticated_october_sellability,0);
 assert.equal(v.actual_paper_orders_created,0);
 assert.equal(v.never_eligible_for_replay_or_live_paper_orders,true);
});
test('pool id matching but wrong mint or wrong quote token is NOT a confirmed second provider identity',()=>{
 const dex=report(),pages=mkPages(dex);
 const response=JSON.parse(pages[0].raw_text);
 response.data.relationships.base_token.data.id='solana_'+'5'.repeat(42);
 pages[0].raw_text=JSON.stringify(response);
 pages[0].sha256=createHash('sha256').update(pages[0].raw_text).digest('hex');
 const r=evaluateGeckoPoolAndOldCandles({dexReport:dex,pages});
 assert.equal(r.currently_crossprovider_exact_pool_mint_quote_matches,1);
 assert.equal(r.results[0].evidence_status,'SECOND_PROVIDER_IDENTITY_NOT_CONFIRMED_OR_NOT_LISTED');
});
test('OHLCV candle that would only close AFTER virtual scan must never enter historical research window',()=>{
 const dex=report(),pages=mkPages(dex);
 const a=JSON.parse(pages[1].raw_text);
 a.data.attributes.ohlcv_list=[
  [Math.floor(Date.parse('2026-10-12T02:00:00Z')/1000),1,1.1,.9,1,10]
 ];
 pages[1].raw_text=JSON.stringify(a);
 pages[1].sha256=createHash('sha256').update(pages[1].raw_text).digest('hex');
 const v=evaluateGeckoPoolAndOldCandles({dexReport:dex,pages});
 assert.equal(v.results[0].postevent_reported_closed_candle_count,0);
 assert.equal(v.results[0].quote_status,
  'NO_VALID_CLOSED_OHLCV_IN_REQUESTED_SCAN_LOOKBACK');
});
test('missing Gecko data is DATA GAP, not evidence of historical nonexistence',()=>{
 const dex=report(),pages=mkPages(dex);
 pages[0].http_status=404;
 const v=evaluateGeckoPoolAndOldCandles({dexReport:dex,pages});
 assert.equal(v.failed_or_missing_http_responses,1);
 assert.equal(v.results[0].current_second_provider_pool_exact_mint_match,false);
 assert.equal(v.results[0].historical_50_usdc_buy_sell_quote_verified,false);
 assert.equal(v.results[1].current_second_provider_pool_exact_mint_match,true);
});
test('replayed response must have actual captured bytes, hash, timestamp and exact requested URL',()=>{
 const dex=report(),p1=mkPages(dex);
 p1[2].sha256='b'.repeat(64);
 assert.throws(()=>evaluateGeckoPoolAndOldCandles({dexReport:dex,pages:p1}),
  /UNTRUSTED_SECOND_PROVIDER_RAW_RESPONSE/);
 const p2=mkPages(dex);p2[1].captured_at_utc='2026-10-12T02:00:00.000Z';
 assert.throws(()=>evaluateGeckoPoolAndOldCandles({dexReport:dex,pages:p2}),
  /UNTRUSTED_SECOND_PROVIDER_RAW_RESPONSE/);
 const p3=mkPages(dex);p3[3].url='https://example.org/fake';
 assert.throws(()=>evaluateGeckoPoolAndOldCandles({dexReport:dex,pages:p3}),
  /UNTRUSTED_SECOND_PROVIDER_RAW_RESPONSE/);
});
test('never convert arbitrary pool research or future-winner lists into a precommitted historic lookup',()=>{
 const r=report();r.never_eligible_to_seed_historical_discovery=false;
 assert.throws(()=>makeTwoPoolGeckoResearchPlan(r),
  /UNTRUSTED_OR_NOT_PRECOMMITTED/);
 const x=report();x.current_provider_mints_with_any_pool=3;
 assert.throws(()=>makeTwoPoolGeckoResearchPlan(x),
  /UNTRUSTED_OR_NOT_PRECOMMITTED/);
});
