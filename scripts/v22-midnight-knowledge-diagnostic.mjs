// Explicit R29 V2.2 SOFTWARE-ONLY 29h midnight-knowledge demonstration.
// Synthesized events are not October market data, GPT calls or client fills.
// No network, GitHub writes, input/output files, keys, orders, wallet, APIs.
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {auditOfflineReplayLedger} from '../src/v19-offline-replay-ledger-audit.mjs';
if(process.argv.length!==2)throw Error('SYNTHETIC_READONLY_DIAGNOSTIC_TAKES_NO_ARGS');
const date='2026-10-12',old='2026-08-01T00:00:00.000Z';
const coin={chain:'base',contract:'0x'+'a'.repeat(40),
 pool:'0x'+'b'.repeat(40),symbol:'SYNTHETIC_NOT_REAL'};
const quote=(at,price)=>({
 provenance:'SYNTHETIC_TEST',source_class:'SYNTHETIC_TEST',
 observed_at_utc:at,archived_at_utc:at,available_at_utc:at,
 coin,discovery:{observed_at_utc:at},risk:{
 status:'ELIGIBLE',observed_at_utc:at},
 quotes:[
  'https://dexscreener.com/base/'+coin.pool,
  'https://www.geckoterminal.com/base/pools/'+coin.pool
 ].map((source_url,i)=>({...coin,provider_id:'SYNTHETIC_'+i,source_url,
    observed_at:at,source_published_at_utc:at,
    price_usdc:price,liquidity_usdc:20000}))
});
const known=(at,market,type='HISTORICAL_CONTEXT')=>({
 kind:'R29_MARKET_KNOWLEDGE_EVENT',event_type:type,
 source_class:'SYNTHETIC_TEST',provenance:'SYNTHETIC_TEST',
 event_at_utc:at,archived_at_utc:at,available_at_utc:at,
 chain:market.chain,pool:market.pool,contract:market.contract
});
const discoveries=Array.from({length:82},(_,i)=>known(
 '2026-10-11T23:59:00.000Z',
 {chain:'base',
 contract:'0x'+(i+1).toString(16).padStart(40,'0'),
 pool:'0x'+(101+i).toString(16).padStart(40,'0')},
 'POOL_DISCOVERY'));
const manifest={
 schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',date,
 selected_from_future_winner_list:false,
 market_knowledge_events:[known(old,coin),...discoveries],
 snapshots:[quote('2026-10-11T23:31:00.000Z',1),
  quote('2026-10-11T23:59:00.000Z',1.10),
  quote('2026-10-12T00:59:00.000Z',1.50)],
 activity_observations:[]
};
const a=backtestOnRequest({date,manifest,firstScanAtStart:true});
const ledger=auditOfflineReplayLedger({report:a});
const t=a.role_audit.dot4_strategy.timeline;
if(t.length!==24||a.on_demand_29h_timeline.hourly_ticks!==29
 ||t[0].target_per_24h!==24
 ||t[0].asof_discovery_pools_last_60m!==82
 ||t[0].predecision_market_knowledge.markets_with_pre_warmup_knowledge<1
 ||!t[0].actions.some(x=>x.action==='BUY')
 ||!t[1].actions.some(x=>x.action==='SELL')
 ||ledger.modeled_buys!==1||ledger.modeled_sells!==1
 ||ledger.status!=='MODEL_CASH_AND_LOTS_RECONCILED'
 ||a.confirmed_paper_fills!==0||a.historical_gpt_dot_runs!==0)
 throw Error('R29_V22_MIDNIGHT_KNOWLEDGE_MODEL_DIAGNOSTIC_FAILED');
const noSource=backtestOnRequest({
 date,firstScanAtStart:true,forceHourlyDiagnostic:true});
const r={
 schema:1,kind:'R29_V22_COMPLETE_PRIOR_KNOWLEDGE_SYNTHETIC_DIAGNOSTIC',
 scenario:'SYNTHETIC_REGRESSION_NOT_HISTORICAL_TRADING',
 date,calendar_hours:29,decision_ticks:24,
 first_scan_utc:t[0].at_utc,
 first_scan_prior_markets:t[0].predecision_market_knowledge.available_knowledge_markets,
 first_scan_markets_known_before_five_hour_warmup:
   t[0].predecision_market_knowledge.markets_with_pre_warmup_knowledge,
 new_pool_activity_at_first_scan:t[0].asof_discovery_pools_last_60m,
 first_scan_adaptive_full_reviews_per_day:t[0].target_per_24h,
 first_scan_model_buy:t[0].actions.some(x=>x.action==='BUY'),
 second_scan_model_sell:t[1].actions.some(x=>x.action==='SELL'),
 synthetic_buys:ledger.modeled_buys,synthetic_sells:ledger.modeled_sells,
 synthetic_model_cash_end_test_usdc:ledger.modeled_cash_end_test_usdc,
 no_real_october_data_source_status:noSource.status,
 no_real_october_model_buys:noSource.model_replay_summary.buys,
 no_real_october_model_sells:noSource.model_replay_summary.sells,
 real_october_original_quotations_authenticated:0,
 actual_five_gpt_reviews_authenticated:0,
 real_client_fills:0,orders_written:0,
 no_post_event_oracle_winner_seeding:true,
 no_wallet_or_client_mutation:true,
 original_qa04_acceptance:false
};
console.log('R29_V22_MIDNIGHT_KNOWLEDGE_DIAGNOSTIC',JSON.stringify(r));
