// R29 SYS-09, D4-09, D5-02, D5-06: read-only verification of a
// SUPPLIED Windows/local paper-client snapshot. No direct client read here,
// no reset, API call, order write or manufactured fill.
// A consistent local PAPER record is not an onchain or independent broker fill.
import {createHash} from 'node:crypto';
import {marketKey} from './core.mjs';

const n=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');
const round=x=>Math.round(x*1e8)/1e8;

export function inspectReadOnlyLocalPaperSnapshot({
 rawStateJson,asOfUtc,originalStartingTestUsdc=5000,
 defaultStakeTestUsdc=50
}={}){
 const at=ms(asOfUtc);
 if(typeof rawStateJson!=='string'||rawStateJson.length>20*1024*1024
  ||at===null||!n(originalStartingTestUsdc)||originalStartingTestUsdc<=0
  ||!n(defaultStakeTestUsdc)||defaultStakeTestUsdc<=0)
  throw Error('INVALID_READONLY_LOCAL_PAPER_INPUT');
 const originalSha256=digest(rawStateJson);
 let state;
 try{state=JSON.parse(rawStateJson);}catch{
  throw Error('LOCAL_PAPER_STATE_NOT_VALID_JSON');
 }
 if(state?.schema!==1||state?.mode!=='PAPER_ONLY'
  ||!n(state.cash)||!state.positions||typeof state.positions!=='object'
  ||!state.receipts||typeof state.receipts!=='object'
  ||!state.processed||typeof state.processed!=='object'
  ||!Array.isArray(state.trade_history))
  throw Error('UNSUPPORTED_READONLY_PAPER_STATE_SCHEMA');
 const blockers=[],safe=(code)=>{if(!blockers.includes(code))blockers.push(code);};
 const receipts=Object.entries(state.receipts);
 const seenSequence=new Set(),filled=[],rejected=[];
 for(const [id,w] of receipts){
  const r=w?.data,processed=state.processed[id];
  if(!r||r.id!==id||!processed||r.status!==processed.status
   ||ms(r.timestamp)===null||ms(r.timestamp)>at
   ||!['PAPER_REJECTED','PAPER_FILLED'].includes(r.status)){
   safe('INCONSISTENT_PROCESSED_RECEIPT');continue;
  }
  if(r.status==='PAPER_REJECTED'){
   rejected.push(r);
   if(typeof r.reason_code!=='string'||!r.reason_code)
    safe('UNEXPLAINED_REJECTION');
   continue;
  }
  filled.push(r);
  if(!['BUY','SELL'].includes(r.action)||!n(r.sequence)
   ||!Number.isInteger(r.sequence)||r.sequence<1
   ||seenSequence.has(r.sequence)||r.mode!=='PAPER'||r.simulated!==true)
   safe('INVALID_OR_DUPLICATED_FILL_SEQUENCES');
  seenSequence.add(r.sequence);
  if(!r.coin||typeof r.coin.chain!=='string'
   ||typeof r.coin.contract!=='string'||typeof r.coin.pool!=='string')
   safe('FILL_IDENTITY_MISSING');
 }
 if(Object.keys(state.processed).length!==receipts.length)
  safe('PROCESSED_AND_RECEIPT_COUNT_MISMATCH');
 const events=new Map();
 for(const e of state.trade_history){
  if(typeof e?.order_id!=='string'||events.has(e.order_id)
   ||!['BUY','SELL'].includes(e.action)||ms(e.filled_at_utc)===null
   ||ms(e.filled_at_utc)>at)
   safe('INVALID_OR_DUPLICATED_TRADE_EVENT');
  else events.set(e.order_id,e);
 }
 if(events.size!==filled.length)safe('FILLED_RECEIPT_HISTORY_MISMATCH');
 let expectedCash=originalStartingTestUsdc;
 const buyLots=new Map(),soldLots=new Set();
 for(const r of [...filled].sort((a,b)=>a.sequence-b.sequence)){
  const e=events.get(r.id);
  if(!e||e.action!==r.action||e.receipt_sequence!==r.sequence
   ||e.filled_at_utc!==r.timestamp)
   safe('TRADE_EVENT_DOES_NOT_MATCH_RECEIPT');
  if(r.action==='BUY'){
   if(!n(r.amount_test_usdc)||r.amount_test_usdc<=0||!n(r.quantity)
     ||r.quantity<=0||!n(r.execution_price_usdc)||r.execution_price_usdc<=0)
    {safe('INVALID_BUY_FINANCIALS');continue;}
   if(r.amount_test_usdc!==defaultStakeTestUsdc)
    safe('NONSTANDARD_HISTORIC_STAKE_REQUIRES_POLICY_EVIDENCE');
   expectedCash-=r.amount_test_usdc;
   buyLots.set(r.id,{coin:r.coin,quantity:r.quantity,amount:r.amount_test_usdc,
    sequence:r.sequence});
   if(e?.position_source_order_id!==r.id)safe('BUY_SOURCE_LOT_MISMATCH');
  }else{
   if(!n(r.proceeds_test_usdc)||!n(r.quantity)||r.quantity<=0
     ||!n(r.execution_price_usdc)||r.execution_price_usdc<=0
     ||typeof e?.position_source_order_id!=='string')
    {safe('INVALID_SELL_FINANCIALS');continue;}
   expectedCash+=r.proceeds_test_usdc;
   const origin=buyLots.get(e.position_source_order_id);
   if(!origin||soldLots.has(e.position_source_order_id))
    safe('SELL_UNLINKED_OR_DUPLICATE_BUY_LOT');
   else{
    soldLots.add(e.position_source_order_id);
    if(origin.coin.chain!==r.coin?.chain
     ||origin.coin.contract!==r.coin?.contract
     ||origin.coin.pool!==r.coin?.pool
     ||Math.abs(origin.quantity-r.quantity)>1e-8)
     safe('SELL_WRONG_POOL_OR_QUANTITY');
    if(!n(r.realized_pnl_test_usdc)
     ||Math.abs(r.realized_pnl_test_usdc-round(r.proceeds_test_usdc-origin.amount))>1e-5)
     safe('SELL_PNL_NOT_RECONCILED');
   }
  }
 }
 let latestCash=originalStartingTestUsdc;
 for(const r of [...filled].sort((a,b)=>a.sequence-b.sequence)){
  if(r.action==='BUY'&&n(r.amount_test_usdc))latestCash=round(latestCash-r.amount_test_usdc);
  if(r.action==='SELL'&&n(r.proceeds_test_usdc))latestCash=round(latestCash+r.proceeds_test_usdc);
  if(!n(r.cash_after_test_usdc)
   ||Math.abs(latestCash-r.cash_after_test_usdc)>1e-5)
   safe('RECEIPT_CASH_BALANCE_NOT_RECONCILED');
 }
 if(Math.abs(round(expectedCash)-state.cash)>1e-5)
  safe('STATE_CASH_BALANCE_NOT_RECONCILED');
 const positionRows=[];
 for(const [key,p] of Object.entries(state.positions)){
  const coin=p?.coin;
  if(!coin||marketKey(coin)!==key||typeof p.sourceOrderId!=='string')
   {safe('INVALID_OPEN_POSITION_IDENTITY');continue;}
  const original=buyLots.get(p.sourceOrderId);
  if(!original||soldLots.has(p.sourceOrderId)
   ||original.coin.chain!==coin.chain
   ||original.coin.contract!==coin.contract
   ||original.coin.pool!==coin.pool
   ||!n(p.costTestUsdc)||p.costTestUsdc!==original.amount
   ||!n(p.quantity)||Math.abs(p.quantity-original.quantity)>1e-8)
   safe('OPEN_POSITION_LOT_DOES_NOT_MATCH_FILLED_BUY');
  positionRows.push({chain:coin.chain,
   key_sha256:digest(key),opening_buy_order_sha256:digest(p.sourceOrderId),
   original_cost_test_usdc:p.costTestUsdc});
 }
 const shouldRemain=[...buyLots.keys()].filter(id=>!soldLots.has(id));
 if(shouldRemain.length!==positionRows.length)
  safe('OPEN_POSITIONS_DO_NOT_MATCH_REMAINING_LOTS');
 if(!Number.isInteger(state.nextSequence)||state.nextSequence<1
  ||(seenSequence.size>0&&state.nextSequence<=Math.max(...seenSequence)))
  safe('SEQUENCE_COUNTER_NOT_MONOTONIC');
 if(!n(state.cash))safe('INVALID_CASH');
 const stateAccepted=blockers.length===0;
 return {schema:1,kind:'R29_V19_READ_ONLY_SUPPLIED_LOCAL_PAPER_PROOF',
  as_of_utc:asOfUtc,
  snapshot_sha256:originalSha256,
  local_client_id_sha256:typeof state.clientId==='string'?digest(state.clientId):null,
  source_type:'USER_SUPPLIED_LOCAL_FILE_BYTES_NOT_INDEPENDENTLY_RETRIEVED',
  status:stateAccepted?'LOCAL_PAPER_STATE_ACCOUNTING_CONSISTENT':
   'LOCAL_PAPER_STATE_REQUIRES_ATTENTION',
  blockers,opening_test_usdc:originalStartingTestUsdc,
  expected_cash_test_usdc:round(expectedCash),observed_cash_test_usdc:state.cash,
  modeled_filled_receipts:filled.length,
  rejected_receipts:rejected.length,
  processed_orders:Object.keys(state.processed).length,
  trade_history_events:state.trade_history.length,
  open_positions_count:positionRows.length,
  open_positions_references:positionRows,
  onchain_sellability_verified:false,
  independent_windows_origin_attested:false,
  actual_client_file_was_read_by_this_function:false,
  blockchain_settlements_or_transfers_verified:false,
  actual_external_market_performance_verified:false,
  orders_written:0,account_mutated:false,
  readiness_for_real_live_trading:false};
}
