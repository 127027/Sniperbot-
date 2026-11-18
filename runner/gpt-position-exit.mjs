// R29 V4.6 – signed-GPT-authorized position policy for the EXISTING Paper bot.
// This is a VIRTUAL, modelled exit using fresh public indicative market quotes.
// It cannot guarantee any real swap, sale, liquidity, slippage or execution.
// Local service shutdown means monitoring pauses until service restarts.
import {createHash} from 'node:crypto';

export const GPT_EXIT_POLICY_SCHEMA='sniper_gpt_position_exit_policy.v1';
const fields=['schema','stop_loss_pct','take_profit_pct','trailing_drawdown_pct',
 'max_hold_minutes','min_exit_liquidity_usd','quote_max_age_seconds'];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const integerBetween=(x,lo,hi)=>Number.isInteger(x)&&x>=lo&&x<=hi;
const sha=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const decId=x=>typeof x==='string'&&/^gpt_[0-9a-f]{32}$/.test(x);
const addrEq=(chain,a,b)=>typeof a==='string'&&typeof b==='string'&&
 (chain==='solana'?a===b:a.toLowerCase()===b.toLowerCase());
export function validateGptExitPolicy(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||
  Object.keys(p).sort().join('|')!==fields.sort().join('|')||
  p.schema!==GPT_EXIT_POLICY_SCHEMA||
  !integerBetween(p.stop_loss_pct,2,35)||
  !integerBetween(p.take_profit_pct,10,1000)||
  !integerBetween(p.trailing_drawdown_pct,5,40)||
  !integerBetween(p.max_hold_minutes,15,43200)||
  !integerBetween(p.min_exit_liquidity_usd,1000,1000000)||
  !integerBetween(p.quote_max_age_seconds,10,90))
  throw Error('GPT_POSITION_EXIT_POLICY_INVALID');
 return p;
}
export function gptExitPolicyHash(p){
 validateGptExitPolicy(p);
 return createHash('sha256').update(JSON.stringify(p),'utf8').digest('hex');
}
export function validateGptExitBinding(position){
 try{
  const p=validateGptExitPolicy(position?.gptExitPolicy);
  return position?.gptPaperDecision===true&&
   decId(position?.gptExitAuthorizedDecisionId)&&
   sha(position?.gptExitPolicyDigest)&&
   gptExitPolicyHash(p)===position.gptExitPolicyDigest;
 }catch{return false}
}
// Never trigger a sell without fresh exact-pool market identity and valid position policy.
// Source is an indicative DEX market quote, therefore every result is PAPER-ONLY.
export function assessGptPaperExit(position,quote,{now=Date.now()}={}){
 const fail=reason=>({due:false,reason,highWaterPrice:null,paper_only:true,
  executable_real_swap_verified:false});
 if(!Number.isFinite(now)||!validateGptExitBinding(position))
  return fail('GPT_POSITION_EXIT_POLICY_MISSING_OR_TAMPERED');
 const p=position.gptExitPolicy,opened=Date.parse(position.openedAt);
 if(!finite(position.entryPriceUsd)||position.entryPriceUsd<=0||
  !finite(position.qty)||position.qty<=0||
  !finite(position.amountUsdc)||position.amountUsdc<=0||
  !Number.isFinite(opened)||opened>now||
  !finite(position.highWaterPrice)||position.highWaterPrice<=0)
  return fail('GPT_POSITION_LEDGER_INVALID');
 const qt=Date.parse(quote?.asOf);
 if(quote?.source!=='DEX Screener'||quote?.chain!==position.chain||
  !addrEq(position.chain,quote?.tokenAddress,position.tokenAddress)||
  !addrEq(position.chain,quote?.poolAddress,position.poolAddress)||
  !finite(quote.priceUsd)||quote.priceUsd<=0||
  !finite(quote.liquidityUsd)||quote.liquidityUsd<p.min_exit_liquidity_usd||
  !Number.isFinite(qt)||qt>now||now-qt>p.quote_max_age_seconds*1000)
  return fail('GPT_EXIT_EXACT_POOL_FRESH_LIQUID_QUOTE_UNAVAILABLE');
 const high=Math.max(position.highWaterPrice,position.entryPriceUsd,quote.priceUsd);
 // The paper ledger models a 1% buy fee and a 1% sell fee; use its current
 // virtual quantity and the candidate sell mark to include modeled costs.
 const pnlPct=(position.qty*quote.priceUsd*.99/position.amountUsdc-1)*100;
 const trailingPct=(1-quote.priceUsd/high)*100;
 const holdMinutes=(now-opened)/60000;
 let reason='GPT_EXIT_HOLD';
 if(pnlPct<=-p.stop_loss_pct)reason='GPT_EXIT_STOP_LOSS';
 else if(pnlPct>=p.take_profit_pct)reason='GPT_EXIT_TAKE_PROFIT';
 else if(trailingPct>=p.trailing_drawdown_pct)reason='GPT_EXIT_TRAILING_DRAWDOWN';
 else if(holdMinutes>=p.max_hold_minutes)reason='GPT_EXIT_MAX_HOLD_EXPIRED';
 return {due:reason!=='GPT_EXIT_HOLD',reason,highWaterPrice:high,
  pnl_pct_modelled:Number(pnlPct.toFixed(4)),
  trailing_pct:Number(trailingPct.toFixed(4)),
  paper_only:true,executable_real_swap_verified:false,
  quote_at_utc:quote.asOf};
}
// Deterministic per-minute intent ID, with durable signed-order replay in the ledger.
// It can retry in a later minute if a local Paper operation was previously blocked.
export function gptPolicyExitIntentId(position,reason,now=Date.now()){
 if(!validateGptExitBinding(position)||!/^GPT_EXIT_(?:STOP_LOSS|TAKE_PROFIT|TRAILING_DRAWDOWN|MAX_HOLD_EXPIRED)$/.test(reason)||
  !Number.isFinite(now))throw Error('GPT_POLICY_EXIT_INTENT_INVALID');
 return 'gpt_'+createHash('sha256').update([
  'R29-V4.6-GPT-PAPER-EXIT',position.id,
  position.gptExitAuthorizedDecisionId,position.gptExitPolicyDigest,
  reason,String(Math.floor(now/60000))
 ].join('|')).digest('hex').slice(0,32);
}
