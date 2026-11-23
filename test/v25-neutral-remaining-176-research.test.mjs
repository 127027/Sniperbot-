import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planV25NeutralRemaining176,reconcileV25NeutralResearch}
 from '../src/v25-neutral-remaining-176-research.mjs';
import {interpretV24GeckoHourlyResponse,deferV24AfterRateLimit}
 from '../src/v24-gecko-neutral-hourly-queue.mjs';

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
 captured_at_utc:'2026-11-23T21:30:00.000Z',
 raw_text:JSON.stringify(data),
 raw_sha256:createHash('sha256').update(JSON.stringify(data)).digest('hex')
});
test('exactly the remaining 176 mints, 22 hours and zero previously completed 02/18 pools',()=>{
 const p=planV25NeutralRemaining176({retrospective:retro()});
 assert.equal(p.requests.length,176);
 assert.equal(p.hour_indices.length,22);
 assert.equal(p.requests[0].sample_hour_index,0);
 assert.equal(p.requests.at(-1).sample_hour_index,23);
 assert.equal(new Set(p.requests.map(q=>q.mint)).size,176);
 assert.equal(p.requests.some(q=>[2,18].includes(q.sample_hour_index)),false);
 assert.equal(p.requests.every(q=>q.source_class==='POST_EVENT_NEUTRAL_RESEARCH_ONLY'),true);
 assert.equal(p.no_winner_reference_seed,true);
});
test('first 200 valid Gecko source becomes a current pool observation, never Oct knowledge',()=>{
 const plan=planV25NeutralRemaining176({retrospective:retro()});
 const query=plan.requests[0],pool='B'.repeat(32);
 const data={data:[{attributes:{address:pool},relationships:{
  base_token:{data:{id:'solana_'+query.mint}}
 }}],included:[{id:'solana_'+query.mint,attributes:{address:query.mint}}]};
 const r=interpretV24GeckoHourlyResponse({query,receipt:receipt(query,data)});
 const report=reconcileV25NeutralResearch({plan,
  results:[{...r,row_index:query.row_index}]});
 assert.equal(report.actual_public_http_requests,1);
 assert.equal(report.additional_mints_with_current_exact_pool,1);
 assert.equal(report.combined_current_exact_mint_pool_mints,17);
 assert.equal(report.unattempted_mints,175);
 assert.equal(report.original_october_discovery_proven,0);
 assert.equal(report.historical_tradeable_buy_sell_quotes_verified,0);
 assert.equal(report.winner_oracle_used,false);
});
test('429 and deferred unattempted are not false negative historical pools',()=>{
 const p=planV25NeutralRemaining176({retrospective:retro()});
 const [q1,q2]=p.requests;
 const denied=interpretV24GeckoHourlyResponse({query:q1,
  receipt:receipt(q1,{error:'429'},429)});
 const deferred=deferV24AfterRateLimit({query:q2});
 const r=reconcileV25NeutralResearch({plan:p,results:[
  {...denied,row_index:q1.row_index},
  {...deferred,row_index:q2.row_index}]});
 assert.equal(r.actual_public_http_requests,1);
 assert.equal(r.provider_rate_limit_http429_or_503,1);
 assert.equal(r.unattempted_mints,174);
 assert.equal(r.missing_source_does_not_prove_nonexistence,true);
});
test('reject duplicate provider source receipt and future/winner manifest',()=>{
 const p=planV25NeutralRemaining176({retrospective:retro()});
 const q=p.requests[0],r=interpretV24GeckoHourlyResponse({query:q,
  receipt:receipt(q,{data:[]})});
 assert.throws(()=>reconcileV25NeutralResearch({plan:p,results:[
  {...r,row_index:0},{...r,row_index:0}]}),/V25_UNTRUSTED_OR_DUPLICATE_RESEARCH_ROW/);
 const wrong=retro();wrong.never_eligible_to_seed_historical_discovery=false;
 assert.throws(()=>planV25NeutralRemaining176({retrospective:wrong}),
  /V25_FORBID_NON_NEUTRAL_ORIGINAL_OCTOBER_REPLAY/);
});
