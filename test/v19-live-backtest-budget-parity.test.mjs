import test from 'node:test';
import assert from 'node:assert/strict';
import {assessDot4PaperDecision} from '../src/v18-dot4-live-decision.mjs';
import {replaySignalDecisions} from '../src/point-in-time-strategy.mjs';
import {resolveSharedPaperPolicy,DEFAULT_BUDGET_SETTINGS}
 from '../src/v19-paper-budget-policy.mjs';

const day='2026-10-12',start=Date.parse(day+'T00:00:00Z');
const hour=(h,min=34)=>new Date(start+h*3600000+min*60000).toISOString();
const coin={chain:'base',pool:'0x'+'b'.repeat(40),
 contract:'0x'+'a'.repeat(40),symbol:'BUDGET_TEST'};
const urls=['https://www.geckoterminal.com/base/pools/'+coin.pool,
 'https://dexscreener.com/base/'+coin.pool];
const snap=(h,price)=>{
 const when=hour(h);return {
  provenance:'SYNTHETIC_TEST',observed_at_utc:when,archived_at_utc:when,
  coin,discovery:{observed_at_utc:when},risk:{status:'ELIGIBLE',observed_at_utc:when},
  quotes:urls.map((url,i)=>({...coin,
   source_url:url,provider_id:'source-'+i,
   observed_at:when,source_published_at_utc:when,
   price_usdc:price,liquidity_usdc:20000}))
 }};
const custom={...DEFAULT_BUDGET_SETTINGS,initial_test_usdc:2000,
 stake_per_coin_test_usdc:100,max_open_positions:12};

test('Dot4 and historical replay use the identical 100-TEST-USDC budget policy for BUY',()=>{
 const prior=snap(5,.001),current=snap(6,.0011);
 const live=assessDot4PaperDecision({snapshot:current,asOfUtc:hour(6,35),
  priorObservation:{at_utc:prior.observed_at_utc,price_usd:.001},
  fullReviewDue:true,allowSyntheticForRegression:true,
  paperBudgetSettings:custom});
 const replay=replaySignalDecisions({date:day,snapshots:[prior,current],
  paperPolicy:resolveSharedPaperPolicy(custom).policy});
 assert.equal(live.action,'BUY');
 assert.equal(live.research_coin_stake_test_usdc,100);
 assert.equal(live.shared_paper_budget_policy_id,resolveSharedPaperPolicy(custom).policy_id);
 assert.equal(replay.starting_cash_test_usdc,2000);
 assert.equal(replay.summary.buys,1);
 assert.equal(replay.ending_cash_test_usdc,1900);
 assert.equal(replay.events[6].actions.find(x=>x.action==='BUY')?.reason,live.reason);
 assert.equal(live.paper_order_authorized,false);
});
test('invalid configurations are blocked in both Live adapter and historical evaluator',()=>{
 const wrong={...custom,stake_per_coin_test_usdc:2500};
 assert.throws(()=>assessDot4PaperDecision({snapshot:snap(6,1),
  asOfUtc:hour(6,35),paperBudgetSettings:wrong}),/INVALID_SHARED_PAPER_BUDGET_CONFIG/);
 assert.throws(()=>replaySignalDecisions({date:day,paperPolicy:{
  startingBalance:100,entryAmount:200,maxPositions:3}}),
  /INVALID_SHARED_REPLAY_PAPER_POLICY/);
});
