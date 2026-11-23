// Dot4's CURRENT/Live-PAPER input adapter. Also callable in historical replay.
// Both time modes use the same checkUnifiedEvidence + decideUnifiedMarket modules.
// This adapter DOES NOT create a PAPER order or modify any account or GitHub file.
import {checkUnifiedEvidence} from './v18-shared-evidence-gate.mjs';
import {decideUnifiedMarket} from './unified-decision-v18.mjs';
import {resolveSharedPaperPolicy,DEFAULT_BUDGET_SETTINGS} from './v19-paper-budget-policy.mjs';
const time=x=>{
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x))
  return null;
 const n=Date.parse(x);
 return Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===x.slice(0,19)?n:null;
};
export function assessDot4PaperDecision({
  snapshot,asOfUtc,priorObservation=null,position=null,lastLossAtUtc=null,
  fullReviewDue=false,params={},allowSyntheticForRegression=false,
  evaluationMode='LIVE_PAPER',
  paperBudgetSettings=DEFAULT_BUDGET_SETTINGS
}={}){
 const at=time(asOfUtc);
 const budget=resolveSharedPaperPolicy(paperBudgetSettings);
 if(at===null||typeof fullReviewDue!=='boolean'||
    !['LIVE_PAPER','HISTORICAL_ASOF'].includes(evaluationMode))
  throw Error('INVALID_DOT4_TIME_OR_CADENCE');
 if(snapshot?.provenance==='SYNTHETIC_TEST'&&!allowSyntheticForRegression)
   return {schema:1,kind:'R29_V18_DOT4_COMMON_DECISION',action:'WATCH',
     reason:'SYNTHETIC_DATA_NOT_LIVE',evidence_status:'BLOCKED',
     paper_order_authorized:false,actual_gpt_order:false};
 const reason=checkUnifiedEvidence(snapshot,at,budget.policy);
 if(reason!==null)return {schema:1,kind:'R29_V18_DOT4_COMMON_DECISION',
     action:'WATCH',reason:'EVIDENCE_'+reason,
     evidence_status:'NOT_ELIGIBLE_YET',risk_recheck_required:true,
     paper_order_authorized:false,actual_gpt_order:false};
 const average=snapshot.quotes.reduce((sum,q)=>sum+q.price_usdc,0)/snapshot.quotes.length;
 const decision=decideUnifiedMarket({asOfUtc,observedAtUtc:snapshot.observed_at_utc,
     observedPriceUsd:average,priorAtUtc:priorObservation?.at_utc||null,
     priorPriceUsd:priorObservation?.price_usd??null,
     position,lastLossAtUtc,fullReviewDue,params});
 return {schema:1,kind:'R29_V18_DOT4_COMMON_DECISION',
   action:decision.action,reason:decision.reason,
   observed_momentum_pct:decision.observed_momentum_pct??null,
   observed_move_pct:decision.observed_move_pct??null,
   evidence_status:'POINT_IN_TIME_GATES_PASS',
   decision_model:'UNIFIED_V18_SIGNAL_V1',
   shared_paper_budget_policy_id:budget.policy_id,
   research_coin_stake_test_usdc:budget.policy.entryAmount,
   contract:snapshot.coin.contract,pool:snapshot.coin.pool,chain:snapshot.coin.chain,
   observed_at_utc:snapshot.observed_at_utc,as_of_utc:asOfUtc,
   paper_order_authorized:false,actual_gpt_order:false,
   caution:'Deterministic recommendation only. Dot3 authentic blob verification and publisher/client receipt remain separate.'};
}
