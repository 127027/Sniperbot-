// R29 V2.1: source-pinned Dot2 -> Dot3 -> Dot4 -> Dot5 RESEARCH handoff.
// Deterministic, read-only: no HTTP, GPT invocations, orders or account mutation.
// This audits a single contemporaneous SOURCE capture, not the October backtest.
import {canonicalChain,poolValid,tokenValid} from './market-evidence.mjs';
import {summarizeDot3RiskStatuses} from './v19-dot3-risk-status.mjs';
import {planDot3EvidenceRechecks} from './v19-dot3-recheck-scheduler.mjs';
const clock=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x)
  &&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const id=x=>typeof x==='string'&&/^research\/feeds\/\d{4}-\d{2}-\d{2}\/\d{8,20}\/[A-Za-z0-9-]+\.json$/.test(x);
const key=(ch,p)=>ch+':'+(ch==='solana'?p:String(p).toLowerCase());
const noCount=x=>Number.isInteger(x)&&x>=0;
const fail=code=>{throw Error('R29_V21_INVALID_HANDOFF_'+code)};
const compareCounts=(a,b,keys)=>keys.every(k=>a?.[k]===b?.[k]);
export function inspectV21FiveDotHandoff({
  feedPointer,evidence,handoff,riskPreview,recheckPlan,asOfUtc,
  maxSelectedRechecks=6
}={}){
 const now=clock(asOfUtc);
 if(now===null||!Number.isInteger(maxSelectedRechecks)||maxSelectedRechecks<1
   ||maxSelectedRechecks>20)fail('CLOCK_OR_BUDGET');
 if(feedPointer?.kind!=='LATEST_DOT2_PUBLIC_CAPTURE_POINTER'
   ||feedPointer.mode!=='PAPER_RESEARCH_ONLY'||feedPointer.trading_ready!==false
   ||feedPointer.orders_created!==0
   ||!id(feedPointer.evidence_path)||!id(feedPointer.handoff_path)
   ||!id(feedPointer.dot3_status_preview_path)||!id(feedPointer.dot3_recheck_plan_path))
   fail('FEED_POINTER');
 const parent=feedPointer.evidence_path.slice(0,feedPointer.evidence_path.lastIndexOf('/')+1);
 if([feedPointer.handoff_path,feedPointer.dot3_status_preview_path,
     feedPointer.dot3_recheck_plan_path].some(x=>!x.startsWith(parent)))
   fail('CROSS_RUN_ARTIFACT_MIX');
 const captured=clock(feedPointer.captured_at_utc);
 if(captured===null||captured>now)fail('FUTURE_SOURCE');
 if(evidence?.kind!=='DOT2_PUBLIC_CAPTURE_EVIDENCE'
   ||evidence?.mode!=='PAPER_RESEARCH_ONLY'
   ||evidence?.request_path!==feedPointer.request_path
   ||evidence?.captured_completed_at_utc!==feedPointer.captured_at_utc
   ||evidence?.published_paper_orders!==0||evidence?.verified_client_fills!==0)
   fail('SOURCE_CAPTURE_OR_ORDERS');
 if(handoff?.kind!=='DOT2_TO_DOT3_EVIDENCE_HANDOFF'
   ||!Array.isArray(handoff.candidates)
   ||handoff.source_request_path!==feedPointer.request_path
   ||handoff.source_capture_utc!==feedPointer.captured_at_utc
   ||handoff.as_of_utc!==feedPointer.captured_at_utc
   ||handoff.live_capture_fresh!==true
   ||!compareCounts(handoff.counts,feedPointer.handoff_counts,
      ['observations','full_contracts','trade_eligible'])
   ||handoff.counts?.trade_eligible!==0)fail('HANDOFF_CAPTURE_OR_ELIGIBILITY');
 if(riskPreview?.kind!=='R29_V19_DOT3_RISK_STATUS_PREVIEW'
   ||riskPreview.mode!=='LIVE_PAPER'
   ||riskPreview.as_of_utc!==feedPointer.captured_at_utc
   ||riskPreview.order_authorized_count!==0||riskPreview.real_paper_fills!==0
   ||!Array.isArray(riskPreview.candidates)
   ||recheckPlan?.kind!=='R29_V19_DOT3_EVIDENCE_RECHECK_PLAN'
   ||recheckPlan.as_of_utc!==feedPointer.captured_at_utc
   ||recheckPlan.actual_paper_orders!==0||recheckPlan.actual_gpt_reviews!==0
   ||!Array.isArray(recheckPlan.watchlist)||!Array.isArray(recheckPlan.selected))
   fail('RISK_OR_RECHECK_ARTIFACT');
 const reasons=[],keys=new Set(),riskKeys=new Set();
 for(const c of handoff.candidates){
   const chain=canonicalChain(c?.chain);
   if(!chain||!poolValid(chain,c?.pool,c?.pool_kind)
     ||!tokenValid(chain,c?.contract)||c.BUY_AUTHORIZED!==false
     ||c.security_verified!==false||c.sellability_verified!==false)
     fail('UNAUTHENTICATED_CANDIDATE_PROMOTION');
   const capturedAt=clock(c.captured_at_utc);
   if(capturedAt===null||capturedAt>captured||captured-capturedAt>600000)
     reasons.push('POOL_CAPTURE_CLOCK_DISCREPANCY');
   const k=key(chain,c.pool);
   if(keys.has(k))fail('DUPLICATED_POOL');
   keys.add(k);
   if('reported_gain_pct' in c||'future_winner_label' in c
     ||'post_event_rank' in c||c.source_class==='POST_EVENT_ORACLE')
     fail('HINDSIGHT_CANDIDATE');
 }
 if(handoff.counts.unique_pools!==keys.size
   ||handoff.counts.full_contracts!==handoff.candidates.length
   ||handoff.counts.risk_review_candidates!==handoff.candidates.length)
   fail('HANDOFF_COUNTS');
 for(const row of riskPreview.candidates){
   if(!keys.has(row?.pool_key)||riskKeys.has(row.pool_key)
     ||!['WATCH','DATA_GAP','REJECTED','DISCOVERED'].includes(row.status)
     ||row.mode!=='LIVE_PAPER'
     ||row.trade_authorized!==false||row.paper_filled!==false
     ||row.original_risk_evidence_verified!==false
     ||row.issuer_authentication_verified!==false)
     fail('RISK_STATUS_PROMOTION_OR_DUPLICATE');
   riskKeys.add(row.pool_key);
 }
 if(riskKeys.size!==keys.size||recheckPlan.candidate_count!==keys.size
   ||recheckPlan.watchlist.length!==keys.size
   ||recheckPlan.selected.length>maxSelectedRechecks
   ||recheckPlan.selected_count!==recheckPlan.selected.length
   ||recheckPlan.actual_provider_rechecks!==0
   ||recheckPlan.research_only!==true)fail('DROPPED_CANDIDATES_OR_ACTION_CLAIM');
 const watchKeys=new Set();
 for(const r of recheckPlan.watchlist){
   if(!keys.has(r.key)||watchKeys.has(r.key)||r.trade_authorized!==false
     ||r.paper_filled!==false)fail('RECHECK_NOT_FROM_CANDIDATES');
   watchKeys.add(r.key);
 }
 const selectedKeys=new Set();
 for(const r of recheckPlan.selected){
   if(!watchKeys.has(r.key)||selectedKeys.has(r.key)||r.retriable!==true)
     fail('SELECTED_RECHECK_NOT_RETRIABLE');
   selectedKeys.add(r.key);
 }
 let recalculatedRisk=null,recalculatedPlan=null;
 try{
  recalculatedRisk=summarizeDot3RiskStatuses({
    handoff,asOfUtc:feedPointer.captured_at_utc,mode:'LIVE_PAPER'});
  recalculatedPlan=planDot3EvidenceRechecks({
    handoff,asOfUtc:feedPointer.captured_at_utc,maxRequests:maxSelectedRechecks});
 }catch(e){fail('SHARED_KERNEL_'+String(e.message).slice(0,100))}
 const counts=recalculatedRisk.counts;
 if(!compareCounts(counts,riskPreview.counts,
   ['DISCOVERED','DATA_GAP','WATCH','REJECTED','PAPER_ELIGIBLE']))
   reasons.push('ARCHIVED_RISK_PREVIEW_DIFFERS_FROM_SHARED_KERNEL');
 const statuses=new Map(recalculatedRisk.candidates.map(r=>[r.pool_key,r.status+':'+r.reason]));
 for(const r of riskPreview.candidates){
   if(statuses.get(r.pool_key)!==r.status+':'+r.reason)
     reasons.push('ARCHIVED_RISK_REASONS_DIFFER_FROM_SHARED_KERNEL');
 }
 if(recalculatedPlan.selected.map(r=>r.key).join('|')!==
    recheckPlan.selected.map(r=>r.key).join('|'))
   reasons.push('RECHECK_ORDER_DIFFERS_FROM_SHARED_SCHEDULER');
 const nextActions={};
 for(const row of recheckPlan.watchlist){
   const action=row.next_action;
   if(typeof action==='string'&&action.length)
     nextActions[action]=(nextActions[action]??0)+1;
 }
 const sourceStale=now-captured>600000;
 if(sourceStale)reasons.push('SOURCE_OLDER_THAN_TEN_MINUTES_NOT_TRADING_QUOTE');
 const critical=[...new Set(reasons)].sort();
 const complete=critical.length===0;
 return {schema:1,kind:'R29_V21_CURRENT_FIVE_DOT_RESEARCH_HANDOFF_AUDIT',
   mode:'READ_ONLY_PAPER_RESEARCH',source_capture_at_utc:feedPointer.captured_at_utc,
   inspected_at_utc:asOfUtc,
   candidate_count:keys.size,risk_counts:counts,
   risk_preview_matches_current_shared_kernel:!critical.some(r=>
     r.startsWith('ARCHIVED_RISK_')),
   scheduler_matches_archived_selection:!critical.includes('RECHECK_ORDER_DIFFERS_FROM_SHARED_SCHEDULER'),
   risk_evidence_gaps_from_current_capture:true,
   candidates_with_open_rechecks:watchKeys.size,selected_rechecks:selectedKeys.size,
   deferred_rechecks:watchKeys.size-selectedKeys.size,
   next_research_actions_by_type:nextActions,
   recorded_source_status:sourceStale?'STALE_FOR_CURRENT_TRADE':'CURRENT_CAPTURE_AT_SOURCE_TIME',
   nonblocking_reconciliation_warnings:critical,
   handoff_reconciled_as_archived:complete,
   proposed_research_action:sourceStale?'RECAPTURE_THEN_REASSESS':'CONTINUE_DOT3_EVIDENCE_RECHECKS',
   dot1_full_reviews_per_day_verifiable_from_this_capture:false,
   dot2_eligible_for_actual_buy:0,dot3_independently_proven_eligible:0,
   dot4_buy_orders_authorized:0,dot4_sell_orders_authorized:0,
   dot5_verified_client_fills:0,actual_gpt_invocations_confirmed:0,
   orders_written:0,client_account_mutated:false,
   qa04_original_historical_backtest_authorized:false,
   limitations:['A completed GitHub source capture is not an independently attested provider quote timestamp.',
     'Recomputing Dot3 read-only states is not a Dot3 GPT invocation or signed issuer approval.',
     'Watch/recheck prioritization cannot claim executable BUY or SELL without independent sellability and source trust.']};
}
