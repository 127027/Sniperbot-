import test from 'node:test';
import assert from 'node:assert/strict';
import {decideUnifiedMarket} from '../src/unified-decision-v18.mjs';
import {assessDot4PaperDecision} from '../src/v18-dot4-live-decision.mjs';
import {replaySignalDecisions} from '../src/point-in-time-strategy.mjs';

const day='2026-10-12';
const coin={chain:'base',contract:'0x'+'a'.repeat(40),pool:'0x'+'b'.repeat(40),symbol:'TEST'};
const sourceUrls=['https://www.geckoterminal.com/base/pools/'+coin.pool,
  'https://dexscreener.com/base/'+coin.pool];
const hour=(h,minutes=34)=>new Date(Date.parse(day+'T00:00:00Z')+h*3600000+minutes*60000).toISOString();
const snap=(h,price)=>{const at=hour(h);return {
 provenance:'SYNTHETIC_TEST',observed_at_utc:at,archived_at_utc:at,
 coin,discovery:{observed_at_utc:at},risk:{status:'ELIGIBLE',observed_at_utc:at},
 quotes:sourceUrls.map((source_url,i)=>({...coin,provider_id:'source-'+i,source_url,
 observed_at:at,source_published_at_utc:at,price_usdc:price,liquidity_usdc:20000}))
}};
const live=(snapshot,opts={})=>assessDot4PaperDecision({snapshot,
 asOfUtc:hour(Number(snapshot.observed_at_utc.slice(11,13)),35),
 allowSyntheticForRegression:true,...opts});

test('same past evidence produces BUY in Dot4 current-mode adapter and historical replay',()=>{
 const previous=snap(5,.001),current=snap(6,.0011);
 const decision=live(current,{priorObservation:{at_utc:previous.observed_at_utc,price_usd:.001},fullReviewDue:true});
 const replay=replaySignalDecisions({date:day,snapshots:[previous,current,snap(7,.0014)]});
 assert.equal(decision.action,'BUY');
 assert.equal(decision.reason,'POSITIVE_OBSERVED_MOMENTUM');
 assert.equal(replay.events[6].actions.find(a=>a.action==='BUY')?.reason,decision.reason);
 assert.equal(decision.paper_order_authorized,false);
 assert.equal(replay.summary.buys,1);
});
test('SELL decision at hourly tick independent of full GPT review (identical in both modes)',()=>{
 const previous=snap(5,.001),current=snap(6,.0011),third=snap(7,.0014);
 const r=replaySignalDecisions({date:day,snapshots:[previous,current,third]});
 const dot4=live(third,{position:{entryPrice:.00111},fullReviewDue:false});
 assert.equal(dot4.action,'SELL');
 assert.equal(dot4.reason,'TAKE_PROFIT');
 assert.equal(r.events[7].full_review,false);
 assert.equal(r.events[7].actions.find(x=>x.action==='SELL')?.reason,dot4.reason);
});
test('first analysis can BUY with prior completed and archived observation',()=>{
 const result=decideUnifiedMarket({asOfUtc:hour(0,35),observedAtUtc:hour(0),
  observedPriceUsd:1.2,priorAtUtc:'2026-10-11T23:34:00.000Z',
  priorPriceUsd:1,fullReviewDue:true});
 assert.equal(result.action,'BUY');
});
test('future info never changes earlier decision or creates fake SELL fill',()=>{
 const current=snap(6,1.2);
 const future=decideUnifiedMarket({asOfUtc:hour(6,35),observedAtUtc:hour(7),
  observedPriceUsd:50,priorAtUtc:hour(5),priorPriceUsd:1,fullReviewDue:true});
 assert.equal(future.action,'DATA_GAP');
 const liveResult=live(current,{priorObservation:{at_utc:hour(7),price_usd:1},fullReviewDue:true});
 assert.equal(liveResult.action,'WATCH');
 assert.equal(liveResult.paper_order_authorized,false);
});
test('WATCH continues for missing risk information; discovery is never deleted',()=>{
 const incomplete=snap(6,2);
 incomplete.risk.status='DATA_GAP';
 const result=live(incomplete,{fullReviewDue:true});
 assert.equal(result.action,'WATCH');
 assert.equal(result.risk_recheck_required,true);
 assert.equal(result.paper_order_authorized,false);
});
test('only an actual realized loss imposes a brief, defined reentry cooldown',()=>{
 const curr={asOfUtc:hour(6,35),observedAtUtc:hour(6),
  observedPriceUsd:1.2,priorAtUtc:hour(5),priorPriceUsd:1,fullReviewDue:true};
 const ready=decideUnifiedMarket(curr);
 assert.equal(ready.action,'BUY');
 const blocked=decideUnifiedMarket({...curr,lastLossAtUtc:hour(6,15)});
 assert.equal(blocked.action,'WATCH');
 assert.equal(blocked.reason,'LOSS_REENTRY_COOLDOWN');
 const later=decideUnifiedMarket({...curr,lastLossAtUtc:hour(5)});
 assert.equal(later.action,'BUY');
});
test('synthetic regression data cannot masquerade as live research decision by default',()=>{
 const result=assessDot4PaperDecision({snapshot:snap(6,2),asOfUtc:hour(6,35),fullReviewDue:true});
 assert.equal(result.reason,'SYNTHETIC_DATA_NOT_LIVE');
 assert.equal(result.paper_order_authorized,false);
});

test('independent indicative PAPER captures are research-reviewable without inventing provider timestamp',()=>{
 const c=snap(6,.0011);
 c.quote_quality='INDICATIVE_WEB_ONLY';
 c.provider_time_unknown_acknowledged=true;
 c.risk.status='PAPER_ELIGIBLE';
 for(const q of c.quotes)delete q.source_published_at_utc;
 const prev={at_utc:hour(5),price_usd:.001};
 const permitted=live(c,{priorObservation:prev,fullReviewDue:true});
 assert.equal(permitted.action,'BUY');
 assert.equal(permitted.paper_order_authorized,false);
 const noAcknowledgement={...c,provider_time_unknown_acknowledged:false};
 const missing=live(noAcknowledgement,{priorObservation:prev,fullReviewDue:true});
 assert.equal(missing.action,'WATCH');
 assert.equal(missing.reason,'EVIDENCE_QUOTE_FUTURE_OR_UNDATED');
});

test('protective shadow uses same SELL rule but does not pretend it filled a trade',async()=>{
 const {inspectProtectiveExit}=await import('../src/protective-exit.mjs');
 const c=snap(7,.0014),position={coin,entryPrice:.00111,quantity:50,costTestUsdc:50};
 const quotes=c.quotes.map((q,i)=>({...q,captured_at_utc:q.observed_at,
   provider_quote_asof_utc:q.observed_at,source_archive_blob_sha:String(i+1).repeat(40)}));
 const result=inspectProtectiveExit({position,observations:quotes,asOfUtc:hour(7,35)});
 const liveDecision=live(c,{position,fullReviewDue:false});
 assert.equal(result.decision_engine,'UNIFIED_V18_SIGNAL_V1');
 assert.equal(result.trigger_reason,liveDecision.reason);
 assert.equal(result.status,'SHADOW_SELL_CANDIDATE');
 assert.equal(result.paper_filled,false);
});
