import {identity} from './broadcast.mjs';
import {preparePublication} from './publisher.mjs';
export function fallbackPlan({previous,universe,priorFinal,reports,target,published,head,priorPointer}){
 const t=Date.parse(target),p=Date.parse(published);
 if(!Number.isFinite(t)||!Number.isFinite(p)||p<t+420000||p>t+600000)throw Error('FALLBACK_WINDOW_CLOSED');
 const groups=new Map(),add=d=>{try{const k=identity(d);if(!groups.has(k))groups.set(k,{coin:d.coin,chain:d.chain,contract:d.contract,votes:[]});return groups.get(k)}catch{return null}};
 for(const d of universe.coins)add(d);
 for(const d of priorFinal.paper_ledger.positions)add(d);
 const required=groups.size;
 for(const report of reports)for(const d of report.data.research_decisions??report.data.decisions??[]){const g=add(d);if(!g)continue;const s=d.reason?.match(/\[STRATEGY (BUY|HOLD|SELL|WATCH|NO_TRADE|DATA_GAP)\]/)?.[1]??(['BUY','HOLD','SELL','WATCH','NO_TRADE'].includes(d.action)?d.action:'DATA_GAP');g.votes.push({role:report.role,strategy:s});}
 if(required>500)throw Error('REQUIRED_UNIVERSE_EXCEEDS_V1');
 const all=[...groups.values()],decisions=all.slice(0,500).map(({votes,...d})=>{
  const active=[...new Set(votes.map(v=>v.strategy).filter(s=>!['DATA_GAP','WATCH','NO_TRADE'].includes(s)))];
  const strategy=active.length===1?active[0]:active.length>1?'HOLD':votes.some(v=>v.strategy==='WATCH')?'WATCH':votes.some(v=>v.strategy==='NO_TRADE')?'NO_TRADE':'DATA_GAP';
  return {...d,action:'DATA_GAP',reason:'[STRATEGY '+strategy+'] [EXECUTION PRICE_PENDING] [FALLBACK] Role indications '+JSON.stringify(votes)+'; no independently approved fresh execution quote; not an executable order.'};
 });
 const plan=preparePublication({previous,universe,decisions,target_utc:target,published_at_utc:published,expires_at_utc:new Date(t+900000).toISOString()});
 const target30=target.replace('.000Z','Z'),ledger=structuredClone(priorFinal.paper_ledger);
 ledger.last_completed_target_utc=target30;
 ledger.positions=ledger.positions.map(x=>({...x,current_mark_usd:null,current_mark_eur:null,net_liquidation_eur:null,unrealized_pnl_eur:null,unrealized_pnl_pct:null,decision:'DATA_GAP'}));
 const n=ledger.positions.length,summary={...priorFinal.summary,cash_eur:ledger.cash_eur,open_cost_eur:ledger.positions.reduce((s,x)=>s+x.cost_basis_eur,0),realized_pnl_eur:ledger.realized_pnl_eur,unknown_mark_count:n,net_liquidation_value_eur:n?null:ledger.cash_eur,unrealized_pnl_eur:n?null:0,total_pnl_eur:n?null:ledger.cash_eur-ledger.initial_cash_eur,total_pnl_pct:n?null:(ledger.cash_eur/ledger.initial_cash_eur-1)*100,scan_number:priorFinal.summary.scan_number+1,proposed_new_spend_eur:0,booked_new_spend_eur:0};
 const missing=[1,2,3,4].filter(x=>!reports.some(y=>y.role===x));
 const final={...priorFinal,target_utc:target30,completed_at_utc:published,run_context_utc:published,previous_final_path:priorPointer.final_path,previous_final_blob_sha:priorPointer.final_blob_sha,checked_head:head,role_reports:reports.map(({path,sha})=>({path,sha})),missing_roles:missing,peer_assessment:'Deterministic fallback: role indications only, no AI adjudication or executable quotes.',research_decisions:plan.signal.decisions,model_execution_events:[],paper_ledger:ledger,summary,news_and_catalysts:[],quote_tracking:[],notes:'R36 fallback. No new orders. Overflow '+Math.max(0,all.length-500)+'.'};
 return {plan,final,missing,overflow:Math.max(0,all.length-500)};
}
