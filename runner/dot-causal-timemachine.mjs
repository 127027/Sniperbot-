// Research-only offline causal replay. ZERO network/file writes or bot imports.
// Every value in SYNTHETIC_FIXTURE tests is made-up and MUST NOT train or label Dots.
import {createHash} from 'node:crypto';
const DAY=86400000;
const round=n=>Math.round((n+Number.EPSILON)*1e8)/1e8;
const timestamp=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(x)&&Number.isFinite(Date.parse(x));
const ms=x=>Date.parse(x);
const assert=(condition,reason)=>{if(!condition)throw Error(reason)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const actions=new Set(['WATCH','REJECT','BUY','ADD','HOLD','REDUCE','SELL']);
export function sourceUsable(src,at,mode){
 if(!src||!timestamp(src.available_at_utc)||!timestamp(src.event_at_utc)||
    ms(src.available_at_utc)>ms(at)||ms(src.event_at_utc)>ms(at)||
    ms(src.available_at_utc)<ms(src.event_at_utc))return false;
 if(mode==='SYNTHETIC_FIXTURE')return src.grade==='SYNTHETIC_FIXTURE'&&src.synthetic_only===true;
 if(mode==='HISTORICAL_RESEARCH'){
  if(typeof src.raw_original!=='string'||src.raw_original.length===0||
     src.content_sha256!==sha(src.raw_original)||src.externally_audited!==true)return false;
  if(src.grade==='ARCHIVED_ORIGINAL')return timestamp(src.capture_at_utc)&&
    ms(src.capture_at_utc)<=ms(at)&&ms(src.available_at_utc)===ms(src.capture_at_utc)&&
    /^https:\/\/web\.archive\.org\/web\//.test(src.archive_url||'');
  if(src.grade==='LEDGER_RECONSTRUCTION')return src.verified_tx===true&&
    Number.isSafeInteger(src.block_slot)&&src.block_slot>=0&&
    typeof src.tx_id==='string'&&src.tx_id.length>=16&&src.historical_state_replayed===true;
 }
 return false;
}
export function dayView({mode,days},at){
 assert(timestamp(at),'INVALID_CUTOFF');
 const all=days.flatMap(day=>(day.sources||[]));
 const sources=all.filter(s=>sourceUsable(s,at,mode));
 const ids=new Set(sources.map(s=>s.id));
 const usable=x=>timestamp(x.at_utc)&&ms(x.at_utc)<=ms(at)&&ids.has(x.source_id);
 return {cutoff_utc:at,sources:sources.map(s=>({...s})),
  quotes:days.flatMap(d=>d.quotes||[]).filter(usable).map(q=>({...q})),
  risks:days.flatMap(d=>d.risks||[]).filter(usable).map(r=>({...r}))};
}
export function runCausalTimeMachine(input){
 assert(input&&['SYNTHETIC_FIXTURE','HISTORICAL_RESEARCH'].includes(input.mode),'INVALID_MODE');
 const cfg=input.config||{},days=input.days||[];
 assert(Array.isArray(days)&&Array.isArray(input.decisions),'INVALID_INPUT');
 const {start_utc,end_utc}=input.period||{};
 assert(timestamp(start_utc)&&timestamp(end_utc)&&ms(end_utc)>ms(start_utc),'INVALID_PERIOD');
 for(const k of ['initial_test_usdc','max_total_budget_usdc','min_trade_usdc','max_trade_usdc','max_quote_age_minutes'])
  assert(Number.isFinite(cfg[k])&&cfg[k]>0,'MISSING_EXPLICIT_BUDGET_OR_FRESHNESS');
 assert(cfg.max_trade_usdc>=cfg.min_trade_usdc,'INVALID_POSITION_RANGE');
 const unique=new Set(),ids=new Set();
 for(const day of days){
  assert(typeof day.day_utc==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day.day_utc) &&
    !unique.has(day.day_utc)&&day.day_utc>=start_utc.slice(0,10)&&day.day_utc<=end_utc.slice(0,10),'DUPLICATE_OR_OUTSIDE_DAY');
  unique.add(day.day_utc);
  for(const src of day.sources||[]){
   assert(src&&typeof src.id==='string'&&!ids.has(src.id),'DUPLICATE_SOURCE');
   ids.add(src.id);
  }
  for(const x of [...day.quotes||[],...day.risks||[]])
   assert(timestamp(x.at_utc)&&x.at_utc.slice(0,10)===day.day_utc,'WRONG_PACKET_DAY');
 }
 const decisions=input.decisions.slice();
 for(let i=0;i<decisions.length;i++){
  const d=decisions[i];
  assert(d&&timestamp(d.at_utc)&&ms(d.at_utc)>=ms(start_utc)&&ms(d.at_utc)<=ms(end_utc),'DECISION_OUTSIDE_WINDOW');
  if(i)assert(ms(decisions[i-1].at_utc)<=ms(d.at_utc),'DECISIONS_NOT_CHRONOLOGICAL');
  assert(actions.has(d.action),'INVALID_ACTION');
  assert(typeof d.token_key==='string'&&d.token_key.length>2,'MISSING_TOKEN_ID');
  assert(d.calibrated_probability===null||d.calibrated_probability===undefined,'UNSUPPORTED_PROBABILITY_FROM_SCORE');
  if(d.score_0_100!==null&&d.score_0_100!==undefined)
   assert(Number.isFinite(d.score_0_100)&&d.score_0_100>=0&&d.score_0_100<=100,'INVALID_UNCALIBRATED_SCORE');
 }
 let cash=cfg.initial_test_usdc,realized=0;
 const positions=new Map(),journal=[];
 for(const d of decisions){
  const result={at_utc:d.at_utc,token_key:d.token_key,action:d.action,score_0_100:d.score_0_100??null,
   calibrated_probability:null,non_actionable:true,bot_delivery:false,filled:false};
  const view=dayView(input,d.at_utc);
  const validRefs=Array.isArray(d.evidence_ids)&&d.evidence_ids.length>0&&
   d.evidence_ids.every(id=>view.sources.some(s=>s.id===id));
  if(!validRefs){result.status='BLOCKED_MISSING_ASOF_EVIDENCE';journal.push(result);continue}
  if(['WATCH','HOLD','REJECT'].includes(d.action)){
   result.status='RESEARCH_ONLY';journal.push(result);continue;
  }
  const qtype=['BUY','ADD'].includes(d.action)?'BUY':'SELL';
  const quote=view.quotes.filter(q=>q.token_key===d.token_key&&q.side===qtype&&
    Number.isFinite(q.price_usdc)&&q.price_usdc>0&&
    Number.isFinite(q.max_notional_usdc)&&q.max_notional_usdc>=0&&
    Number.isFinite(q.fee_bps)&&q.fee_bps>=0&&q.fee_bps<10000&&
    Number.isFinite(q.slippage_bps)&&q.slippage_bps>=0&&q.slippage_bps<10000&&
    ms(d.at_utc)-ms(q.at_utc)<=cfg.max_quote_age_minutes*60000)
    .sort((a,b)=>ms(b.at_utc)-ms(a.at_utc))[0];
  if(!quote){result.status='BLOCKED_MISSING_FRESH_QUOTE';journal.push(result);continue}
  if(['BUY','ADD'].includes(d.action)){
   const risk=view.risks.filter(r=>r.token_key===d.token_key&&r.status==='PASS')
    .sort((a,b)=>ms(b.at_utc)-ms(a.at_utc))[0];
   const sellRoute=view.quotes.filter(q=>q.token_key===d.token_key&&q.side==='SELL'&&
     ms(d.at_utc)-ms(q.at_utc)<=cfg.max_quote_age_minutes*60000&&
     Number.isFinite(q.max_notional_usdc)&&q.max_notional_usdc>0).sort((a,b)=>ms(b.at_utc)-ms(a.at_utc))[0];
   if(!risk||!sellRoute){result.status='BLOCKED_RISK_OR_SELLABILITY';journal.push(result);continue}
   const amount=d.requested_usdc;
   assert(Number.isFinite(amount)&&amount>0,'INVALID_REQUESTED_USDC');
   const locked=[...positions.values()].reduce((n,p)=>n+p.cost_basis_usdc,0);
   if(amount<cfg.min_trade_usdc||amount>cfg.max_trade_usdc||
      amount>cash+1e-8||locked+amount>cfg.max_total_budget_usdc+1e-8||
      amount>quote.max_notional_usdc||amount>sellRoute.max_notional_usdc){
    result.status='BLOCKED_BUDGET_OR_CAPACITY';journal.push(result);continue
   }
   const qty=(amount*(1-quote.fee_bps/10000))/(quote.price_usdc*(1+quote.slippage_bps/10000));
   const pos=positions.get(d.token_key)||{token_key:d.token_key,quantity:0,cost_basis_usdc:0};
   pos.quantity=round(pos.quantity+qty);pos.cost_basis_usdc=round(pos.cost_basis_usdc+amount);
   positions.set(d.token_key,pos);cash=round(cash-amount);result.filled=true;
   result.status='SIMULATED_FILL';result.amount_usdc=amount;result.quantity=qty;
  }else{
   const pos=positions.get(d.token_key);
   if(!pos){result.status='NO_OPEN_POSITION';journal.push(result);continue}
   const fraction=d.action==='SELL'?1:d.reduce_fraction;
   assert(Number.isFinite(fraction)&&fraction>0&&fraction<=1,'INVALID_REDUCE_FRACTION');
   const qty=pos.quantity*fraction,base=pos.cost_basis_usdc*fraction;
   const gross=qty*quote.price_usdc*(1-quote.slippage_bps/10000);
   if(gross>quote.max_notional_usdc+1e-8){result.status='BLOCKED_SELL_CAPACITY';journal.push(result);continue}
   const net=round(gross*(1-quote.fee_bps/10000)),pnl=round(net-base);
   cash=round(cash+net);realized=round(realized+pnl);
   pos.quantity=round(pos.quantity-qty);pos.cost_basis_usdc=round(pos.cost_basis_usdc-base);
   if(d.action==='SELL'||pos.quantity<=1e-8)positions.delete(d.token_key);
   result.filled=true;result.status='SIMULATED_FILL';result.net_proceeds_usdc=net;result.realized_pnl_usdc=pnl;
  }
  journal.push(result);
 }
 const open_positions=[...positions.values()].map(p=>({...p,valuation_status:'OPEN_NOT_ASSUMED_SELLABLE'}));
 return {schema:'sniper_r11_causal_lab_result.v1',mode:input.mode,
  simulation_only:true,bot_delivery:false,real_bot_orders:0,
  calibration_status:'NOT_CALIBRATED',
  source_count:ids.size,days_with_packets:unique.size,
  decision_count:journal.length,simulated_fills:journal.filter(j=>j.filled).length,
  cash_test_usdc:cash,realized_pnl_test_usdc:realized,open_positions,
  total_equity_test_usdc:null,maximum_drawdown_pct:null,
  journal};
}
