// A bounded retrospective model policy, deliberately independent of live order authorization.
import {modelHistoricalCurve} from './r29-historical-curve-model.mjs';
import {decideUnifiedMarket} from './unified-decision-v18.mjs';
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
export function evaluateRetrospectiveEntry({pair,states,fx,tickUtc,riskInput,gptReview}={}){
 const risk=assessHistoricalModelRisk({...riskInput,mint:pair.mint,pool:pair.pool,states,tickUtc});
 const quote=modelHistoricalCurve({pair,fx,tickUtc});
 const first=states.find(s=>s.receipt_id===pair.earlier&&s.mint===pair.mint&&s.pool===pair.pool&&s.event_flow_verified===true);
 const last=states.find(s=>s.receipt_id===pair.later&&s.mint===pair.mint&&s.pool===pair.pool&&s.event_flow_verified===true);
 if(!first||!last||last.source_sha256!==pair.source_sha256||last.block_time_utc!==pair.source_time||JSON.stringify(last.post)!==JSON.stringify(pair.asof_event_state)||t(first.block_time_utc)+60000>=t(tickUtc)||t(last.block_time_utc)+60000>=t(tickUtc))throw Error('PAIR_NOT_CORROBORATED');
 const price=s=>Number(s.virtual_sol)/Number(s.virtual_token)/1000*fx.close_usdc_per_sol;
 const signal=decideUnifiedMarket({asOfUtc:tickUtc,observedAtUtc:last.block_time_utc,observedPriceUsd:price(last.post),priorAtUtc:first.block_time_utc,priorPriceUsd:price(first.post),fullReviewDue:true});
 const reasons=[...risk.reasons];
 // A hypothetical buyer's own cash must not be counted as independent exit liquidity.
 if(u(last.post.real_sol)<u(quote.immediate_exit_after_own_buy.gross_lamports))reasons.push('INSUFFICIENT_PRE_ENTRY_REAL_SOL_EXIT_LIQUIDITY');
 const newest=latestObservedCurve(states.filter(s=>s.mint===pair.mint&&s.pool===pair.pool));
 if(!newest||newest.signature!==last.signature)reasons.push('LATEST_OBSERVED_POOL_STATE_AMBIGUOUS_OR_MISMATCH');
 if(quote.reserve_age_seconds>300)reasons.push('RESERVE_OBSERVATION_OLDER_THAN_5_MIN');
 if(u(quote.entry.price_impact_bps)>500n)reasons.push('MODEL_PRICE_IMPACT_OVER_5_PERCENT');
 if(signal.action!=='BUY')reasons.push('SHARED_SIGNAL_NOT_BUY');
 // Current review may be a manually recorded GPT assessment, never a fake October receipt.
 const inputHash=createHash('sha256').update(JSON.stringify({pair,states,fx,tickUtc,risk})).digest('hex');
 if(!gptReview||gptReview.input_sha256!==inputHash||gptReview.mint!==pair.mint||gptReview.tick_utc!==tickUtc||gptReview.action!=='BUY'||typeof gptReview.reason!=='string'||!gptReview.reason.trim())reasons.push('NO_MATCHING_CURRENT_GPT_BUY_REVIEW');
 return {kind:'R29_RETROSPECTIVE_MODEL_ENTRY_EVALUATION',mint:pair.mint,pool:pair.pool,tick_utc:tickUtc,input_sha256:inputHash,signal,risk,quote,reasons,model_fill_eligible:reasons.length===0,scope:'ISOLATED_RESEARCH_SIMULATION_ONLY',live_order_authorized:false,client_writes_authorized:false,orders:0};
}
export const emptyRetrospectiveLedger=()=>({kind:'R29_RETROSPECTIVE_RESEARCH_LEDGER',cash_micro:'5000000000',positions:{},events:[],realized_pnl_micro:'0',orders:0});
function eventState(state,mint,tickUtc){
 if(state?.kind!=='R29_RETROSPECTIVE_RESEARCH_LEDGER'||!Number.isFinite(t(tickUtc))||state.events.some(e=>e.mint===mint&&e.tick_utc===tickUtc)||state.events.some(e=>t(e.tick_utc)>t(tickUtc)))throw Error('INVALID_OR_DUPLICATE_LEDGER_EVENT');
 return structuredClone(state);
}
export function applyRetrospectiveEntry(state,input){
 const e=evaluateRetrospectiveEntry(input),next=eventState(state,e.mint,e.tick_utc);
 const event={mint:e.mint,tick_utc:e.tick_utc,action:e.model_fill_eligible?'BUY':e.signal.action==='BUY'?'DATA_GAP':e.signal.action,execution:'NO_FILL',reasons:e.reasons,input_sha256:e.input_sha256};
 if(e.model_fill_eligible){
  const q=e.quote.entry,cost=u(q.spent_micro_usdc),amount=u(q.token_output_raw);
  if(next.positions[e.mint]||cost<=0n||cost>50000000n||u(next.cash_micro)<cost)throw Error('INVALID_POSITION_OR_CASH');
  next.cash_micro=String(u(next.cash_micro)-cost);
  next.positions[e.mint]={mint:e.mint,pool:e.pool,entered_at_utc:e.tick_utc,cost_micro:String(cost),token_raw:String(amount),entry_price_usdc:Number(cost)/Number(amount),entry_source_sha256:e.quote.source_sha256};
  Object.assign(event,{execution:'RETROSPECTIVE_MODEL_FILL',cost_micro:String(cost),token_raw:String(amount),assumptions:e.risk.assumptions});
 }
 next.events.push(event);return {ledger:next,evaluation:e};
}
export function evaluateRetrospectiveExit({position,state,fx,tickUtc}={}){
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
 const signal=decideUnifiedMarket({asOfUtc:tickUtc,observedAtUtc:state.block_time_utc,observedPriceUsd:effective,position:{entryPrice:position.entry_price_usdc}});
 return {mint:position.mint,pool:position.pool,tick_utc:tickUtc,received_micro:String(received),token_raw:String(amount),signal,source_sha256:state.source_sha256,scope:'RETROSPECTIVE_LATER_OBSERVED_CURVE_ONLY',exact_execution_proven:false,orders:0};
}
export function applyRetrospectiveExit(ledger,input){
 const position=ledger.positions[input.mint];if(!position)throw Error('NO_POSITION');
 const e=evaluateRetrospectiveExit({...input,position}),next=eventState(ledger,input.mint,input.tickUtc);
 const event={mint:input.mint,tick_utc:input.tickUtc,action:e.signal.action,execution:'NO_FILL',reason:e.signal.reason,source_sha256:e.source_sha256};
 if(e.signal.action==='SELL'){
  const received=u(e.received_micro),pnl=received-u(position.cost_micro);
  next.cash_micro=String(u(next.cash_micro)+received);next.realized_pnl_micro=String(BigInt(next.realized_pnl_micro)+pnl);delete next.positions[input.mint];
  Object.assign(event,{execution:'RETROSPECTIVE_MODEL_FILL',received_micro:String(received),pnl_micro:String(pnl)});
 }
 next.events.push(event);return {ledger:next,evaluation:e};
}
