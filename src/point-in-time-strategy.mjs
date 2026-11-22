// Independent evidence-gated model strategy for ISOLATED historical replay.
// There is no network access, GitHub write, wallet, OpenAI call, or hindsight winner input.
// This is NOT the cloud GPT strategy; it tests that the same PAPER execution gates
// can create both BUY and SELL from pre-existing market observations.
import {newState,settlePaper,Reject,marketKey,DEFAULT_POLICY} from './core.mjs';
import {researchDue} from './cadence.mjs';
import {advanceAdaptiveCadence} from './v19-adaptive-cadence.mjs';
import {decideUnifiedMarket,UNIFIED_V18_RULES} from './unified-decision-v18.mjs';
import {buildAsOfLookback} from './v19-asof-lookback.mjs';
import {planDataGapRecovery} from './v19-coverage-recovery.mjs';
import {measureDot1Activity} from './v19-market-activity.mjs';

const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const ms=value=>typeof value==='string'&&ISO.test(value)&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
const iso=value=>new Date(value).toISOString();
import {checkUnifiedEvidence as gate,makeReplayCheckOrder as policyOrder} from './v18-shared-evidence-gate.mjs';
export function replaySignalDecisions({date,snapshots=[],activityObservations=[],activityPageCaptures=[],targetPer24h=4,forceHourlyReview=false,params={}}){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z')))
   throw Error('INVALID_DATE');
 if(![4,8,12,24].includes(targetPer24h))throw Error('INVALID_TARGET');
 if(typeof forceHourlyReview!=='boolean')throw Error('INVALID_FORCE_HOURLY');
 if(!Array.isArray(snapshots)||!Array.isArray(activityObservations)||!Array.isArray(activityPageCaptures))throw Error('INVALID_SNAPSHOTS');
 const start=ms(date+'T00:00:00Z'),end=start+86400000;
 const p={...UNIFIED_V18_RULES,...params};
 if(![p.entryMomentumPct,p.takeProfitPct,p.stopLossPct,p.maxMomentumAgeHours].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0))throw Error('INVALID_PARAMS');
 const state=newState(),initial=state.cash,events=[],sums={dataGap:0,available:0,fullReviews:0,buys:0,sells:0};
 let ledger=state,lastReview=null,sequence=0,currentTarget=targetPer24h,cadenceState=null;
 const history=new Map(),lastRealizedLoss=new Map();
 // Research features may use ALL older, genuinely available market history.
 // The common BUY kernel still limits its MOMENTUM BASELINE to two hours, and
 // the actual purchase/exit requires an entirely separate fresh Dot3 quote.
 const initialHistory=buildAsOfLookback({snapshots,asOfUtc:iso(start)});
 for(const h of initialHistory.markets)
   history.set(h.key,{price:h.latest_price_usdc,at_utc:h.latest_observed_at_utc});

 // Input MUST be independently collected and available at its own timestamp.
 // We evaluate every hour :35 and never preselect winners or sort by future performance.
 for(let hour=0;hour<24;hour++){
   const tick=start+hour*3600000+35*60000,at=iso(tick);
   // Dot 1 determines cadence from measured *as-of* activity on the first scan,
   // and on later hourly wakes. No evidence -> hold last setting.
   const activity=activityObservations.filter(x=>{
     const observed=ms(x?.observed_at_utc),captured=ms(x?.archived_at_utc);
     return observed!==null&&captured!==null&&observed<=tick&&captured<=tick
       &&tick-observed<=3600000&&x.provenance==='CONTEMPORANEOUS_RECORD'
       &&typeof x.source_archive_sha==='string'&&/^[0-9a-f]{40}$/.test(x.source_archive_sha);
   }).sort((a,b)=>ms(b.observed_at_utc)-ms(a.observed_at_utc))[0];
   const measured=activityPageCaptures.length
     ?measureDot1Activity({pageCaptures:activityPageCaptures,asOfUtc:at}):null;
   const cadenceMetrics=measured?.metrics?.dataAvailable?measured.metrics:activity?.metrics??null;
   const cadenceEval=forceHourlyReview?null:advanceAdaptiveCadence({
     previous:cadenceState,metrics:cadenceMetrics,asOfUtc:at,initialTarget:targetPer24h});
   if(cadenceEval)cadenceState=cadenceEval.state;
   const cadence=forceHourlyReview?{target:24,reason:'EXPLICIT_24_HOUR_DIAGNOSTIC'}
     :{target:cadenceEval.target,reason:cadenceEval.reason};
   currentTarget=cadence.target;
   const due=researchDue(at,lastReview,currentTarget).due;
   if(due){lastReview=at;sums.fullReviews++;}
   const valid=[],blocked=[];
   for(const s of snapshots){
     const observed=ms(s?.observed_at_utc);
     if(observed===null||observed>tick||tick-observed>600000)continue;
     const reason=gate(s,tick);
     if(reason){blocked.push({coin:s?.coin?.symbol||null,reason});continue;}
     valid.push(s);
   }
   valid.sort((a,b)=>String(a.coin.chain).localeCompare(String(b.coin.chain))||String(a.coin.contract).localeCompare(String(b.coin.contract))||String(a.coin.pool).localeCompare(String(b.coin.pool))||ms(a.observed_at_utc)-ms(b.observed_at_utc));
   const fresh=new Map();
   for(const s of valid)fresh.set(marketKey(s.coin),s);
   const featureHistory=buildAsOfLookback({snapshots,asOfUtc:at});
   const gapRecovery=planDataGapRecovery({asOfUtc:at,activityObservations});
   const step={at_utc:at,full_review:due,target_per_24h:currentTarget,cadence_reason:cadence.reason,
     measured_page_activity:measured,
     cadence_quiet_confirmations:cadenceState?.quiet_confirmations??0,
     eligible_snapshots:fresh.size,blocked_sources:blocked,
     data_gap_capture_recommendations:gapRecovery,
     past_only_feature_history:{market_count:featureHistory.market_count,
       observation_count:featureHistory.observation_count,
       oldest_observation_at_utc:featureHistory.oldest_observation_at_utc,
       executable_quotes_from_history:0},
     status:'NO_TRADE',actions:[]};
   if(!fresh.size){sums.dataGap++;step.status='DATA_GAP_NO_FRESH_QUOTES';events.push(step);continue;}
   sums.available++;
   // Open positions are examined hourly; no 6h delay until next full discovery review.
   for(const [key,position] of Object.entries(ledger.positions)){
     const candidate=fresh.get(key);
     if(!candidate)continue;
     const avg=candidate.quotes.reduce((total,q)=>total+q.price_usdc,0)/candidate.quotes.length;
     const decision=decideUnifiedMarket({asOfUtc:at,observedAtUtc:candidate.observed_at_utc,
       observedPriceUsd:avg,position,fullReviewDue:due,params:p});
     if(decision.action!=='SELL')continue;
     const order=policyOrder(candidate,tick,'SELL',sequence++);
     try{
       const settled=settlePaper(order,ledger,tick,DEFAULT_POLICY);ledger=settled.state;
       if(settled.receipt.realized_pnl_test_usdc<0)lastRealizedLoss.set(key,at);
       sums.sells++;step.status='SELL';step.actions.push({action:'SELL',reason:decision.reason,coin:candidate.coin,at_utc:at,
         simulated_price_usdc:settled.receipt.execution_price_usdc,realized_pnl_test_usdc:settled.receipt.realized_pnl_test_usdc,
         unified_decision_kind:decision.kind,paper_receipt_status:'SYNTHETIC_REPLAY_ONLY'});
     }catch(err){step.actions.push({action:'SELL_REJECTED',code:err instanceof Reject?err.code:'UNEXPECTED_ERROR',reason:decision.reason});}
   }
   // A BUY needs at least one earlier recorded, time-valid quote: momentum computed
   // only from earlier records, never from a later daily winner table.
   if(due){
     for(const [key,candidate] of fresh.entries()){
       if(ledger.positions[key])continue;
       const prev=history.get(key);
       const price=candidate.quotes.reduce((sum,q)=>sum+q.price_usdc,0)/candidate.quotes.length;
       const decision=decideUnifiedMarket({asOfUtc:at,observedAtUtc:candidate.observed_at_utc,
         observedPriceUsd:price,priorAtUtc:prev?.at_utc||null,priorPriceUsd:prev?.price??null,
         lastLossAtUtc:lastRealizedLoss.get(key)||null,fullReviewDue:due,params:p});
       if(decision.action!=='BUY'){
         step.actions.push({action:decision.action,reason:decision.reason,
           coin:candidate.coin,at_utc:at,unified_decision_kind:decision.kind});
         continue;
       }
       const order=policyOrder(candidate,tick,'BUY',sequence++);
       try{
         const settled=settlePaper(order,ledger,tick,DEFAULT_POLICY);ledger=settled.state;
         sums.buys++;step.status='BUY';step.actions.push({action:'BUY',reason:decision.reason,
           observed_momentum_pct:decision.observed_momentum_pct,coin:candidate.coin,at_utc:at,
           simulated_price_usdc:settled.receipt.execution_price_usdc,
           unified_decision_kind:decision.kind,paper_receipt_status:'SYNTHETIC_REPLAY_ONLY'});
       }catch(err){step.actions.push({action:'BUY_REJECTED',code:err instanceof Reject?err.code:'UNEXPECTED_ERROR'});}
     }
   }
   // Update history after evaluating signals to prohibit look-ahead.
   for(const [key,s] of fresh.entries()){
     const price=s.quotes.reduce((sum,q)=>sum+q.price_usdc,0)/s.quotes.length;
     history.set(key,{price,at_utc:s.observed_at_utc});
   }
   events.push(step);
 }
 return {schema:1,kind:'EVIDENCE_GATED_SHADOW_STRATEGY',date,mode:'ISOLATED_SHADOW_PAPER',
   source_count:snapshots.length,decision_engine:'UNIFIED_V18_SIGNAL_V1',
    evidence_gate:'V18_SHARED_PAPER_EVIDENCE',exit_checks_independent_of_full_reviews:true,
    starting_cash_test_usdc:initial,ending_cash_test_usdc:ledger.cash,
   positions_end:Object.keys(ledger.positions).length,summary:sums,events,
   reality_status:snapshots.length===0?'DATA_GAP_NO_HISTORICAL_INPUT':'NOT_A_CLOUD_DOT_ORDER_OR_CLIENT_FILL',
   caution:'Only timestamps in supplied evidence are checked, not their external authenticity. Synthetic observations are not actual historical prices.'};
}
