import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {ROLES,digest,validateDataset,blindReadiness,initialPortfolio,visibleEvents,frame,decide,settle,portfolioReport} from './engine.mjs';
import {initialize,runPath,advance,load,nextFrame,evaluate,summary} from './controller.mjs';
export function fixture(){
 const ticks=Array.from({length:6},(_,i)=>new Date(Date.UTC(2023,0,1,0,i)).toISOString());
 const events=[];
 for(const [i,at]of ticks.entries())for(const id of ['A','B']){
  const base={candidate_id:id,event_at:at,available_at:at,evidence:{type:'FIXTURE',verified:true,ref:'synthetic-only'}};
  events.push({...base,id:id+'m'+i,kind:'MARKET',reserve_token:1000000,reserve_quote:1000000,fee_bps:30,gas_quote:1,quote_asset:'TEST_USDC',execution_verified:true});
  events.push({...base,id:id+'s'+i,kind:'SECURITY',scope:'BLOCK_STATE',buy_allowed:true,sell_allowed:true});
 }
 return {schema:'isolated_replay.v1',data_class:'SYNTHETIC',ticks,events};
}
export function votes(f,orders=[]){return ROLES.map(role=>({role,run_id:role+'-'+f.index,index:f.index,at:f.at,input_hash:f.input_hash,reviews:['A','B'].map(id=>({candidate_id:id,verdict:'YES',evidence_ids:[id+'m'+f.index,id+'s'+f.index]})),orders:role==='qa'?orders:[]}));}
test('future events and evaluator labels cannot alter earlier observations',()=>{
 const d=fixture(),p=initialPortfolio(),before=frame(d,0,p);
 d.secret_target='B';d.events.at(-1).reserve_quote=999999999;
 d.events[0].outcome='winner';d.events[0].evidence.future_ath=999;
 assert.deepEqual(frame(d,0,p),before);
 assert.equal(visibleEvents(d,d.ticks[0]).length,4);
 d.events[0].available_at=d.ticks[1];assert.equal(visibleEvents(d,d.ticks[0]).length,3);
});
test('reject malformed dataset, duplicate IDs and fixture injection into historical data',()=>{
 const d=fixture();assert.equal(validateDataset(d),d);
 const duplicate=structuredClone(d);duplicate.events.push(duplicate.events[0]);assert.throws(()=>validateDataset(duplicate),/EVENT_ID/);
 d.data_class='HISTORICAL';assert.throws(()=>validateDataset(d),/FIXTURE_IN_HISTORY/);
 const invalid=fixture();invalid.events[0].gas_quote=-1;assert.throws(()=>validateDataset(invalid),/GAS/);
});
test('missing, duplicate, future and wrong-frame role decisions cannot pass barrier',()=>{
 const f=frame(fixture(),0,initialPortfolio()),v=votes(f);
 assert.throws(()=>decide(initialPortfolio(),f,v.slice(1)),/FIVE_ROLE/);
 const duplicate=structuredClone(v);duplicate[1]=duplicate[0];assert.throws(()=>decide(initialPortfolio(),f,duplicate),/ROLE_ID/);
 const future=structuredClone(v);future[0].reviews[0].evidence_ids=['Am1'];assert.throws(()=>decide(initialPortfolio(),f,future),/UNSEEN/);
 const wrong=structuredClone(v);wrong[0].input_hash='bad';assert.throws(()=>decide(initialPortfolio(),f,wrong),/STALE/);
});
test('no trades forced; unknown review and unverified execution block entry',()=>{
 const d=fixture(),p=initialPortfolio(),f=frame(d,0,p);
 assert.equal(decide(p,f,votes(f)).pending.length,0);
 const v=votes(f,[{action:'BUY',candidate_id:'A',amount_quote:100}]);v[3].reviews[0].verdict='UNKNOWN';
 assert.equal(decide(p,f,v).rejections[0].reason,'ROLE_APPROVAL_MISSING');
 d.events[0].execution_verified=false;const f2=frame(d,0,p);
 assert.equal(decide(p,f2,votes(f2,[{action:'BUY',candidate_id:'A',amount_quote:100}])).rejections[0].reason,'ENTRY_REFERENCE_QUOTE_MISSING');
});
test('BUY HOLD ADD REDUCE SELL, concurrent positions, fees and real loss accounting',()=>{
 const d=fixture();let p=initialPortfolio();const schedule=[
  [{action:'BUY',candidate_id:'A',amount_quote:100},{action:'BUY',candidate_id:'B',amount_quote:100}],
  [{action:'HOLD',candidate_id:'A'},{action:'HOLD',candidate_id:'B'}],
  [{action:'ADD',candidate_id:'A',amount_quote:50}],
  [{action:'REDUCE',candidate_id:'A',fraction:0.5}],
  [{action:'SELL',candidate_id:'A'},{action:'SELL',candidate_id:'B'}],[]];
 for(let i=0;i<d.ticks.length;i++){
  p=settle(p,d,d.ticks[i]);if(i===1)assert.equal(Object.keys(p.positions).length,2);
  const f=frame(d,i,p);p=decide(p,f,votes(f,schedule[i]));
  if(i===0)assert.equal(p.trades.length,0,'no same-close execution');
 }
 assert.equal(p.trades.length,6);assert.equal(Object.keys(p.positions).length,0);
 assert.equal(p.pending.length,0);assert.ok(p.realized_pnl<0);assert.ok(p.cash<1000);
 assert.ok(Math.abs((p.cash-1000)-p.realized_pnl)<1e-8);
 assert.ok(p.trades.every(t=>t.filled_at>t.decided_at&&t.gas_quote===1));
 assert.equal(p.decisions.filter(d=>d.action==='HOLD').length,2);
});
test('slippage, cash, expiry, stale quotes and security at fill reject without fabricated fills',()=>{
 const cases=['slippage','cash','expiry','stale','security','participation'];
 for(const kind of cases){
  const d=fixture(),config=kind==='cash'?{initial_cash:50}:kind==='expiry'?{max_delay_ms:1000}:{};
  let p=initialPortfolio(config),f=frame(d,0,p);
  p=decide(p,f,votes(f,[{action:'BUY',candidate_id:'A',amount_quote:kind==='participation'?20000:100}]));
  if(kind==='slippage')d.events.find(e=>e.id==='Am1').reserve_quote*=2;
  if(kind==='stale')d.events=d.events.filter(e=>!['Am1','As1'].includes(e.id));
  if(kind==='security')d.events.find(e=>e.id==='As1').buy_allowed=false;
  p=settle(p,d,d.ticks[1]);assert.equal(p.trades.length,0,kind);assert.ok(p.rejections.length,kind);
 }
});
test('unknown security prevents fabricated sale, preserves position; missing marks stay unknown',()=>{
 const d=fixture();let p=initialPortfolio();let f=frame(d,0,p);
 p=decide(p,f,votes(f,[{action:'BUY',candidate_id:'A',amount_quote:100}]));p=settle(p,d,d.ticks[1]);
 f=frame(d,1,p);p=decide(p,f,votes(f,[{action:'SELL',candidate_id:'A'}]));
 d.events.find(e=>e.id==='As2').sell_allowed=false;p=settle(p,d,d.ticks[2]);
 assert.ok(p.positions.A);assert.equal(p.trades.length,1);
 const report=portfolioReport(p,{...d,events:[]},d.ticks[2]);assert.equal(report.mark_to_market_equity,null);
});
test('known winner corpus and exposed contexts fail blind readiness',()=>{
 const d=fixture();assert.equal(blindReadiness(d).eligible,false);
 d.data_class='HISTORICAL';d.events.forEach(e=>e.evidence.type='LEDGER');
 d.universe={selection:'ASOF_COHORT',complete:true,provenance:'test-attestation'};
 d.contexts=Object.fromEntries(ROLES.map(r=>[r,{fresh:true,target_exposed:false,attestation:'test-only'}]));
 assert.equal(blindReadiness(d).eligible,true);
 d.contexts.scout.target_exposed=true;assert.ok(blindReadiness(d).reasons.includes('CONTEXT_NOT_ISOLATED:scout'));
});
test('durable controller: no advance until 5 roles, reproducible resume, sealed evaluation and tamper rejection',()=>{
 const name='test-'+process.pid+'-'+Date.now(),root=runPath(name),d=fixture();
 try{
  assert.throws(()=>initialize(name,d),/BLIND_TEST_BLOCKED/);
  initialize(name,d,{},'SYNTHETIC');assert.equal(advance(name).missing_roles.length,5);
  assert.equal(fs.existsSync(path.join(root,'frames','00001')),false);
  assert.throws(()=>evaluate(name,{outcomes:[]}),/BEFORE_DECISIONS/);
  for(let i=0;i<d.ticks.length;i++){
   const info=nextFrame(name),f=JSON.parse(fs.readFileSync(info.input_path));
   fs.mkdirSync(info.decision_directory,{recursive:true});
   for(const v of votes(f))fs.writeFileSync(path.join(info.decision_directory,v.role+'.json'),JSON.stringify(v));
   advance(name);assert.equal(load(name).index,i+1);
  }
  assert.equal(summary(name).status,'COMPLETE');assert.equal(summary(name).trades.length,0);
  const e=evaluate(name,{dataset_hash:digest(d),outcomes:[{candidate_id:'A',outcome:'WINNER'}]});assert.deepEqual(e.missed_winners,['A']);
  assert.throws(()=>advance(name),/ALREADY_COMPLETE/);
  const p=path.join(root,'commits','00000.json'),c=JSON.parse(fs.readFileSync(p));c.decisions[0].run_id='tampered';fs.writeFileSync(p,JSON.stringify(c));
  assert.throws(()=>load(name),/COMMIT_CHAIN_CORRUPT/);
 }finally{
  // This generated path is restricted to the controller's own runs subtree.
  assert.ok(path.resolve(root).endsWith(path.sep+'runs'+path.sep+name));
  fs.rmSync(root,{recursive:true,force:true});
 }
});
