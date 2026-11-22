// D5-06: oracle, hypothetical model, and client-acknowledged PAPER are
// three separate ledgers. An empty or DATA_GAP ledger has UNKNOWN return.
const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function buildSeparatedPerformanceLedgers({replayReport,asOfUtc}={}){
 const at=time(asOfUtc);
 if(at===null||replayReport?.kind!=='R29_V18_ON_DEMAND_FIVE_ROLE_SHADOW_BACKTEST'
  ||time(replayReport.end_utc)===null||time(replayReport.end_utc)>at)
  throw Error('INVALID_THREE_LEDGER_REPORT');
 const summary=replayReport.model_replay_summary;
 if(!summary||!Number.isInteger(summary.buys)||!Number.isInteger(summary.sells)
  ||!Number.isInteger(summary.dataGap))
  throw Error('INVALID_MODEL_LEDGER_SUMMARY');
 const cash=num(replayReport.model_ending_cash_test_usdc);
 const start=num(replayReport.start_capital_test_usdc);
 const open=replayReport.model_open_positions;
 const complete=Number.isInteger(open)&&open===0&&summary.buys>0
  &&summary.sells>0&&cash!==null&&start!==null;
 const modelPnl=complete?Math.round((cash-start)*1e8)/1e8:null;
 const historicalGap=replayReport.status==='DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE';
 return {schema:1,kind:'R29_D5_06_STRICT_THREE_LEDGER_REPORT',
  as_of_utc:asOfUtc,date:replayReport.date,
  ledgers:{
   ORACLE_UPPER_BOUND:{origin:'POST_EVENT_ORACLE_ONLY',
    evaluated_reference_coins:0,trade_count:null,
    gross_profit_test_usdc:null,pnl_test_usdc:null,return_pct:null,
    used_for_entry_decisions:false,estimated_oracle_profit_not_known:true},
   DETERMINISTIC_PAPER_MODEL:{origin:'SHADOW_OR_SYNTHETIC_NOT_CLIENT',
    buy_count:summary.buys,sell_count:summary.sells,
    open_position_count:Number.isInteger(open)?open:null,
    source_authenticity_verified:false,
    incomplete_historical_market:historicalGap,
    realized_model_pnl_test_usdc:modelPnl,
    return_pct:modelPnl===null||start===0?null:Math.round(modelPnl/start*10000)/100,
    model_pnl_is_not_client_pnl:true},
   AUTHENTICATED_CLIENT_PAPER:{origin:'CLIENT_CONFIRMED_ONLY',
    independently_verified_receipts:0,confirmed_fills:0,
    starting_balance_test_usdc:null,ending_balance_test_usdc:null,
    realized_pnl_test_usdc:null,return_pct:null,
    client_wallet_not_read:true}
  },
  do_not_sum_across_ledgers:true,
  zero_trades_does_not_imply_zero_return:true,
  data_gap_is_not_a_loss_or_zero_performance:true,
  no_future_oracle_in_model:true,no_phantom_client_fills:true};
}
