import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createModelAdapter} from './model-adapter.mjs';
import {frame,initialPortfolio,digest} from './engine.mjs';
import {ephemeralRoleTask} from './role-task.mjs';
import {runContinuousReplay} from './continuous-runner.mjs';
import {runPath} from './controller.mjs';
import {auditDataset,intake} from './r22-intake.mjs';
const config={apiKey:'test-secret-not-real',model:'mock-model',privacyApproved:true,budgetUsd:2,inputUsdPerMillion:1,outputUsdPerMillion:2,timeoutMs:1000,retries:0};
const ticks=['2023-03-14T23:59:59Z','2023-03-15T23:59:59Z'];
function dataset(){return {schema:'isolated_replay.v1',data_class:'HISTORICAL',ticks,
 window:{start:'2023-03-14T00:00:00Z',end:ticks[1]},universe:{selection:'ASOF_COHORT',complete:false},
 events:[{id:'p1',kind:'POOL',candidate_id:'candidate-1',event_at:ticks[0],available_at:ticks[0],
  evidence:{type:'LEDGER',ref:'asof:1',verified:true},chain:'test',token:'neutral',pool:'neutral'},
 {id:'future',kind:'POOL',candidate_id:'candidate-2',event_at:ticks[1],available_at:ticks[1],evidence:{type:'LEDGER',ref:'asof:2',verified:true}}],
 outcomes:'DO_NOT_EXPOSE_WINNER'};}
