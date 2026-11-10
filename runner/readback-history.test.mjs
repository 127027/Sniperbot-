import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {saveReadbackBatch} from './readback-history.mjs';

const sample=()=>({schema:'pool_readback_batch.v1',paper_only:true,actionable:false,
 checked_at_utc:'2026-11-10T14:00:00Z',status:'COMPLETED_READ_ONLY',
 results:[{candidate_id:'base:sample',status:'UNVERIFIED',
 paper_entry_authorized:false}]});
test('immutable history retained and latest updated without paper ledger',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-readback-history-'));
 const paper=path.join(dir,'paper-state-v03.json');
 await writeFile(paper,'{"cashUsdc":500}');
 try{
  const archive=path.join(dir,'research');
  const result=await saveReadbackBatch({folder:archive,batch:sample()});
  assert.equal(result.archived,true);
  assert.equal(JSON.parse(await readFile(path.join(archive,'latest.json'),'utf8')).results.length,1);
  await saveReadbackBatch({folder:archive,batch:sample()});
  assert.equal((await readdir(path.join(archive,'history'))).length,1);
  assert.equal(await readFile(paper,'utf8'),'{"cashUsdc":500}');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('invalid body and corrupt existing latest fail closed, preserving bytes',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-readback-corrupt-'));
 try{
  const archive=path.join(dir,'research');
  await assert.rejects(saveReadbackBatch({folder:archive,batch:{...sample(),actionable:true}}),
   /INVALID_READBACK_ARCHIVE_DATA/);
  await saveReadbackBatch({folder:archive,batch:sample()});
  const latest=path.join(archive,'latest.json');
  await writeFile(latest,'{broken json');
  await assert.rejects(saveReadbackBatch({folder:archive,batch:sample()}),SyntaxError);
  assert.equal(await readFile(latest,'utf8'),'{broken json');
 }finally{await rm(dir,{recursive:true,force:true})}
});
