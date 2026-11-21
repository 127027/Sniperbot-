import test from 'node:test';
import assert from 'node:assert/strict';
import {auditOracleManifest,normalizeOracleTape,bestCloseOracle,forecastFeatureLabelSeparation,oracleMissReason} from '../src/oracle-training.mjs';
const start=Date.parse('2026-10-12T00:00:00Z');
const bar=(i,p,lo=p,hi=p)=>({known_no_earlier_than_utc:new Date(start+(i+1)*300000).toISOString(),
 candle_start_utc:new Date(start+i*300000).toISOString(),
 open_usd:p,close_usd:p,low_usd:lo,high_usd:hi,volume_usd:5000});
const tape=rows=>normalizeOracleTape({symbol:'SYNTH',chain:'bsc',pool:'0x'+'a'.repeat(40),
 tape:{candles:rows}});
test('strict earlier close to later close, not same wick, not a real executed trade',()=>{
 const r=bestCloseOracle(tape([bar(0,10),bar(1,7,6,11),bar(2,21,20,30),bar(3,5)]));
 assert.equal(r.best_close_to_later_close.buy_price_usd,7);
 assert.equal(r.best_close_to_later_close.sell_price_usd,21);
 assert.equal(r.actual_trade_verified,false);
 assert.equal(r.wick_upper_bound.executable,false);
});
test('two different futures do not contaminate the original as-of feature',()=>{
 const prev=[bar(5,1),bar(6,1),bar(7,1.03),bar(8,1.05),bar(9,1.08),bar(10,1.12)];
 const one=forecastFeatureLabelSeparation(tape([...prev,...Array.from({length:30},(_,i)=>bar(11+i,2))]));
 const two=forecastFeatureLabelSeparation(tape([...prev,...Array.from({length:30},(_,i)=>bar(11+i,20))]));
 assert.deepEqual(one.features_past_only[0],two.features_past_only[0]);
 assert.equal(one.features_past_only[0].forecast_probability_100pct,null);
 assert.ok(Object.keys(one.features_past_only[0]).every(k=>!k.startsWith('LABEL_FUTURE')));
 assert.ok(Object.keys(one.labels_future_after_horizon_only[0]).every(k=>!k.startsWith('FEATURES_PAST_ONLY')));
});
test('unreconstructed futures are null labels, not negative examples',()=>{
 const out=forecastFeatureLabelSeparation(tape([bar(0,1),bar(1,2)]));
 assert.equal(out.labels_future_after_horizon_only[0].LABEL_FUTURE_up100,null);
 assert.equal(out.labels_future_after_horizon_only.length,72);
});
test('archive 65 rows not accepted as purchase or historical discovery',()=>{
 const items=Array.from({length:65},(_,i)=>({id:i+1,name:'X',chain:'BNB',
  pool_id:i<16?'0x'+(i+1).toString(16).padStart(40,'0'):null,
  token_contract:i<7?'0x'+(i+1).toString(16).padStart(40,'0'):null}));
 const m=auditOracleManifest({items});
 assert.equal(m.counts.with_pool,16);assert.equal(m.counts.with_contract,7);
 assert.ok(m.items.every(x=>!x.buy_authorized&&!x.historical_discovery_verified));
});
test('unknown first capture and risk must not be called a profitable missed fill',()=>{
 assert.equal(oracleMissReason({pool:'some-pool'}),'DATA_GAP_FIRST_CAPTURE');
 assert.equal(oracleMissReason({pool:'a',original_first_capture:'2026-10-12T01:00:00Z'}),'DATA_GAP_RISK');
});
