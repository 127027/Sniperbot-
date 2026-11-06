// Local simulation ledger. Only virtual money and paper trades; no live order/payment transport.
export const PAPER_EUR_TO_TEST_USDC=1; // intentionally NOT a market EUR/USD quote
const round=(x)=>Math.round((x+Number.EPSILON)*1e8)/1e8;
const time=()=>new Date().toISOString();
export function freshState(){return {version:3,entriesEnabled:false,automaticPaperBuys:false,
 minTrade:50,maxTrade:50,takeProfit:15,stopLoss:10,defaultExitMode:'HOLD',maxPositions:1,
 cashEur:0,cashUsdc:0,positions:[],candidates:[],history:[],closedPnl:0,
 lastScan:null,scanErrors:[],priceUpdatedAt:null,scanRunning:false,lastError:null};}
export function log(s,title,detail){return [{id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,at:time(),title,detail},...s.history].slice(0,150)};
const isAmount=x=>Number.isFinite(x)&&x>0&&x<=100000;
const numeric=x=>Number(x);
const finitePrice=x=>Number.isFinite(x)&&x>0;
export function action(s,a){if(!a||typeof a!=='object')return s;
 switch(a.type){
 case 'TOGGLE_BOT':return {...s,entriesEnabled:!s.entriesEnabled,history:log(s,!s.entriesEnabled?'Bot AN':'Bot AUS',!s.entriesEnabled?'Neue Paper-Einstiege erlaubt':'Neue Paper-Einstiege gestoppt, Exit-Engine bleibt aktiv')};
 case 'SET_AUTO':return {...s,automaticPaperBuys:!!a.enabled,history:log(s,'Autokauf-Modus',a.enabled?'Qualifizierte Live-Kandidaten dürfen PAPER gekauft werden':'Nur manuelle Testkäufe')};
 case 'SET_RANGE': {const min=numeric(a.min),max=numeric(a.max);if(!isAmount(min)||!isAmount(max)||min>max)return s;return {...s,minTrade:min,maxTrade:max,history:log(s,'Beträge eingestellt',`${min}–${max} TEST-USDC`)}};
 case 'SET_EXITS':{const profit=numeric(a.profit),loss=numeric(a.loss),mode=a.mode;
 if(!isAmount(profit)||!isAmount(loss)||loss>=100||profit>500||!['HOLD','AUTO'].includes(mode))return s;
 return {...s,takeProfit:profit,stopLoss:loss,defaultExitMode:mode,positions:s.positions.map(p=>({...p,exitMode:mode})),history:log(s,'Exit-Regel',mode==='HOLD'?'Halten bis manuell verkauft wird':`Automatischer Exit bei +${profit}% / -${loss}% (auch bei Bot AUS)`)}};
 case 'DEPOSIT': {const eur=numeric(a.eur);if(!isAmount(eur))return s;return {...s,cashEur:round(s.cashEur+eur),history:log(s,'Testguthaben eingezahlt',`${eur.toFixed(2)} virtuelle EUR; KEINE Paypal-/Bankzahlung`)}};
 case 'WITHDRAW':{const eur=numeric(a.eur);if(!isAmount(eur)||s.cashEur<eur)return s;return {...s,cashEur:round(s.cashEur-eur),history:log(s,'Testguthaben abgehoben',`${eur.toFixed(2)} virtuelle EUR; KEINE Auszahlung`)}};
 case 'EXCHANGE':{const eur=numeric(a.eur);if(!isAmount(eur)||s.cashEur<eur)return s;const usdc=round(eur*PAPER_EUR_TO_TEST_USDC);return {...s,cashEur:round(s.cashEur-eur),cashUsdc:round(s.cashUsdc+usdc),history:log(s,'TEST-Umwandlung',`${eur.toFixed(2)} Demo-EUR → ${usdc.toFixed(2)} Test-USDC; Kurs 1:1 ist kein Wechselkurs`)}};
 case 'EXCHANGE_BACK':{const usdc=numeric(a.usdc);if(!isAmount(usdc)||s.cashUsdc<usdc)return s;return {...s,cashUsdc:round(s.cashUsdc-usdc),cashEur:round(s.cashEur+usdc/PAPER_EUR_TO_TEST_USDC),history:log(s,'TEST-Rückumwandlung',`${usdc.toFixed(2)} Test-USDC → ${(usdc/PAPER_EUR_TO_TEST_USDC).toFixed(2)} virtuelle EUR; KEIN echter Kurs`)}};
 case 'BUY':{
  const c=s.candidates.find(x=>x.id===a.id);const amount=numeric(a.amount);
  if(!c||!finitePrice(c.priceUsd)||!s.entriesEnabled||!isAmount(amount)||amount<s.minTrade||amount>s.maxTrade||s.positions.length>=s.maxPositions)return s;
  // Paper buy with optional JUST-IN-TIME fictional EUR to USDC conversion; NEVER an on-chain swap.
  let cashEur=s.cashEur,cashUsdc=s.cashUsdc;const shortfall=Math.max(0,round(amount-cashUsdc));
  if(shortfall>0){if(cashEur<shortfall)return s;cashEur=round(cashEur-shortfall);cashUsdc=round(cashUsdc+shortfall)}
  if(cashUsdc<amount)return s;
  const fee=0.01,qty=round((amount*(1-fee))/c.priceUsd);if(!finitePrice(qty))return s;
  const pos={id:`pos-${Date.now()}-${Math.random().toString(16).slice(2)}`,chain:c.chain,poolAddress:c.poolAddress,
  tokenAddress:c.tokenAddress,symbol:c.symbol,name:c.name,priceUsd:c.priceUsd,entryPriceUsd:c.priceUsd,
  markAt:c.asOf,source:c.source,isDemo:c.isDemo,qty,amountUsdc:amount,openedAt:time(),exitMode:s.defaultExitMode,
  safety:'NICHT VERIFIZIERT',status:'PAPER_ONLY'};
  return {...s,cashEur,cashUsdc:round(cashUsdc-amount),positions:[pos,...s.positions],history:log(s,'TEST-KAUF',`${c.symbol} · ${amount.toFixed(2)} Test-USDC · 1% modellierte Einstiegskosten · ${c.chain}; ${shortfall>0?'Demo-EUR automatisch getauscht':''}`)}};
 case 'SELL':{
  const p=s.positions.find(x=>x.id===a.id);if(!p)return s;
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
   const q=quotes[p.id];return q&&finitePrice(q.priceUsd)?{...p,priceUsd:q.priceUsd,markAt:q.asOf,source:q.source}:p;})};
 return applyExits(next);
}
export function applyExits(s){
 let n=s;for(const p of [...n.positions]){
  if(p.exitMode!=='AUTO')continue;
  if(!p.markAt||Date.now()-Date.parse(p.markAt)>180000)continue;
  const pct=(p.priceUsd*0.99/p.entryPriceUsd/1.01-1)*100;
  if(pct>=n.takeProfit||pct<=-n.stopLoss){n=action(n,{type:'SELL',id:p.id});n={...n,history:log(n,'AUTO-EXIT trotz Bot '+(n.entriesEnabled?'AN':'AUS'),`${p.symbol}: ${pct.toFixed(2)}% simuliert`)}}
 }
 return n;
}
export function paperSignal(){return {id:'demo:signal-1',source:'SIMULATION',chain:'demo',poolAddress:'DEMO-POOL-001',tokenAddress:'DEMO-MINT-001',symbol:'TEST',name:'Test Sniper Coin (erfunden)',
 priceUsd:0.025,liquidityUsd:50000,volume5mUsd:18000,buys5m:60,sells5m:22,createdAt:time(),asOf:time(),score:95,criteria:['Erfundenes Testsignal, keine Chain-Validierung'],safety:'SIMULATION – UNGEPRÜFT',isDemo:true,paperEligible:true};}
export function autoBuyCandidate(s){if(!s.entriesEnabled||!s.automaticPaperBuys||s.positions.length>=s.maxPositions)return s;
 const c=s.candidates.find(x=>x.paperEligible&&!x.isDemo&&x.score>=80&&Date.now()-Date.parse(x.asOf)<120000);
 if(!c)return s;
 // At most one auto purchase while maxPositions=1. Never treat a scoring result as safety certification.
 const available=s.cashUsdc+s.cashEur;const amount=Math.min(s.maxTrade,available);
 if(amount<s.minTrade)return s;
 return action(s,{type:'BUY',id:c.id,amount});
}
