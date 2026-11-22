// D4-01: the ONE Dot4 strategy is evaluated both as-of and current PAPER
// against identical evidence, and publication remains fail-closed until
// external Dot3 authentication, independent quote and sellability all pass.
// No second rule engine, no GitHub write, no order creation or client fill.
import {assessDot4PaperDecision} from './v18-dot4-live-decision.mjs';
import {validateDot3OrderBeforePublish} from './v19-dot3-authenticated-gate.mjs';
const allowed=new Set(['BUY','WATCH','HOLD','SELL','DATA_GAP']);
export async function auditOfflineDot4OrderBoundary({
 snapshot,asOfUtc,priorObservation=null,position=null,
 lastLossAtUtc=null,fullReviewDue=true,
 syntheticRegressionOnly=false,proposedOrder=null
}={}){
 const params={snapshot,asOfUtc,priorObservation,position,lastLossAtUtc,
  fullReviewDue,allowSyntheticForRegression:syntheticRegressionOnly};
 const current=assessDot4PaperDecision({...params,evaluationMode:'LIVE_PAPER'});
 const past=assessDot4PaperDecision({...params,evaluationMode:'HISTORICAL_ASOF'});
 if(!allowed.has(current.action)||current.action!==past.action
  ||current.reason!==past.reason||current.paper_order_authorized!==false
  ||past.paper_order_authorized!==false)
  throw Error('D4_COMMON_STRATEGY_LIVE_ASOF_PARITY_FAILED');
 const requested=!!proposedOrder;
 let signed=null;
 if(requested){
  if(!['BUY','SELL'].includes(current.action)
   ||proposedOrder?.action!==current.action
   ||proposedOrder.coin?.chain!==snapshot.coin.chain
   ||proposedOrder.coin?.pool!==snapshot.coin.pool
   ||proposedOrder.coin?.contract!==snapshot.coin.contract)
   throw Error('D4_ORDER_INTENT_NOT_FROM_SHARED_DECISION');
  // Untrusted caller-supplied contents, claimed blob SHA or key may NEVER
  // replace independently fetched, pinned issuer/source proofs. Always use
  // unavailable callback in this stand-alone offline workflow.
  signed=await validateDot3OrderBeforePublish({
   order:proposedOrder,nowUtc:asOfUtc,
   read:async()=>{throw Error('NO_INDEPENDENT_GITHUB_RISK_BLOBS_IN_OFFLINE_REPLAY');}
  });
  if(signed.trade_authorized===true)
   throw Error('UNEXPECTED_UNAUTHENTICATED_DOT3_ORDER_PROMOTION');
 }
 return {schema:1,kind:'R29_V19_D401_COMMON_DOT4_TO_SIGNED_ORDER_BOUNDARY',
  as_of_utc:asOfUtc,
  common_kernel_model:'UNIFIED_V18_SIGNAL_V1',
  both_evaluation_modes_identical:true,
  source_class:syntheticRegressionOnly?'SYNTHETIC_MODEL_TEST_ONLY':'RESEARCH_ONLY',
  action:current.action,reason:current.reason,
  signed_paper_order_attempted_as_read_only_validation:requested,
  independent_dot3_status:signed?.status??'NOT_ATTEMPTED',
  independent_dot3_failure_code:signed?.code??null,
  external_issuer_trust_anchor_present:false,
  independently_authenticated_quotes_present:false,
  onchain_sellability_proven:false,
  orders_created:0,orders_published:0,
  existing_windows_paper_account_touched:false,client_fills_verified:0,
  paper_order_authorized:false};
}
