// R29 V1.9 D4-08: deterministic exit-intent convergence for OPEN paper lots.
// A STOP and Dot4 SELL for the same BUY lot yield ONE research intent.
// No GitHub writes, client state mutation, order authorization, or fake fills.
// The actual client still requires separately authenticated source+Dot3 proofs.
import {createHash} from 'node:crypto';
import {marketKey} from './core.mjs';
import {inspectProtectiveExit} from './protective-exit.mjs';

const when=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const safeId=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(x);
const sources=new Set(['DOT4_SELL','PROTECTIVE_STOP']);

export function planConvergentExitIntents({paperState,
 proposals=[],asOfUtc,policy={}}={}){
 const now=when(asOfUtc);
 if(now===null||paperState?.mode!=='PAPER_ONLY'
    ||!paperState.positions||typeof paperState.positions!=='object'
    ||!Array.isArray(proposals))
   throw Error('INVALID_CONVERGENT_EXIT_INPUT');
 const grouped=new Map(),rejected=[];
 for(const [i,p] of proposals.entries()){
   const coin=p?.coin;
   const key=coin&&typeof coin==='object'?marketKey(coin):null;
   const lot=key?paperState.positions[key]:null;
   if(!sources.has(p?.origin)||!lot
     ||!safeId(p.opening_buy_order_id)
     ||p.opening_buy_order_id!==lot.sourceOrderId
     ||!Array.isArray(p.observations)
     ||when(p.observed_at_utc)===null||when(p.observed_at_utc)>now){
     rejected.push({index:i,reason:!lot?'NO_OPEN_POSITION_FOR_POOL':
       p?.opening_buy_order_id!==lot.sourceOrderId?'STALE_OR_MISMATCHED_BUY_LOT':
       'INVALID_EXIT_PROPOSAL_OR_FUTURE_OBSERVATION'});continue;
   }
   // Re-run the SAME protective exit evaluator and V1.8 Dot4 decision
   // kernel; never trust a caller's claimed STOP/SELL result.
   const probe=inspectProtectiveExit({position:lot,
     observations:p.observations,asOfUtc,policy});
   if(!grouped.has(key))grouped.set(key,{key,lot,probes:[]});
   grouped.get(key).probes.push({origin:p.origin,
     submitted_at_utc:p.observed_at_utc,
     result:probe});
 }
 const planned=[];
 for(const group of grouped.values()){
   const eligible=group.probes.filter(x=>x.result.status==='SHADOW_SELL_CANDIDATE');
   const blocked=group.probes.filter(x=>x.result.status==='EXIT_BLOCKED'
     ||x.result.status==='EXIT_DATA_GAP');
   // A more conservative candidate takes precedence, regardless of which
   // role proposed it. No order is created or filled.
   eligible.sort((a,b)=>a.result.estimated_net_proceeds_test_usdc-
     b.result.estimated_net_proceeds_test_usdc
     ||a.submitted_at_utc.localeCompare(b.submitted_at_utc)
     ||a.origin.localeCompare(b.origin));
   const selected=eligible[0]??null;
   const id='exit-'+createHash('sha256').update(
     group.key+'|'+group.lot.sourceOrderId,'utf8').digest('hex').slice(0,26);
   const status=selected?'SHADOW_EXIT_CANDIDATE':
     blocked.length?'EXIT_RECHECK_REQUIRED':'SHADOW_HOLD';
   planned.push({
     schema:1,kind:'R29_V19_CONVERGED_PAPER_EXIT_INTENT',
     id,market_key:group.key,
     opening_buy_order_id:group.lot.sourceOrderId,
     as_of_utc:asOfUtc,status,
     proposals_seen:group.probes.length,
     origin_labels:[...new Set(group.probes.map(x=>x.origin))].sort(),
     valid_exit_candidate_count:eligible.length,
     evidence_blocked_count:blocked.length,
     trigger_reason:selected?.result.trigger_reason??null,
     worst_case_research_proceeds_test_usdc:
       selected?.result.estimated_net_proceeds_test_usdc??null,
     projected_pnl_test_usdc:selected?.result.estimated_pnl_test_usdc??null,
     estimated_quote_not_executable:true,
     risk_proofs_independently_authenticated:false,
     trade_authorized:false,
     order_published:false,client_receipt_verified:false,paper_filled:false
   });
 }
 planned.sort((a,b)=>a.market_key.localeCompare(b.market_key));
 return {schema:1,kind:'R29_V19_CONVERGENT_SHADOW_EXIT_PLAN',
  as_of_utc:asOfUtc,proposals_received:proposals.length,
  inspected_open_lots:grouped.size,exit_candidates:planned.filter(x=>
    x.status==='SHADOW_EXIT_CANDIDATE').length,
  duplicate_proposals_collapsed:planned.reduce((n,x)=>
    n+Math.max(0,x.proposals_seen-1),0),
  intents:planned,rejected,
  real_orders_published:0,real_paper_fills:0,
  client_state_mutated:false,
  note:'This is a signal/intent audit only. Actual SELL authorization, fresh verified source and one real client receipt are separate gates.'};
}

