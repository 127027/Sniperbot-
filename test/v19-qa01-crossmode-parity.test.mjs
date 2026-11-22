import test from 'node:test';
import assert from 'node:assert/strict';
import {assessDot4PaperDecision} from '../src/v18-dot4-live-decision.mjs';
import {replaySignalDecisions} from '../src/point-in-time-strategy.mjs';
import {decideUnifiedMarket} from '../src/unified-decision-v18.mjs';
import {checkUnifiedEvidence} from '../src/v18-shared-evidence-gate.mjs';
const day='2026-10-12',zero=Date.parse(day+'T00:00:00Z');
const at=(h,min=34)=>new Date(zero+h*3600000+min*60000).toISOString();
const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40),symbol:'PARITY'};
const urls=['https://www.geckoterminal.com/base/pools/'+coin.pool,'https://dexscreener.com/base/'+coin.pool];
const snap=(h,price)=>({provenance:'SYNTHETIC_TEST',observed_at_utc:at(h),archived_at_utc:at(h),
 coin,discovery:{observed_at_utc:at(h)},risk:{status:'ELIGIBLE',observed_at_utc:at(h)},
 quotes:urls.map((url,i)=>({...coin,source_url:url,provider_id:'independent-'+i,observed_at:at(h),
  source_published_at_utc:at(h),price_usdc:price,liquidity_usdc:20000}))});
const opts=s=>({snapshot:s,asOfUtc:at(6,35),fullReviewDue:true,allowSyntheticForRegression:true});
test('QA-01 shared positive BUY: Live PAPER recommendation equals historical model action/reason, no actual order',()=>{
 const first=snap(5,.001),second=snap(6,.0011);
 const live=assessDot4PaperDecision({...opts(second),
  priorObservation:{at_utc:first.observed_at_utc,price_usd:.001}});
 const replay=replaySignalDecisions({date:day,snapshots:[first,second]});
 const action=replay.events[6].actions.find(x=>x.action==='BUY');
 assert.equal(live.action,'BUY');assert.equal(action.action,live.action);
 assert.equal(action.reason,live.reason);assert.equal(replay.summary.buys,1);
 assert.equal(live.paper_order_authorized,false);
});
test('QA-01 shared WATCH and risk/quote blocks are identical across live-adapter and replay',()=>{
 const first=snap(5,.001),second=snap(6,.00101);
 const watch=assessDot4PaperDecision({...opts(second),
  priorObservation:{at_utc:first.observed_at_utc,price_usd:.001}});
 assert.equal(watch.action,'WATCH');
 assert.equal(watch.reason,decideUnifiedMarket({asOfUtc:at(6,35),observedAtUtc:at(6),
  observedPriceUsd:.00101,priorAtUtc:at(5),priorPriceUsd:.001,fullReviewDue:true}).reason);
 const noBuy=replaySignalDecisions({date:day,snapshots:[first,second]});
 assert.equal(noBuy.summary.buys,0);
 for(const corrupt of [
  {...second,risk:{status:'DATA_GAP',observed_at_utc:at(6)}},
  {...second,quotes:second.quotes.slice(0,1)},
  {...second,quotes:[second.quotes[0],{...second.quotes[1],price_usdc:.003}]},
  {...second,archived_at_utc:at(8)}
 ]){
  const reason=checkUnifiedEvidence(corrupt,Date.parse(at(6,35)));
  assert.ok(reason);
  const live=assessDot4PaperDecision({...opts(corrupt),
   priorObservation:{at_utc:first.observed_at_utc,price_usd:.001}});
  assert.equal(live.action,'WATCH');assert.equal(live.reason,'EVIDENCE_'+reason);
  const past=replaySignalDecisions({date:day,snapshots:[first,corrupt]});
  assert.equal(past.summary.buys,0);
  assert.equal(past.events[6].blocked_sources[0].reason,reason);
 }
});
test('QA-01 BUY then SELL uses the same shared action and stop/take-profit reason between reviews',()=>{
 const a=snap(5,.001),b=snap(6,.0011),c=snap(7,.0014);
 const replay=replaySignalDecisions({date:day,snapshots:[a,b,c]});
 const live=assessDot4PaperDecision({snapshot:c,asOfUtc:at(7,35),
  position:{entryPrice:.0011},fullReviewDue:false,allowSyntheticForRegression:true});
 assert.equal(replay.summary.buys,1);assert.equal(replay.summary.sells,1);
 assert.equal(replay.events[7].full_review,false);
 assert.equal(live.action,'SELL');
 assert.equal(live.action,replay.events[7].actions[0].action);
 assert.equal(live.reason,replay.events[7].actions[0].reason);
 assert.equal(live.paper_order_authorized,false);
});
test('QA-01 HOLD does not invent an order or closing receipt',()=>{
 const a=snap(5,.001),b=snap(6,.0011),c=snap(7,.00115);
 const replay=replaySignalDecisions({date:day,snapshots:[a,b,c]});
 const live=assessDot4PaperDecision({snapshot:c,asOfUtc:at(7,35),
  position:{entryPrice:.0011},fullReviewDue:false,allowSyntheticForRegression:true});
 assert.equal(live.action,'HOLD');assert.equal(live.reason,'POSITION_WITHIN_BOUNDS');
 assert.equal(replay.summary.sells,0);assert.equal(replay.positions_end,1);
 assert.equal(live.paper_order_authorized,false);
});
test('QA-01 changing only the as-of time makes a future quote unavailable in either mode',()=>{
 const current=snap(6,.0011);
 const live=assessDot4PaperDecision({...opts(current),asOfUtc:at(5,35)});
 assert.equal(live.action,'WATCH');assert.equal(live.paper_order_authorized,false);
 const replay=replaySignalDecisions({date:day,snapshots:[snap(5,.001),current]});
 assert.equal(replay.events[5].actions.filter(x=>x.action==='BUY').length,0);
});

