// D4-04: positions from isolated MODEL receipts only. Consumes already
// available observations, never fetches, publishes or settles a SELL.
import {inspectProtectiveExit} from './protective-exit.mjs';
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
export function auditOfflineProtectiveExits({
 modeledReceipts=[],samples=[],asOfUtc
}={}){
 const now=ms(asOfUtc);
 if(now===null||!Array.isArray(modeledReceipts)||!Array.isArray(samples)
  ||samples.length>1000||modeledReceipts.length>10000)
   throw Error('INVALID_OFFLINE_PROTECTIVE_AUDIT');
 const buys=new Map(),closed=new Map(),results=[];
 for(const r of modeledReceipts){
  if(r?.status!=='MODELED_FILL_NOT_CLIENT'
   ||r.provenance!=='SYNTHETIC_REPLAY_ONLY'
   ||r.verified_client_fill!==false||r.github_order_published!==false
   ||!['BUY','SELL'].includes(r.action)||ms(r.timestamp)===null
   ||ms(r.timestamp)>now||!r.id||!r.coin)
   throw Error('UNTRUSTED_MODEL_RECEIPT_FOR_PROTECTIVE_AUDIT');
  if(r.action==='BUY')buys.set(r.id,r);
  else closed.set(r.id,r);
 }
 for(const [index,row] of samples.entries()){
  const at=ms(row?.as_of_utc),buy=buys.get(row?.model_buy_order_id);
  if(at===null||at>now||!buy||at<ms(buy.timestamp))
   throw Error('INVALID_PROTECTIVE_TIME_OR_BUY_LOT');
  const alreadyClosed=[...closed.values()].some(r=>
   r.coin.chain===buy.coin.chain&&r.coin.contract===buy.coin.contract
   &&r.coin.pool===buy.coin.pool&&ms(r.timestamp)<=at);
  if(alreadyClosed){results.push({index,as_of_utc:row.as_of_utc,
   status:'MODEL_POSITION_ALREADY_CLOSED',order_created:false});continue;}
  const risk=inspectProtectiveExit({
   asOfUtc:row.as_of_utc,
   position:{coin:buy.coin,entryPrice:buy.execution_price_usdc,
    quantity:buy.quantity,costTestUsdc:buy.amount_test_usdc,
    sourceOrderId:buy.id},
   observations:row.observations??[]
  });
  results.push({index,as_of_utc:row.as_of_utc,
   model_buy_order_id:buy.id,
   status:risk.status,code:risk.code,
   trigger_reason:risk.trigger_reason??null,
   estimated_only_pnl_test_usdc:risk.estimated_pnl_test_usdc??null,
   quote_authenticity_verified:false,actual_exit_executed:false,
   verified_client_receipt:null,order_created:false});
 }
 return {schema:1,kind:'R29_V19_OFFLINE_PROTECTIVE_EXIT_RESEARCH',
  evaluated_samples:results.length,checks:results,
  review_cadence_independent:true,
  all_inputs_are_detached_model_research:true,
  paper_fills:0,orders_created:0,actual_client_position_state_accessed:false,
  unverified_quote_never_promoted_to_executable:true};
}
