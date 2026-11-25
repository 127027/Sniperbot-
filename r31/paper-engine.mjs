// R31 isolated model only. No network, real orders, wallets or R30 writes.
import {validateControls,admitBuy} from './policy.mjs';
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const eur=c=>c/100;
const cent=x=>{if(typeof x!=='number'||!Number.isFinite(x)||x<0||!Number.isSafeInteger(Math.round(x*100))||Math.abs(x-Math.round(x*100)/100)>1e-7)throw Error('INVALID_MONEY');return Math.round(x*100)};
const id=x=>x.chain.trim().toLowerCase()+':'+(/^(ethereum|base|bsc|bnb chain|arbitrum|polygon|optimism|avalanche)$/i.test(x.chain.trim())?x.contract.trim().toLowerCase():x.contract.trim());
const key=x=>{if(!x||typeof x.chain!=='string'||!x.chain.trim()||typeof x.contract!=='string'||!x.contract.trim())throw Error('IDENTITY_REQUIRED');return id(x)};
const validQty=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const moneyRound=x=>{if(!Number.isFinite(x)||x<0||x>Number.MAX_SAFE_INTEGER)throw Error('MONEY_OVERFLOW');return Math.floor(x+1e-8)};
export function createPaperLedger(initialCashCents) {
 if(!Number.isSafeInteger(initialCashCents)||initialCashCents<0||initialCashCents>100_000_000)throw Error('INVALID_INITIAL_CASH');
 return {schema:'r31.paper.ledger.v1',mode:'PAPER_ONLY',initial_cash_eur:eur(initialCashCents),cash_eur:eur(initialCashCents),positions:[],trades:[],realized_pnl_eur:0,last_target_utc:null};
}
function validateLedger(l){
 if(l?.schema!=='r31.paper.ledger.v1'||l.mode!=='PAPER_ONLY'||!Array.isArray(l.positions)||!Array.isArray(l.trades)||!(l.last_target_utc===null||stamp(l.last_target_utc))||!Number.isFinite(l.realized_pnl_eur))throw Error('INVALID_LEDGER');
 cent(l.cash_eur);cent(l.initial_cash_eur);
 const keys=new Set();for(const p of l.positions){const k=key(p);if(keys.has(k)||!validQty(p.quantity)||cent(p.cost_basis_eur)<=0)throw Error('INVALID_POSITION');keys.add(k)}
 return l;
}
function quote(d,now) {
 if(!validQty(d.price_eur)||!stamp(d.observed_at_utc))return 'PRICE_REQUIRED';
 const dt=Date.parse(now)-Date.parse(d.observed_at_utc);
 if(dt<0||dt>15*60_000)return 'STALE_OR_FUTURE_PRICE';
 try{const u=new URL(d.source_url);if(u.protocol!=='https:'||u.username||u.password)return 'SOURCE_REQUIRED'}catch{return 'SOURCE_REQUIRED'}
 if(typeof d.reason!=='string'||!d.reason.trim())return 'REASON_REQUIRED';
 return null;
}
export function settlePaperCycle({ledger,controls,cycle,now,maxDecisions=500}) {
 validateLedger(ledger);validateControls(controls);
 if(!stamp(now)||!cycle||!stamp(cycle.target_utc)||!Array.isArray(cycle.decisions)||cycle.decisions.length>maxDecisions||cycle.control_revision!==controls.revision)throw Error('INVALID_CYCLE_OR_STALE_CONTROLS');
 if(new Date(cycle.target_utc).toISOString().slice(14)!=='00:00.000Z'||Date.parse(cycle.target_utc)>Date.parse(now)||Date.parse(now)-Date.parse(cycle.target_utc)>15*60_000)throw Error('INVALID_TARGET_TIME');
 if(ledger.last_target_utc!==null&&Date.parse(cycle.target_utc)<=Date.parse(ledger.last_target_utc))throw Error('DUPLICATE_OR_OLD_CYCLE');
 const seen=new Set(),byKey=new Map();for(const d of cycle.decisions){if(!['BUY','SELL','HOLD','WATCH','NO_TRADE','DATA_GAP'].includes(d.action))throw Error('INVALID_ACTION');const k=key(d);if(seen.has(k))throw Error('DUPLICATE_DECISION');seen.add(k);byKey.set(k,d);}
 // Require an explicit decision for all positions, including DATA_GAP.
 for(const p of ledger.positions){const d=byKey.get(key(p));if(!d||!['SELL','HOLD','DATA_GAP'].includes(d.action))throw Error('POSITION_REVIEW_REQUIRED')}
 const out=structuredClone(ledger),events=[];
 const reject=(d,reason)=>events.push({coin:d.coin,chain:d.chain,contract:d.contract,action:d.action,status:'BLOCKED',reason});
 const buy=(d)=>{
  const permitted=admitBuy(controls,out,{...d,control_revision:cycle.control_revision});
  if(!permitted.ok)return reject(d,permitted.reason);
  const q=quote(d,now);if(q)return reject(d,q);
  const stake=controls.stake_cents, fee=Math.ceil(stake/100),quantity=(stake-fee)/100/d.price_eur;
  if(!validQty(quantity))return reject(d,'AMOUNT_TOO_SMALL');
  out.cash_eur=eur(cent(out.cash_eur)-stake);
  out.positions.push({coin:d.coin??d.contract,chain:d.chain,contract:d.contract,quantity,cost_basis_eur:eur(stake),entry_price_eur:d.price_eur,booked_at_utc:now,source_url:d.source_url,reason:d.reason});
  events.push({id:cycle.target_utc+'|'+key(d)+'|BUY',coin:d.coin,chain:d.chain,contract:d.contract,action:'BUY',status:'MODEL_BOOKED',amount_eur:eur(stake),fee_eur:eur(fee),quantity,price_eur:d.price_eur,source_url:d.source_url,observed_at_utc:d.observed_at_utc,booked_at_utc:now,reason:d.reason});
 };
 const sell=(d)=>{
  const i=out.positions.findIndex(p=>key(p)===key(d));if(i<0)return reject(d,'POSITION_NOT_FOUND');
  const p=out.positions[i],q=quote(d,now);if(q)return reject(d,q);
  const fraction=d.fraction??1;if(!validQty(fraction)||fraction>1)return reject(d,'INVALID_FRACTION');
  const basis=cent(p.cost_basis_eur), soldBasis=fraction===1?basis:moneyRound(basis*fraction),quantity=p.quantity*fraction;
  if(soldBasis<1||!validQty(quantity)||(fraction<1&&basis-soldBasis<1))return reject(d,'FRACTION_TOO_SMALL');
  const gross=moneyRound(quantity*d.price_eur*100),net=moneyRound(gross*0.99),pnl=net-soldBasis;
  out.cash_eur=eur(cent(out.cash_eur)+net);out.realized_pnl_eur=Math.round(out.realized_pnl_eur*100+pnl)/100;
  if(fraction===1)out.positions.splice(i,1);else out.positions[i]={...p,quantity:p.quantity-quantity,cost_basis_eur:eur(basis-soldBasis)};
  events.push({id:cycle.target_utc+'|'+key(d)+'|SELL',coin:d.coin,chain:d.chain,contract:d.contract,action:'SELL',status:'MODEL_BOOKED',fraction,quantity,price_eur:d.price_eur,source_url:d.source_url,observed_at_utc:d.observed_at_utc,booked_at_utc:now,net_proceeds_eur:eur(net),fee_eur:eur(gross-net),realized_pnl_eur:eur(pnl),cost_basis_eur:eur(soldBasis),reason:d.reason});
 };
 // Exits before new entries. No new buy bypasses current cash or exposure.
 for(const d of cycle.decisions.filter(x=>x.action==='SELL'))sell(d);
 for(const d of cycle.decisions.filter(x=>x.action==='BUY'))buy(d);
 let unknown=0,marked=0,open=0;
 for(const p of out.positions){const d=byKey.get(key(p));const basis=cent(p.cost_basis_eur);open+=basis;if(!d||d.action==='DATA_GAP'||quote(d,now)){p.net_liquidation_eur=null;p.unrealized_pnl_eur=null;unknown++;continue}const net=moneyRound(moneyRound(p.quantity*d.price_eur*100)*0.99);p.net_liquidation_eur=eur(net);p.unrealized_pnl_eur=eur(net-basis);p.mark_price_eur=d.price_eur;p.mark_observed_at_utc=d.observed_at_utc;marked+=net;}
 out.trades.push(...events.filter(e=>e.status==='MODEL_BOOKED'));out.last_target_utc=cycle.target_utc;
 return {ledger:out,events,summary:{cash_eur:out.cash_eur,open_cost_eur:eur(open),realized_pnl_eur:out.realized_pnl_eur,unrealized_pnl_eur:unknown?null:eur(marked-open),net_liquidation_value_eur:unknown?null:out.cash_eur+eur(marked),unknown_mark_count:unknown},control_revision:controls.revision};
}
