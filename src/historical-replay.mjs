// Historical R29 replay. ALL timestamps must be point-in-time, never retrospective hindsight.
// Produces isolated virtual state; does not write orders, GitHub data, or wallets.
import {newState,settlePaper,Reject} from './core.mjs';
import {researchDue} from './cadence.mjs';
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
export function strictTime(value){
  if(typeof value!=='string'||!ISO.test(value)||!Number.isFinite(Date.parse(value)))
    throw Error('TIMESTAMP_NOT_FULLY_VERIFIED');
  return Date.parse(value);
}
function verifiedAt(tick,decision){
  try{
    const issued=strictTime(decision.issued_at_utc);
    if(issued>tick||tick-issued>120000)return false;
    if(!Array.isArray(decision.evidence)||decision.evidence.length<2)return false;
    for(const s of decision.evidence){
      const pub=strictTime(s.source_published_at_utc);
      const seen=strictTime(s.observed_at_utc);
      if(pub>issued||seen>issued||pub>tick||seen>tick)return false;
      if(!s.source_url||!s.pool)return false;
    }
    return true;
  }catch{return false;}
}
export function replayHistoricalDay({date,reviewTarget=4,point_in_time_decisions=[],openingCash=5000}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('INVALID_REPLAY_DATE');
  const start=strictTime(date+'T00:00:00Z'),end=start+86400000;
  if(![4,8,12,24].includes(reviewTarget))throw Error('INVALID_REVIEW_TARGET');
  if(!Array.isArray(point_in_time_decisions))throw Error('INVALID_DECISION_INPUT');
  const policy={startingBalance:openingCash,entryAmount:50,maxPositions:30,maxQuoteAgeMs:90000,maxOrderAgeMs:300000,maxQuoteDivergencePct:3,minLiquidityUsd:5000,maxLiquidityUtilizationPct:1,feeBps:75,simulatedSpreadBps:40,simulatedImpactMultiplier:.5};
  let state=newState(policy),lastReview=null;
  const trace=[],reviews=[],executions=[],processedIds=new Set();
  const stamp=t=>new Date(t).toISOString();
  for(let hour=0;hour<24;hour++){
    const offset=start+hour*3600000;
    const slots=[['dot-1',5],['dot-2',15],['dot-3',25],['dot-4',35],['dot-5',45]];
    for(const [dot,minute] of slots){
      const tick=offset+minute*60000;
      const row={dot,at_utc:stamp(tick),status:'REPLAY_ONLY'};
      if(dot==='dot-1'){row.status='DATA_GAP_HOLD_TARGET';row.target_per_24h=reviewTarget;}
      if(dot==='dot-2'){row.status='NO_POINT_IN_TIME_DISCOVERY_ARCHIVE';}
      if(dot==='dot-3'){row.status='NO_POINT_IN_TIME_RISK_OR_QUOTES_ARCHIVE';}
      if(dot==='dot-4'){
        const gate=researchDue(stamp(tick),lastReview,reviewTarget);
        if(!gate.due){row.status='REVIEW_NOT_DUE';row.next_due_at_utc=gate.nextDue;}
        else{
          lastReview=stamp(tick);
          row.status='NO_TRADE_DATA_GAP';row.review='FULL_SHADOW_REVIEW';
          const matching=point_in_time_decisions.filter(d=>d.issued_at_utc===stamp(tick));
          for(const decision of matching){
            const order=decision.order;
            if(!order||processedIds.has(order.id)){row.status='REJECTED_DUPLICATE_OR_MISSING_ID';continue;}
            processedIds.add(order.id);
            if(!verifiedAt(tick,decision)){executions.push({at_utc:stamp(tick),id:order.id,status:'BLOCKED_NO_POINT_IN_TIME_EVIDENCE'});continue;}
            try{
              const result=settlePaper(order,state,tick,policy);
              state=result.state;
              executions.push({at_utc:stamp(tick),id:order.id,action:order.action,status:'SYNTHETIC_REPLAY_FILL',cash_after_test_usdc:result.receipt.cash_after_test_usdc,realized_pnl_test_usdc:result.receipt.realized_pnl_test_usdc??null});
              row.status='SYNTHETIC_REPLAY_ORDER';
            }catch(err){
              executions.push({at_utc:stamp(tick),id:order.id,status:'BLOCKED_BY_EXECUTOR',code:err instanceof Reject?err.code:'UNEXPECTED_ERROR'});
            }
          }
          reviews.push({at_utc:stamp(tick),status:row.status,usable_strategy_evidence:matching.length});
        }
      }
      if(dot==='dot-5'){row.status='SHADOW_QA_ONLY';row.synthetic_replay_fills=executions.filter(x=>x.status==='SYNTHETIC_REPLAY_FILL').length;}
      trace.push(row);
    }
  }
  return {schema:1,mode:'HISTORICAL_SHADOW_REPLAY_ONLY',date,window_start_utc:stamp(start),window_end_utc:stamp(end),
    review_target_per_24h:reviewTarget,roles_wakes:trace.length,full_reviews:reviews.length,reviews,
    executed_real_dot_orders:0,real_client_receipts:0,synthetic_replay_fills:executions.filter(x=>x.status==='SYNTHETIC_REPLAY_FILL').length,
    synthetic_replay_executions:executions,opening_cash_test_usdc:openingCash,ending_cash_test_usdc:state.cash,
    open_replay_positions:Object.keys(state.positions).length,trace,
    caveat:'No retrospective source can be treated as known intraday without an archived publication timestamp. No live GPT trades were run in 2026-10-12. Synthetic replay fills, if any, are test-only.'};
}
