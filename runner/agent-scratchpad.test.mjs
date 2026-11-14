import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createAgentScratchpad} from './agent-scratchpad.mjs';
const start=Date.parse('2026-11-10T14:00:00Z');
test('agent roles can share research or save role-only notes without touching portfolio',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-agent-scratch-'));
 const wallet=path.join(dir,'paper-state-v03.json'),scratch=path.join(dir,'scratch.json');
 await writeFile(wallet,'{"cashUsdc":5000}');
 try{
  const store=await createAgentScratchpad(scratch);
  await store.put({role:'news_discovery',entry:{key:'event-1',value:{candidate_id:'solana:example',
    source:'https://example.org'},visibility:'shared',ttl_minutes:60},now:start});
  await store.put({role:'opportunity_qa',entry:{key:'notes',value:{counter_evidence:'unknown'},
    visibility:'role_only',ttl_minutes:60},now:start});
  const other=await store.get({role:'onchain_liquidity',now:start+1000});
  assert.equal(other.records.length,1);
  assert.equal(other.records[0].key,'event-1');
  assert.equal(other.actionable,false);
  const qa=await store.get({role:'opportunity_qa',now:start+1000});
  assert.equal(qa.records.length,2);
  assert.equal(await readFile(wallet,'utf8'),'{"cashUsdc":5000}');
  assert.equal((await store.get({role:'news_discovery',now:start+61*60000})).records.length,0);
 }finally{await rm(dir,{force:true,recursive:true})}
});
test('credential-like keys, unrecognized roles and trade commands fail closed',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-scratch-refuse-'));
 try{
  const store=await createAgentScratchpad(path.join(dir,'notes.json'));
  for(const k of ['privateKey','seed_phrase','paypalToken','api_key','bank_account','password']){
   await assert.rejects(store.put({role:'news_discovery',entry:{
    key:'test',visibility:'shared',ttl_minutes:10,value:{[k]:'secret'}},now:start}),/PRIVATE_MATERIAL/);
  }
  await assert.rejects(store.put({role:'bot_admin',entry:{
   key:'order',visibility:'shared',ttl_minutes:10,value:{action:'BUY'}},now:start}),/UNAUTHORIZED/);
  await store.put({role:'news_discovery',entry:{key:'untrusted',visibility:'shared',
   ttl_minutes:10,value:{action:'BUY',score:100}},now:start});
  const rec=(await store.get({role:'opportunity_qa',now:start})).records[0];
  assert.equal(rec.actionable,false);
 }finally{await rm(dir,{force:true,recursive:true})}
});
test('corrupt file fails without being overwritten and updates are serialized',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-scratch-corrupt-'));
 const file=path.join(dir,'notes.json');
 try{
  const store=await createAgentScratchpad(file);
  await Promise.all(Array.from({length:12},(_,i)=>store.put({role:'news_discovery',entry:{
   key:'test-'+i,visibility:'shared',ttl_minutes:60,value:{index:i}},now:start})));
  assert.equal((await store.get({role:'opportunity_qa',now:start})).records.length,12);
  await writeFile(file,'{corrupted');
  await assert.rejects(store.put({role:'news_discovery',entry:{
   key:'another',visibility:'shared',ttl_minutes:60,value:{index:1}},now:start}),SyntaxError);
  assert.equal(await readFile(file,'utf8'),'{corrupted');
 }finally{await rm(dir,{force:true,recursive:true})}
});
