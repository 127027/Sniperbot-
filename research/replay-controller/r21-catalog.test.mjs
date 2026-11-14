import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {runPath} from './controller.mjs';
import {validateCaseCatalog,runCaseCatalog} from './r21-catalog.mjs';
import {syntheticFixtureRoleProvider} from './continuous-runner.mjs';
const mkId=i=>'case_'+String(i+1).padStart(4,'0');
function dataset(i){
 const at=new Date(Date.UTC(2023,2,14+i)).toISOString();
 const next=new Date(Date.UTC(2023,2,15+i)).toISOString();
 return {
  schema:'isolated_replay.v1',data_class:'SYNTHETIC',
  window:{start:at,end:next},ticks:[at,next],events:[],
  universe:{selection:'ASOF_COHORT',complete:false,provenance:'synthetic batch fixture'}
 };
}
const cases=(n=50)=>Array.from({length:n},(_,i)=>({
 case_id:mkId(i),
 split:i<35?'DEVELOPMENT':i<45?'VALIDATION':'HOLDOUT',
 mode:'DIAGNOSTIC',
 dataset_path:'private/cohort-'+i+'.json',
 labels_path:'private/labels-'+i+'.json'
}));
const catalog=(n=50)=>({schema:'r21_case_catalog.v1',target_case_count:50,cases:cases(n)});
const cleanup=(n,dir)=>{
 fs.rmSync(dir,{recursive:true,force:true});
 for(let i=0;i<n;i++)fs.rmSync(runPath('r21-'+mkId(i)),{recursive:true,force:true});
};
test('50 neutral test cases can be independently scheduled, labelled and audited',async()=>{
 const c=catalog();
 const p=fs.mkdtempSync(path.join(os.tmpdir(),'r21-batch-'));
 let labelsLoaded=0,active=0;
 try{
  const result=await runCaseCatalog(c,{
   outputDir:p,
   loadDataset:async d=>dataset(Number(d.match(/cohort-(\d+)/)[1])),
   loadLabels:async d=>{
    labelsLoaded++;
    const i=Number(d.match(/labels-(\d+)/)[1]);
    // Labels only accessed AFTER 100% of that case's two frames were sealed.
    assert.equal(fs.readdirSync(path.join(runPath('r21-'+mkId(i)),'commits')).length,2);
    const data=dataset(i);
    const {digest}=await import('./engine.mjs');
    return {schema:'r21_evaluator_labels.v1',dataset_hash:digest(data),outcomes:[]};
   },
   invokeRole:async(role,task)=>{
    active++;
    return syntheticFixtureRoleProvider(role,task);
   },
   providerLabel:'SYNTHETIC_FIXTURE'
  });
  assert.equal(result.target_case_count,50);
  assert.equal(result.completed_cases,50);
  assert.equal(result.blocked_cases,0);
  assert.equal(result.total_completed_frames,100);
  assert.equal(result.total_role_calls,500);
  assert.equal(active,500);
  assert.equal(labelsLoaded,50);
  assert.equal(result.total_simulated_trades,0);
  assert.equal(result.split_summaries.DEVELOPMENT.completed,35);
  assert.equal(result.split_summaries.VALIDATION.completed,10);
  assert.equal(result.split_summaries.HOLDOUT.completed,5);
  assert.ok(result.cases.every(x=>x.historical_blind_success_verified===false));
  assert.ok(fs.existsSync(path.join(p,'case_0050','report.json')));
 }finally{cleanup(50,p);}
});
test('no historical data can be traded using synthetic generated role decisions',async()=>{
 const c=catalog(1),temp=fs.mkdtempSync(path.join(os.tmpdir(),'r21-reject-'));
 try{
  const r=await runCaseCatalog(c,{
   outputDir:temp,
   loadDataset:async()=>({...dataset(0),data_class:'HISTORICAL'}),
   invokeRole:syntheticFixtureRoleProvider,
   providerLabel:'SYNTHETIC_FIXTURE'
  });
  assert.equal(r.blocked_cases,1);
  assert.equal(r.total_completed_frames,0);
  assert.match(r.cases[0].error,/R21_SYNTHETIC_VOTES_FORBIDDEN_ON_HISTORICAL/);
 }finally{cleanup(1,temp);}
});
test('winner-aware and duplicate case identifiers rejected before running',()=>{
 const c=catalog();
 c.cases[0].case_id='PEPE-2023';
 assert.throws(()=>validateCaseCatalog(c),/R21_CASE_ID_MUST_BE_NEUTRAL/);
 const c2=catalog();
 c2.cases[1].case_id=c2.cases[0].case_id;
 assert.throws(()=>validateCaseCatalog(c2),/R21_DUPLICATE_CASE_ID/);
});
test('same dataset private path cannot be reused for train and holdout',()=>{
 const c=catalog();
 c.cases[49].dataset_path=c.cases[0].dataset_path;
 assert.throws(()=>validateCaseCatalog(c),/R21_REUSED_CASE_DATASET_PATH/);
});
test('incomplete case never loads evaluator labels or claims a return',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r21-block-'));
 let labelsLoaded=0;
 try{
  const r=await runCaseCatalog(catalog(1),{
   outputDir:temp,maxFramesPerCase:1,
   loadDataset:async()=>dataset(0),
   loadLabels:async()=>{labelsLoaded++;throw Error('FUTURE_LABEL_READ');},
   invokeRole:syntheticFixtureRoleProvider,
   providerLabel:'SYNTHETIC_FIXTURE'
  });
  assert.equal(r.completed_cases,0);
  assert.equal(r.blocked_cases,1);
  assert.equal(r.total_completed_frames,1);
  assert.equal(labelsLoaded,0);
  assert.equal(r.total_simulated_trades,0);
 }finally{cleanup(1,temp);}
});
test('50+ catalog with pending real cases is not represented as completed',()=>{
 const c={schema:'r21_case_catalog.v1',target_case_count:50,cases:[]};
 const s=validateCaseCatalog(c);
 assert.equal(s.remaining_to_register,50);
 assert.equal(s.pending_cohort_data,true);
 assert.equal(s.enabled_cases,0);
});
