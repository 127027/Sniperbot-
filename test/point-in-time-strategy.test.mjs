import test from 'node:test';
import assert from 'node:assert/strict';
import {replaySignalDecisions} from '../src/point-in-time-strategy.mjs';
const date='2026-10-12';
const coin={chain:'base',contract:'0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',pool:'0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',symbol:'SYNTH'};
const urls=['https://dexscreener.com/base/'+coin.pool,'https://www.geckoterminal.com/base/pools/'+coin.pool];
const synth=(hour,price,opts={})=>{
 const at=new Date(Date.parse(date+'T00:00:00.000Z')+hour*3600000+34*60000).toISOString();
 return {provenance:'SYNTHETIC_TEST',observed_at_utc:at,archived_at_utc:opts.archive_at||at,
 coin,discovery:{observed_at_utc:at},risk:{status:'ELIGIBLE',observed_at_utc:at},
 quotes:urls.map((source_url,i)=>({...coin,source_url,provider_id:'provider-'+i,observed_at:at,
   source_published_at_utc:opts.source_pub_at||at,price_usdc:price,liquidity_usdc:20000}))};
};
test('historical day without original observations remains DATA_GAP',()=>{
 const r=replaySignalDecisions({date});
 assert.equal(r.summary.dataGap,24);assert.equal(r.summary.buys,0);assert.equal(r.summary.sells,0);
 assert.equal(r.ending_cash_test_usdc,5000);assert.equal(r.summary.fullReviews,4);
});
test('two timestamped synthetic snapshots trigger BUY then hourly SELL even if full review not due',()=>{
 const r=replaySignalDecisions({date,snapshots:[synth(5,.001),synth(6,.0011),synth(7,.0014)]});
 assert.equal(r.summary.fullReviews,4);
 assert.equal(r.summary.buys,1);assert.equal(r.summary.sells,1);
 assert.equal(r.events[6].actions[0].action,'BUY');
 assert.equal(r.events[7].full_review,false);
 assert.equal(r.events[7].actions[0].action,'SELL');
 assert.equal(r.positions_end,0);assert.ok(r.ending_cash_test_usdc>5000);
 assert.equal(r.events[6].actions[0].paper_receipt_status,'SYNTHETIC_REPLAY_ONLY');
});
test('future-publication evidence cannot cause trade even if price rises',()=>{
 const after='2026-10-13T00:00:00.000Z';
 const r=replaySignalDecisions({date,snapshots:[synth(5,.001),synth(6,.0011,{source_pub_at:after})]});
 assert.equal(r.summary.buys,0);assert.equal(r.summary.sells,0);
 assert.equal(r.events[6].blocked_sources[0].reason,'QUOTE_FUTURE_OR_UNDATED');
});
test('late archived source cannot retroactively trade',()=>{
 const after='2026-10-13T00:00:00.000Z';
 const r=replaySignalDecisions({date,snapshots:[synth(5,.001),synth(6,.0011,{archive_at:after})]});
 assert.equal(r.summary.buys,0);assert.equal(r.events[6].blocked_sources[0].reason,'FUTURE_OR_UNVERIFIED_ARCHIVE');
});
test('falling synthetic markets trigger an hourly stop instead of claiming a winner',()=>{
 const r=replaySignalDecisions({date,snapshots:[synth(5,.001),synth(6,.0011),synth(7,.0008)]});
 assert.equal(r.summary.buys,1);assert.equal(r.summary.sells,1);
 assert.equal(r.events[7].actions[0].reason,'STOP_LOSS');
 assert.ok(r.ending_cash_test_usdc<5000);
});

