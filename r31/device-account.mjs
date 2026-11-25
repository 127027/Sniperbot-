import {randomUUID} from 'node:crypto';
import {createPaperLedger,settlePaperCycle} from './paper-engine.mjs';
import {validateControls,nextControls,capacity} from './policy.mjs';
import {identity,validateBroadcast} from './broadcast.mjs';
const stamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const cents=x=>Number.isSafeInteger(x)&&x>=0&&x<=100_000_000;
const money=x=>Math.round(x*100);
export function createAccount({now=new Date().toISOString(),initial_cents=0,max_invest_cents=0,stake_cents=5000,account_id=randomUUID()}={}){
 if(!stamp(now)||!cents(initial_cents)||typeof account_id!=='string'||!account_id)throw Error('INVALID_ACCOUNT');
 const controls=validateControls({schema:'r31.paper.controls.v1',revision:1,mode:'PAPER_ONLY',allow_new_buys:false,max_invest_cents,stake_cents,updated_at_utc:now});
 return {schema:'r31.device.account.v1',account_id,joined_at_utc:now,controls,ledger:createPaperLedger(initial_cents),cursor:null,funding_events:[],cycles:[],last_summary:null};
}
export function updateAccountControls(a,input,now){return {...a,controls:nextControls(a.controls,input,now)}}
export function fundAccount(a,{id,kind,amount_cents},now){
 if(typeof id!=='string'||!id||!['PAPER_DEPOSIT','PAPER_WITHDRAW'].includes(kind)||!cents(amount_cents)||amount_cents<=0||!stamp(now))throw Error('INVALID_FUNDING');
 const prior=a.funding_events.find(e=>e.id===id);
 if(prior){if(prior.kind!==kind||prior.amount_cents!==amount_cents)throw Error('FUNDING_ID_CONFLICT');return a}
 const cash=money(a.ledger.cash_eur)+(kind==='PAPER_DEPOSIT'?amount_cents:-amount_cents);
 if(!cents(cash))throw Error('INSUFFICIENT_CASH_OR_LIMIT');
 return {...a,ledger:{...a.ledger,cash_eur:cash/100},funding_events:[...a.funding_events,{id,kind,amount_cents,at_utc:now}],last_summary:null};
}
function cursor(s,sha){return {sequence:s.sequence,blob_sha:sha,target_utc:s.target_utc}}
export function applyBroadcast(account,{signal:s,blob_sha:sha,now},{allowV2=false}={}){
 validateBroadcast(s,{allowV2});validateControls(account.controls);
 if(!/^[a-f0-9]{40}$/.test(sha??'')||!stamp(now))throw Error('INVALID_RECEIPT');
 const old=account.cursor;
 if(old&&s.sequence===old.sequence){if(sha!==old.blob_sha)throw Error('SIGNAL_FORK');return {account,status:'ALREADY_PROCESSED',events:[]}}
 if(old&&(s.sequence<old.sequence||Date.parse(s.target_utc)<=Date.parse(old.target_utc)))throw Error('SIGNAL_ROLLBACK');
 if(old&&s.sequence===old.sequence+1&&s.previous_blob_sha!==old.blob_sha)throw Error('SIGNAL_CHAIN_MISMATCH');
 if(Date.parse(s.published_at_utc)>Date.parse(now))throw Error('FUTURE_SIGNAL');
 // Do not import someone else's positions or replay pre-join/expired entries.
 if(Date.parse(s.published_at_utc)<=Date.parse(account.joined_at_utc)||Date.parse(s.expires_at_utc)<=Date.parse(now)){
  // Do not hide a missed exit: mark local positions unknown and surface the gap.
  const ledger={...account.ledger,positions:account.ledger.positions.map(p=>({...p,net_liquidation_eur:null,unrealized_pnl_eur:null,mark_price_eur:null,mark_observed_at_utc:null}))};
  return {account:{...account,ledger,cursor:cursor(s,sha),last_summary:null,cycles:[...account.cycles,{sequence:s.sequence,target_utc:s.target_utc,status:'SKIPPED_OLD_OR_EXPIRED',events:[],gap:old?Math.max(0,s.sequence-old.sequence-1):0}]},status:'SKIPPED_OLD_OR_EXPIRED',events:[]};
 }

 const holdings=new Map(account.ledger.positions.map(p=>[identity(p),p]));
 const decisions=[],ignored=[];
 for(const d of s.decisions){
  const k=identity(d),owned=holdings.has(k);
  if(d.action==='SELL'&&!owned){ignored.push({coin:d.coin,action:'SELL',status:'IGNORED_NOT_OWNED'});continue}
  if(d.action==='HOLD'&&!owned){ignored.push({coin:d.coin,action:'HOLD',status:'IGNORED_NOT_OWNED'});continue}
  if(d.action==='BUY'&&owned){decisions.push({...d,action:'HOLD'});ignored.push({coin:d.coin,action:'BUY',status:'IGNORED_ALREADY_OWNED'});continue}
  if(d.action==='BUY'){decisions.push({...d,amount_cents:account.controls.stake_cents});continue}
  if(owned&&!['SELL','HOLD','DATA_GAP'].includes(d.action)){decisions.push({...d,action:'DATA_GAP'});continue}
  decisions.push(d);
 }
 // Devices can own different coins. No instruction does NOT mean sell.
 const decided=new Set(decisions.map(identity));
 for(const p of account.ledger.positions)if(!decided.has(identity(p)))decisions.push({coin:p.coin,chain:p.chain,contract:p.contract,action:'DATA_GAP',reason:'No current broadcast decision for this local position'});
 const r=settlePaperCycle({ledger:account.ledger,controls:account.controls,cycle:{target_utc:s.target_utc,control_revision:account.controls.revision,decisions},now,maxDecisions:s.schema==='r32.broadcast.v2'?100000:500});
 const events=[...r.events,...ignored],gap=old?Math.max(0,s.sequence-old.sequence-1):0;
 const flows=account.funding_events.reduce((n,e)=>n+(e.kind==='PAPER_DEPOSIT'?e.amount_cents:-e.amount_cents),money(account.ledger.initial_cash_eur));
 const point={at_utc:now,sequence:s.sequence,pnl_eur:Number.isFinite(r.summary.net_liquidation_value_eur)?(money(r.summary.net_liquidation_value_eur)-flows)/100:null};
 return {account:{...account,ledger:r.ledger,cursor:cursor(s,sha),last_summary:r.summary,performance_history:[...(account.performance_history??[]),point].slice(-8760),cycles:[...account.cycles,{sequence:s.sequence,target_utc:s.target_utc,status:'PROCESSED',gap,events}]},status:'PROCESSED',events};
}
export function accountView(a){
 const cap=capacity(a.controls,a.ledger),s=a.last_summary;
 const unknown=a.ledger.positions.filter(p=>!Number.isFinite(p.net_liquidation_eur)).length;
 const marked=a.ledger.positions.reduce((n,p)=>n+(Number.isFinite(p.net_liquidation_eur)?money(p.net_liquidation_eur):0),0);
 const open=cap.open_cost_cents;
 const net=unknown?null:(cap.cash_cents+marked)/100;
 const deposits=a.funding_events.reduce((n,e)=>n+(e.kind==='PAPER_DEPOSIT'?e.amount_cents:-e.amount_cents),money(a.ledger.initial_cash_eur));
 return {account_id:a.account_id,joined_at_utc:a.joined_at_utc,controls:a.controls,ledger:a.ledger,capacity:cap,cursor:a.cursor,last_cycle:a.cycles.at(-1)??null,summary:{cash_eur:a.ledger.cash_eur,open_cost_eur:open/100,net_liquidation_value_eur:net,realized_pnl_eur:a.ledger.realized_pnl_eur,unrealized_pnl_eur:unknown?null:(marked-open)/100,total_pnl_eur:net===null?null:(money(net)-deposits)/100,unknown_mark_count:unknown},funding_events:a.funding_events,performance_history:a.performance_history??[]};
}
