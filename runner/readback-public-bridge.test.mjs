import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {readPublicPoolReadbacks,sanitizePoolReadbacks} from './readback-public-bridge.mjs';
const now=Date.parse('2026-11-10T14:00:00Z');
const id='base:0x'+'a'.repeat(40)+':0x'+'b'.repeat(40);
const record=()=>({candidate_id:id,paper_only:true,actionable:false,
 paper_entry_authorized:false,executable_buy_quote:false,executable_sell_quote:false,
 contract_status:'UNKNOWN',sellability_status:'UNKNOWN',
 status:'IDENTITY_MATCHED',market_identity_verified:true,
 reason:'IDENTITY_ONLY_RISK_AND_SELL_QUOTE_STILL_UNKNOWN',
 private_key:'MUST_NOT_ESCALATE',cashUsdc:123456});
const batch=()=>({schema:'pool_readback_batch.v1',paper_only:true,actionable:false,
 checked_at_utc:new Date(now).toISOString(),results:[record()]});
test('whitelist only releases public non-order pool facts; never money or secrets',()=>{
 const result=sanitizePoolReadbacks(batch(),{now});
 assert.equal(result.length,1);
 assert.equal(result[0].candidate_id,id);
 assert.equal(result[0].paper_entry_authorized,false);
 assert.equal(result[0].sellability_status,'UNKNOWN');
 assert.equal(result[0].executable_sell_quote,false);
 assert(!JSON.stringify(result).includes('MUST_NOT_ESCALATE'));
 assert(!JSON.stringify(result).includes('cashUsdc'));
});
test('stale observations, forged approval, contract pass or fake identity are stripped',()=>{
 assert.deepEqual(sanitizePoolReadbacks(batch(),{now:now+16*60000}),[]);
 for(const patch of [
  {paper_entry_authorized:true},{contract_status:'PASS'},{sellability_status:'PASS'},
  {executable_sell_quote:true},{status:'UNVERIFIED',market_identity_verified:true},
  {candidate_id:'base:INVALID:POOL'}]){
  const b=batch();b.results[0]={...record(),...patch};
  assert.deepEqual(sanitizePoolReadbacks(b,{now}),[]);
 }
});
test('GitHub-ready result readback is local only and missing file is harmless',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-pub-readback-'));
 const f=path.join(dir,'latest.json');
 try{
  assert.deepEqual(await readPublicPoolReadbacks({filename:f,now}),[]);
  await writeFile(f,JSON.stringify(batch()));
  assert.equal((await readPublicPoolReadbacks({filename:f,now})).length,1);
  await writeFile(f,'INVALID JSON');
  await assert.rejects(readPublicPoolReadbacks({filename:f,now}),SyntaxError);
 }finally{await rm(dir,{recursive:true,force:true})}
});