test('QA-01 exact shared mode parity BUY/WATCH/HOLD/SELL and quote/risk block reasons',()=>{
 const first=snap(5,.001),second=snap(6,.0011),third=snap(7,.0014);
 const scenarios=[
  {snapshot:second,asOfUtc:at(6,35),priorObservation:{at_utc:at(5),price_usd:.001},
   fullReviewDue:true,expected:'BUY'},
  {snapshot:second,asOfUtc:at(6,35),priorObservation:{at_utc:at(5),price_usd:.001},
   fullReviewDue:false,expected:'WATCH'},
  {snapshot:third,asOfUtc:at(7,35),position:{entryPrice:.0011},
   fullReviewDue:false,expected:'SELL'},
  {snapshot:snap(7,.00115),asOfUtc:at(7,35),position:{entryPrice:.0011},
   fullReviewDue:false,expected:'HOLD'},
  {snapshot:{...second,risk:{status:'DATA_GAP',observed_at_utc:at(6)}},
   asOfUtc:at(6,35),expected:'WATCH'},
  {snapshot:{...second,quotes:[...second.quotes.slice(0,1)]},
   asOfUtc:at(6,35),expected:'WATCH'},
  {snapshot:{...second,archived_at_utc:at(8)},
   asOfUtc:at(6,35),expected:'WATCH'}
 ];
 for(const c of scenarios){
  const input={...c,allowSyntheticForRegression:true};
  delete input.expected;
  const live=assessDot4PaperDecision({...input,evaluationMode:'LIVE_PAPER'});
  const past=assessDot4PaperDecision({...input,evaluationMode:'HISTORICAL_ASOF'});
  assert.deepEqual(live,past);
  assert.equal(live.action,c.expected);
  assert.equal(live.paper_order_authorized,false);
 }
 assert.throws(()=>assessDot4PaperDecision({snapshot:first,asOfUtc:at(5,35),
  evaluationMode:'UNKNOWN'}),/INVALID_DOT4_TIME_OR_CADENCE/);
});
