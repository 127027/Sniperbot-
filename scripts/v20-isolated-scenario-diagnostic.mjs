// Explicit read-only software diagnostic, no input files, no GitHub, APIs or orders.
// No arg: valid empty October evidence -> DATA_GAP; --synthetic-fixture: fabricated
// test quotes and fixed plan -> only tests portfolio math, NOT a trading strategy.
import {runV20IsolatedScenario,auditV20IsolatedScenario} from '../src/v20-isolated-scenario.mjs';

const args=process.argv.slice(2);
if(args.length>1||(args.length===1&&args[0]!=='--synthetic-fixture'))
  throw Error('ALLOWED_ARGS_NONE_OR_SYNTHETIC_FIXTURE_ONLY');

const iso=h=>'2026-10-12T'+String(h).padStart(2,'0')+':00:00.000Z';
const instrument={chain:'solana',contract:'SyntheticContract11111',
  pool:'SyntheticPool111111111'};
const syntheticQuotes=(at,price)=>['alpha-provider','bravo-provider'].map((p,i)=>({
  ...instrument,synthetic_fixture:true,event_kind:'SYNTHETIC_QUOTE',
  source_provider:p,price_test_usdc:price,liquidity_test_usdc:100000,
  published_at_utc:at,available_at_utc:at,captured_at_utc:at,
  source_origin_verified:true,original_bytes_verified:true,
  source_blob_sha:(i===0?'a':'b').repeat(40)
}));
const demo=args.includes('--synthetic-fixture');
const scenario=runV20IsolatedScenario({
  observations:demo?[...syntheticQuotes(iso(0),1),...syntheticQuotes(iso(1),1.5)]:[],
  plans:demo?[{...instrument,synthetic_fixture:true,plan_kind:'FIXED_TEST_PLAN',
    plan_id:'synthetic-plan-0001',precommitted_at_utc:'2026-10-11T18:59:00.000Z',
    at_utc:iso(0),action:'BUY'}]:[]
});
const internalAudit=auditV20IsolatedScenario(scenario);
const report={
  schema:1,kind:'R29_V20_READ_ONLY_SOFTWARE_DIAGNOSTIC',
  status:demo?'SYNTHETIC_MATH_EXERCISED_NOT_OCTOBER_TRADING':
    'DATA_GAP_NO_ORIGINAL_OCTOBER_QUOTE_INPUT',
  scenario_type:scenario.mode,
  warmup_hours:scenario.warmup_hour_count,
  decision_hours:scenario.decision_hour_count,
  hypothetical_test_cash_start:scenario.starting_cash_test_usdc,
  hypothetical_test_cash_end:scenario.ending_cash_test_usdc,
  synthetic_buys:scenario.synthetic_buys,
  synthetic_sells:scenario.synthetic_sells,
  synthetic_no_fills:scenario.synthetic_no_fills,
  synthetic_open_positions:scenario.synthetic_open_positions.length,
  synthetic_realized_pnl_test_usdc:scenario.synthetic_realized_pnl_test_usdc,
  internal_synthetic_ledger_audit:internalAudit.status,
  real_historical_trades_verified:0,
  real_gpt_reviews_verified:0,
  actual_windows_client_fills:0,
  real_market_profit_estimate:null,
  original_qa04_approved:false,
  order_writes:0,
  no_network_or_client_state_access:true
};
console.log('R29_V20_OFFLINE_DIAGNOSTIC '+JSON.stringify(report));
