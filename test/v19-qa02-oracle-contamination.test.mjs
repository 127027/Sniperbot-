import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAsOfEvidence} from '../src/v19-asof-evidence.mjs';
import {scoreAsOf} from '../src/forward-learning.mjs';
import {replaySignalDecisions} from '../src/point-in-time-strategy.mjs';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
const when='2026-10-12T06:35:00.000Z',later='2026-11-22T10:00:00.000Z';
const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40),symbol:'UNKNOWN'};
const sample=(t,price)=>({provenance:'SYNTHETIC_TEST',observed_at_utc:t,archived_at_utc:t,
 coin,discovery:{observed_at_utc:t},risk:{status:'ELIGIBLE',observed_at_utc:t},
 quotes:['https://dexscreener.com/base/'+coin.pool,
  'https://www.geckoterminal.com/base/pools/'+coin.pool].map((url,i)=>({...coin,
    provider_id:'independent-'+i,source_url:url,observed_at:t,source_published_at_utc:t,
    price_usdc:price,liquidity_usdc:20000}))});
test('QA-02 November reconstructed October candle cannot become contemporaneous evidence',()=>{
 const row={source_class:'RETRO_ASOF_RECONSTRUCTION',event_at_utc:'2026-10-12T06:00:00Z',
  http_captured_at_utc:later,available_at_utc:later,provider_quote_asof_utc:'2026-10-12T06:00:00Z'};
 const verdict=classifyAsOfEvidence(row,{asOfUtc:when});
 assert.equal(verdict.status,'RETROSPECTIVE_RESEARCH_ONLY');
 assert.equal(verdict.usable_for_historical_trade,false);
 const oracle=classifyAsOfEvidence({...row,source_class:'POST_EVENT_ORACLE'},
  {asOfUtc:when});
 assert.equal(oracle.status,'POST_EVENT_ONLY');
 assert.equal(oracle.usable_for_historical_trade,false);
});
test('QA-02 postevent labels cannot upshift as-of research rankings or create fake paper orders',()=>{
 const base={schema:1,kind:'R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS',
  captured_at_utc:'2026-10-12T06:00:00Z',observations:[{
   key:'base:'+coin.pool,chain:'base',pool:coin.pool,contract:coin.contract,
   symbol:coin.symbol,captured_at_utc:'2026-10-12T06:00:00Z',
   price_usd:0.001,liquidity_usd:20000,volume_24h_usd:50000
  }]};
 const r=scoreAsOf({batches:[base],asOfUtc:when});
 const poisoned={...base,captured_at_utc:later,observations:[{
  ...base.observations[0],captured_at_utc:later,price_usd:50,
  reported_gain_pct:500000,future_winner_label:'WINNER',source_class:'POST_EVENT_ORACLE'
 }]};
 const after=scoreAsOf({batches:[base,poisoned],asOfUtc:when});
 assert.deepEqual(after,r);
 assert.equal(after.counts.research_rankable,0);
});
test('QA-02 injecting future profit labels must never change previous shared-model decisions',()=>{
 const first=sample('2026-10-12T05:34:00Z',.001),second=sample('2026-10-12T06:34:00Z',.0011);
 const plain=replaySignalDecisions({date:'2026-10-12',snapshots:[first,second]});
 const retro={...second,source_class:'POST_EVENT_ORACLE',
  future_winner_label:'WINNER',reported_gain_pct:90000};
 const poisoned=replaySignalDecisions({date:'2026-10-12',snapshots:[first,second,retro]});
 // The evaluator may reject tainted candidate before the shared gate, but the
 // existing as-of decision must not change or duplicate.
 assert.equal(poisoned.summary.buys,plain.summary.buys);
 assert.equal(poisoned.summary.sells,plain.summary.sells);
 assert.deepEqual(poisoned.events[6].actions,plain.events[6].actions);
});
test('QA-02 retrospective winner-selection manifest rejected at entry, never silently normalized',()=>{
 assert.throws(()=>backtestOnRequest({date:'2026-10-12',manifest:{
  schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',date:'2026-10-12',
  selected_from_future_winner_list:true,snapshots:[],activity_observations:[]}
 }),/UNTRUSTED_OR_HINDSIGHT_UNIVERSE/);
});
