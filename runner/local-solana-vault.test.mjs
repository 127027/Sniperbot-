import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {createLocalSolanaVault,readLocalSolanaVault,
 checkSolanaVaultPassword,encodeBase58,decodeBase58,
 encryptedSolanaBackup,verifyEncryptedSolanaBackup,restoreEncryptedSolanaBackup} from './local-solana-vault.mjs';
const PASS='very-long-test-only-password-1234567';
test('actual Solana address is losslessly encoded as 32 bytes',()=>{
 const bytes=Buffer.alloc(32);bytes[31]=1;
 assert.equal(decodeBase58(encodeBase58(bytes)).toString('hex'),bytes.toString('hex'));
 assert.equal(encodeBase58(Buffer.alloc(32)),'1'.repeat(32));
 assert.throws(()=>decodeBase58('https://evil'),/INVALID_SOLANA_ADDRESS/);
});
test('one encrypted on-device Solana wallet; right password verifies Ed25519 identity and wrong refuses',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-sol-vault-'));const filename=path.join(dir,'local.json');
 try{
  assert.equal((await readLocalSolanaVault(filename)).exists,false);
  const x=await createLocalSolanaVault({filename,password:PASS});
  assert.equal(x.created,true);assert.equal(x.encrypted,true);assert.equal(x.signing_enabled,false);
  assert.equal(decodeBase58(x.address).length,32);
  const raw=await readFile(filename,'utf8');
  assert(!raw.includes(PASS));
  assert(!raw.includes('privateKey'));
  assert(!raw.includes('private_key'));
  assert.equal((await readLocalSolanaVault(filename)).address,x.address);
  const check=await checkSolanaVaultPassword({filename,password:PASS});
  assert.equal(check.unlocked_for_verification,true);
  assert.equal(check.address,x.address);
  await assert.rejects(checkSolanaVaultPassword({filename,password:PASS+'!'}),/PASSWORD_OR_INTEGRITY_FAILED/);
  await assert.rejects(createLocalSolanaVault({filename,password:PASS}),x=>x.code==='EEXIST');
  assert.equal((await readLocalSolanaVault(filename)).address,x.address);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('malformed encrypted file is not silently replaced or misreported as new',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-corrupt-sol-vault-'));const filename=path.join(dir,'vault.json');
 try{
  await writeFile(filename,'{BROKEN');
  await assert.rejects(readLocalSolanaVault(filename),SyntaxError);
  await assert.rejects(createLocalSolanaVault({filename,password:PASS}),x=>x.code==='EEXIST');
  assert.equal(await readFile(filename,'utf8'),'{BROKEN');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('short/invalid password refuses key generation; wrong identity or modified tag fails closed',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-tamper-sol-vault-'));const filename=path.join(dir,'vault.json');
 try{
  await assert.rejects(createLocalSolanaVault({filename,password:'123'}),/MIN_16/);
  await createLocalSolanaVault({filename,password:PASS});
  const record=JSON.parse(await readFile(filename,'utf8'));
  record.address=encodeBase58(Buffer.alloc(32,2));
  await writeFile(filename,JSON.stringify(record));
  await assert.rejects(checkSolanaVaultPassword({filename,password:PASS}),/PASSWORD_OR_INTEGRITY_FAILED/);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('encrypted wallet backup restores identical Solana address into a fresh installation',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-sol-backup-'));
 const first=path.join(dir,'first','vault.json');
 const replacement=path.join(dir,'replacement','vault.json');
 try{
  const created=await createLocalSolanaVault({filename:first,password:PASS});
  const sealed=await encryptedSolanaBackup(first);
  const check=await verifyEncryptedSolanaBackup({filename:first,record:sealed,password:PASS});
  assert.equal(check.valid,true);
  assert.equal(check.address,created.address);
  assert.equal(check.private_key_exposed,false);
  const restored=await restoreEncryptedSolanaBackup({filename:replacement,record:sealed,password:PASS});
  assert.equal(restored.restored,true);
  assert.equal(restored.address,created.address);
  assert.equal((await readLocalSolanaVault(replacement)).address,created.address);
  assert.equal((await checkSolanaVaultPassword({filename:replacement,password:PASS})).address,created.address);
  await assert.rejects(restoreEncryptedSolanaBackup({filename:replacement,record:sealed,password:PASS}),
   e=>e.code==='EEXIST');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('wrong password or modified encrypted backup cannot replace wallet',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-bad-backup-'));
 const first=path.join(dir,'original.json'),replacement=path.join(dir,'restored.json');
 try{
  await createLocalSolanaVault({filename:first,password:PASS});
  const sealed=await encryptedSolanaBackup(first);
  await assert.rejects(restoreEncryptedSolanaBackup({filename:replacement,record:sealed,password:PASS+'!'}),
   /PASSWORD_OR_INTEGRITY_FAILED/);
  assert.equal((await readLocalSolanaVault(replacement)).exists,false);
  const changed={...sealed,cipher:{...sealed.cipher,tag:Buffer.alloc(16).toString('base64')}};
  await assert.rejects(restoreEncryptedSolanaBackup({filename:replacement,record:changed,password:PASS}),
   /PASSWORD_OR_INTEGRITY_FAILED/);
  assert.equal((await readLocalSolanaVault(replacement)).exists,false);
 }finally{await rm(dir,{recursive:true,force:true})}
});
