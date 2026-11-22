import test from 'node:test';
import assert from 'node:assert/strict';
import {build29HourAsOfTimeline} from '../src/v19-backtest-window.mjs';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
const date='2026-10-12',coin={chain:'base',contract:'0x'+'a'.repeat(40),
 pool:'0x'+'b'.repeat(40),symbol:'DEMO'};
const snap=(when,price)=>({
 provenance:'SYNTHETIC_TEST',source_class:'SYNTHETIC_TEST',
 observed_at_utc:when,archived_at_utc:when,available_at_utc:when,coin,
 discovery:{observed_at_utc:when},risk:{status:'ELIGIBLE',observed_at_utc:when},
 quotes:['https://dexscreener.com/base/'+coin.pool,
  'https://www.geckoterminal.com/base/pools/'+coin.pool].map((source_url,i)=>({
  ...coin,source_url,provider_id:'q'+i,observed_at:when,source_published_at_utc:when,
  price_usdc:price,liquidity_usdc:20000}))
});
test('exact 5h warmup + 24h decisions with future observations hidden',()=>{
 const x=build29HourAsOfTimeline({date,snapshots:[
  snap('2026-10-11T19:34:00.000Z',1),
  snap('2026-10-12T04:34:00.000Z',2),
  snap('2026-10-12T10:34:00.000Z',3)]});
 assert.equal(x.hourly_ticks,29);
 assert.equal(x.begin_utc,'2026-10-11T19:00:00.000Z');
 assert.equal(x.end_utc,'2026-10-13T00:00:00.000Z');
 assert.equal(x.ticks.filter(z=>z.phase==='WARMUP_RESEARCH_NO_TRADING').length,5);
 assert.equal(x.ticks.filter(z=>z.phase==='PAPER_DECISION_WINDOW').length,24);
 assert.equal(x.ticks[0].past_only_history_observations,1);
 assert.equal(x.ticks[0].fresh_source_snapshots,1);
 assert.equal(x.ticks[0].excluded_future_or_unavailable,2);
 assert.equal(x.ticks[10].past_only_history_observations,2);
 assert.equal(x.ticks[10].excluded_future_or_unavailable,1);
 assert.equal(x.orders_written,0);
});
test('retrospective and Oracle evidence never enter decision inputs',()=>{
 const retro=snap('2026-10-11T19:34:00.000Z',1.0);
 retro.source_class='RETRO_ASOF_RECONSTRUCTION';
 retro.available_at_utc='2026-11-22T10:00:00.000Z';
 retro.archived_at_utc=retro.available_at_utc;
 const oracle=snap('2026-10-11T19:34:00.000Z',4.0);
 oracle.source_class='POST_EVENT_ORACLE';
 const x=build29HourAsOfTimeline({date,snapshots:[retro,oracle]});
 assert.equal(x.ticks[0].past_only_history_observations,0);
 assert.equal(x.ticks[0].retro_data_for_research_only,1);
 assert.equal(x.ticks[0].oracle_labels_not_for_decisions,1);
 assert.equal(x.ticks[0].fresh_source_snapshots,0);
});
test('on-demand five-role result uses same trade kernel with 29h prep attached',()=>{
 const manifest={schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',
  date,selected_from_future_winner_list:false,activity_observations:[],
  snapshots:[snap('2026-10-11T19:34:00.000Z',1)]};
 const x=backtestOnRequest({date,manifest});
 assert.equal(x.historical_warmup_hours,5);
 assert.equal(x.on_demand_29h_timeline.hourly_ticks,29);
 assert.equal(x.on_demand_29h_timeline.ticks[0].past_only_history_observations,1);
 assert.equal(x.model_replay_summary.buys,0);
 assert.equal(x.confirmed_paper_fills,0);
});

test('29-hour report includes an exact 00:00 first decision and does not leak a 00:34 observation',()=>{
 const late=snap('2026-10-12T00:34:00.000Z',2.0);
 const before=snap('2026-10-11T23:59:00.000Z',1.0);
 const r=build29HourAsOfTimeline({date,snapshots:[late,before],
  firstScanAtStart:true});
 assert.equal(r.first_decision_opportunity_utc,'2026-10-12T00:00:00.000Z');
 assert.equal(r.first_decision_wait_minutes,0);
 assert.equal(r.hourly_ticks,29);
 assert.equal(r.ticks[5].at_utc,r.first_decision_opportunity_utc);
 assert.equal(r.ticks[5].past_only_history_observations,1);
 assert.equal(r.ticks[5].excluded_future_or_unavailable,1);
 assert.equal(r.ticks[5].phase,'PAPER_DECISION_WINDOW');
 assert.equal(r.ticks[6].at_utc,'2026-10-12T01:35:00.000Z');
 assert.equal(r.orders_written,0);
});
