import test from 'node:test';
import assert from 'node:assert/strict';
import {runV20IsolatedScenario} from '../src/v20-isolated-scenario.mjs';
const P='2026-10-11T18:59:00.000Z';
const at=h=>'2026-10-12T'+String(h).padStart(2,'0')+':00:00.000Z';
const id={chain:'solana',contract:'Contract1111111111',pool:'Pool1111111111111'};
const quote=(time,provider,price=1,liquidity=100000,identity=id,rawSha=null)=>({
  ...identity,synthetic_fixture:true,event_kind:'SYNTHETIC_QUOTE',
  source_provider:provider,price_test_usdc:price,liquidity_test_usdc:liquidity,
  published_at_utc:time,available_at_utc:time,captured_at_utc:time,
  source_origin_verified:true,original_bytes_verified:true,
  source_blob_sha:rawSha??(provider==='Alpha'? 'a'.repeat(40):'b'.repeat(40))
});
const pair=(time,price=1,liquidity=100000,identity=id)=>[
  quote(time,'Alpha',price,liquidity,identity),
  quote(time,'Bravo',price,liquidity,identity)
];
const plan=(time,action='BUY',identity=id,extra={})=>({
  ...identity,synthetic_fixture:true,plan_kind:'FIXED_TEST_PLAN',
  precommitted_at_utc:P,at_utc:time,action,
  plan_id:'testplan-'+action+'-'+time.slice(11,13)+'-'+identity.pool.slice(0,6),
  ...extra
});
const run=(observations=[],plans=[],extra={})=>runV20IsolatedScenario({observations,plans,...extra});
test('empty 5h warmup + 24h strict scenario never asserts real trading or PnL',()=>{
  const r=run();
  assert.equal(r.warmup_hour_count,5);
  assert.equal(r.decision_hour_count,24);
  assert.equal(r.synthetic_receipts.length,0);
  assert.equal(r.ending_cash_test_usdc,5000);
  assert.equal(r.reported_external_pnl,null);
  assert.equal(r.reported_real_paper_fills,0);
  assert.equal(r.orders_published,0);
  assert.equal(r.windows_state_read_or_modified,false);
  assert.equal(r.original_QA04_pass,false);
});
test('two fresh synthetic quotes buy 50 TEST-USDC and hourly take-profit sell with fees',()=>{
  const r=run([...pair(at(0),1),...pair(at(1),1.5)],[plan(at(0))]);
  assert.equal(r.synthetic_buys,1);
  assert.equal(r.synthetic_sells,1);
  assert.equal(r.synthetic_open_positions.length,0);
  assert.equal(r.synthetic_receipts.length,2);
  assert.equal(r.synthetic_receipts[1].trigger,'HOURLY_TAKE_PROFIT');
  assert.ok(r.synthetic_receipts[0].fee_test_usdc>0);
  assert.ok(r.synthetic_receipts[1].fee_test_usdc>0);
  assert.ok(r.ending_cash_test_usdc>5000);
  assert.equal(r.reported_real_paper_fills,0);
});
test('an hourly 25% drop closes synthetic lot at a loss, never a fake gain',()=>{
  const r=run([...pair(at(0),1),...pair(at(1),.75)],[plan(at(0))]);
  assert.equal(r.synthetic_buys,1);
  assert.equal(r.synthetic_sells,1);
  assert.ok(r.synthetic_realized_pnl_test_usdc<0);
  assert.ok(r.ending_cash_test_usdc<5000);
  assert.equal(r.synthetic_receipts[1].trigger,'HOURLY_STOP_LOSS');
});
test('a single provider cannot produce a synthetic fill',()=>{
  const r=run([quote(at(0),'Alpha')],[plan(at(0))]);
  assert.equal(r.synthetic_buys,0);
  assert.equal(r.synthetic_no_fills,1);
  assert.equal(r.ticks[5].attempts[0].reason,'NO_FRESH_TWO_SOURCE_QUOTES');
});
test('late November capture is quarantined from earlier October synthetic ticks',()=>{
  const late=pair('2026-11-23T00:00:00.000Z').map(q=>({
    ...q,published_at_utc:at(0),available_at_utc:at(0)}));
  const r=run(late,[plan(at(0))]);
  assert.equal(r.synthetic_buys,0);
  assert.equal(r.quarantined_source_events.length,2);
  assert.equal(r.quarantined_source_events[0].reason,'CAPTURE_AFTER_TEST_WINDOW');
});
test('identical source bytes are not two independent quotes',()=>{
  const q=pair(at(0));q[1].source_blob_sha=q[0].source_blob_sha;
  const r=run(q,[plan(at(0))]);
  assert.equal(r.synthetic_buys,0);
  assert.equal(r.ticks[5].attempts[0].reason,'DUPLICATE_SOURCE_BYTES');
});
test('large source disagreement prevents any synthetic entry',()=>{
  const q=pair(at(0));q[1].price_test_usdc=2;
  const r=run(q,[plan(at(0))]);
  assert.equal(r.synthetic_buys,0);
  assert.equal(r.ticks[5].attempts[0].reason,'SOURCE_PRICE_DIVERGENCE');
});
test('explicitly injected test no-fill does not deduct cash or create a lot',()=>{
  const r=run(pair(at(0)),[plan(at(0),'BUY',id,{force_no_fill:true})]);
  assert.equal(r.synthetic_buys,0);
  assert.equal(r.synthetic_no_fills,1);
  assert.equal(r.ending_cash_test_usdc,5000);
  assert.equal(r.ticks[5].attempts[0].reason,'INJECTED_TEST_NO_FILL');
});
test('without verified synthetic exit quotes, lot stays open unmarked at end',()=>{
  const r=run(pair(at(0)),[plan(at(0))]);
  assert.equal(r.synthetic_buys,1);
  assert.equal(r.synthetic_sells,0);
  assert.equal(r.synthetic_open_positions.length,1);
  assert.equal(r.synthetic_open_positions[0].unrealized_pnl_unverified,true);
  assert.equal(r.ending_cash_test_usdc,4950);
  assert.equal(r.ticks[6].attempts[0].reason,'CANNOT_CHECK_EXIT_NO_FRESH_TWO_SOURCE_QUOTES');
});
test('the same EVM token cannot be bought twice through differently cased other pool',()=>{
 const first={chain:'base',contract:'0xABCDEF1111111111',pool:'0xPOOL111111111111'};
 const second={chain:'base',contract:'0xabcdef1111111111',pool:'0xPOOL222222222222'};
 const r=run([...pair(at(0),1,100000,first),...pair(at(1),1,100000,second)],
  [plan(at(0),'BUY',first),plan(at(1),'BUY',second)]);
 assert.equal(r.synthetic_buys,1);
 assert.equal(r.synthetic_no_fills,1);
 assert.equal(r.ticks[6].attempts.at(-1).reason,'TOKEN_POSITION_ALREADY_OPEN_OTHER_POOL');
});
test('post-event oracle, nonprecommitted and live directives are rejected',()=>{
 const bad={...plan(at(0)),future_winner_label:true};
 const bad2={...plan(at(0)),plan_id:'notearly1234',precommitted_at_utc:at(0)};
 const invalid={...quote(at(0),'Alpha'),synthetic_fixture:false};
 const r=run([invalid,...pair(at(0))],[bad,bad2]);
 assert.equal(r.invalid_plans.length,2);
 assert.equal(r.invalid_synthetic_quote_inputs.length,1);
 assert.equal(r.synthetic_buys,0);
 assert.throws(()=>runV20IsolatedScenario({scenario_kind:'LIVE',observations:[],plans:[]}),
   /INVALID_SYNTHETIC_SCENARIO_INPUT/);
});
test('capacity, cash, and action idempotence are bounded',()=>{
 const r=run([...pair(at(0),1,5000)],
  [plan(at(0)),plan(at(0),'SELL')]);
 assert.equal(r.synthetic_buys,1);
 assert.equal(r.synthetic_no_fills,1);
 assert.equal(r.ticks[5].attempts.at(-1).reason,'ONE_MARKET_ACTION_PER_TICK');
 assert.equal(r.ending_cash_test_usdc,4950);
 const small=run(pair(at(0),1,4999),[plan(at(0))]);
 assert.equal(small.synthetic_buys,0);
 assert.equal(small.ticks[5].attempts[0].reason,'INSUFFICIENT_LIQUIDITY');
});
