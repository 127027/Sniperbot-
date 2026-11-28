// Common evidence -> expiring advisory -> virtual ledger. No wallet or transaction.
import {identity} from './paper.mjs';
import {USDC} from './providers.mjs';
const MINT=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const raw=x=>typeof x==='string'&&/^[1-9][0-9]{0,30}$/.test(x);
const fresh=(t,now,max)=>Number.isFinite(Date.parse(t))&&Date.parse(t)<=now&&now-Date.parse(t)<=max;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export const POLICY=Object.freeze({stake:5000,maxPositions:10,minLiquidity:20000,minVolume:25000,
  minPairAge:600000,maxQuoteAge:60000,maxMarketAge:300000,maxRiskAge:300000,maxRoundtripBps:600,
  advisoryTtl:3600000,stopLossBps:2500,trailBps:3000});
function validIdentity(x){return x?.chain==='solana'&&typeof x.address==='string'&&MINT.test(x.address);}
function route(q,input,output,now){
  return q?.status==='QUOTED_NOT_EXECUTED'&&q.input_mint===input&&q.output_mint===output&&
    raw(q.in_raw)&&raw(q.out_raw)&&fresh(q.retrieved_at,now,POLICY.maxQuoteAge)&&
    (!q.expires_at||Date.parse(q.expires_at)>now);
}
// Explicit virtual USDC=USD model (not a real conversion); use daily FX reference.
function reference(fx,now){
  return fx?.status==='DAILY_REFERENCE_NOT_LIVE_FX'&&finite(fx.usd_per_eur)&&fx.usd_per_eur>0&&
    fresh(fx.retrieved_at,now,3600000)&&fresh(fx.reference_date+'T00:00:00Z',now,7*86400000);
}
export function paperBudgetRaw(fx,now){
  if(!reference(fx,now))throw Error('INVALID_FX_REFERENCE');
  // Reserve 10 cents modeled entry fee from fixed 50 EUR, not deducted twice.
  return BigInt(Math.floor(49.9*fx.usd_per_eur*1e6)).toString();
}
function proceeds(q,fx){return Math.max(0,Math.floor(Number(BigInt(q.out_raw))/1e6/fx.usd_per_eur*100)-10);}
export function qualify(c,now){
  const reasons=[],m=c?.market??{},q=c?.roundtrip??{},r=c?.risk_evidence??{},fx=c?.fx;
  if(!validIdentity(c))reasons.push('IDENTITY');
  if(c?.meme_status!=='VERIFIED_MEME'||!c?.meme_source||!fresh(c.meme_observed_at,now,86400000))reasons.push('MEME_EVIDENCE');
  if(c?.market_stale!==false||!fresh(m.retrieved_at,now,POLICY.maxMarketAge))reasons.push('MARKET_STALE');
  if(!finite(m.liquidity_usd)||m.liquidity_usd<POLICY.minLiquidity)reasons.push('LIQUIDITY');
  if(!finite(m.volume_1h_usd)||m.volume_1h_usd<POLICY.minVolume)reasons.push('VOLUME');
  if(!finite(m.pair_created_at)||m.pair_created_at<=0||now-m.pair_created_at<POLICY.minPairAge)reasons.push('PAIR_AGE');
  if(!finite(m.buys_5m)||!finite(m.sells_5m)||m.sells_5m<=0||m.buys_5m/m.sells_5m<1.2)reasons.push('FLOW');
  if(r.address!==c?.address||r.chain!==c?.chain||r.risk!=='PASS'||r.scope!=='CLASSIC_SPL_MINT_AND_ACCOUNT_CONCENTRATION'||
    !fresh(r.observed_at,now,POLICY.maxRiskAge))reasons.push('RISK');
  if(!reference(fx,now))reasons.push('FX');
  if(q.address!==c?.address||q.chain!==c?.chain||q.mode!=='PAPER_ONLY'||q.route_evidence!=='BIDIRECTIONAL_QUOTED'||
    !route(q.buy,USDC,c?.address,now)||!route(q.sell,c?.address,USDC,now)||
    q.buy?.out_raw!==q.sell?.in_raw||Date.parse(q.sell?.retrieved_at)<Date.parse(q.buy?.retrieved_at))reasons.push('ROUTE');
  if(!reasons.length){
    if(q.buy.in_raw!==paperBudgetRaw(fx,now))reasons.push('BUDGET_MISMATCH');
    else if((POLICY.stake-proceeds(q.sell,fx))*10000>POLICY.stake*POLICY.maxRoundtripBps)reasons.push('ROUNDTRIP_COST');
  }
  return reasons;
}
function score(c){
  const m=c.market;
  return Math.max(-50,Math.min(200,finite(m.change_1h_pct)?m.change_1h_pct:0))/200+
    Math.log10(1+m.volume_1h_usd)/10+Math.log10(1+m.liquidity_usd)/10-(c.promoted?0.1:0);
}
export function decide(candidates,now){
  const blocked=[],qualified=new Map();
  for(const c of candidates){
    const reasons=qualify(c,now);
    if(reasons.length)blocked.push({address:c?.address??null,reasons});
    else qualified.set(identity(c),c);
  }
  const buys=[...qualified.values()].sort((a,b)=>score(b)-score(a)).slice(0,10).map(c=>({
    action:'BUY',mode:'PAPER_ONLY',chain:c.chain,address:c.address,symbol:c.market.symbol??c.address.slice(0,8),
    observed_at:new Date(now).toISOString(),expires_at:new Date(now+POLICY.advisoryTtl).toISOString(),score:score(c)
  }));
  return {buys,blocked};
}
function advisory(x,now,action){
  return validIdentity(x)&&x.mode==='PAPER_ONLY'&&x.action===action&&fresh(x.observed_at,now,POLICY.advisoryTtl)&&
    Date.parse(x.expires_at)>now&&Date.parse(x.expires_at)<=Date.parse(x.observed_at)+POLICY.advisoryTtl;
}
export function applyBuy(s,sig,c,now){
  if(!advisory(sig,now,'BUY'))return {state:s,reason:'INVALID_ADVISORY'};
  if(!s.enabled)return {state:s,reason:'OFF'};
  if(s.positions.some(p=>p.id===identity(sig)))return {state:s,reason:'ALREADY_HELD'};
  if(s.cash<POLICY.stake||s.positions.length>=POLICY.maxPositions)return {state:s,reason:'BUDGET'};
  if(!validIdentity(c)||identity(c)!==identity(sig)||qualify(c,now).length)return {state:s,reason:'LOCAL_VALIDATION_FAILED'};
  const q=c.roundtrip, at=new Date(now).toISOString(),value=proceeds(q.sell,c.fx);
  const decimals=Number.isInteger(c.risk_evidence.decimals)&&c.risk_evidence.decimals>=0&&c.risk_evidence.decimals<=18?c.risk_evidence.decimals:null;
  const units=decimals===null?null:Number(q.buy.out_raw)/10**decimals;
  const entry_price_eur=units>0?Number(q.buy.in_raw)/1e6/c.fx.usd_per_eur/units:null;
  const p={id:identity(sig),chain:sig.chain,address:sig.address,symbol:sig.symbol,amount:POLICY.stake,
    qty_raw:q.buy.out_raw,decimals,entry_price_eur,entry_usdc_raw:q.buy.in_raw,entry_fee_cents:10,
    entry_fx:c.fx.usd_per_eur,entry_liquidity:c.market.liquidity_usd,
    peak_cents:value,mark_cents:value,at,model:'QUOTED_PAPER_USDC_USD_PARITY'};
  return {reason:'BOUGHT',state:{...s,cash:s.cash-POLICY.stake,positions:[...s.positions,p],
    history:[...s.history,{action:'BUY',id:p.id,symbol:p.symbol,amount:50,at,qty_raw:p.qty_raw,unit_price_eur:p.entry_price_eur,modeled_fee_eur:0.1,model:p.model}]}};
}
export function monitor(s,id,{quote,fx,market,signal}={},now){
  const p=s.positions.find(x=>x.id===id);
  if(!p)return {state:s,reason:'NOT_HELD'};
  if(!raw(p.qty_raw)||!reference(fx,now)||!route(quote,p.address,USDC,now)||quote.in_raw!==p.qty_raw){
    return {state:{...s,positions:s.positions.map(x=>x===p?{...p,mark_stale:true,last_error:'EXIT_QUOTE_UNAVAILABLE'}:x)},reason:'EXIT_QUOTE_UNAVAILABLE'};
  }
  const value=proceeds(quote,fx),peak=Math.max(p.peak_cents,value);
  const reason=(advisory(signal,now,'SELL')&&identity(signal)===id)?'CENTRAL_SELL':
    value*10000<=p.amount*(10000-POLICY.stopLossBps)?'STOP_LOSS':
    value*10000<=peak*(10000-POLICY.trailBps)?'TRAILING':
    market&&fresh(market.retrieved_at,now,POLICY.maxMarketAge)&&finite(market.liquidity_usd)&&
      market.liquidity_usd<=p.entry_liquidity/2?'LIQUIDITY_DROP':null;
  if(!reason)return {state:{...s,positions:s.positions.map(x=>x===p?{...p,mark_cents:value,peak_cents:peak,mark_stale:false,last_error:null}:x)},reason:'NO_ACTION'};
  return {reason,state:{...s,cash:s.cash+value,positions:s.positions.filter(x=>x!==p),
    history:[...s.history,{action:'SELL',id:p.id,symbol:p.symbol,amount:value/100,pnl:(value-p.amount)/100,
      buy_at:p.at,at:new Date(now).toISOString(),reason,model:p.model,qty_raw:p.qty_raw,
      unit_price_eur:Number.isInteger(p.decimals)?Number(quote.out_raw)/1e6/fx.usd_per_eur/(Number(p.qty_raw)/10**p.decimals):null,modeled_fee_eur:0.1}]}};
}