test('six-hour-old baseline cannot produce BUY',()=>{
 const r=replaySignalDecisions({date,snapshots:[synth(0,.001),synth(6,.0015)]});
 assert.equal(r.summary.buys,0);
});
test('wrong pool detail URL is rejected before entering momentum history',()=>{
 const wrong=synth(5,.001);
 wrong.quotes[1].source_url='https://www.geckoterminal.com/base/pools/'+coin.contract;
 const r=replaySignalDecisions({date,snapshots:[wrong,synth(6,.0011)]});
 assert.equal(r.summary.buys,0);
 assert.equal(r.events[5].blocked_sources[0].reason,'QUOTE_GATE_SOURCE_POOL_URL_MISMATCH');
});
test('divergent prices cannot enter historical momentum observations',()=>{
 const wrong=synth(5,.001);wrong.quotes[1].price_usdc=.002;
 const r=replaySignalDecisions({date,snapshots:[wrong,synth(6,.0011)]});
 assert.equal(r.summary.buys,0);
 assert.equal(r.events[5].blocked_sources[0].reason,'QUOTE_GATE_PRICE_DISAGREEMENT');
});

test('first review may BUY using strictly pre-window observations, not requiring a warm-up after midnight',()=>{
 const previous=synth(0,.001), first=synth(0,.0012);
 const prior='2026-10-11T23:34:00.000Z';
 previous.observed_at_utc=prior;previous.archived_at_utc=prior;
 previous.discovery.observed_at_utc=prior;previous.risk.observed_at_utc=prior;
 for(const q of previous.quotes){q.observed_at=prior;q.source_published_at_utc=prior;}
 const r=replaySignalDecisions({date,snapshots:[previous,first]});
 assert.equal(r.summary.buys,1);
 assert.equal(r.events[0].actions[0].action,'BUY');
 assert.equal(r.events[0].at_utc,'2026-10-12T00:35:00.000Z');
});
test('prior price published after day start is forbidden as reference',()=>{
 const previous=synth(0,.001),first=synth(0,.0013);
 const prior='2026-10-11T23:34:00.000Z',late='2026-10-12T02:00:00.000Z';
 previous.observed_at_utc=prior;previous.archived_at_utc=late;
 previous.discovery.observed_at_utc=prior;previous.risk.observed_at_utc=prior;
 for(const q of previous.quotes){q.observed_at=prior;q.source_published_at_utc=prior;}
 const r=replaySignalDecisions({date,snapshots:[previous,first]});
 assert.equal(r.summary.buys,0);
});
test('Dot 1 may jump from 4 to 24 full reviews on first authenticated activity observation',()=>{
 const at='2026-10-12T00:34:00.000Z';
 const metrics={dataAvailable:true,newPools:85,eligible:0,volumeChangePct:0,openPositions:0};
 const r=replaySignalDecisions({date,activityObservations:[{provenance:'CONTEMPORANEOUS_RECORD',observed_at_utc:at,archived_at_utc:at,source_archive_sha:'a'.repeat(40),metrics}]});
 assert.equal(r.events[0].target_per_24h,24);
 assert.equal(r.events[0].full_review,true);
 assert.equal(r.events[1].full_review,true);
});
test('missing or late activity evidence does not force higher cadence',()=>{
 const at='2026-10-12T00:34:00.000Z';
 const r=replaySignalDecisions({date,activityObservations:[{provenance:'CONTEMPORANEOUS_RECORD',observed_at_utc:at,archived_at_utc:'2026-10-13T00:00:00.000Z',source_archive_sha:'a'.repeat(40),metrics:{dataAvailable:true,newPools:85}}]});
 assert.equal(r.events[0].target_per_24h,4);
 assert.equal(r.summary.fullReviews,4);
});

test('forced 24-review mode ignores adaptive downshifts only within explicit diagnostics',()=>{
 const at='2026-10-12T00:05:00.000Z';
 const r=replaySignalDecisions({date,targetPer24h:24,forceHourlyReview:true,activityObservations:[{
 provenance:'CONTEMPORANEOUS_RECORD',observed_at_utc:at,archived_at_utc:at,source_archive_sha:'a'.repeat(40),
 metrics:{dataAvailable:true,newPools:0,eligible:0,volumeChangePct:-15,openPositions:0,consecutiveQuietChecks:2}
 }]});
 assert.equal(r.summary.fullReviews,24);
 assert.ok(r.events.every(x=>x.target_per_24h===24));
});
