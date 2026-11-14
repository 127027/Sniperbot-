import {publishResearchSnapshot} from './research-market-publisher.mjs';
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
 assert.equal(result[0].onchain_existence_status,'UNKNOWN');
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

test('public GitHub publisher sends exact sanitized readbacks and rejects injected keys',async()=>{
 const safe=sanitizePoolReadbacks(batch(),{now});
 const snapshot={schema:'research_market_snapshot.v1',paper_only:true,actionable:false,
  candidates:[],pool_readbacks:safe};
 let published=null,calls=0;
 const fetcher=async (url,options)=>{
  calls++;
  if(options.method==='GET')return {status:404,ok:false};
  published=JSON.parse(options.body);
  return {status:201,ok:true,json:async()=>({commit:{sha:'test-commit-sha'}})};
 };
 const result=await publishResearchSnapshot(snapshot,{
  token:'TEST_GITHUB_NOT_REAL_SECRET_123456789',fetcher});
 assert.equal(result.commit_sha,'test-commit-sha');
 assert.equal(calls,2);
 const output=JSON.parse(Buffer.from(published.content,'base64').toString('utf8'));
 assert.deepEqual(output.pool_readbacks,safe);
 const injected={...snapshot,pool_readbacks:[{...safe[0],private_key:'MUST_NOT_LEAK'}]};
 await assert.rejects(publishResearchSnapshot(injected,{token:'TEST_GITHUB_NOT_REAL_SECRET_123456789',
  fetcher}),/Unsafe public pool readback payload/);
 assert.equal(calls,2,'invalid private payload rejected before network');
});

test('public bridge refuses to interpret forged onchain contract PASS as safety',()=>{
 const b=batch();
 b.results[0].onchain_existence={schema:'onchain_existence_readback.v1',
  candidate_id:id,paper_only:true,actionable:false,
  paper_entry_authorized:false,existence_status:'CODE_PRESENT',
  contract_security:'PASS',sellability:'PASS',amount_specific_sell_quote:false};
 const result=sanitizePoolReadbacks(b,{now});
 assert.equal(result[0].onchain_existence_status,'UNKNOWN');
 assert.equal(result[0].paper_entry_authorized,false);
});

test('Solana revoked versus retained mint rights are public facts, never trading approvals',()=>{
 const solId='solana:So11111111111111111111111111111111111111112:9KNZ2WoEC2bpL3HeKaT3B7B73Wbv8Kgwz5NmRMT2qZ2H';
 const b=batch(),v=record();
 v.candidate_id=solId;
 v.onchain_existence={schema:'onchain_existence_readback.v1',
  candidate_id:solId,paper_only:true,actionable:false,paper_entry_authorized:false,
  existence_status:'ACCOUNTS_REPORTED',contract_security:'UNKNOWN',
  sellability:'UNKNOWN',amount_specific_sell_quote:false,
  solana_mint_header:{schema:'solana_mint_header_risk.v1',
   paper_only:true,actionable:false,paper_entry_authorized:false,
   mint_program:'SPL_TOKEN_LEGACY',mint_authority:'RETAINED',
   freeze_authority:'REVOKED',initialized:true,supply_raw:'999999',
   extension_audit:'NOT_APPLICABLE',observed_risk:'CAUTION',
   contract_security:'UNKNOWN',sellability:'UNKNOWN'}};
 b.results=[v];
 const out=sanitizePoolReadbacks(b,{now});
 assert.equal(out.length,1);
 assert.equal(out[0].solana_mint_authority,'RETAINED');
 assert.equal(out[0].solana_freeze_authority,'REVOKED');
 assert.equal(out[0].solana_mint_header_risk,'CAUTION');
 assert.equal(out[0].contract_status,'UNKNOWN');
 assert.equal(out[0].paper_entry_authorized,false);
 assert(!JSON.stringify(out).includes('MUST_NOT_ESCALATE'));
});
test('forged Solana mint risk PASS never leaves public research bridge',()=>{
 const solId='solana:So11111111111111111111111111111111111111112:9KNZ2WoEC2bpL3HeKaT3B7B73Wbv8Kgwz5NmRMT2qZ2H';
 const b=batch(),v=record();
 v.candidate_id=solId;
 v.onchain_existence={schema:'onchain_existence_readback.v1',
  candidate_id:solId,paper_only:true,actionable:false,paper_entry_authorized:false,
  existence_status:'ACCOUNTS_REPORTED',contract_security:'UNKNOWN',
  sellability:'UNKNOWN',amount_specific_sell_quote:false,
  solana_mint_header:{schema:'solana_mint_header_risk.v1',paper_only:true,
   actionable:false,paper_entry_authorized:false,mint_program:'SPL_TOKEN_LEGACY',
   mint_authority:'REVOKED',freeze_authority:'REVOKED',initialized:true,
   supply_raw:'1000',extension_audit:'NOT_APPLICABLE',observed_risk:'PASS',
   contract_security:'UNKNOWN',sellability:'UNKNOWN'}};
 b.results=[v];
 const out=sanitizePoolReadbacks(b,{now});
 assert.equal(out[0].solana_mint_authority,'UNKNOWN');
 assert.equal(out[0].solana_mint_header_risk,'UNKNOWN');
});
