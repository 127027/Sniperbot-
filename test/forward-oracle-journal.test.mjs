import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAsOfForecastSnapshot,settleMatureForecastSnapshot} from '../src/forward-oracle-journal.mjs';
const base='2026-11-21T12:00:00Z',pool='0x'+'b'.repeat(40),key='base:'+pool,contract='0x'+'a'.repeat(40);
const at=h=>new Date(Date.parse(base)+h*3600000).toISOString();
const batch=(h,price)=>{
 const stamp=at(h);
 return {kind:'R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS',captured_at_utc:stamp,observations:[
 {key,chain:'base',pool,contract,observed_at_utc:stamp,captured_at_utc:stamp,
 price_usd:price,liquidity_usd:25000}]};
};
const ranking={kind:'R29_FORWARD_BLIND_ASOF_RESEARCH_RANKING',as_of_utc:base,
 candidates:[{key,chain:'base',pool,contract,score:15,
 status:'RESEARCH_PRIORITY_ONLY_NOT_RISK_APPROVED',
 observed_price_change_pct:9}]};
test('future 100x cannot leak into a prediction snapshot',()=>{
 const a=makeAsOfForecastSnapshot({ranking,batches:[batch(0,1),batch(1,100)]});
 const b=makeAsOfForecastSnapshot({ranking,batches:[batch(0,1),batch(1,.01)]});
 assert.deepEqual(a,b);assert.equal(a.predictions[0].last_observed_price_usd,1);
 assert.equal(a.predictions[0].calibrated_probability_up100pct,null);
 assert.equal(a.predictions[0].paper_buy_authorized,false);
});
test('1/3/6h labels appear ONLY after horizon and with actual endpoint quote',()=>{
 const snapshot=makeAsOfForecastSnapshot({ranking,batches:[batch(0,1)]});
 const early=settleMatureForecastSnapshot({snapshot,batches:[batch(0,1),batch(1,2.5)],asOfUtc:at(1)});
 assert.equal(early.labels[0].status,'OBSERVED_ENDPOINT_CHANGE');
 assert.equal(early.labels[0].LABEL_FUTURE_up100,true);
 assert.equal(early.labels[1].status,'PENDING_HORIZON');
 const later=settleMatureForecastSnapshot({snapshot,batches:[batch(0,1),batch(1,2.5)],asOfUtc:at(7)});
 assert.equal(later.observed,1);
 assert.equal(later.unknown,2);
 assert.equal(later.labels[1].LABEL_FUTURE_up100,null);
});
test('no source price at decision cannot be treated as negative outcome',()=>{
 const snap=makeAsOfForecastSnapshot({ranking,batches:[]});
 const out=settleMatureForecastSnapshot({snapshot:snap,batches:[batch(1,5)],asOfUtc:at(7)});
 assert.equal(out.observed,0);
 assert.equal(out.labels[0].status,'UNKNOWN_UNRANKABLE_AT_DECISION');
});
