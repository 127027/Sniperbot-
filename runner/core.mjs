// Local simulation ledger. Only virtual money and paper trades; no live order/payment transport.
import {isWithinPortfolioBudget} from './portfolio-budget.mjs';
export const PAPER_EUR_TO_TEST_USDC=1; // intentionally NOT a market EUR/USD quote
const round=(x)=>Math.round((x+Number.EPSILON)*1e8)/1e8;
const time=()=>new Date().toISOString();
export function freshState(){return {version:3,entriesEnabled:false,automaticPaperBuys:false,centralPaperFollow:false,
 minTrade:50,maxTrade:50,portfolioBudgetUsdc:null,takeProfit:15,stopLoss:10,defaultExitMode:'HOLD',trailingPercent:25,
 cashEur:0,cashUsdc:0,positions:[],candidates:[],history:[],agentOrderReceipts:[],closedPnl:0,
 lastScan:null,scanErrors:[],priceUpdatedAt:null,scanRunning:false,lastError:null};}
export function log(s,title,detail){return [{id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,at:time(),title,detail},...s.history].slice(0,150)};
const isAmount=x=>Number.isFinite(x)&&x>0&&x<=100000;
const numeric=x=>Number(x);
const finitePrice=x=>Number.isFinite(x)&&x>0;
export function action(s,a){if(!a||typeof a!=='object')return s;
 switch(a.type){
 case 'TOGGLE_BOT':return {...s,entriesEnabled:!s.entriesEnabled,history:log(s,!s.entriesEnabled?'Bot AN':'Bot AUS',!s.entriesEnabled?'Neue Paper-Einstiege erlaubt':'Neue Paper-Einstiege gestoppt, Exit-Engine bleibt aktiv')};
 case 'SET_CENTRAL_FOLLOW':return {...s,centralPaperFollow:a.enabled===true,history:log(s,'Zentrale Paper-Ausführung',a.enabled===true?'Wartet auf gültige zentrale Aufträge; fehlende Publisher/Marktadapter blockieren':'Deaktiviert')};
 case 'SET_AUTO':return {...s,automaticPaperBuys:!!a.enabled,history:log(s,'Autokauf-Modus',a.enabled?'Nur freigegebene 5-Rollen-Signale werden geprüft':'Nur manuelle Testkäufe')};
 case 'SET_PAPER_BALANCE': {
  // Explicit total virtual balance replacement; never mint extra test funds accidentally.
  // No open positions may be discarded and entries must be paused during the reset.
  const amount=a.amount;
  if(typeof amount!=='number'||!Number.isFinite(amount)||amount<0||amount>100000||Math.abs(amount*100-Math.round(amount*100))>1e-6)return s;
  // Explicit "set to zero" must always work with no open positions, even
  // when the Paper bot was running. Atomically stop new entries first.
  if(!Array.isArray(s.positions)||s.positions.length>0||
    (s.entriesEnabled&&amount!==0))return s;
  const next=Math.round(amount*100)/100,old=round(s.cashEur+s.cashUsdc);
  if(s.cashEur===0&&s.cashUsdc===next&&!s.entriesEnabled)return s;
  return {...s,entriesEnabled:amount===0?false:s.entriesEnabled,cashEur:0,cashUsdc:next,history:log(s,'Testkapital festgelegt',`Virtuelles Guthaben gesamt ${old.toFixed(2)} → ${next.toFixed(2)} TEST-USDC; keine Einzahlung, Auszahlung oder echte Umwandlung`)};
 }
 case 'SET_RANGE': {const min=numeric(a.min),max=numeric(a.max);if(!isAmount(min)||!isAmount(max)||min<50||min>max||max<50)return s;return {...s,minTrade:min,maxTrade:max,portfolioBudgetUsdc:max,history:log(s,'Paper-Budget eingestellt',`Wunsch-Einsatz ${min} Test-USDC; Gesamtbudget ${max} Test-USDC; flexible Käufe ab 50, offene Positionen bleiben unverändert`)}};
 case 'SET_EXITS':{const profit=numeric(a.profit),loss=numeric(a.loss),mode=a.mode;
 if(!isAmount(profit)||!isAmount(loss)||loss>=100||profit>500||!['HOLD','AUTO','TRAILING'].includes(mode)|| (mode==='TRAILING'&&(!isAmount(Number(a.trailing))||Number(a.trailing)>=100)))return s;
 return {...s,takeProfit:profit,stopLoss:loss,trailingPercent:mode==='TRAILING'?Number(a.trailing):s.trailingPercent,defaultExitMode:mode,positions:s.positions.map(p=>({...p,exitMode:mode,highWaterPrice:p.highWaterPrice||p.priceUsd})),history:log(s,'Exit-Regel',mode==='HOLD'?'Halten bis manuell verkauft wird':mode==='TRAILING'?`Paper-Trailing ${a.trailing}%, Stop-Loss ${loss}%`: `Legacy-Exit bei +${profit}% / -${loss}% (auch bei Bot AUS)`)}};
 case 'DEPOSIT': {const eur=numeric(a.eur);if(!isAmount(eur))return s;return {...s,cashEur:round(s.cashEur+eur),history:log(s,'Testguthaben eingezahlt',`${eur.toFixed(2)} virtuelle EUR; KEINE Paypal-/Bankzahlung`)}};
 case 'WITHDRAW':{
  const eur=numeric(a.eur);
  // Users see ONE free paper balance, not a cumbersome fake EUR/USDC exchange.
  // The internal conversion remains 1:1 TEST ONLY; no real FX, wallet or PayPal.
  if(!isAmount(eur)||eur>round(s.cashEur+s.cashUsdc))return s;
  const fromEur=Math.min(s.cashEur,eur),fromUsdc=round(eur-fromEur);
  return {...s,cashEur:round(s.cashEur-fromEur),
   cashUsdc:round(s.cashUsdc-fromUsdc),
   history:log(s,'Testguthaben abgehoben',
    `${eur.toFixed(2)} virtuelles Gesamtguthaben abgehoben; KEINE Auszahlung; ${fromUsdc>0?'TEST-USDC automatisch verrechnet':''}`)};
 }
 case 'EXCHANGE':{const eur=numeric(a.eur);if(!isAmount(eur)||s.cashEur<eur)return s;const usdc=round(eur*PAPER_EUR_TO_TEST_USDC);return {...s,cashEur:round(s.cashEur-eur),cashUsdc:round(s.cashUsdc+usdc),history:log(s,'TEST-Umwandlung',`${eur.toFixed(2)} Demo-EUR → ${usdc.toFixed(2)} Test-USDC; Kurs 1:1 ist kein Wechselkurs`)}};
 case 'EXCHANGE_BACK':{const usdc=numeric(a.usdc);if(!isAmount(usdc)||s.cashUsdc<usdc)return s;return {...s,cashUsdc:round(s.cashUsdc-usdc),cashEur:round(s.cashEur+usdc/PAPER_EUR_TO_TEST_USDC),history:log(s,'TEST-Rückumwandlung',`${usdc.toFixed(2)} Test-USDC → ${(usdc/PAPER_EUR_TO_TEST_USDC).toFixed(2)} virtuelle EUR; KEIN echter Kurs`)}};
 case 'BUY':{
  const c=s.candidates.find(x=>x.id===a.id);const amount=numeric(a.amount);
  if(!c||!finitePrice(c.priceUsd)||!s.entriesEnabled||!isAmount(amount)||!isWithinPortfolioBudget(s,amount))return s;
  if(s.positions.some(p=>p.chain===c.chain&&p.tokenAddress===c.tokenAddress))return s;
  if(!c.isDemo&&(!Number.isFinite(Date.parse(c.asOf))||Date.now()-Date.parse(c.asOf)>120000||Date.parse(c.asOf)>Date.now()))return s;
  // Paper buy with optional JUST-IN-TIME fictional EUR to USDC conversion; NEVER an on-chain swap.
  let cashEur=s.cashEur,cashUsdc=s.cashUsdc;const shortfall=Math.max(0,round(amount-cashUsdc));
  if(shortfall>0){if(cashEur<shortfall)return s;cashEur=round(cashEur-shortfall);cashUsdc=round(cashUsdc+shortfall)}
  if(cashUsdc<amount)return s;
  const fee=0.01,qty=round((amount*(1-fee))/c.priceUsd);if(!finitePrice(qty))return s;
  const pos={id:`pos-${Date.now()}-${Math.random().toString(16).slice(2)}`,chain:c.chain,poolAddress:c.poolAddress,
  tokenAddress:c.tokenAddress,symbol:c.symbol,name:c.name,priceUsd:c.priceUsd,entryPriceUsd:c.priceUsd,highWaterPrice:c.priceUsd,
  markAt:c.asOf,source:c.source,isDemo:c.isDemo,qty,amountUsdc:amount,openedAt:time(),exitMode:s.defaultExitMode,
  safety:'NICHT VERIFIZIERT',status:'PAPER_ONLY'};
  return {...s,cashEur,cashUsdc:round(cashUsdc-amount),positions:[pos,...s.positions],history:log(s,'TEST-KAUF',`${c.symbol} · ${amount.toFixed(2)} Test-USDC · 1% modellierte Einstiegskosten · ${c.chain}; ${shortfall>0?'Demo-EUR automatisch getauscht':''}`)}};
 case 'SELL':{
  const p=s.positions.find(x=>x.id===a.id);if(!p)return s;
  if(!Number.isFinite(Date.parse(p.markAt))||Date.now()-Date.parse(p.markAt)>180000||Date.parse(p.markAt)>Date.now())return s;
  const proceeds=round(p.qty*p.priceUsd*0.99);const pnl=round(proceeds-p.amountUsdc);
  return {...s,cashUsdc:round(s.cashUsdc+proceeds),closedPnl:round(s.closedPnl+pnl),positions:s.positions.filter(x=>x.id!==p.id),history:log(s,'TEST-VERKAUF',`${p.symbol}: ${proceeds.toFixed(2)} Test-USDC, P&L ${pnl.toFixed(2)} (1% modellierte Ausstiegskosten)`)}};
 case 'RESET':return freshState();
 default:return s;
 }}
