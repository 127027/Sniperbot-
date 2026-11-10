import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {getDotDocument,putDotDocument,listDotDocuments,DOT_ROLES} from './dot-workspace.mjs';
const data=()=>({schema:'research_note.v1',paper_only:true,actionable:false,
 memo:'Public token observation only',urls:['https://example.com']});
test('per-role scratchpad persists, revisions are required, no other roles see it',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-dotwork-'));
 try{
  assert.equal((await getDotDocument({dir,role:DOT_ROLES[0],key:'candidate-01'})).revision,0);
  let a=await putDotDocument({dir,role:DOT_ROLES[0],key:'candidate-01',value:data(),expectedRevision:0});
  assert.equal(a.revision,1);
  const x=await getDotDocument({dir,role:DOT_ROLES[0],key:'candidate-01'});
  assert.equal(x.value.memo,'Public token observation only');
  assert.equal((await getDotDocument({dir,role:DOT_ROLES[1],key:'candidate-01'})).revision,0);
  await assert.rejects(putDotDocument({dir,role:DOT_ROLES[0],key:'candidate-01',
   value:data(),expectedRevision:0}),/WORKSPACE_REVISION_CONFLICT/);
  assert.equal((await listDotDocuments({dir,role:DOT_ROLES[0]})).length,1);
  assert.equal((await listDotDocuments({dir,role:DOT_ROLES[1]})).length,0);
 }finally{await rm(dir,{force:true,recursive:true})}
});
test('escape paths and secret fields are rejected without storing anything',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-dotdeny-'));
 try{
  for(const key of ['../paper-state','wallet/private','AAA','',':']){
   await assert.rejects(putDotDocument({dir,role:DOT_ROLES[0],key,value:data()}),/WORKSPACE_KEY_INVALID/);
  }
  for(const obj of [{...data(),private_key:'SECRET'},
   {...data(),nested:{paypalAccessToken:'SECRET'}},
   {...data(),actionable:true},
   {...data(),paper_only:false},
   {...data(),memo:'x'.repeat(14000)}]){
   await assert.rejects(putDotDocument({dir,role:DOT_ROLES[0],key:'scratch',
    value:obj}),/WORKSPACE/);
  }
  assert.equal((await listDotDocuments({dir,role:DOT_ROLES[0]})).length,0);
 }finally{await rm(dir,{force:true,recursive:true})}
});
test('file is local under state dir and survives re-instantiation',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-dotpersist-'));
 const paper=path.join(dir,'paper-state-v03.json');
 try{
  const {writeFile}=await import('node:fs/promises');
  await writeFile(paper,'{"cashUsdc":500}');
  await putDotDocument({dir,role:'opportunity_qa',key:'case_123',value:data()});
  const reopened=await getDotDocument({dir,role:'opportunity_qa',key:'case_123'});
  assert.equal(reopened.revision,1);
  assert.equal(await readFile(paper,'utf8'),'{"cashUsdc":500}');
 }finally{await rm(dir,{force:true,recursive:true})}
});
