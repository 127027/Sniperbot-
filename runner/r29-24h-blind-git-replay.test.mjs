import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {asofReplay24h,renderMarkdown,archiveActions} from './r29-24h-blind-git-replay.mjs';

const start='2026-11-19T20:48:09.000Z',end='2026-11-20T20:48:09.000Z';
const token='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40);
const id='base:'+token+':'+pool;
const snap=(commit,at,price,candidateOverrides={},coverage=[])=>({
 commit_sha:commit.repeat(40),committed_at_utc:at,
 snapshot:{
  schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
  published_at_utc:new Date(Date.parse(at)-2000).toISOString(),
  candidates:[{chain:'base',token_address:token,pool_address:pool,candidate_id:id,
   price_usd:price,liquidity_usd:16000,verification:'CROSS_PROVIDER_IDENTITY',
   source:'GECKOTERMINAL_NEW_POOLS',
   observed_at_utc:new Date(Date.parse(at)-2000).toISOString(),
   ...candidateOverrides}],
  coverage,summary:{omitted_by_per_chain_cap:3}
 }
});
const one='2026-11-19T21:00:00.000Z',two='2026-11-19T22:00:00.000Z',three='2026-11-20T01:00:00.000Z';
test('replays every valid observation AS OF Git commit, then calculates hindsight without trading',()=>{
 const r=asofReplay24h({startUtc:start,endUtc:end,snapshots:[
  snap('a',one,.01),snap('b',two,.035),
  snap('c',three,.015),
 ],stake:50,budget:5000});
 assert.equal(r.snapshot_commits_loaded,3);
 assert.equal(r.unique_chain_token_pools,1);
 assert.equal(r.pools_with_multiple_price_samples,1);
 assert.equal(r.first_to_peak_observed_over_100_pct,1);
 assert.equal(r.top_first_to_peak_movers[0].first_to_later_peak_pct,250);
 assert.equal(r.top_first_to_peak_movers[0].theoretical_50_first_to_peak_end,175);
 assert.equal(r.strict_replay_virtual_buy_count,0);
 assert.equal(r.strict_replay_virtual_sell_count,0);
 assert.equal(r.user_paper_account_changed,false);
 assert.equal(r.network_requests,0);
 assert.equal(r.model_inference_calls,0);
 assert.equal(r.top_first_to_peak_movers[0].actual_entry_verified,false);
 assert.equal(r.top_first_to_peak_movers[0].actual_exit_verified,false);
 assert.equal(r.market_observations[0].candidate_ids,undefined,'future winner identities must not leak into output replay states');
 assert.match(renderMarkdown(r),/KEINE Live-Trades/);
});
test('future-dated observations, mismatched identities, and untrusted snapshots never appear in market replay',()=>{
 const x=snap('a',one,.01,{candidate_id:'base:other:wrong'});
 const ahead=snap('b',two,.07,{observed_at_utc:three});
 const broken=snap('c',three,.2);
 broken.snapshot.paper_only=false;
 const r=asofReplay24h({startUtc:start,endUtc:end,snapshots:[x,ahead,broken]});
 assert.equal(r.snapshot_commits_loaded,2);
 assert.equal(r.candidate_rows_with_identity_and_price,0);
 assert.equal(r.unique_chain_token_pools,0);
 assert.equal(r.first_to_peak_observed_over_100_pct,0);
 assert.equal(r.snapshots_rejected.INVALID_OR_OUT_OF_WINDOW_SNAPSHOT,1);
 assert.equal(r.snapshots_rejected.INVALID_IDENTITY_OR_PRICE,2);
});
test('bad timestamps and out-of-window commits cannot backdate future pumps',()=>{
 const past=snap('a','2026-11-19T20:30:00.000Z',.01);
 const last=snap('b','2026-11-20T21:40:00.000Z',100);
 const honest=snap('c',two,.01);
 const r=asofReplay24h({startUtc:start,endUtc:end,snapshots:[past,honest,last]});
 assert.equal(r.snapshot_commits_loaded,1);
 assert.equal(r.unique_chain_token_pools,1);
 assert.equal(r.first_to_peak_observed_over_100_pct,0);
});
test('429 statuses count data gaps but never cause invented fills',()=>{
 const r=asofReplay24h({startUtc:start,endUtc:end,snapshots:[
  snap('a',one,.01,{},[{status:'HTTP_429_RATE_LIMIT',chain:'base',source:'GT'}]),
  snap('b',two,.031,{},[{status:'RATE_LIMITED',chain:'base',source:'DS'}])
 ]});
 assert.equal(r.provider_429_status_count,2);
 assert.equal(r.first_to_peak_observed_over_100_pct,1);
 assert.equal(r.signed_buy_decisions_published,0);
 assert.equal(r.strict_replay_virtual_buy_count,0);
});
test('confirmed buys cannot be claimed without independent historic local fill evidence',()=>{
 const dec={decision_id:'gpt_'+'f'.repeat(32),action:'BUY',
  published_commit_at_utc:one};
 const r=asofReplay24h({startUtc:start,endUtc:end,
  snapshots:[snap('a',one,.01),snap('b',two,.03)],
  decisions:[dec],receipts:[]});
 assert.equal(r.signed_buy_decisions_published,1);
 assert.equal(r.archived_buy_and_filled_pairs,0);
 assert.equal(r.strict_replay_virtual_buy_count,0);
 assert.equal(r.public_paper_filled_receipts,0);
});
test('review claims count only after actual Git publication, not as model inferences at prior timestamps',()=>{
 const r=asofReplay24h({startUtc:start,endUtc:end,
  snapshots:[snap('a',one,.01)],
  reviews:[{review_id:'review1',completed_at_utc:one,
   published_commit_at_utc:two,action:'NO_ACTION'},
   {review_id:'invalid_future',completed_at_utc:three,
    published_commit_at_utc:two,action:'BUY'}]});
 assert.equal(r.gpt_full_reviews_observed,1);
 assert.equal(r.gpt_actions.NO_ACTION,1);
 assert.equal(r.prospective_strategy_reinference_performed,false);
});
test('invalid window lengths and bankrolls rejected without touching any account',()=>{
 assert.throws(()=>asofReplay24h({startUtc:start,endUtc:start,snapshots:[]}),/INVALID/);
 assert.throws(()=>asofReplay24h({startUtc:start,endUtc:end,snapshots:[],stake:6000,budget:5000}),/INVALID/);
});

