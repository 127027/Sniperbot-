import test from 'node:test';
import assert from 'node:assert/strict';
import {replaySignalDecisions} from '../src/point-in-time-strategy.mjs';
const date='2026-10-12',coin={chain:'base',contract:'0x'+'a'.repeat(40),
 pool:'0x'+'b'.repeat(40),symbol:'OLD'};
const snap=(at,price)=>({source_class:'SYNTHETIC_TEST',provenance:'SYNTHETIC_TEST',
 observed_at_utc:at,archived_at_utc:at,available_at_utc:at,coin,
 discovery:{observed_at_utc:at},risk:{status:'ELIGIBLE',observed_at_utc:at},
 quotes:['https://www.geckoterminal.com/base/pools/'+coin.pool,
 'https://dexscreener.com/base/'+coin.pool].map((url,i)=>({chain:coin.chain,contract:coin.contract,
 pool:coin.pool,price_usdc:price,liquidity_usdc:20000,provider_id:'p'+i,
 source_url:url,observed_at:at,source_published_at_utc:at}))});
test('old 20-day and 5h prelude data appear as research features at first tick',()=>{
 const snapshots=[snap('2026-09-22T09:00:00.000Z',.1),
  snap('2026-10-11T19:00:00.000Z',.15),
  snap('2026-10-12T00:34:00.000Z',.16),
  snap('2026-10-12T01:34:00.000Z',.20)];
 const r=replaySignalDecisions({date,snapshots,forceHourlyReview:true});
 assert.equal(r.events[0].past_only_feature_history.market_count,1);
 assert.equal(r.events[0].past_only_feature_history.observation_count,3);
 assert.equal(r.events[0].past_only_feature_history.oldest_observation_at_utc,'2026-09-22T09:00:00.000Z');
 assert.equal(r.events[0].past_only_feature_history.executable_quotes_from_history,0);
 assert.equal(r.events[0].eligible_snapshots,1);
 assert.equal(r.events[0].actions.find(x=>x.action==='BUY'),undefined);
 assert.equal(r.events[1].past_only_feature_history.observation_count,4);
 assert.equal(r.events[1].actions.some(x=>x.action==='BUY'),true);
});
test('days-old snapshot without a fresh current quote creates no fabricated trade',()=>{
 const r=replaySignalDecisions({date,snapshots:[snap('2026-10-11T19:00:00.000Z',.15)]});
 assert.equal(r.events[0].past_only_feature_history.observation_count,1);
 assert.equal(r.events[0].eligible_snapshots,0);
 assert.equal(r.summary.buys,0);
 assert.equal(r.summary.sells,0);
});