const task=()=>ephemeralRoleTask('scout',frame(dataset(),0,initialPortfolio()));
const response=(answer={reviews:[],orders:[]})=>({response:{status:'completed',id:'resp_'+randomUUID(),model:'mock-model',usage:{input_tokens:100,output_tokens:50},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(answer)}]}]}});
test('configuration fails closed without auth, privacy, pricing or valid limits',()=>{
 for(const [key,value,code]of [['apiKey','',/AUTH/],['privacyApproved',false,/APPROVAL/],['budgetUsd',0,/COST/],['inputUsdPerMillion',NaN,/COST/],['model','',/MODEL_NOT/],['retries',3,/LIMITS/]])
  assert.throws(()=>createModelAdapter({...config,[key]:value}),code);
});
test('real adapter orchestration contract: parallel four, QA after, next frame only after seal (mock HTTP)',async()=>{
 const name='r22-test-'+randomUUID(),root=fs.mkdtempSync(path.join(os.tmpdir(),'r22-'));
 const started=new Map(),finished=new Map();let calls=0;
 const adapter=createModelAdapter(config,{transport:async({body})=>{
  calls++;assert.equal(body.store,false);assert.deepEqual(body.tools,[]);
  assert.equal(body.previous_response_id,undefined);assert.equal(body.conversation,undefined);
  assert.ok(!JSON.stringify(body).includes('DO_NOT_EXPOSE_WINNER'));
  assert.ok(!JSON.stringify(body).includes(config.apiKey));
  const {frame:f,role,current_peer_votes:peers}=JSON.parse(body.input);
  if(f.index===0)assert.equal(f.events.length,1);
  if(role==='qa'){assert.equal(finished.get(f.index),4);assert.equal(peers.length,4);}
  else {assert.deepEqual(peers,[]);started.set(f.index,(started.get(f.index)||0)+1);
   await new Promise(r=>setTimeout(r,10));assert.equal(started.get(f.index),4);
   finished.set(f.index,(finished.get(f.index)||0)+1);}
  return response();
 }});
 try{
  const r=await runContinuousReplay({sessionName:name,dataset:dataset(),publicRoot:root,invokeRole:adapter.invokeRole,providerLabel:'MOCK_HTTP_TEST'});
  assert.equal(r.status,'COMPLETE');assert.equal(calls,10);assert.equal(adapter.report().receipts.length,10);
  assert.equal(r.real_paper_account_changes,0);assert.equal(r.blind_success,false);
 }finally{fs.rmSync(root,{recursive:true,force:true});fs.rmSync(runPath(name),{recursive:true,force:true});}
});
test('budget is reserved atomically before concurrent requests',async()=>{
 let calls=0;const a=createModelAdapter({...config,budgetUsd:0.000001},{transport:async()=>{calls++;return response();}});
 await assert.rejects(a.invokeRole('scout',task()),/BUDGET/);assert.equal(calls,0);
});
test('wire identities and references are opaque, valid cited model reviews restore to sealed frame',async()=>{
 const a=createModelAdapter(config,{transport:async({body})=>{
  const wire=JSON.parse(body.input);const e=wire.frame.events[0];
  assert.notEqual(e.candidate_id,'candidate-1');assert.notEqual(e.evidence.ref,'asof:1');
  return response({reviews:[{candidate_id:e.candidate_id,verdict:'UNKNOWN',evidence_ids:[e.id]}],orders:[]});
 }});
 const vote=await a.invokeRole('scout',task());
 assert.equal(vote.reviews[0].candidate_id,'candidate-1');assert.deepEqual(vote.reviews[0].evidence_ids,['p1']);
});
test('known winner diagnostic requires explicit opt-in and cannot become BLIND',async()=>{
 const name='r22-test-'+randomUUID(),root=fs.mkdtempSync(path.join(os.tmpdir(),'r22-'));
 const d=dataset();d.universe.selection='KNOWN_WINNER';
 const a=createModelAdapter(config,{transport:async()=>response()});
 try {
  await assert.rejects(runContinuousReplay({sessionName:name,dataset:d,publicRoot:root,invokeRole:a.invokeRole}),/NEUTRAL_WINDOW/);
  await assert.rejects(runContinuousReplay({sessionName:name,dataset:d,publicRoot:root,invokeRole:a.invokeRole,mode:'BLIND',allowKnownWinnerDiagnostic:true}),/NEUTRAL_WINDOW/);
  const r=await runContinuousReplay({sessionName:name,dataset:d,publicRoot:root,invokeRole:a.invokeRole,allowKnownWinnerDiagnostic:true});
  assert.equal(r.status,'COMPLETE');assert.equal(r.blind_success,false);
 } finally {fs.rmSync(root,{recursive:true,force:true});fs.rmSync(runPath(name),{recursive:true,force:true});}
});
test('only transient HTTP errors retry; auth errors never retry or leak bodies',async()=>{
 let calls=0;const a=createModelAdapter({...config,retries:1},{transport:async()=>++calls===1?{error:'HTTP_429',status:429}:response()});
 await a.invokeRole('scout',task());assert.equal(calls,2);assert.equal(a.report().attempts,2);
 calls=0;const b=createModelAdapter({...config,retries:2},{transport:async()=>{calls++;return {error:'HTTP_401',status:401};}});
 await assert.rejects(b.invokeRole('scout',task()),/HTTP_401/);assert.equal(calls,1);
});
test('no votes from incomplete, refused, malformed, cross-candidate or invented evidence',async()=>{
 const cases=[{response:{status:'incomplete'}},response({reviews:[{candidate_id:'candidate-1',verdict:'YES',evidence_ids:['future']}],orders:[]}),
 response({reviews:[],orders:[{candidate_id:'candidate-1',action:'BUY',amount_quote:50}]}),response({bad:true})];
 for(const result of cases){const a=createModelAdapter(config,{transport:async()=>result});
  await assert.rejects(a.invokeRole('scout',task()));assert.equal(a.report().receipts.length,0);}
});
test('tampered and future frames rejected before transport; QA requires peers',async()=>{
 let calls=0;const a=createModelAdapter(config,{transport:async()=>{calls++;return response();}});
 const t=task();t.frame.events[0].available_at=ticks[1];
 await assert.rejects(a.invokeRole('scout',t),/TAMPERED/);
 const {input_hash,...body}=t.frame;t.frame.input_hash=digest(body);
 await assert.rejects(a.invokeRole('scout',t),/FUTURE/);
 await assert.rejects(a.invokeRole('qa',task(),{current_peer_votes:[]}),/QA_PEERS/);assert.equal(calls,0);
});
test('cancellation spends nothing and makes no replacement vote',async()=>{
 const abort=new AbortController();abort.abort();
 const a=createModelAdapter(config,{transport:async()=>{throw Error('should not call');}});
 await assert.rejects(a.invokeRole('scout',task(),{signal:abort.signal}),/CANCELLED/);
 assert.equal(a.report().attempts,0);
});
test('coverage exposes source gaps and intake rejects false raw hashes',()=>{
 const audit=auditDataset(dataset());assert.equal(audit.counts.POOL,2);assert.equal(audit.counts.MARKET,0);
 assert.deepEqual(audit.candidates[0].missing,['MARKET','SOCIAL','SECURITY']);assert.equal(audit.readiness.eligible,false);
 assert.throws(()=>intake({schema:'asof_corpus.v1',window:dataset().window,sources:[{id:'x',kind:'POOL',candidate_id:'a',proof:{method:'ONCHAIN_LEDGER',original:'x',sha256:'wrong'}}]}),/RAW_HASH/);
});
