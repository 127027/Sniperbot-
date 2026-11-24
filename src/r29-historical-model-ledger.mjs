// Research-only integer ledger. No filesystem, no client state and no live order format.
export const emptyHistoricalLedger=()=>({kind:'R29_ISOLATED_HISTORICAL_MODEL_LEDGER',cash_micro:'5000000000',positions:{},events:[],realized_pnl_micro:'0',orders:0});
const u=x=>{if(typeof x!=='string'||!/^\d+$/.test(x))throw Error('INVALID_AMOUNT');return BigInt(x);};
export function applyHistoricalModelDecision(state,{decision,quote,tickUtc,mint,fixtureOnly=false}={}){
 if(state?.kind!=='R29_ISOLATED_HISTORICAL_MODEL_LEDGER'||!['BUY','SELL','HOLD','WATCH','NO_TRADE','DATA_GAP'].includes(decision?.action)||!Number.isFinite(Date.parse(tickUtc))||typeof mint!=='string'||!mint)throw Error('INVALID_LEDGER_INPUT');
 const next=structuredClone(state),prev=next.events.at(-1);
 if(prev&&Date.parse(tickUtc)<Date.parse(prev.tick_utc))throw Error('TIME_REGRESSION');
 if(next.events.some(e=>e.tick_utc===tickUtc&&e.mint===mint))throw Error('DUPLICATE_DECISION');
 const event={tick_utc:tickUtc,mint,decision:decision.action,reason:decision.reason,execution:'NO_FILL',fixture_only:fixtureOnly};
 if(['BUY','SELL'].includes(decision.action)){
  // Positive execution path deliberately restricted to explicit synthetic tests
  // until a separate verified retrospective-risk/execution contract is ready.
  if(!fixtureOnly||quote?.kind!=='R29_SYNTHETIC_LEDGER_TEST_QUOTE'||quote.mint!==mint||quote.tick_utc!==tickUtc||quote.action!==decision.action){event.execution='BLOCKED_UNVERIFIED_HISTORICAL_EXECUTION';}
  else if(decision.action==='BUY'){
   const cost=u(quote.spent_micro),tokens=u(quote.token_raw);
   if(next.positions[mint]||cost!==50000000n||tokens<=0n||u(next.cash_micro)<cost)throw Error('INVALID_BUY');
   next.cash_micro=String(u(next.cash_micro)-cost);next.positions[mint]={token_raw:String(tokens),cost_micro:String(cost),entered_at_utc:tickUtc};event.execution='SYNTHETIC_MODEL_BUY';event.cost_micro=String(cost);
  }else{
   const p=next.positions[mint],received=u(quote.received_micro);if(!p||u(p.token_raw)!==u(quote.token_raw)||Date.parse(p.entered_at_utc)>=Date.parse(tickUtc))throw Error('INVALID_SELL');
   next.cash_micro=String(u(next.cash_micro)+received);const pnl=received-u(p.cost_micro);next.realized_pnl_micro=String(BigInt(next.realized_pnl_micro)+pnl);delete next.positions[mint];event.execution='SYNTHETIC_MODEL_SELL';event.pnl_micro=String(pnl);
  }
 }
 next.events.push(event);return next;
}
