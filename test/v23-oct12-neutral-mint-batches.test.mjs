import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeV23NeutralBatches,assessV23DexBatch,
 summarizeV23NeutralBatchFindings} from '../src/v23-oct12-neutral-mint-batches.mjs';
const ABC='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const addr=(i,prefix='A')=>prefix.repeat(30)+ABC[Math.floor(i/ABC.length)]+ABC[i%ABC.length];
const at=h=>'2026-10-12T'+String(h).padStart(2,'0')+':00:00.000Z';
const retro=()=>({
 schema:1,kind:'R29_V19_POSTRUN_RETROSPECTIVE_NEUTRAL_24_HOURS',
 date:'2026-10-12',archive_released_after_historical_test:true,
 never_eligible_to_seed_historical_discovery:true,
 never_eligible_for_entry_or_exit_quotes:true,
 original_provider_delivered_during_october_independently_verified:false,
 distinct_sample_mints:192,sampled_mint_occurrences:192,
 per_hour:Array.from({length:24},(_,h)=>({
  scan:h+1,at_utc:at(h),
  quote_and_sellability_status:'NOT_VERIFIED_NOT_A_TRADE_DECISION',
  postrun_neutral_mint_sample:Array.from({length:8},(_,k)=>({
   chain:'solana',mint:addr(h*8+k),
   source_observed_at_utc:new Date(Date.parse(at(h))-60_000).toISOString(),
   exact_pool:null,tradable_usdc_quote_verified:false,
   sellability_original_verified:false,
   source_provider_delivered_asof_verified:false,
   provenance:'POST_EVENT_NEUTRAL_ARCHIVE_RESEARCH_ONLY'
  }))
 }))
});
const receipt=(batch,items,status=200)=>({
 endpoint:batch.url,http_method:'GET',http_status:status,
 captured_at_utc:'2026-11-23T21:15:00.000Z',
 raw_text:JSON.stringify(items),
 raw_sha256:createHash('sha256').update(JSON.stringify(items)).digest('hex')
});
test('all 192 neutral historical sample mints are covered exactly once with 7 public batches',()=>{
 const p=makeV23NeutralBatches({retrospective:retro()});
 assert.equal(p.unique_mints,192);
 assert.equal(p.request_count,7);
 assert.deepEqual(p.requests.map(x=>x.mints.length),[30,30,30,30,30,30,12]);
 assert.equal(new Set(p.requests.flatMap(x=>x.mints)).size,192);
 assert.ok(p.requests.every(x=>x.url.startsWith(
  'https://api.dexscreener.com/tokens/v1/solana/')));
 assert.equal(p.no_winner_oracle_input,true);
});
test('postevent provider response only maps exact token to real-format pool ID and never admits price',()=>{
 const p=makeV23NeutralBatches({retrospective:retro()});
 const b=p.requests[0],pool=addr(199,'B');
 const rows=[
  {chainId:'solana',pairAddress:pool,baseToken:{address:b.mints[0]},
   quoteToken:{address:addr(198,'C')},priceUsd:'999',
   liquidity:{usd:12000},pairCreatedAt:Date.parse('2026-10-12T01:00:00Z')},
  {chainId:'solana',pairAddress:pool,baseToken:{address:b.mints[0]},
   quoteToken:{address:addr(198,'C')}},
  {chainId:'bsc',pairAddress:pool,baseToken:{address:b.mints[1]}},
  {chainId:'solana',pairAddress:addr(201,'B'),baseToken:{address:addr(100,'Z')}}
 ];
 const o=assessV23DexBatch({batch:b,receipt:receipt(b,rows)});
 assert.equal(o.matched_count,1);
 assert.equal(o.pools.length,1);
 assert.equal(o.rejected_rows,2);
 assert.equal(o.pools[0].mint,b.mints[0]);
 assert.equal(o.pools[0].pool,pool);
 assert.equal(o.pools[0].retrospective_provider_reported_pool_created_at_utc,
  '2026-10-12T01:00:00.000Z');
 assert.equal(o.pools[0].independent_historical_buy_quote_verified,false);
 assert.equal(o.pools[0].paper_trade_authorized,false);
 assert.equal('priceUsd' in o.pools[0],false);
 assert.equal('liquidity' in o.pools[0],false);
});
test('reject wrong URLs, forged sha, October-dated provider capture and future-altered manifest',()=>{
 const p=makeV23NeutralBatches({retrospective:retro()}),b=p.requests[0];
 const good=receipt(b,[]);
 assert.throws(()=>assessV23DexBatch({batch:b,receipt:{...good,
  raw_sha256:'0'.repeat(64)}}),/INVALID_PROVIDER_OR_RAW_RECEIPT/);
 assert.throws(()=>assessV23DexBatch({batch:b,receipt:{...good,
  captured_at_utc:'2026-10-12T00:00:00.000Z'}}),/INVALID_PROVIDER_OR_RAW_RECEIPT/);
 assert.throws(()=>assessV23DexBatch({batch:{...b,url:'https://evil.test'},
  receipt:good}),/INVALID_PROVIDER_OR_RAW_RECEIPT/);
 const fake=retro();
 fake.per_hour[0].postrun_neutral_mint_sample[0].mint='invalid!!';
 assert.throws(()=>makeV23NeutralBatches({retrospective:fake}),
  /SAMPLE_IDENTITY_OR_DEDUP/);
 const fake2=retro();fake2.never_eligible_to_seed_historical_discovery=false;
 assert.throws(()=>makeV23NeutralBatches({retrospective:fake2}),
  /NEUTRAL_INPUT_NOT_PINNED_192/);
});
test('returns HTTP429 as incomplete source coverage instead of falsifying no market activity',()=>{
 const p=makeV23NeutralBatches({retrospective:retro()});
 const b=p.requests[0],q=assessV23DexBatch({batch:b,
  receipt:receipt(b,{error:'rate limit'},429)});
 assert.equal(q.status,'PUBLIC_HTTP_DATA_GAP');
 assert.equal(q.matched_count,0);
 assert.equal(q.historical_trade_eligibility_proven,false);
});
test('seven source receipts produce postrun neutral pool identity coverage, never a historical buy',()=>{
 const p=makeV23NeutralBatches({retrospective:retro()});
 const assessments=p.requests.map((b,i)=>assessV23DexBatch({
  batch:b,receipt:receipt(b,
   i===0?[{chainId:'solana',pairAddress:addr(180,'B'),
      baseToken:{address:b.mints[0]},quoteToken:{address:addr(190,'C')}}]:[])
 }));
 const result=summarizeV23NeutralBatchFindings({plan:p,assessments});
 assert.equal(result.provider_http_requests,7);
 assert.equal(result.provider_http200,7);
 assert.equal(result.matched_neutral_mints,1);
 assert.equal(result.unmatched_neutral_mints,191);
 assert.equal(result.matched_exact_mint_pool_pairs,1);
 assert.equal(result.historical_original_discovery_evidence_added,0);
 assert.equal(result.contemporaneous_october_tradeable_buy_sell_quote_pairs,0);
 assert.equal(result.historical_replay_or_live_trade_authorized,false);
 assert.equal(result.winner_reference_oracle_accessed,false);
});
