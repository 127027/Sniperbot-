// A bounded retrospective model policy, deliberately independent of live order authorization.
import {modelHistoricalCurve} from './r29-historical-curve-model.mjs';
import {decideUnifiedMarket} from './unified-decision-v18.mjs';
import {GPT_RESEARCH_POLICY,checkResearchDecision,decisionHash} from './r29-gpt-research-policy.mjs';
import {compareReserveContinuity} from './r29-reserve-continuity.mjs';
import {createHash} from 'node:crypto';
const t=s=>Date.parse(s),u=x=>{if(typeof x!=='string'||!/^(0|[1-9]\d*)$/.test(x))throw Error('INVALID_AMOUNT');return BigInt(x);};
const L=1000000000n,B=10000n,ceil=(x,y)=>(x+y-1n)/y;
const allowed=new Set(['initializeMint','initializeMint2','mintTo','mintToChecked','setAuthority','initializeMetadataPointer','initializeTokenMetadata','updateTokenMetadataAuthority','getAccountDataSize','initializeAccount','initializeAccount2','initializeAccount3','initializeImmutableOwner']);
export function assessHistoricalModelRisk({mint,pool,rows,expectedSignatures,archiveExhausted,states,tickUtc}={}){
 const reasons=[],tick=t(tickUtc);
 if(!Number.isFinite(tick)||!Array.isArray(rows)||!Array.isArray(expectedSignatures)||!Array.isArray(states))throw Error('INVALID_RISK_INPUT');
 const relevant=rows.filter(x=>x.mint===mint);
 if(!archiveExhausted||!expectedSignatures.length||new Set(expectedSignatures).size!==expectedSignatures.length||relevant.length!==expectedSignatures.length||new Set(relevant.map(x=>x.signature)).size!==expectedSignatures.length||relevant.some(x=>!expectedSignatures.includes(x.signature)||!Number.isFinite(t(x.block_time_utc))||t(x.block_time_utc)+60000>=tick))reasons.push('MINT_HISTORY_INCOMPLETE_OR_FUTURE');
 if(relevant.some(x=>x.unknown.length||x.controls.some(c=>!allowed.has(c.type))))reasons.push('UNKNOWN_OR_UNSUPPORTED_MINT_CONTROL');
 const controls=relevant.flatMap(x=>x.controls.map(c=>({...c,signature:x.signature,at:x.block_time_utc})));
 const init=controls.filter(x=>['initializeMint','initializeMint2'].includes(x.type)&&x.info.mint===mint);
 const rev=controls.filter(x=>x.type==='setAuthority');
 // Restrict to initialization and permanent mint revocation in same successful tx.
 if(init.length!==1||init[0].info.decimals!==6||init[0].info.freezeAuthority!=null||rev.length!==1||rev[0].signature!==init[0].signature||rev[0].info.mint!==mint||rev[0].info.authorityType!=='mintTokens'||rev[0].info.newAuthority!==null||rev[0].info.authority!==init[0].info.mintAuthority||controls.some(x=>/^mintTo/.test(x.type)&&x.signature!==init[0].signature))reasons.push('MINT_AUTHORITY_OR_FREEZE_NOT_RECONSTRUCTED');
 const market=states.filter(x=>x.mint===mint&&x.pool===pool&&x.event_flow_verified===true&&expectedSignatures.includes(x.signature)&&t(x.block_time_utc)+60000<tick);
 if(!market.some(x=>x.side==='BUY')||!market.some(x=>x.side==='SELL'))reasons.push('BIDIRECTIONAL_THIRD_PARTY_ACTIVITY_NOT_OBSERVED');
 return {mint,pool,tick_utc:tickUtc,status:reasons.length?'UNKNOWN':'BOUNDED_HISTORICAL_MODEL_RISK_ACCEPTED',reasons,source_signatures:relevant.map(x=>x.signature),assumptions:['SUCCESSFUL_PARSED_MINT_ADDRESS_HISTORY','NO_UNSUPPORTED_MINT_CONTROL_OBSERVED','THIRD_PARTY_SWAPS_ARE_NOT_OUR_OWN_SELLABILITY_PROOF'],historical_account_bytes_verified:false,actual_sellability_proven:false,live_order_authorized:false};
}
// Same-slot observations must be ordered by verified reserve/vault transitions,
// not by array order or fabricated sub-second timestamps.
export function latestObservedCurve(states){
 const verified=states.filter(s=>s.event_flow_verified===true);
 if(!verified.length)return null;
 const latestTime=Math.max(...verified.map(s=>t(s.block_time_utc)));
 const tied=verified.filter(s=>t(s.block_time_utc)===latestTime);
 const maxSlot=Math.max(...tied.map(s=>s.slot));
 const same=tied.filter(s=>s.slot===maxSlot);
 if(same.length===1)return same[0];
 const terminals=same.filter(a=>!same.some(b=>a!==b&&compareReserveContinuity(a,b)));
 if(terminals.length!==1)return null;
 const terminal=terminals[0],seen=new Set([terminal.signature]);let current=terminal;
 while(true){const prev=same.filter(a=>!seen.has(a.signature)&&compareReserveContinuity(a,current));if(prev.length>1)return null;if(!prev.length)break;current=prev[0];seen.add(current.signature);}
 return seen.size===same.length?terminal:null;
}
export function evaluateRetrospectiveEntry({pair,states,fx,tickUtc,riskInput,gptReview,strategyPolicy='LEGACY_COMPARATOR'}={}){
 if(!['LEGACY_COMPARATOR',GPT_RESEARCH_POLICY].includes(strategyPolicy))throw Error('UNKNOWN_STRATEGY_POLICY');
 const risk=assessHistoricalModelRisk({...riskInput,mint:pair.mint,pool:pair.pool,states,tickUtc});
 if(states.some(s=>!Number.isFinite(t(s.block_time_utc))||t(s.block_time_utc)+60000>=t(tickUtc)))throw Error('FUTURE_STATE_IN_DECISION_INPUT');
 const quote=modelHistoricalCurve({pair,fx,tickUtc});
 const first=states.find(s=>s.receipt_id===pair.earlier&&s.mint===pair.mint&&s.pool===pair.pool&&s.event_flow_verified===true);
 const last=states.find(s=>s.receipt_id===pair.later&&s.mint===pair.mint&&s.pool===pair.pool&&s.event_flow_verified===true);
 if(!first||!last||last.source_sha256!==pair.source_sha256||last.block_time_utc!==pair.source_time||JSON.stringify(last.post)!==JSON.stringify(pair.asof_event_state)||t(first.block_time_utc)+60000>=t(tickUtc)||t(last.block_time_utc)+60000>=t(tickUtc))throw Error('PAIR_NOT_CORROBORATED');
 const price=s=>Number(s.virtual_sol)/Number(s.virtual_token)/1000*fx.close_usdc_per_sol;
 const diagnosticSignal=decideUnifiedMarket({asOfUtc:tickUtc,observedAtUtc:last.block_time_utc,observedPriceUsd:price(last.post),priorAtUtc:first.block_time_utc,priorPriceUsd:price(first.post),fullReviewDue:true});
 const reasons=[...risk.reasons];
 // A hypothetical buyer's own cash must not be counted as independent exit liquidity.
 if(u(last.post.real_sol)<u(quote.immediate_exit_after_own_buy.gross_lamports))reasons.push('INSUFFICIENT_PRE_ENTRY_REAL_SOL_EXIT_LIQUIDITY');
 const newest=latestObservedCurve(states.filter(s=>s.mint===pair.mint&&s.pool===pair.pool));
 if(!newest||newest.signature!==last.signature)reasons.push('LATEST_OBSERVED_POOL_STATE_AMBIGUOUS_OR_MISMATCH');
 if(quote.reserve_age_seconds>300)reasons.push('RESERVE_OBSERVATION_OLDER_THAN_5_MIN');
 if(u(quote.entry.price_impact_bps)>500n)reasons.push('MODEL_PRICE_IMPACT_OVER_5_PERCENT');
 if(strategyPolicy==='LEGACY_COMPARATOR'&&diagnosticSignal.action!=='BUY')reasons.push('SHARED_SIGNAL_NOT_BUY');
 // Current review may be a manually recorded GPT assessment, never a fake October receipt.
 const inputHash=createHash('sha256').update(JSON.stringify({pair,states,fx,tickUtc,risk})).digest('hex');
 const strategy=strategyPolicy===GPT_RESEARCH_POLICY?checkResearchDecision({review:gptReview,inputSha256:inputHash,mint:pair.mint,pool:pair.pool,tickUtc}):null;
 const signal=strategy??diagnosticSignal;
 if(strategyPolicy===GPT_RESEARCH_POLICY&&(!strategy.valid||strategy.action!=='BUY'))reasons.push('GPT_STRATEGY_NOT_BUY');
 if(!gptReview||gptReview.input_sha256!==inputHash||gptReview.mint!==pair.mint||gptReview.tick_utc!==tickUtc||gptReview.action!=='BUY'||typeof gptReview.reason!=='string'||!gptReview.reason.trim())reasons.push('NO_MATCHING_CURRENT_GPT_BUY_REVIEW');
 return {kind:'R29_RETROSPECTIVE_MODEL_ENTRY_EVALUATION',mint:pair.mint,pool:pair.pool,tick_utc:tickUtc,input_sha256:inputHash,signal,diagnostic_signal:diagnosticSignal,strategy_policy:strategyPolicy,risk,quote,reasons,model_signal_eligible:reasons.length===0,model_fill_eligible:false,scope:'ISOLATED_RESEARCH_SIMULATION_ONLY',live_order_authorized:false,client_writes_authorized:false,orders:0};
}
export const emptyRetrospectiveLedger=()=>({kind:'R29_RETROSPECTIVE_RESEARCH_LEDGER',cash_micro:'5000000000',positions:{},pending:{},events:[],realized_pnl_micro:'0',orders:0});
function eventState(state,mint,tickUtc){
 if(state?.kind!=='R29_RETROSPECTIVE_RESEARCH_LEDGER'||!Number.isFinite(t(tickUtc))||state.events.some(e=>e.mint===mint&&e.tick_utc===tickUtc)||state.events.some(e=>t(e.tick_utc)>t(tickUtc)))throw Error('INVALID_OR_DUPLICATE_LEDGER_EVENT');
 return structuredClone(state);
}
// Signals and fills are separate events. No execution at the earlier signal quote.
export function applyRetrospectiveEntry(state,input){
 const e=evaluateRetrospectiveEntry(input),next=eventState(state,e.mint,e.tick_utc);
 const event={mint:e.mint,tick_utc:e.tick_utc,action:e.model_signal_eligible?'BUY':e.signal.action==='BUY'?'DATA_GAP':e.signal.action,execution:'NO_FILL',reasons:e.reasons,input_sha256:e.input_sha256};
 if(e.model_signal_eligible){
  if(next.positions[e.mint]||next.pending[e.mint])throw Error('POSITION_OR_PENDING_EXISTS');
  const reserved=Object.values(next.pending).filter(p=>p.action==='BUY').length*50000000;
  if(u(next.cash_micro)<50000000n+BigInt(reserved))throw Error('INSUFFICIENT_UNRESERVED_CASH');
  next.pending[e.mint]={action:'BUY',pool:e.pool,signal_at_utc:e.tick_utc,input_sha256:e.input_sha256};
  event.execution='PENDING_NEXT_VERIFIED_MODEL_OBSERVATION';
 }
 next.events.push(event);return {ledger:next,evaluation:e};
}
export function evaluateRetrospectiveExit({position,state,fx,tickUtc,gptReview,strategyPolicy='LEGACY_COMPARATOR'}={}){
 if(!['LEGACY_COMPARATOR',GPT_RESEARCH_POLICY].includes(strategyPolicy))throw Error('UNKNOWN_STRATEGY_POLICY');
 if(!position||position.mint!==state.mint||position.pool!==state.pool||!state.event_flow_verified||t(state.block_time_utc)+60000>=t(tickUtc)||t(tickUtc)-t(state.block_time_utc)>300000||t(state.block_time_utc)<=t(position.entered_at_utc)||!Number.isFinite(t(fx.modeled_available_at_utc))||t(fx.modeled_available_at_utc)>=t(tickUtc)||t(tickUtc)-t(fx.modeled_available_at_utc)>600000||fx.pair!=='SOL-USDC')throw Error('INVALID_LATER_EXIT_OBSERVATION');
 const x=u(state.post.virtual_sol),y=u(state.post.virtual_token),amount=u(position.token_raw),real=u(state.post.real_sol);
 if(!x||!y||!amount)throw Error('INVALID_EXIT_RESERVES');
 const gross=x*amount/(y+amount);
 if(gross>real)throw Error('EXIT_REAL_RESERVE_LIMIT');
 const protocol=u(state.fees.protocol_bps),creator=u(state.fees.creator_bps),buffer=25n,network=1005000n;
 if(protocol+creator+buffer>=B)throw Error('INVALID_EXIT_FEE');
 const fee=ceil(gross*protocol,B)+ceil(gross*creator,B)+ceil(gross*buffer,B)+network;
 if(gross<=fee)throw Error('NONPOSITIVE_EXIT');
 const received=(gross-fee)*u(fx.low_micro_usdc_per_sol)/L;
 const effective=Number(received)/Number(amount);
 const diagnosticSignal=decideUnifiedMarket({asOfUtc:tickUtc,observedAtUtc:state.block_time_utc,observedPriceUsd:effective,position:{entryPrice:position.entry_price_usdc}});
 const inputHash=decisionHash({position,state,fx,tickUtc});
 const signal=strategyPolicy===GPT_RESEARCH_POLICY?checkResearchDecision({review:gptReview,inputSha256:inputHash,mint:position.mint,pool:position.pool,tickUtc,positionOpen:true}):diagnosticSignal;
 return {mint:position.mint,pool:position.pool,tick_utc:tickUtc,input_sha256:inputHash,strategy_policy:strategyPolicy,diagnostic_signal:diagnosticSignal,received_micro:String(received),token_raw:String(amount),signal,source_sha256:state.source_sha256,scope:'RETROSPECTIVE_LATER_OBSERVED_CURVE_ONLY',exact_execution_proven:false,orders:0};
}
export function applyRetrospectiveExit(ledger,input){
 const position=ledger.positions[input.mint];if(!position)throw Error('NO_POSITION');
 const e=evaluateRetrospectiveExit({...input,position}),next=eventState(ledger,input.mint,input.tickUtc);
 const event={mint:input.mint,tick_utc:input.tickUtc,action:e.signal.action,execution:'NO_FILL',reason:e.signal.reason,source_sha256:e.source_sha256};
 if(e.signal.action==='SELL'){
  if(next.pending[input.mint])throw Error('PENDING_ORDER_EXISTS');
  next.pending[input.mint]={action:'SELL',pool:position.pool,signal_at_utc:input.tickUtc,source_sha256:e.source_sha256};
  event.execution='PENDING_NEXT_VERIFIED_MODEL_OBSERVATION';
 }
 next.events.push(event);return {ledger:next,evaluation:e};
}
// Fill only on the first eligible supplied later observation. Coverage is an explicit
// model assumption, not proof of exact historic market-wide execution.
export function settleRetrospectivePending(ledger,{mint,tickUtc,observations,fx,riskInput}={}){
 const p=ledger.pending?.[mint];if(!p)throw Error('NO_PENDING_SIGNAL');
 const next=eventState(ledger,mint,tickUtc),now=t(tickUtc),signal=t(p.signal_at_utc);
 if(!Number.isFinite(signal)||now<=signal||!Array.isArray(observations)||observations.some(s=>!Number.isFinite(t(s.block_time_utc))||t(s.block_time_utc)+60000>=now))throw Error('INVALID_OR_FUTURE_FILL_INPUT');
 const candidates=observations.filter(s=>s.mint===mint&&s.pool===p.pool&&s.event_flow_verified===true&&t(s.block_time_utc)>signal).sort((a,b)=>t(a.block_time_utc)-t(b.block_time_utc)||a.slot-b.slot);
 const ev={mint,tick_utc:tickUtc,action:p.action,execution:'NO_FILL',signal_at_utc:p.signal_at_utc,scope:'FIRST_VERIFIED_SUPPLIED_OBSERVATION_NOT_PROVEN_FIRST_MARKET_QUOTE',orders:0};
 function block(reason,terminal=false){ev.reason=reason;if(terminal){delete next.pending[mint];ev.execution='MODEL_SIGNAL_EXPIRED_OR_REJECTED';}next.events.push(ev);return {ledger:next,event:ev};}
 if(!candidates.length)return block('NO_POST_SIGNAL_OBSERVATION',now-signal>600000&&p.action==='BUY');
 const s=candidates[0],at=t(s.block_time_utc);
 if(candidates.filter(a=>t(a.block_time_utc)===at&&a.slot===s.slot).length!==1)return block('AMBIGUOUS_FIRST_POST_SIGNAL_STATE');
 // Never skip a supplied first observation to select a more favorable later quote.
 if(now-at>300000)return block('FIRST_OBSERVATION_TOO_OLD',p.action==='BUY');
 if(p.action==='BUY'&&at-signal>600000)return block('ENTRY_SIGNAL_EXPIRED',true);
 if(!Number.isFinite(t(fx?.modeled_available_at_utc))||t(fx.modeled_available_at_utc)>=at||at-t(fx.modeled_available_at_utc)>600000||fx.pair!=='SOL-USDC')return block('FX_NOT_AVAILABLE_BEFORE_FILL_OBSERVATION');
 if(p.action==='BUY'){
  const risk=assessHistoricalModelRisk({...riskInput,mint,pool:p.pool,states:observations,tickUtc});
  if(risk.status!=='BOUNDED_HISTORICAL_MODEL_RISK_ACCEPTED')return block('RISK_RECHECK_FAILED',true);
  const pair={mint,pool:p.pool,source_time:s.block_time_utc,source_signature:s.signature,source_sha256:s.source_sha256,asof_event_state:s.post,fee_observation:s.fees};
  let quote;try{quote=modelHistoricalCurve({pair,fx,tickUtc});}catch{return block('MODEL_QUOTE_UNAVAILABLE',true);}
  if(u(s.post.real_sol)<u(quote.immediate_exit_after_own_buy.gross_lamports)||u(quote.entry.price_impact_bps)>500n)return block('EXIT_LIQUIDITY_OR_IMPACT_RECHECK_FAILED',true);
  const cost=u(quote.entry.spent_micro_usdc),amount=u(quote.entry.token_output_raw);
  if(next.positions[mint]||cost<=0n||cost>50000000n||u(next.cash_micro)<cost)throw Error('INVALID_POSITION_OR_CASH');
  next.cash_micro=String(u(next.cash_micro)-cost);next.positions[mint]={mint,pool:p.pool,entered_at_utc:tickUtc,cost_micro:String(cost),token_raw:String(amount),entry_price_usdc:Number(cost)/Number(amount),entry_source_sha256:s.source_sha256};
  Object.assign(ev,{execution:'RETROSPECTIVE_MODEL_FILL',cost_micro:String(cost),token_raw:String(amount),source_sha256:s.source_sha256,observed_at_utc:s.block_time_utc,exact_execution_proven:false});
 }else{
  const pos=next.positions[mint];if(!pos)throw Error('NO_POSITION');
  let e;try{e=evaluateRetrospectiveExit({position:pos,state:s,fx,tickUtc});}catch{return block('LATER_EXIT_QUOTE_UNAVAILABLE');}
  const received=u(e.received_micro),pnl=received-u(pos.cost_micro);
  next.cash_micro=String(u(next.cash_micro)+received);next.realized_pnl_micro=String(BigInt(next.realized_pnl_micro)+pnl);delete next.positions[mint];
  Object.assign(ev,{execution:'RETROSPECTIVE_MODEL_FILL',received_micro:String(received),pnl_micro:String(pnl),source_sha256:s.source_sha256,observed_at_utc:s.block_time_utc,exact_execution_proven:false});
 }
 delete next.pending[mint];next.events.push(ev);return {ledger:next,event:ev};
}
