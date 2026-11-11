// Agent-facing paper execution pipeline. A signed research signal may change
// only the local PAPER ledger. The agent never sends a USD price or instructs
// an actual wallet swap. Market prices are independently looked up by server.
// All test amounts are virtual; actual LIVE execution is explicitly unavailable.
import {createHash,createPublicKey,verify} from 'node:crypto';
import {canonicalInstruction} from './device-execution-inbox.mjs';
import {validateChainAsset} from './chain-trade-intent-v2.mjs';
import {action} from './core.mjs';
import {isWithinPortfolioBudget} from './portfolio-budget.mjs';

export const AGENT_SIGNAL_SCHEMA='sniper_agent_trade_signal.v1';
export const AGENT_SIGNAL_DOMAIN='MemeSniper/agent_trade_signal.v1\n';
const fields=['schema','target_device_id','signal_id','issuer','key_id',
 'chain','action','token_address','pool_address','size_test_usdc',
 'created_at_utc','expires_at_utc','signature'];
const DEV=/^device_[0-9a-f]{32}$/;
const ID=/^sig_[0-9a-f]{32}$/;
const LABEL=/^[a-zA-Z0-9_.-]{3,80}$/;
const CENTS=/^(?:[1-9][0-9]{0,4})(?:\.[0-9]{1,2})?$/;
function eqAddress(a,b){return a?.toLowerCase()===b?.toLowerCase()}
export function unsignedAgentSignal(order){
 if(!order||typeof order!=='object')throw Error('AGENT_SIGNAL_REQUIRED');
 const {signature,...data}=order;
 return AGENT_SIGNAL_DOMAIN+canonicalInstruction(data);
}
export function verifyAgentSignal(order,keys,{deviceId,now=Date.now()}={}){
 if(!DEV.test(deviceId||''))throw Error('AGENT_DEVICE_INVALID');
 if(!order||typeof order!=='object'||Array.isArray(order)||
  Object.keys(order).sort().join(',')!==[...fields].sort().join(','))
  throw Error('AGENT_SIGNAL_FIELDS_INVALID');
 if(order.schema!==AGENT_SIGNAL_SCHEMA||order.target_device_id!==deviceId||
  !ID.test(order.signal_id)||!LABEL.test(order.issuer)||!LABEL.test(order.key_id)||
  !['BUY','SELL'].includes(order.action))throw Error('AGENT_SIGNAL_ID_INVALID');
 const token=validateChainAsset(order.chain,order.token_address);
 const pool=order.pool_address===null?null:
  validateChainAsset(order.chain,order.pool_address);
 if(order.action==='BUY'){
  if(typeof order.size_test_usdc!=='string'||!CENTS.test(order.size_test_usdc)||
   Number(order.size_test_usdc)<50)
   throw Error('AGENT_PAPER_SIZE_INVALID');
 }else if(order.size_test_usdc!==null)throw Error('AGENT_SELL_MUST_BE_FULL_POSITION');
 const created=Date.parse(order.created_at_utc),expiry=Date.parse(order.expires_at_utc);
 if(!Number.isFinite(now)||!Number.isFinite(created)||!Number.isFinite(expiry)||
  created>now+5000||expiry<=now||expiry<=created||expiry-created>120000)
  throw Error('AGENT_SIGNAL_STALE');
 if(!Array.isArray(keys)||keys.length>30)throw Error('PUBLISHER_REGISTRY_INVALID');
 const trusted=keys.find(k=>k.issuer===order.issuer&&k.key_id===order.key_id&&
  k.scope==='agent_execution'&&!k.revoked);
 if(!trusted)throw Error('UNTRUSTED_AGENT_SIGNER');
 const pub=createPublicKey(trusted.public_key_pem);
 const sig=typeof order.signature==='string'?Buffer.from(order.signature,'base64'):Buffer.alloc(0);
 if(pub.asymmetricKeyType!=='ed25519'||sig.length!==64||
  sig.toString('base64')!==order.signature||
  !verify(null,Buffer.from(unsignedAgentSignal(order),'utf8'),pub,sig))
  throw Error('AGENT_SIGNATURE_INVALID');
 return {token,pool,amount:order.action==='BUY'?Number(order.size_test_usdc):null};
}
function validQuote(q,order,now){
 return q&&q.chain===order.chain&&eqAddress(q.tokenAddress,order.token_address)&&
  (!order.pool_address||eqAddress(q.poolAddress,order.pool_address))&&
  typeof q.poolAddress==='string'&&typeof q.priceUsd==='number'&&
  Number.isFinite(q.priceUsd)&&q.priceUsd>0&&q.priceUsd<1e10&&
  Number.isFinite(q.liquidityUsd)&&q.liquidityUsd>=1000&&
  Number.isFinite(Date.parse(q.asOf))&&Date.parse(q.asOf)<=now&&
  now-Date.parse(q.asOf)<=90000&&
  typeof q.symbol==='string'&&q.symbol.length<=32;
}
export function applyAgentSignal(state,order,keys,{deviceId,now=Date.now(),quote=null,source='SIGNED_LOCAL_ADAPTER'}={}){
 if(!['SIGNED_LOCAL_ADAPTER','GITHUB_SIGNED_COURIER'].includes(source))throw Error('INVALID_AGENT_TRANSPORT_SOURCE');
 const verified=verifyAgentSignal(order,keys,{deviceId,now});
 const receipts=state.agentOrderReceipts||[];
 if(!Array.isArray(receipts)||receipts.length>250)throw Error('PAPER_AGENT_RECEIPTS_INVALID');
 const digest=createHash('sha256').update(unsignedAgentSignal(order)).digest('hex');
 const previous=receipts.find(x=>x.signal_id===order.signal_id);
 if(previous){
  if(previous.payload_sha256!==digest)throw Error('AGENT_SIGNAL_REPLAY_CONFLICT');
  return {next:state,receipt:{...previous,duplicate:true}};
 }
 let next=state,status='BLOCKED',reason='MARKET_QUOTE_UNAVAILABLE';
 const amount=verified.amount,actionType=order.action;
 let positionId=null,pnl=null;
 if(!state.entriesEnabled&&actionType==='BUY')reason='PAPER_BOT_OFF';
 else if(!validQuote(quote,order,now))reason='MARKET_QUOTE_INVALID_OR_STALE';
 else if(actionType==='BUY'){
  if(!isWithinPortfolioBudget(state,amount))reason='PAPER_BUDGET_OR_FUNDS_INSUFFICIENT';
  else{
   const id=order.chain+':'+quote.poolAddress;
   const candidate={
    id,source:'DEX Screener',chain:order.chain,
    tokenAddress:order.token_address,poolAddress:quote.poolAddress,
    symbol:quote.symbol||order.token_address.slice(0,8),
    name:quote.name||'Von Agent gemeldeter Token',
    priceUsd:quote.priceUsd,asOf:quote.asOf,isDemo:false,
    paperEligible:true,safety:'NICHT VERIFIZIERT',
    liquidityUsd:quote.liquidityUsd
   };
   const candidateState={...state,candidates:[candidate,...state.candidates.filter(c=>c.id!==id)].slice(0,90)};
   const attempted=action(candidateState,{type:'BUY',id,amount});
   if(attempted.positions.length>state.positions.length){
    next=attempted;status='PAPER_FILLED';reason='SIGNED_AGENT_BUY_PAPER_ONLY';
    positionId=attempted.positions.find(p=>p.chain===order.chain&&
     eqAddress(p.tokenAddress,order.token_address))?.id||null;
   }else reason='POSITION_ALREADY_OPEN_OR_LEDGER_BLOCKED';
  }
 }
 else{
  const matching=state.positions.filter(p=>p.chain===order.chain&&
   eqAddress(p.tokenAddress,order.token_address)&&
   (!order.pool_address||eqAddress(p.poolAddress,order.pool_address)));
  if(matching.length===0){status='NOOP';reason='NO_MATCHING_PAPER_POSITION'}
  else if(matching.length!==1)reason='AMBIGUOUS_PAPER_POSITION';
  else{
   const old=matching[0];
   const updated={...state,positions:state.positions.map(p=>p.id===old.id?
    {...p,priceUsd:quote.priceUsd,markAt:quote.asOf}:p)};
   const closed=action(updated,{type:'SELL',id:old.id});
   if(closed.positions.length===state.positions.length-1){
    next=closed;status='PAPER_FILLED';reason='SIGNED_AGENT_SELL_PAPER_ONLY';
    positionId=old.id;pnl=Number((closed.closedPnl-state.closedPnl).toFixed(8));
   }else reason='SELL_BLOCKED_BY_MARKET_OR_LEDGER';
  }
 }
 const receipt={
  signal_id:order.signal_id,command_source:source,
  issuer:order.issuer,action:actionType,
  chain:order.chain,token_address:order.token_address,
  pool_address:quote?.poolAddress||order.pool_address,
  requested_test_usdc:amount,
  position_id:positionId,closed_pnl_test_usdc:pnl,
  status,reason,quote_price_usd:validQuote(quote,order,now)?quote.priceUsd:null,
  received_at_utc:new Date(now).toISOString(),
  payload_sha256:digest,duplicate:false,
  real_trade_executed:false,wallet_debited:false,
  externally_funded:false,live_trading_enabled:false
 };
 next={...next,agentOrderReceipts:[...receipts,receipt].slice(-250)};
 return {next,receipt};
}