test('archived Git decision pointer counts BUY only after exact owner-public SHA256 archive, not pointer alone',()=>{
 const decision_id='gpt_'+'f'.repeat(32);
 const raw=JSON.stringify({decision_id,mode:'PAPER_ONLY',action:'BUY',
  created_at_utc:one})+'\n';
 const pointer={schema:'sniper_r29_gpt_paper_pointer.v1',
  decision_id,mode:'PAPER_ONLY',archive_path:'research/r29/gpt-decisions/2026-11-19/'+decision_id+'.json',
  archive_sha256:createHash('sha256').update(raw).digest('hex'),
  published_at_utc:one};
 const row={commit_sha:'a'.repeat(40),committed_at_utc:two,snapshot:pointer};
 const verified=archiveActions([row],'decision',{readArchive:()=>raw});
 assert.equal(verified[0].action,'BUY');
 assert.equal(verified[0].status,'ARCHIVE_SHA256_AND_ID_MATCH');
 const corrupt=archiveActions([row],'decision',{readArchive:()=>raw+'tampered'});
 assert.equal(corrupt[0].action,'UNKNOWN_UNVERIFIED_POINTER');
 assert.equal(corrupt[0].status,'MISSING_OR_INVALID_ARCHIVE');
 const missing=archiveActions([row],'decision',{readArchive:()=>{throw Error('missing')}});
 assert.equal(missing[0].action,'UNKNOWN_UNVERIFIED_POINTER');
});
