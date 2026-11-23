import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planV24GeckoHourlySlice,interpretV24GeckoHourlyResponse,
 summarizeV24GeckoHourlySlice} from '../src/v24-gecko-neutral-hourly-queue.mjs';
const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const mint=i=>'A'.repeat(30)+alphabet[Math.floor(i/58)]+alphabet[i%58];
const retro=()=>({
 kind:'R29_V19_POSTRUN_RETROSPECTIVE_NEUTRAL_24_HOURS',
 archive_released_after_historical_test:true,
 never_eligible_to_seed_historical_discovery:true,
 never_eligible_for_entry_or_exit_quotes:true,
 original_provider_delivered_during_october_independently_verified:false,
 distinct_sample_mints:192,sampled_mint_occurrences:192,
 per_hour:Array.from({length:24},(_,hour)=>{
  const scan='2026-10-12T'+String(hour).padStart(2,'0')+':00:00.000Z';
  return {scan:hour+1,at_utc:scan,
   quote_and_sellability_status:'NOT_VERIFIED_NOT_A_TRADE_DECISION',
   postrun_neutral_mint_sample:Array.from({length:8},(_,i)=>({
    chain:'solana',mint:mint(hour*8+i),
    source_observed_at_utc:new Date(Date.parse(scan)-60_000).toISOString(),
    exact_pool:null,tradable_usdc_quote_verified:false,
    sellability_original_verified:false,
    source_provider_delivered_asof_verified:false,
    provenance:'POST_EVENT_NEUTRAL_ARCHIVE_RESEARCH_ONLY'}))
  };
 })
});
const receipt=(q,data,status=200)=>({
 url:q.url,method:'GET',http_status:status,
 captured_at_utc:'2026-11-23T21:00:00.000Z',
 raw_text:JSON.stringify(data),
 raw_sha256:createHash('sha256').update(JSON.stringify(data)).digest('hex')
});
test('24 independent hour slices cover all 192 neutral mints with 8 calls each',()=>{
 const r=retro();const batches=Array.from({length:24},(_,h)=>
  planV24GeckoHourlySlice({retrospective:r,hour:h}));
 assert.ok(batches.every(b=>b.requests.length===8&&b.http_requests_budget===8));
 assert.equal(new Set(batches.flatMap(x=>x.requests.map(y=>y.mint))).size,192);
 assert.equal(batches[0].requests[0].mint,mint(0));
 assert.equal(batches[18].requests[0].mint,mint(144));
 assert.throws(()=>planV24GeckoHourlySlice({retrospective:r,hour:24}),
  /INVALID_NEUTRAL_HOURLY_SLICE_INDEX/);
});
test('Gecko source confirms exact included token and pool, never historical trade',()=>{
 const q=planV24GeckoHourlySlice({retrospective:retro(),hour:2}).requests[0];
 const pool='B'.repeat(32);
 const response={data:[{attributes:{address:pool},relationships:{
  base_token:{data:{id:'solana_'+q.mint}},
  quote_token:{data:{id:'solana_unknown'}}
 }}],included:[{id:'solana_'+q.mint,attributes:{address:q.mint}}]};
 const r=interpretV24GeckoHourlyResponse({query:q,receipt:receipt(q,response)});
 assert.equal(r.return_pools.length,1);
 assert.equal(r.status,'NOVEMBER_CURRENT_EXACT_MINT_POOL_ASSOCIATION_ONLY');
 assert.equal(r.return_pools[0].pool,pool);
 assert.equal(r.historical_provider_delivery_proven,false);
 assert.equal(r.trade_authorized,false);
});
test('missing included mint or empty HTTP200 is UNKNOWN, never nonexistence proof',()=>{
 const q=planV24GeckoHourlySlice({retrospective:retro(),hour:0}).requests[1];
 const a=interpretV24GeckoHourlyResponse({query:q,receipt:receipt(q,{data:[]})});
 assert.equal(a.status,'HTTP200_NO_VERIFIED_IDENTITY_COVERAGE_UNKNOWN');
 const b=interpretV24GeckoHourlyResponse({query:q,
  receipt:receipt(q,{data:[{attributes:{address:'B'.repeat(32)}}]})});
 assert.equal(b.return_pools.length,0);
 assert.equal(b.rejected_no_exact_included_mint,1);
});
test('HTTP429 is retained as source failure; tampered SHA or temporal reconstruction rejected',()=>{
 const q=planV24GeckoHourlySlice({retrospective:retro(),hour:0}).requests[1];
 const limited=interpretV24GeckoHourlyResponse({query:q,receipt:receipt(q,{error:'429'},429)});
 assert.equal(limited.status,'PUBLIC_SOURCE_FAILURE_OR_RATE_LIMIT_COVERAGE_UNKNOWN');
 const x=receipt(q,{data:[]});
 assert.throws(()=>interpretV24GeckoHourlyResponse({query:q,
  receipt:{...x,raw_sha256:'f'.repeat(64)}}),/V24_INVALID_HTTP_SHA_OR_EXACT_MINT_SOURCE/);
 assert.throws(()=>interpretV24GeckoHourlyResponse({query:q,
  receipt:{...x,captured_at_utc:'2026-10-12T02:00:00.000Z'}}),
  /V24_INVALID_HTTP_SHA_OR_EXACT_MINT_SOURCE/);
});
test('eight safe research receipts yield bounded coverage and zero historically authenticated fills',()=>{
 const p=planV24GeckoHourlySlice({retrospective:retro(),hour:7});
 const a=p.requests.map(q=>interpretV24GeckoHourlyResponse({
  query:q,receipt:receipt(q,{data:[]})}));
 const result=summarizeV24GeckoHourlySlice({plan:p,observations:a});
 assert.equal(result.public_provider_requests,8);
 assert.equal(result.unknown_current_identity_mints,8);
 assert.equal(result.original_october_market_population_complete,false);
 assert.equal(result.historical_50_usdc_buy_sell_quote_count,0);
 assert.equal(result.actual_paper_orders,0);
});
