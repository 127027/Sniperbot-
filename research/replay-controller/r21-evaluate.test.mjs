import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ROLES,digest} from './engine.mjs';
import {initialize,runPath,nextFrame,advance,load} from './controller.mjs';
import {evaluateSealedReplay} from './r21-evaluate.mjs';

function synthetic(two=true){
 const ticks=Array.from({length:6},(_,i)=>new Date(Date.UTC(2023,2,14,0,i)).toISOString());
 const candidates=two?['A','B']:['A'];
 const events=[];
 for(let i=0;i<ticks.length;i++)for(const id of candidates){
  const evidence={type:'FIXTURE',ref:'synthetic-62-day-qa',verified:true};
  const reserve_quote=id==='A'?(i>=2?2000000:1000000):(i>=2?600000:1000000);
  events.push({
   id:id+'m'+i,kind:'MARKET',candidate_id:id,event_at:ticks[i],available_at:ticks[i],
   evidence,reserve_quote,reserve_token:1000000,fee_bps:30,gas_quote:0.2,
   quote_asset:'TEST_USDC',execution_verified:true
  });
  events.push({
   id:id+'s'+i,kind:'SECURITY',candidate_id:id,event_at:ticks[i],available_at:ticks[i],
   evidence,scope:'BLOCK_STATE',buy_allowed:true,sell_allowed:true
  });
 }
 return {schema:'isolated_replay.v1',data_class:'SYNTHETIC',ticks,events};
}
const rand=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2);
function session(d,orders={}){
 const name='r21-eval-test-'+process.pid+'-'+rand();
 initialize(name,d,{},'SYNTHETIC');
 try{
  for(let i=0;i<d.ticks.length;i++){
   const info=nextFrame(name),f=JSON.parse(fs.readFileSync(info.input_path));
   fs.mkdirSync(info.decision_directory,{recursive:true});
   const candidateIds=[...new Set(f.events.map(e=>e.candidate_id))];
   const votes=ROLES.map(role=>({
    role,run_id:role+'-'+i,index:i,at:f.at,input_hash:f.input_hash,
    reviews:candidateIds.map(id=>({
     candidate_id:id,verdict:'YES',
     evidence_ids:f.events.filter(e=>e.candidate_id===id).slice(-2).map(e=>e.id)
    })),
    orders:role==='qa'?(orders[i]||[]):[]
   }));
   for(const v of votes)
    fs.writeFileSync(info.decision_directory+'/'+v.role+'.json',JSON.stringify(v));
   advance(name);
  }
  return name;
 }catch(e){fs.rmSync(runPath(name),{recursive:true,force:true});throw e;}
}
function cleanup(name){fs.rmSync(runPath(name),{recursive:true,force:true});}
test('multi-coin BUY and SELL have independent realized positive/negative net PnL',()=>{
 const d=synthetic();
 const name=session(d,{
  0:[{action:'BUY',candidate_id:'A',amount_quote:100},{action:'BUY',candidate_id:'B',amount_quote:100}],
  2:[{action:'SELL',candidate_id:'A'},{action:'SELL',candidate_id:'B'}]
 });
 try{
  const r=evaluateSealedReplay(name,{caseId:'synthetic-neutral-cohort'});
  assert.equal(r.case_id,'synthetic-neutral-cohort');
  assert.equal(r.completed_frames,6);
  assert.equal(r.observed_candidate_count,2);
  assert.equal(r.discovered_candidate_count,2);
  assert.equal(r.trade_count,4);
  assert.equal(r.buy_count,2);assert.equal(r.sell_count,2);
  assert.equal(r.winning_exit_count,1);
  assert.equal(r.losing_exit_count,1);
  assert.equal(r.open_positions,0);
  assert.ok(r.max_drawdown_pct>=0&&r.drawdown_coverage_complete);
  assert.ok(r.coins.find(c=>c.candidate_id==='A').realized_net_pnl>0);
  assert.ok(r.coins.find(c=>c.candidate_id==='B').realized_net_pnl<0);
  assert.equal(r.coins.find(c=>c.candidate_id==='A').first_buy_at,d.ticks[1]);
  assert.equal(r.coins.find(c=>c.candidate_id==='A').last_exit_at,d.ticks[3]);
  assert.equal(r.realized_net_pnl,Math.round(r.coins.reduce((s,c)=>s+c.realized_net_pnl,0)*1e8)/1e8);
  assert.ok(r.coins.every(c=>c.executable_trades.every(t=>t.filled_at>t.decided_at&&t.evidence_id)));
  assert.equal(r.real_paper_account_changes,0);
  assert.equal(r.blind_success,false);
 }finally{cleanup(name);}
});
test('winner labels are inaccessible until after sealing, then missed coin is reported',()=>{
 const d=synthetic(),name=session(d,{0:[{action:'BUY',candidate_id:'A',amount_quote:100}]});
 try{
  const sealed=load(name);
  const labels={schema:'r21_evaluator_labels.v1',
   dataset_hash:sealed.meta.dataset_hash,
   outcomes:[{candidate_id:'A',outcome:'WINNER'},{candidate_id:'B',outcome:'WINNER'}]};
  const r=evaluateSealedReplay(name,{labels});
  assert.deepEqual(r.outcome_comparison.bought_winners,['A']);
  assert.deepEqual(r.outcome_comparison.missed_winners,[]);
  assert.deepEqual(r.outcome_comparison.discovered_winners,['A','B']);
  assert.equal(r.outcome_comparison.never_exposed_to_role_frames,true);
  assert.throws(()=>evaluateSealedReplay(name,{labels:{...labels,dataset_hash:'bad'}}),/R21_LABELS_DATASET_MISMATCH/);
  assert.equal(r.pending_orders,0);
 }finally{cleanup(name);}
});
test('unbought and unseen winner is treated as missed detection not fabricated trade',()=>{
 const d=synthetic(false),name=session(d);
 try{
  const labels={schema:'r21_evaluator_labels.v1',
   dataset_hash:load(name).meta.dataset_hash,
   outcomes:[{candidate_id:'A',outcome:'FAILURE'},{candidate_id:'B',outcome:'WINNER'}]};
  const r=evaluateSealedReplay(name,{labels});
  assert.deepEqual(r.outcome_comparison.missed_winners,['B']);
  assert.equal(r.trade_count,0);
  assert.equal(r.realized_net_pnl,0);
  assert.equal(r.max_drawdown_pct,0);
  assert.equal(r.discovered_candidate_count,1);
 }finally{cleanup(name);}
});
test('open position with missing later quote produces UNKNOWN complete drawdown',()=>{
 const d=synthetic(false);
 d.events=d.events.filter(e=>!(e.candidate_id==='A'&&e.kind==='MARKET'&&[d.ticks[4],d.ticks[5]].includes(e.event_at)));
 const name=session(d,{0:[{action:'BUY',candidate_id:'A',amount_quote:100}]});
 try{
  const r=evaluateSealedReplay(name);
  assert.equal(r.open_positions,1);
  assert.equal(r.drawdown_coverage_complete,false);
  assert.equal(r.max_drawdown_pct,null);
  assert.equal(r.equity,null);
  assert.deepEqual(r.unmarked_positions,['A']);
  assert.equal(r.realized_net_pnl,0);
 }finally{cleanup(name);}
});
test('reject incomplete replay instead of using later information early',()=>{
 const d=synthetic(false),name='r21-incomplete-'+process.pid+'-'+rand();
 try{
  initialize(name,d,{},'SYNTHETIC');
  assert.throws(()=>evaluateSealedReplay(name),/R21_EVALUATION_REQUIRES_ALL_FRAMES_SEALED/);
 }finally{cleanup(name);}
});
