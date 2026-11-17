// R29 unbiased ACTUAL GitHub courier delivery latency observability.
// Distinguishes GPT decision → laptop receipt from discovery → filled execution.
// Does not change a wallet, account, execution policy or strategy.
import {validateGptPaperDecision} from './gpt-paper-protocol.mjs';
export function auditGptPaperDelivery(decision,receipt,{now=Date.now()}={}){
 const nonProof=reason=>({
  schema:'sniper_r29_gpt_delivery_latency_audit.v1',
  mode:'PAPER_ONLY',delivery_verified:false,reason,
  decision_to_bot_receipt_ms:null,
  discovered_event_to_fill_ms:null,
  real_executable_buy_sell_quote_verified:false,
  genuine_live_paper_fill_verified:false,
  actual_model_signature_verified:false,
  paper_account_balance_read:false
 });
 if(!Number.isFinite(now))throw Error('R29_DELIVERY_AUDIT_CLOCK_INVALID');
 let valid;
 try{valid=validateGptPaperDecision(decision,{now})}
 catch{return nonProof('GPT_DECISION_SCHEMA_INVALID')}
 if(receipt?.schema!=='sniper_r29_public_gpt_paper_receipt.v1'||
  receipt.mode!=='PAPER_ONLY'||receipt.real_trading_enabled!==false||
  receipt.decision_id!==decision.decision_id||
  receipt.action!==decision.action||
  receipt.actionable!==false||
  receipt.wallet_touched!==false||
  receipt.account_balance_or_wallet_published!==false||
  receipt.submitted_by!=='GITHUB_OWNER_ATTRIBUTED_GPT_RELAY'||
  receipt.origin_model_signature_verified!==false||
  !['NO_TRADE','WATCH','HOLD','BUY','SELL'].includes(receipt.action)||
  typeof receipt.reason!=='string'||!/^[A-Z0-9_]{3,100}$/.test(receipt.reason)||
  !['NO_TRADE','WATCH','HOLD','BLOCKED','REJECTED','PAPER_FILLED'].includes(receipt.status)||
  typeof receipt.received_at_utc!=='string'||
  !receipt.received_at_utc.endsWith('Z'))
  return nonProof('GPT_PUBLIC_RECEIPT_MISMATCH_OR_INVALID');
 const start=Date.parse(decision.created_at_utc),end=Date.parse(receipt.received_at_utc);
 if(!Number.isFinite(start)||!Number.isFinite(end)||
  end<start||end>now+30000||end-start>24*3600000)
  return nonProof('GPT_DELIVERY_LATENCY_UNTRUSTED');
 if((!valid.trade&&receipt.status==='PAPER_FILLED')||
  (decision.action==='NO_TRADE'&&receipt.status!=='NO_TRADE'))
  return nonProof('GPT_RECEIPT_CANNOT_IMPLY_PAPER_FILL');
 const elapsed=end-start;
 return {schema:'sniper_r29_gpt_delivery_latency_audit.v1',
  mode:'PAPER_ONLY',
  delivery_verified:true,reason:'RECEIPT_MATCHED_OWNER_ATTRIBUTED_GITHUB_COURIER',
  decision_id:decision.decision_id,decision_action:decision.action,
  decision_created_at_utc:decision.created_at_utc,
  laptop_receipt_at_utc:receipt.received_at_utc,
  decision_to_bot_receipt_ms:elapsed,
  latency_class:elapsed<=5000?'AT_MOST_5_SECONDS':
   elapsed<=15000?'BETWEEN_5_AND_15_SECONDS':
   elapsed<=60000?'BETWEEN_15_AND_60_SECONDS':'OVER_60_SECONDS',
  discovered_event_to_fill_ms:null,
  actual_model_signature_verified:false,
  genuine_live_paper_fill_verified:false,
  real_executable_buy_sell_quote_verified:false,
  paper_account_balance_read:false,
  no_trade_does_not_establish_buy_latency:decision.action==='NO_TRADE',
  additional_latency_needed_for_trading:'MARKET_EVENT_TO_GPT_DECISION_AND_QUOTE_TO_LOCAL_FILL'
 };
}
