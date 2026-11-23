import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {flattenNeutralMintSample,makeCurrentDexTokenBatches,
 evaluatePostrunDexMintPools} from '../src/v19-postrun-solana-mint-pool-lookup.mjs';

const abc='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const mint=i=>'2'.repeat(30)+abc[i%abc.length]+abc[Math.floor(i/abc.length)%abc.length];
const source=(id)=>({chain:'solana',mint:id,exact_pool:null,
 source_observed_at_utc:'2026-10-11T23:59:30.000Z',
 tradable_usdc_quote_verified:false,sellability_original_verified:false,
 provenance:'POST_EVENT_NEUTRAL_ARCHIVE_RESEARCH_ONLY'});
const overlay=()=>{
 const h=Array.from({length:24},(_,i)=>({
  scan:i+1,at_utc:'2026-10-12T'+String(i).padStart(2,'0')+':00:00.000Z',
  postrun_neutral_mint_sample:Array.from({length:8},(_,j)=>
   ({...source(mint(i*8+j)),
    source_observed_at_utc:new Date(Date.parse('2026-10-12T00:00:00.000Z')
     +i*3600000-30000).toISOString()}))
 }));
 return {kind:'R29_V19_POSTRUN_RETROSPECTIVE_NEUTRAL_24_HOURS',
  date:'2026-10-12',archive_released_after_historical_test:true,
  never_eligible_to_seed_historical_discovery:true,
  never_eligible_for_entry_or_exit_quotes:true,per_hour:h};
};
const page=(b,rows=[],status=200)=>{const raw_text=JSON.stringify(rows);
 return {index:b.index,url:b.url,mints:b.mints,
  http_status:status,content_type:'application/json',
  captured_at_utc:'2026-11-23T08:15:00.000Z',
  raw_text,sha256:createHash('sha256').update(raw_text).digest('hex')};};
const pair=(base,other,pool,created)=>({
 chainId:'solana',dexId:'raydium',pairAddress:pool,
 baseToken:{address:base},quoteToken:{address:other},
 pairCreatedAt:created,priceUsd:'123456789',liquidity:{usd:99999999},
 // Live prices and liquidity are NOT historical values.
});
const make=()=>{const sample=flattenNeutralMintSample(overlay());
 const batches=makeCurrentDexTokenBatches(sample);
 return {sample,batches,pages:batches.map(x=>page(x))};};
