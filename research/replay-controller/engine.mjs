// Isolated historical simulation. No network, runner imports, wallets or account files.
import {createHash} from 'node:crypto';
export const ROLES=['scout','social','onchain','security','qa'];
const ACTIONS=['BUY','HOLD','ADD','REDUCE','SELL'];
export const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clone=x=>structuredClone(x);
const time=x=>typeof x==='string'?Date.parse(x):NaN;
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
function assert(ok,reason){if(!ok)throw Error(reason);}
export function validateDataset(d){
 assert(d?.schema==='isolated_replay.v1','DATASET_SCHEMA');
 assert(['SYNTHETIC','HISTORICAL'].includes(d.data_class),'DATA_CLASS');
 assert(Array.isArray(d.ticks)&&d.ticks.length>0&&d.ticks.length<=10000,'TICKS');
 assert(d.ticks.every((t,i)=>Number.isFinite(time(t))&&(!i||time(t)>time(d.ticks[i-1]))),'TICK_ORDER');
 assert(Array.isArray(d.events),'EVENTS');
 const ids=new Set();
 for(const e of d.events){
  assert(typeof e.id==='string'&&!ids.has(e.id),'EVENT_ID');ids.add(e.id);
  assert(['POOL','MARKET','SOCIAL','SECURITY'].includes(e.kind),'EVENT_KIND');
  assert(typeof e.candidate_id==='string'&&e.candidate_id.length>0,'CANDIDATE_ID');
  assert(Number.isFinite(time(e.event_at))&&Number.isFinite(time(e.available_at))&&time(e.event_at)<=time(e.available_at),'EVENT_TIME');
  assert(e.evidence&&['LEDGER','ARCHIVE','FIXTURE'].includes(e.evidence.type)&&typeof e.evidence.ref==='string','EVIDENCE');
  assert(d.data_class==='SYNTHETIC'||e.evidence.type!=='FIXTURE','FIXTURE_IN_HISTORY');
  if(e.kind==='MARKET'){
   assert(positive(e.reserve_token)&&positive(e.reserve_quote),'RESERVES');
   assert(typeof e.fee_bps==='number'&&e.fee_bps>=0&&e.fee_bps<10000,'FEE');
   assert(typeof e.gas_quote==='number'&&Number.isFinite(e.gas_quote)&&e.gas_quote>=0,'GAS');
   assert(typeof e.quote_asset==='string','QUOTE_ASSET');
  }
 }
 return d;
}
export function blindReadiness(d){
 validateDataset(d);const reasons=[];
 if(d.data_class!=='HISTORICAL')reasons.push('SYNTHETIC_NOT_RESEARCH_EVIDENCE');
 if(d.universe?.selection!=='ASOF_COHORT'||d.universe?.complete!==true||!d.universe?.provenance)reasons.push('NO_DOCUMENTED_ASOF_COHORT');
 if(new Set(d.events.map(e=>e.candidate_id)).size<2)reasons.push('SINGLE_TARGET_SELECTION');
 for(const role of ROLES)if(d.contexts?.[role]?.fresh!==true||d.contexts?.[role]?.target_exposed!==false||!d.contexts?.[role]?.attestation)reasons.push('CONTEXT_NOT_ISOLATED:'+role);
 if(!d.events.some(e=>e.kind==='MARKET'&&e.execution_verified===true&&e.evidence.verified===true))reasons.push('NO_EXECUTION_EVIDENCE');
 return {eligible:reasons.length===0,reasons,limit:'Metadata gate only; attestations and source authenticity require independent verification.'};
}
// Explicit projection: arbitrary annotations, labels and later evaluation fields never enter a frame.
export function visibleEvents(d,at){
 return d.events.filter(e=>time(e.available_at)<=time(at)&&e.evidence.verified===true).map(e=>{
  const base={id:e.id,kind:e.kind,candidate_id:e.candidate_id,event_at:e.event_at,available_at:e.available_at,evidence:{type:e.evidence.type,ref:e.evidence.ref,verified:e.evidence.verified===true,...(e.evidence.sha256?{sha256:e.evidence.sha256}:{})}};
  const fields={POOL:['chain','token','pool'],SOCIAL:['body','authors','interactions'],SECURITY:['buy_allowed','sell_allowed','scope'],MARKET:['reserve_token','reserve_quote','fee_bps','gas_quote','quote_asset','execution_verified']};
  for(const k of fields[e.kind])if(e[k]!==undefined)base[k]=clone(e[k]);
  return base;
 });
}
export function initialPortfolio(config={}){
 const c={initial_cash:1000,quote_asset:'TEST_USDC',max_slippage_bps:300,max_pool_fraction:0.01,max_delay_ms:86400000,max_market_age_ms:60000,...config};
 assert(positive(c.initial_cash)&&typeof c.quote_asset==='string','CAPITAL');
 assert(Number.isFinite(c.max_slippage_bps)&&c.max_slippage_bps>=0&&c.max_slippage_bps<10000,'SLIPPAGE');
 assert(positive(c.max_delay_ms)&&positive(c.max_market_age_ms),'FRESHNESS');
 assert(positive(c.max_pool_fraction)&&c.max_pool_fraction<=0.1,'POOL_PARTICIPATION');
 return {config:c,cash:c.initial_cash,positions:{},pending:[],trades:[],rejections:[],decisions:[],realized_pnl:0,first_seen:{}};
}
function latest(events,kind,id){return events.filter(e=>e.kind===kind&&e.candidate_id===id).sort((a,b)=>time(b.available_at)-time(a.available_at)||time(b.event_at)-time(a.event_at))[0];}
export function frame(d,index,p){
 const at=d.ticks[index];assert(at,'FRAME_INDEX');
 const f={schema:'dot_replay_frame.v1',index,at,events:visibleEvents(d,at),portfolio:{cash:p.cash,quote_asset:p.config.quote_asset,positions:clone(p.positions)},data_class:d.data_class};
 return {...f,input_hash:digest(f)};
}
export function validateDecisions(f,decisions){
 assert(Array.isArray(decisions)&&decisions.length===5,'FIVE_ROLE_BARRIER');
 const roles=new Set(),seenEvents=new Map(f.events.map(e=>[e.id,e]));
 for(const d of decisions){
  assert(ROLES.includes(d.role)&&!roles.has(d.role),'ROLE_ID');roles.add(d.role);
  assert(d.index===f.index&&d.input_hash===f.input_hash&&d.at===f.at,'STALE_OR_FUTURE_DECISION');
  assert(typeof d.run_id==='string'&&d.run_id.length>0,'RUN_ID');
  assert(Array.isArray(d.reviews),'REVIEWS');
  const candidates=new Set();
  for(const r of d.reviews){
   assert(!candidates.has(r.candidate_id),'DUPLICATE_REVIEW');candidates.add(r.candidate_id);
   assert(['YES','NO','UNKNOWN'].includes(r.verdict),'VERDICT');
   assert(Array.isArray(r.evidence_ids)&&r.evidence_ids.length>0,'REVIEW_EVIDENCE');
   assert(r.evidence_ids.every(id=>seenEvents.get(id)?.candidate_id===r.candidate_id),'UNSEEN_OR_CROSS_CANDIDATE_EVIDENCE');
  }
  assert(Array.isArray(d.orders),'ORDERS');
  assert(d.role==='qa'||d.orders.length===0,'ONLY_QA_ORDERS');
  const orderCandidates=new Set();
  for(const o of d.orders){
   assert(ACTIONS.includes(o.action),'ACTION');
   assert(!orderCandidates.has(o.candidate_id),'DUPLICATE_CANDIDATE_ORDER');orderCandidates.add(o.candidate_id);
   assert(f.events.some(e=>e.candidate_id===o.candidate_id),'UNSEEN_CANDIDATE');
   if(['BUY','ADD'].includes(o.action))assert(positive(o.amount_quote),'ORDER_AMOUNT');
   if(o.action==='REDUCE')assert(positive(o.fraction)&&o.fraction<1,'REDUCE_FRACTION');
  }
 }
 return decisions;
}
export function decide(p,f,decisions){
 validateDecisions(f,decisions);const out=clone(p);
 for(const d of decisions)for(const r of d.reviews)if(d.role==='scout'&&!out.first_seen[r.candidate_id])out.first_seen[r.candidate_id]=f.at;
 for(const o of decisions.find(d=>d.role==='qa').orders){
  const verdict=role=>decisions.find(d=>d.role===role).reviews.find(r=>r.candidate_id===o.candidate_id)?.verdict;
  if(o.action==='HOLD'){out.decisions.push({...o,at:f.at});continue;}
  // Entries require all five roles. Exits require route/security/QA, not continuing social hype.
  const required=['BUY','ADD'].includes(o.action)?ROLES:['onchain','security','qa'];
  const m=latest(f.events,'MARKET',o.candidate_id);
  const s=latest(f.events,'SECURITY',o.candidate_id);
  const buying=['BUY','ADD'].includes(o.action);
  let reason=required.some(r=>verdict(r)!=='YES')?'ROLE_APPROVAL_MISSING':null;
  if(!m||!m.execution_verified||time(f.at)-time(m.event_at)>out.config.max_market_age_ms)reason='ENTRY_REFERENCE_QUOTE_MISSING';
  if(!s||s.scope!=='BLOCK_STATE'||time(f.at)-time(s.event_at)>out.config.max_market_age_ms||s[buying?'buy_allowed':'sell_allowed']!==true)reason='SECURITY_EVIDENCE_MISSING';
  if(out.pending.some(x=>x.candidate_id===o.candidate_id))reason='PENDING_ORDER_EXISTS';
  if(reason){out.rejections.push({...o,at:f.at,reason});continue;}
  out.pending.push({...o,decided_at:f.at,reference_price:m.reserve_quote/m.reserve_token,source_frame:f.input_hash});
  out.decisions.push({...o,at:f.at});
 }
 return out;
}
export function settle(p,d,at){
 const out=clone(p),events=visibleEvents(d,at),pending=out.pending;out.pending=[];
 const working=new Map();
 for(const o of pending){
  const buying=['BUY','ADD'].includes(o.action),position=out.positions[o.candidate_id];
  let m=working.get(o.candidate_id);
  if(!m){m=latest(events,'MARKET',o.candidate_id);if(m){m=clone(m);working.set(o.candidate_id,m);}}
  const s=latest(events,'SECURITY',o.candidate_id);
  let reason=null;
  if(time(at)<=time(o.decided_at)){out.pending.push(o);continue;}
  if(time(at)-time(o.decided_at)>out.config.max_delay_ms)reason='ORDER_EXPIRED';
  else if(!m||time(m.event_at)<=time(o.decided_at)||time(at)-time(m.event_at)>out.config.max_market_age_ms||!m.execution_verified)reason='NO_FRESH_NEXT_TICK_EXECUTION';
  else if(m.quote_asset!==out.config.quote_asset)reason='QUOTE_ASSET_MISMATCH';
  else if(!s||s.scope!=='BLOCK_STATE'||time(at)-time(s.event_at)>out.config.max_market_age_ms||s[buying?'buy_allowed':'sell_allowed']!==true)reason='EXECUTION_SECURITY_REJECTED';
  else if(o.action==='BUY'&&position)reason='USE_ADD_FOR_EXISTING_POSITION';
  else if(o.action!=='BUY'&&!position)reason='POSITION_MISSING';
  if(reason){out.rejections.push({...o,at,reason});continue;}
  const factor=1-m.fee_bps/10000;
  const input=buying?o.amount_quote:position.units*(o.action==='REDUCE'?o.fraction:1);
  const output=buying?m.reserve_token*input*factor/(m.reserve_quote+input*factor):m.reserve_quote*input*factor/(m.reserve_token+input*factor);
  const price=buying?input/output:output/input;
  const adverse=buying?price/o.reference_price-1:1-price/o.reference_price;
  if(input>(buying?m.reserve_quote:m.reserve_token)*out.config.max_pool_fraction)reason='POOL_PARTICIPATION_LIMIT';
  if(adverse*10000>out.config.max_slippage_bps)reason='SLIPPAGE_LIMIT';
  if(buying&&input+m.gas_quote>out.cash)reason='INSUFFICIENT_CASH';
  if(!buying&&out.cash<m.gas_quote)reason='INSUFFICIENT_GAS_CASH';
  if(reason){out.rejections.push({...o,at,reason});continue;}
  let realized=0;
  if(buying){
   out.cash-=input+m.gas_quote;
   out.positions[o.candidate_id]={units:(position?.units||0)+output,cost_basis:(position?.cost_basis||0)+input+m.gas_quote};
   m.reserve_quote+=input;m.reserve_token-=output;
  }else{
   const basis=position.cost_basis*(input/position.units);
   realized=output-m.gas_quote-basis;out.realized_pnl+=realized;out.cash+=output-m.gas_quote;
   if(o.action==='SELL')delete out.positions[o.candidate_id];
   else out.positions[o.candidate_id]={units:position.units-input,cost_basis:position.cost_basis-basis};
   m.reserve_token+=input;m.reserve_quote-=output;
  }
  out.trades.push({...o,filled_at:at,input,output,gas_quote:m.gas_quote,pool_fee_input:input*(1-factor),price,realized_pnl:realized,model:'CONSTANT_PRODUCT_NEXT_TICK',execution_evidence:m.id});
 }
 return out;
}
export function portfolioReport(p,d,at){
 const events=visibleEvents(d,at);let marked=p.cash;const missing=[];
 for(const [id,pos]of Object.entries(p.positions)){
  const m=latest(events,'MARKET',id);
  if(!m||m.quote_asset!==p.config.quote_asset||time(at)-time(m.event_at)>p.config.max_market_age_ms)missing.push(id);
  else marked+=pos.units*m.reserve_quote/m.reserve_token;
 }
 return {cash:p.cash,realized_pnl:p.realized_pnl,mark_to_market_equity:missing.length?null:marked,mark_is_not_executable_exit:true,unmarked_positions:missing,open_positions:clone(p.positions),trades:clone(p.trades),rejections:clone(p.rejections),pending:clone(p.pending),first_seen:clone(p.first_seen),strategy_performance_verified:false};
}
