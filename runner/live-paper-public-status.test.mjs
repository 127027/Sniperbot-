import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {sanitizePaperAutoHeartbeat,syncLocalPaperAutoHeartbeat,
 AUTOPILOT_PUBLIC_STATUS_PATH} from './live-paper-public-status.mjs';
const local={schema:'sniper_r29_local_live_paper_autopilot.v1',
 mode:'PAPER_ONLY',live_trading_enabled:false,
 actual_wallet_access:false,local_signer_only:true,
 expensive_ai_api_required:false,enabled:true,
 last_scan_at_utc:'2026-11-15T17:30:00.000Z',
 last_outcome:'NO_VERIFIED_SAFE_ENTRY',
 entries_submitted:2,sells_submitted:1,paper_fills_confirmed:2,
 private_wallet_address:'private-not-sent',cash_test_usdc:5000,
 last_decision:{candidate_id:'secret-strategy-pool'},
 last_receipt:{token_address:'secret-token'}};
test('paper heartbeat public fields are strict whitelist, never private account',()=>{
 const p=sanitizePaperAutoHeartbeat(local);
 assert.equal(p.mode,'PAPER_ONLY');
 assert.equal(p.confirmed_virtual_paper_fill_count,2);
 assert.equal(p.account_balance_or_wallet_published,false);
 assert.equal(p.executable_commands_published,false);
 const j=JSON.stringify(p);
 for(const term of ['private-not-sent','secret-token','5000','secret-strategy-pool','private_wallet'])
  assert(!j.includes(term),term);
 assert.throws(()=>sanitizePaperAutoHeartbeat({...local,live_trading_enabled:true}),/INVALID/);
 assert.throws(()=>sanitizePaperAutoHeartbeat({...local,last_outcome:'BUY foo'}),/INVALID/);
});
test('missing local file cannot manufacture successful bot execution',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'r29-auto-status-missing-'));
 try{
 let called=false;
 const r=await syncLocalPaperAutoHeartbeat({
  token:'github_pat_FAKE_TEST_TOKEN_123456789012345',
  filename:path.join(dir,'missing.json'),
  fetcher:async()=>{called=true;throw Error('never')}});
 assert.equal(r.status,'WAITING_FOR_LOCAL_AUTOPILOT');
 assert.equal(called,false);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('existing GitHub courier carries only safe virtual counts and deduplicates',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'r29-auto-status-'));
 try{
  const filename=path.join(dir,'latest.json');
  await writeFile(filename,JSON.stringify(local));
  const calls=[];
  const fetcher=async (url,init)=>{
   assert(url.includes(AUTOPILOT_PUBLIC_STATUS_PATH));
   calls.push(init.method);
   if(init.method==='GET'&&calls.length===1)return {status:404,ok:false};
   if(init.method==='PUT')return {ok:true,status:201,json:async()=>({commit:{sha:'a'.repeat(40)}})};
   return {status:200,ok:true,json:async()=>({type:'file',sha:'b'.repeat(40),
    encoding:'base64',
    content:Buffer.from(JSON.stringify(sanitizePaperAutoHeartbeat(local))).toString('base64')})};
  };
  const token='github_pat_FAKE_TEST_TOKEN_123456789012345';
  const one=await syncLocalPaperAutoHeartbeat({token,filename,fetcher,now:Date.parse(local.last_scan_at_utc)+30000});
  assert.equal(one.published,true);
  const two=await syncLocalPaperAutoHeartbeat({token,filename,fetcher,now:Date.parse(local.last_scan_at_utc)+30000});
  assert.equal(two.published,false);
  assert.deepEqual(calls,['GET','PUT','GET']);
 }finally{await rm(dir,{recursive:true,force:true})}
});
