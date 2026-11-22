// QA-04 / SYS-09: audit only the detached in-memory REPLAY ledger.
// No GitHub orders, Windows paper-client fills, provider calls, or oracle PnL.
// Research receipts must never be interchangeable with client receipts.
const round=n=>Math.round((n+Number.EPSILON)*1e8)/1e8;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const fail=m=>{throw Error('INVALID_ISOLATED_MODEL_LEDGER_'+m);};

export function auditOfflineReplayLedger({report}={}){
 if(report?.kind!=='R29_V18_ON_DEMAND_FIVE_ROLE_SHADOW_BACKTEST'
  ||!Array.isArray(report.isolated_model_receipts)
  ||!Array.isArray(report.isolated_model_trade_history)
  ||!finite(report.start_capital_test_usdc)||report.start_capital_test_usdc<=0
  ||!finite(report.model_ending_cash_test_usdc)
  ||report.confirmed_paper_orders!==0||report.confirmed_paper_fills!==0
  ||report.historical_proven_trades!==0||report.historical_gpt_dot_runs!==0)
  fail('UNTRUSTED_REPORT');
 const receipts=report.isolated_model_receipts;
 const history=report.isolated_model_trade_history;
 if(receipts.length!==history.length)fail('RECEIPT_TRADE_HISTORY_COUNT');
 const ids=new Set(),buys=new Map(),closed=new Set();
 let cash=report.start_capital_test_usdc,buyCount=0,sellCount=0;
 const details=[];
 for(let i=0;i<receipts.length;i++){
  const r=receipts[i],h=history[i];
  if(r?.status!=='MODELED_FILL_NOT_CLIENT'
   ||r.model_exchange_status!=='PAPER_FILLED'
   ||r.provenance!=='SYNTHETIC_REPLAY_ONLY'
   ||r.simulated!==true
   ||r.verified_client_fill!==false
   ||r.github_order_published!==false
   ||r.sequence!==i+1
   ||typeof r.id!=='string'||ids.has(r.id)
   ||!['BUY','SELL'].includes(r.action)
   ||h?.order_id!==r.id||h.action!==r.action
   ||h.receipt_sequence!==r.sequence
   ||!finite(r.execution_price_usdc)||r.execution_price_usdc<=0
   ||!finite(r.fee_test_usdc)||r.fee_test_usdc<0
   ||!finite(r.cash_after_test_usdc))
    fail('RECEIPT_OR_ORDER_PROVENANCE');
  ids.add(r.id);
  if(r.action==='BUY'){
   if(!finite(r.amount_test_usdc)||r.amount_test_usdc!==report.amount_per_coin_test_usdc
    ||!finite(r.quantity)||r.quantity<=0
    ||buys.has(r.id)||h.position_source_order_id!==r.id)
     fail('INVALID_BUY_LOT');
   buys.set(r.id,{receipt:r,trade:h});
   buyCount++;cash=round(cash-r.amount_test_usdc);
  }else{
   if(!finite(r.proceeds_test_usdc)||r.proceeds_test_usdc<=0
    ||!finite(r.realized_pnl_test_usdc)
    ||!buys.has(h.position_source_order_id)
    ||closed.has(h.position_source_order_id)
    ||r.quantity!==buys.get(h.position_source_order_id).receipt.quantity)
    fail('INVALID_SELL_LOT');
   const entry=buys.get(h.position_source_order_id).receipt;
   if(Math.abs(r.realized_pnl_test_usdc-
     round(r.proceeds_test_usdc-entry.amount_test_usdc))>0.00000002)
     fail('SELL_REALIZED_PNL_INCONSISTENT');
   closed.add(h.position_source_order_id);
   sellCount++;cash=round(cash+r.proceeds_test_usdc);
  }
  if(cash<0||Math.abs(cash-r.cash_after_test_usdc)>0.00000002)
   fail('CASH_DOES_NOT_BALANCE');
  details.push({model_order_id:r.id,action:r.action,sequence:r.sequence,
   simulated_at_utc:r.timestamp,verified_model_cash_after:r.cash_after_test_usdc,
   associated_buy_lot_id:h.position_source_order_id,
   client_fill:false});
 }
 if(buyCount!==report.model_replay_summary?.buys
  ||sellCount!==report.model_replay_summary?.sells
  ||Math.abs(cash-report.model_ending_cash_test_usdc)>0.00000002
  ||buys.size-closed.size!==report.model_open_positions
  ||report.model_ending_cash_test_usdc<0)fail('MODEL_END_STATE_MISMATCH');
 const value=round([...closed].reduce((sum,lotId)=>{
  const sale=receipts.find((r,i)=>r.action==='SELL'
   &&history[i].position_source_order_id===lotId);
  return sum+(sale?.realized_pnl_test_usdc||0);
 },0));
 return {schema:1,kind:'R29_V19_OFFLINE_MODEL_LEDGER_AUDIT',
  status:'MODEL_CASH_AND_LOTS_RECONCILED',
  date:report.date,starting_cash_test_usdc:report.start_capital_test_usdc,
  modeled_cash_end_test_usdc:cash,
  modeled_buys:buyCount,modeled_sells:sellCount,
  modeled_open_lots:buys.size-closed.size,
  modeled_realized_pnl_test_usdc:value,
  model_receipt_count:receipts.length,unique_order_ids:ids.size,
  modeled_actions:details,
  input_historical_source_status:report.status,
  synthetic_model_not_actual_historical_pnl:true,
  client_paper_fills:0,actual_gpt_dot_runs:0,
  published_orders:0,real_wallet_changes:0,
  provider_requests_made_by_audit:0,
  verifies_remote_Windows_state:false};
}