test('192 distinct neutral mints produce exactly seven bounded public source calls',()=>{
 const {sample,batches}=make();
 assert.equal(sample.length,192);assert.equal(batches.length,7);
 assert.ok(batches.every(x=>x.mints.length<=30&&x.url.startsWith(
  'https://api.dexscreener.com/tokens/v1/solana/')));
 assert.equal(batches.reduce((n,x)=>n+x.mints.length,0),192);
});
test('mint-token pool identity is a current postrun hint, not historical BUY or SELL evidence',()=>{
 const {sample,pages}=make(),pool='3'.repeat(42),other='5'.repeat(42);
 pages[0]=page(makeCurrentDexTokenBatches(sample)[0],[
   pair(sample[0].mint,other,pool,Date.parse('2026-10-11T22:00:00Z'))
 ]);
 const x=evaluatePostrunDexMintPools({neutralMintRows:sample,providerPages:pages});
 assert.equal(x.current_provider_request_count,7);
 assert.equal(x.current_provider_mints_with_any_pool,1);
 assert.equal(x.currently_reported_pool_hints,1);
 assert.equal(x.sample_mints_with_provider_reported_pool_before_their_scan,1);
 assert.equal(x.candidate_rows[0].current_provider_token_pairs[0].pool_address,pool);
 assert.equal(x.candidate_rows[0].current_provider_token_pairs[0].price_usd_asof_october,null);
 assert.equal(x.candidate_rows[0].current_provider_token_pairs[0].permitted_as_2026_10_12_live_quote,false);
 assert.equal(x.candidate_rows[0].candidate_price_usd,undefined);
 assert.equal(x.historically_executable_buy_sell_price_quotes_proven,0);
 assert.equal(x.independent_historical_solana_sellability_verified,0);
 assert.equal(x.original_october_gpt_decisions_proven,0);
 assert.equal(x.not_an_order_or_trade_authorization,true);
});
test('pool appearing after sample scan cannot pretend to have existed at historical scan',()=>{
 const {sample,batches,pages}=make();
 pages[0]=page(batches[0],[pair(sample[0].mint,'5'.repeat(42),
 '3'.repeat(42),Date.parse('2026-10-12T05:00:00.000Z'))]);
 const x=evaluatePostrunDexMintPools({neutralMintRows:sample,providerPages:pages});
 assert.equal(x.candidate_rows[0].current_provider_token_pairs[0].relation_to_historical_scan,
  'CURRENT_PROVIDER_REPORTS_CREATED_AFTER_SCAN');
 assert.equal(x.candidate_rows[0].simulatable_historical_buy_sell,false);
});
test('wrong mint, chain and malformed pool do not establish identity',()=>{
 const {sample,batches,pages}=make();
 pages[0]=page(batches[0],[
  pair('8'.repeat(42),'6'.repeat(42),'3'.repeat(42),
   Date.parse('2026-10-11T23:00:00.000Z')),
  {...pair(sample[0].mint,'5'.repeat(42),'3'.repeat(42),null),chainId:'base'},
  pair(sample[0].mint,'5'.repeat(42),'0BAD',null)
 ]);
 const x=evaluatePostrunDexMintPools({neutralMintRows:sample,providerPages:pages});
 assert.equal(x.current_provider_mints_with_any_pool,0);
 assert.equal(x.invalid_or_mismatched_provider_pairs_rejected,3);
 assert.equal(x.candidate_rows[0].historical_pool_identity_status,
  'NO_POOL_REPORTED_IN_CURRENT_PROVIDER_RESPONSE_NOT_HISTORIC_ABSENCE');
});
test('provider HTTP 429 affects ONLY the 30 mints in the failed batch',()=>{
 const {sample,batches,pages}=make();
 pages[0]=page(batches[0],{error:'429'},429);
 const x=evaluatePostrunDexMintPools({neutralMintRows:sample,providerPages:pages});
 assert.equal(x.failed_or_invalid_source_batches,1);
 assert.equal(x.candidate_rows[0].historical_pool_identity_status,
  'PARTIAL_SOURCE_CAPTURE_CANNOT_DECLARE_ABSENT');
 assert.equal(x.candidate_rows[30].historical_pool_identity_status,
  'NO_POOL_REPORTED_IN_CURRENT_PROVIDER_RESPONSE_NOT_HISTORIC_ABSENCE');
});
test('raw bytes and UTC receipt must match exact provider request and hash',()=>{
 const {sample,pages}=make();
 const x=structuredClone(pages);x[0].sha256='a'.repeat(64);
 assert.throws(()=>evaluatePostrunDexMintPools({neutralMintRows:sample,providerPages:x}),
  /UNPINNED_OR_FUTURE_PROVIDER_BATCH/);
 const y=structuredClone(pages);y[0].captured_at_utc='2026-10-11T23:00:00.000Z';
 assert.throws(()=>evaluatePostrunDexMintPools({neutralMintRows:sample,providerPages:y}),
  /UNPINNED_OR_FUTURE_PROVIDER_BATCH/);
 const z=structuredClone(pages);z[0].mints.reverse();
 assert.throws(()=>evaluatePostrunDexMintPools({neutralMintRows:sample,providerPages:z}),
  /UNPINNED_OR_FUTURE_PROVIDER_BATCH/);
});
test('malicious future-oracle data cannot be promoted to a pre-Oct12 source',()=>{
 const x=overlay();
 x.per_hour[0].postrun_neutral_mint_sample[0].tradable_usdc_quote_verified=true;
 assert.throws(()=>flattenNeutralMintSample(x),/UNSAFE_OR_DUPLICATED_RETRO_MINT/);
 const y=overlay();
 y.per_hour[1].postrun_neutral_mint_sample[0].source_observed_at_utc='2026-10-12T04:00:00.000Z';
 assert.throws(()=>flattenNeutralMintSample(y),/UNSAFE_OR_DUPLICATED_RETRO_MINT/);
});
