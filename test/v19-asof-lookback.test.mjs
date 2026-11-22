import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAsOfLookback} from '../src/v19-asof-lookback.mjs';

const day='2026-10-12';
const at='2026-10-12T00:35:00.000Z';
const coin={chain:'base',pool:'0x'+'a'.repeat(40),contract:'0x'+'b'.repeat(40),symbol:'DEMO'};
const snap=(when,price,source_class='ORIGINAL_CAPTURE',captured=when)=>({
 source_class,provenance:'CONTEMPORANEOUS_RECORD',
 observed_at_utc:when,archived_at_utc:captured,available_at_utc:captured,
 coin,quotes:[{...coin,price_usdc:price,provider_id:'a'}]
});
test('old 20-day feature history survives no fixed cutoff, without becoming trade authorization',()=>{
 const r=buildAsOfLookback({asOfUtc:at,snapshots:[
  snap('2026-09-22T09:00:00.000Z',.1),
  snap('2026-10-11T19:00:00.000Z',.15),
  snap('2026-10-12T00:34:00.000Z',.2)
 ]});
 assert.equal(r.market_count,1);assert.equal(r.observation_count,3);
 assert.equal(r.oldest_observation_at_utc,'2026-09-22T09:00:00.000Z');
 assert.ok(Math.abs(r.markets[0].past_observed_return_pct-100)<1e-9);
 assert.equal(r.markets[0].older_than_five_hours,true);
 assert.equal(r.may_execute_trade,false);
 assert.equal(r.markets[0].execution_quote_authorized,false);
});
test('future candles, backdated November downloads and Oracle labels are excluded',()=>{
 const x=buildAsOfLookback({asOfUtc:at,snapshots:[
  snap('2026-10-12T00:36:00.000Z',10),
  snap('2026-10-11T19:00:00.000Z',.15,'RETRO_ASOF_RECONSTRUCTION','2026-11-22T11:00:00.000Z'),
  snap('2026-10-11T19:00:00.000Z',.16,'POST_EVENT_ORACLE')
 ]});
 assert.equal(x.market_count,0);
 assert.equal(x.excluded.future_or_not_available,1);
 assert.equal(x.excluded.retrospective_or_oracle,2);
});
test('partial old source remains a feature when no Dot3 risk approval exists',()=>{
 const x=snap('2026-10-11T20:00:00.000Z',.1);
 delete x.risk;
 const result=buildAsOfLookback({asOfUtc:at,snapshots:[x]});
 assert.equal(result.observation_count,1);
 assert.equal(result.may_execute_trade,false);
});
test('late availability cannot masquerade as old feature data',()=>{
 const s=snap('2026-10-11T19:00:00.000Z',.1,'ORIGINAL_CAPTURE','2026-10-12T01:00:00.000Z');
 assert.equal(buildAsOfLookback({asOfUtc:at,snapshots:[s]}).market_count,0);
});