export function updateCandidates(s,list,errors=[],at=time()){
 return {...s,candidates:list,scanErrors:errors,lastScan:at};
}
export function updateQuotes(s,quotes){
 // Quotes may change marks but must never modify balances or cause speculative paper fills on stale data.
 const next={...s,positions:s.positions.map(p=>{
   const q=quotes[p.id];return q&&finitePrice(q.priceUsd)&&Number.isFinite(Date.parse(q.asOf))&&Date.parse(q.asOf)<=Date.now()&&Date.now()-Date.parse(q.asOf)<=180000?{...p,priceUsd:q.priceUsd,markAt:q.asOf,source:q.source}:p;})};
 return applyExits(next);
}
export function applyExits(s){
 let n={...s,positions:s.positions.map(p=>({...p}))};
 for(const p of [...n.positions]){
  const age=Date.now()-Date.parse(p.markAt);
  if(!Number.isFinite(age)||age<0||age>180000){p.quoteStatus='STALE / EXIT_UNAVAILABLE';continue}
  p.quoteStatus=p.isDemo?'SYNTHETIC':'INDICATIVE';
  p.highWaterPrice=Math.max(p.highWaterPrice||p.entryPriceUsd,p.priceUsd);
  if(!['AUTO','TRAILING'].includes(p.exitMode))continue;
  // Trailing is only executed for synthetic fixtures until real sell quotes exist.
  if(p.exitMode==='TRAILING'&&!p.isDemo){p.quoteStatus='EXIT_UNAVAILABLE: keine ausführbare Sell-Quote';continue}
  const pct=(p.qty*p.priceUsd*.99/p.amountUsdc-1)*100;
  const drawdown=(1-p.priceUsd/p.highWaterPrice)*100;
  const exit=pct<=-n.stopLoss||(p.exitMode==='AUTO'?pct>=n.takeProfit:drawdown>=n.trailingPercent);
  if(exit){const sold=action(n,{type:'SELL',id:p.id});if(sold!==n){n=sold;n={...n,history:log(n,'AUTO-EXIT trotz Bot '+(n.entriesEnabled?'AN':'AUS'),`${p.symbol}: ${pct.toFixed(2)}% simuliert (${p.exitMode})`)}}}
 }
 return n;
}
export function paperSignal(){return {id:'demo:signal-1',source:'SIMULATION',chain:'demo',poolAddress:'DEMO-POOL-001',tokenAddress:'DEMO-MINT-001',symbol:'TEST',name:'Test Sniper Coin (erfunden)',
 priceUsd:0.025,liquidityUsd:50000,volume5mUsd:18000,buys5m:60,sells5m:22,createdAt:time(),asOf:time(),score:95,criteria:['Erfundenes Testsignal, keine Chain-Validierung'],safety:'SIMULATION – UNGEPRÜFT',isDemo:true,paperEligible:true};}
// Heuristic scanner scores never authorize automatic entries. Research controller owns that path.
export function autoBuyCandidate(s){return s}
