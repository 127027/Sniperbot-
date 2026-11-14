// R21: independently auditable performance report from a completely sealed
// historical replay. NO model inputs, future labels or post-hoc prices here.
// This module does not interact with runner, wallets, exchanges or paper accounts.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from './controller.mjs';
import {ROLES,initialPortfolio,settle,frame,decide,portfolioReport,digest} from './engine.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const round=n=>typeof n==='number'&&Number.isFinite(n)?Math.round(n*1e8)/1e8:null;
const invariant=(ok,reason)=>{if(!ok)throw Error(reason);};

export function evaluateSealedReplay(name,{labels=null,caseId=null}={}){
 const session=load(name);
 const {dataset,meta}=session;
 invariant(session.index===dataset.ticks.length,'R21_EVALUATION_REQUIRES_ALL_FRAMES_SEALED');
 invariant(['DIAGNOSTIC','BLIND','SYNTHETIC'].includes(meta.mode),'R21_INVALID_MODE');
 const chronology=[];
 let p=initialPortfolio(meta.config),marksUnreliable=false,peak=null,maxDrawdown=0;
 for(let i=0;i<dataset.ticks.length;i++){
  const at=dataset.ticks[i];
  p=settle(p,dataset,at);
  const actualFrame=frame(dataset,i,p);
  const commit=read(path.join(session.root,'commits',String(i).padStart(5,'0')+'.json'));
  invariant(commit.frame_hash===actualFrame.input_hash,'R21_FRAME_HASH_MISMATCH');
  p=decide(p,actualFrame,commit.decisions);
  const report=portfolioReport(p,dataset,at);
  const equity=report.mark_to_market_equity;
  if(equity===null){
   marksUnreliable=true;
  }else{
   if(peak===null||equity>peak)peak=equity;
   if(peak>0)maxDrawdown=Math.max(maxDrawdown,(peak-equity)/peak);
  }
  chronology.push({
   at,frame_index:i,observed_events:actualFrame.events.length,
   role_count:commit.decisions.length,
   candidate_count:new Set(actualFrame.events.map(e=>e.candidate_id)).size,
   equity:round(equity),
   cash:round(p.cash),
   realized_pnl:round(p.realized_pnl),
   open_positions:Object.keys(p.positions).length,
   unmarked_positions:report.unmarked_positions,
   executed_trades:p.trades.length,
   rejected_orders:p.rejections.length
  });
 }
 invariant(digest(p)===digest(session.portfolio),'R21_PORTFOLIO_NOT_REPRODUCIBLE');
 const byCoin=new Map();
 for(const t of p.trades){
  const id=t.candidate_id;
  if(!byCoin.has(id))byCoin.set(id,{
   candidate_id:id,
   discovered_at:p.first_seen[id]||null,
   first_buy_at:null,last_exit_at:null,
   buy_count:0,add_count:0,reduce_count:0,sell_count:0,
   total_quote_deployed:0,total_quote_received:0,
   realized_net_pnl:0,winning_exit_count:0,losing_exit_count:0,
   gas_quote_paid:0,executable_trades:[],
   open_units:0,open_cost_basis:0
  });
  const coin=byCoin.get(id),entry=['BUY','ADD'].includes(t.action);
  if(t.action==='BUY')coin.buy_count++;
  if(t.action==='ADD')coin.add_count++;
  if(t.action==='REDUCE')coin.reduce_count++;
  if(t.action==='SELL')coin.sell_count++;
  coin.gas_quote_paid+=t.gas_quote;
  if(entry){
   coin.total_quote_deployed+=t.input+t.gas_quote;
   coin.first_buy_at=coin.first_buy_at||t.filled_at;
  }else{
   coin.last_exit_at=t.filled_at;
   coin.total_quote_received+=t.output-t.gas_quote;
   coin.realized_net_pnl+=t.realized_pnl;
   if(t.realized_pnl>0)coin.winning_exit_count++;
   if(t.realized_pnl<0)coin.losing_exit_count++;
  }
  coin.executable_trades.push({
   action:t.action,decided_at:t.decided_at,filled_at:t.filled_at,
   input:round(t.input),output:round(t.output),price:round(t.price),
   gas_quote:round(t.gas_quote),
   realized_net_pnl:round(t.realized_pnl),
   evidence_id:t.execution_evidence,
   model:t.model
  });
 }
 // Record watched coins even if no historical BUY was executed.
 for(const [id,at] of Object.entries(p.first_seen))
  if(!byCoin.has(id))byCoin.set(id,{
   candidate_id:id,discovered_at:at,first_buy_at:null,last_exit_at:null,
   buy_count:0,add_count:0,reduce_count:0,sell_count:0,
   total_quote_deployed:0,total_quote_received:0,
   realized_net_pnl:0,winning_exit_count:0,losing_exit_count:0,
   gas_quote_paid:0,executable_trades:[],open_units:0,open_cost_basis:0
  });
 for(const [id,pos]of Object.entries(p.positions)){
  if(!byCoin.has(id))throw Error('R21_UNATTRIBUTED_POSITION');
  byCoin.get(id).open_units=pos.units;
  byCoin.get(id).open_cost_basis=pos.cost_basis;
 }
 const coins=[...byCoin.values()].sort((a,b)=>a.candidate_id.localeCompare(b.candidate_id))
  .map(c=>({
   ...c,total_quote_deployed:round(c.total_quote_deployed),
   total_quote_received:round(c.total_quote_received),
   realized_net_pnl:round(c.realized_net_pnl),
   gas_quote_paid:round(c.gas_quote_paid),
   open_units:round(c.open_units),open_cost_basis:round(c.open_cost_basis),
   completed_exits:c.sell_count+c.reduce_count
  }));
 let outcomeComparison=null;
 if(labels!==null){
  invariant(labels.schema==='r21_evaluator_labels.v1','R21_INVALID_LABEL_SCHEMA');
  invariant(labels.dataset_hash===meta.dataset_hash,'R21_LABELS_DATASET_MISMATCH');
  invariant(Array.isArray(labels.outcomes),'R21_LABELS_OUTCOMES_MISSING');
  const existing=new Set();
  const bought=new Set(p.trades.filter(t=>t.action==='BUY').map(t=>t.candidate_id));
  const observed=new Set([...new Set(dataset.events.map(e=>e.candidate_id))]);
  const scored=labels.outcomes.map(o=>{
   invariant(typeof o.candidate_id==='string'&&!existing.has(o.candidate_id),'R21_DUPLICATE_OUTCOME');
   existing.add(o.candidate_id);
   invariant(['WINNER','FAILURE','NEUTRAL','UNKNOWN'].includes(o.outcome),'R21_INVALID_OUTCOME');
   return {
    candidate_id:o.candidate_id,
    outcome:o.outcome,
    known_to_historical_corpus:observed.has(o.candidate_id),
    detected:Boolean(p.first_seen[o.candidate_id]),
    first_detected_at:p.first_seen[o.candidate_id]||null,
    bought:bought.has(o.candidate_id),
    realized_net_pnl:round(coins.find(c=>c.candidate_id===o.candidate_id)?.realized_net_pnl||0)
   };
  });
  outcomeComparison={
   outcomes:scored,
   missed_winners:scored.filter(x=>x.outcome==='WINNER'&&!x.detected).map(x=>x.candidate_id),
   discovered_winners:scored.filter(x=>x.outcome==='WINNER'&&x.detected).map(x=>x.candidate_id),
   bought_winners:scored.filter(x=>x.outcome==='WINNER'&&x.bought).map(x=>x.candidate_id),
   bought_failures:scored.filter(x=>x.outcome==='FAILURE'&&x.bought).map(x=>x.candidate_id),
   never_exposed_to_role_frames:true,
   limitations:'Labels apply only after all 5-role decisions were sealed. Full neutral candidate coverage still requires independent verification.'
  };
 }
 const final=portfolioReport(p,dataset,dataset.ticks.at(-1));
 const exits=coins.reduce((s,c)=>s+c.completed_exits,0);
 return {
  schema:'r21_sealed_multicoin_result.v1',
  case_id:caseId,mode:meta.mode,data_class:dataset.data_class,
  initial_cash:round(meta.config.initial_cash),
  final_cash:round(p.cash),equity:round(final.mark_to_market_equity),
  equity_is_not_executable_exit:true,
  completed_frames:session.index,total_frames:dataset.ticks.length,
  observed_candidate_count:new Set(dataset.events.map(e=>e.candidate_id)).size,
  discovered_candidate_count:Object.keys(p.first_seen).length,
  bought_coin_count:new Set(p.trades.filter(t=>t.action==='BUY').map(t=>t.candidate_id)).size,
  trade_count:p.trades.length,
  buy_count:p.trades.filter(t=>t.action==='BUY').length,
  sell_count:p.trades.filter(t=>t.action==='SELL').length,
  winning_exit_count:coins.reduce((s,c)=>s+c.winning_exit_count,0),
  losing_exit_count:coins.reduce((s,c)=>s+c.losing_exit_count,0),
  completed_exits:exits,
  realized_net_pnl:round(p.realized_pnl),
  pending_orders:p.pending.length,
  rejected_orders:p.rejections.length,
  open_positions:Object.keys(p.positions).length,
  unmarked_positions:final.unmarked_positions,
  max_drawdown_pct:marksUnreliable?null:round(maxDrawdown*100),
  drawdown_coverage_complete:!marksUnreliable,
  coins,chronology,
  outcome_comparison:outcomeComparison,
  blind_success:false,
  externally_authenticated_agent_decisions:false,
  real_paper_account_changes:0,
  risk_notes:[
   'Performance is historical MODEL accounting only, not market-executed orders.',
   'Real fees and transfer taxes beyond the simulated market model may differ.',
   'Any missing market valuation makes full-window maximum drawdown UNKNOWN.',
   'A profitable synthetic example does not establish real memecoin prediction.'
  ]
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [sessionName,outPath,labelsPath]=process.argv.slice(2);
  if(!sessionName||!outPath)throw Error('Usage: node r21-evaluate.mjs SESSION OUTPUT_JSON [PRIVATE_LABELS_JSON]');
  const labels=labelsPath?read(labelsPath):null;
  const result=evaluateSealedReplay(sessionName,{labels});
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({
   status:'SEALED_EVALUATION_COMPLETE',case_id:result.case_id,
   completed_frames:result.completed_frames,trade_count:result.trade_count,
   realized_net_pnl:result.realized_net_pnl,blind_success:false
  },null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
