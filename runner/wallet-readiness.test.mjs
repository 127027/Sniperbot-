import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {emptyWalletReadiness,validateWalletReadiness,
 rejectPrivateMaterial,saveWalletReadiness,loadWalletReadiness} from './wallet-readiness.mjs';
const address='0x'+'a'.repeat(40);
const original=()=>({schema:'wallet_readiness.v1',paper_only:true,
 signing_enabled:false,live_enabled:false,accounts:[{
 chain:'base',public_address:address,label:'read-only future address',
 enabled:false,observed_at_utc:'2026-11-10T12:00:00Z'}]});
test('only public read-only accounts accepted, never active signing',()=>{
 const m=original();assert.equal(validateWalletReadiness(m),m);
 for(const patch of [{signing_enabled:true},{live_enabled:true},{paper_only:false}]){
  assert.throws(()=>validateWalletReadiness({...m,...patch}),/WALLET_READINESS_INVALID/);
 }
 assert.throws(()=>validateWalletReadiness({...m,accounts:[{...m.accounts[0],enabled:true}]}),/WALLET_ACCOUNT_INVALID/);
});
test('nested private keys, mnemonic, PayPal credentials and secret fields are always rejected',()=>{
 const m=original();
 for(const key of ['private_key','seedPhrase','mnemonic','apiKey','paypalToken','password']){
  assert.throws(()=>rejectPrivateMaterial({...m,metadata:{[key]:'Never store me'}}),
   /PRIVATE_WALLET_MATERIAL_PROHIBITED/);
 }
});
test('valid watch-only manifest persists locally; existing corrupted file is never replaced',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-wallet-readiness-'));
 const file=path.join(dir,'wallet-readiness.json');
 try{
  assert.deepEqual(await loadWalletReadiness(file),emptyWalletReadiness());
  const saved=await saveWalletReadiness({filename:file,value:original()});
  assert.equal(saved.signing_enabled,false);
  assert.equal(saved.account_count,1);
  assert.deepEqual(await loadWalletReadiness(file),original());
  await writeFile(file,'{broken private state');
  await assert.rejects(saveWalletReadiness({filename:file,value:emptyWalletReadiness()}),SyntaxError);
  assert.equal(await readFile(file,'utf8'),'{broken private state');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('duplicate public account and unknown key never pass validation',()=>{
 const m=original();
 assert.throws(()=>validateWalletReadiness({...m,accounts:[m.accounts[0],m.accounts[0]]}),/DUPLICATE_PUBLIC_ACCOUNT/);
 assert.throws(()=>validateWalletReadiness({...m,accounts:[{...m.accounts[0],private_key:'fake'}]}),/WALLET_ACCOUNT_INVALID/);
});