// Strictly compare two supplied local-model snapshots. This never imports a
// trusted Windows receipt, never publishes a signal, and never mutates state.
export function auditSingleExitReceipt({stateBefore,stateAfter,
 openingBuyOrderId,sellOrderId,coin}={}){
 const issues=[],mark=code=>{if(!issues.includes(code))issues.push(code);};
 const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 const sameMoney=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=1e-5;
 const round=x=>Math.round(x*1e8)/1e8;
 const key=coin&&typeof coin==='object'?marketKey(coin):null;
 const before=key?stateBefore?.positions?.[key]:null;
 const after=key?stateAfter?.positions?.[key]:undefined;
 const processed=stateAfter?.processed?.[sellOrderId];
 const receipt=stateAfter?.receipts?.[sellOrderId]?.data;
 const prevHistory=stateBefore?.trade_history, nextHistory=stateAfter?.trade_history;
 const event=Array.isArray(nextHistory)?nextHistory.at(-1):null;
 if(!before||before.sourceOrderId!==openingBuyOrderId||after!==undefined
  ||stateBefore?.mode!=='PAPER_ONLY'||stateAfter?.mode!=='PAPER_ONLY')
  mark('LOT_NOT_CLOSED_EXACTLY_ONCE');
 if(!processed||processed.status!=='PAPER_FILLED'
  ||!receipt||receipt.status!=='PAPER_FILLED'||receipt.action!=='SELL'
  ||receipt.id!==sellOrderId||receipt.mode!=='PAPER'
  ||receipt.simulated!==true||when(receipt.timestamp)===null
  ||processed.time!==receipt.timestamp)
  mark('EXIT_RECEIPT_NOT_RECONCILED');
 if(!before||!receipt||!eq(receipt.coin,coin)
  ||!eq(before.coin,coin)||!finite(before.quantity)
  ||receipt.quantity!==before.quantity
  ||!finite(receipt.execution_price_usdc)||receipt.execution_price_usdc<=0
  ||!finite(receipt.fee_test_usdc)||receipt.fee_test_usdc<0
  ||!finite(receipt.proceeds_test_usdc)||receipt.proceeds_test_usdc<0
  ||!sameMoney(receipt.quantity*receipt.execution_price_usdc
    -receipt.fee_test_usdc,receipt.proceeds_test_usdc)
  ||!sameMoney(receipt.realized_pnl_test_usdc,
    round(receipt.proceeds_test_usdc-before.costTestUsdc)))
  mark('EXIT_QUANTITY_FEES_OR_PNL_NOT_RECONCILED');
 if(!receipt||!sameMoney(stateAfter?.cash,
    round(stateBefore?.cash+receipt.proceeds_test_usdc))
  ||!sameMoney(receipt.cash_after_test_usdc,stateAfter?.cash)
  ||stateAfter?.cash<0)
  mark('EXIT_CASH_NOT_RECONCILED');
 if(!Number.isInteger(stateBefore?.nextSequence)
  ||stateAfter?.nextSequence!==stateBefore.nextSequence+1
  ||receipt?.sequence!==stateBefore.nextSequence)
  mark('EXIT_SEQUENCE_NOT_RECONCILED');
 if(!Array.isArray(prevHistory)||!Array.isArray(nextHistory)
  ||nextHistory.length!==prevHistory.length+1
  ||!eq(nextHistory.slice(0,-1),prevHistory)
  ||event?.order_id!==sellOrderId||event?.action!=='SELL'
  ||event?.position_source_order_id!==openingBuyOrderId
  ||event?.receipt_sequence!==receipt?.sequence
  ||event?.filled_at_utc!==receipt?.timestamp||event?.market_key!==key
  ||event?.realized_pnl_test_usdc!==receipt?.realized_pnl_test_usdc)
  mark('EXIT_TRADE_EVENT_NOT_RECONCILED');
 for(const field of ['processed','receipts']){
  const was=stateBefore?.[field],now=stateAfter?.[field];
  if(!was||!now||Object.hasOwn(was,sellOrderId)
   ||Object.keys(now).length!==Object.keys(was).length+1
   ||Object.keys(was).some(id=>!eq(now[id],was[id])))
    mark('PREVIOUS_'+field.toUpperCase()+'_CHANGED');
 }
 const oldPositions=stateBefore?.positions,newPositions=stateAfter?.positions;
 if(!key||!oldPositions||!newPositions
  ||Object.keys(newPositions).length!==Object.keys(oldPositions).length-1
  ||Object.entries(oldPositions).some(([k,v])=>k!==key&&!eq(newPositions[k],v)))
  mark('UNRELATED_POSITIONS_CHANGED');
 const matched=issues.length===0;
 return {schema:1,kind:'R29_V19_LOCAL_MODEL_EXIT_RECEIPT_AUDIT',
  status:matched?'MODEL_EXIT_RECEIPT_CONSISTENT':'MISSING_OR_MISMATCHED_EXIT_RECEIPT',
  model_receipt_consistent:matched,local_proof_blockers:issues,
  receipt_proceeds_reconciled:matched,
  independently_authenticated_client_receipt:false,
  does_not_prove_actual_external_paper_fill:true,
  no_fictional_receipt_created:true};
}
