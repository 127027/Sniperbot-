import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createLocalWallet,getLocalWalletStatus,exportLocalWalletBackup,
 restoreLocalWalletBackup} from './local-wallet-vault.mjs';
const fakeProtector=async(mode,input)=>{
 if(mode==='protect')return Buffer.from(input).toString('base64');
 if(mode==='unprotect')return Buffer.from(input,'base64').toString('utf8');
 throw Error('BAD_MOCK_MODE');
};
test('two-chain public wallet creation is local only and never returns secrets',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-wallet-test-'));
 try{
  const status=await createLocalWallet({dir,protector:fakeProtector});
  assert.equal(status.created,true);
  assert.match(status.addresses.ethereum,/^0x[a-fA-F0-9]{40}$/);
  assert.match(status.addresses.solana,/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  assert.equal(status.addresses.ethereum,status.addresses.base);
  assert.equal(status.addresses.ethereum,status.addresses.bsc);
  assert.equal(status.signing_api_enabled,false);
  assert.equal(status.live_trading_enabled,false);
  const pub=await readFile(path.join(dir,'secrets','wallet-public-v1.json'),'utf8');
  assert(!pub.includes('evm_private_key'));
  assert(!pub.includes('solana_private_key_pkcs8_base64'));
  assert.deepEqual(await getLocalWalletStatus({dir}),status);
  await assert.rejects(createLocalWallet({dir,protector:fakeProtector}),/WALLET_ALREADY_EXISTS/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('portable encrypted backup can restore identical public addresses',async()=>{
 const d1=await mkdtemp(path.join(os.tmpdir(),'sniper-wallet-export-'));
 const d2=await mkdtemp(path.join(os.tmpdir(),'sniper-wallet-restore-'));
 try{
  const old=await createLocalWallet({dir:d1,protector:fakeProtector});
  const backup=await exportLocalWalletBackup({dir:d1,passphrase:'long-protective-password-2026',
   protector:fakeProtector});
  assert.equal(backup.schema,'portable_wallet_backup.v1');
  assert(!JSON.stringify(backup).includes('evm_private_key'));
  await assert.rejects(restoreLocalWalletBackup({dir:d2,passphrase:'wrong-password-2026',
   backup,protector:fakeProtector}),/BACKUP_PASSWORD_OR_INTEGRITY_INVALID/);
  const restored=await restoreLocalWalletBackup({dir:d2,passphrase:'long-protective-password-2026',
   backup,protector:fakeProtector});
  assert.deepEqual(restored.addresses,old.addresses);
  await assert.rejects(restoreLocalWalletBackup({dir:d2,passphrase:'long-protective-password-2026',
   backup,protector:fakeProtector}),/WALLET_ALREADY_EXISTS/);
 }finally{await rm(d1,{recursive:true,force:true});await rm(d2,{recursive:true,force:true})}
});
test('no password, malformed backups and one-sided partial vault fail closed',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-wallet-corrupt-'));
 try{
  assert.equal((await getLocalWalletStatus({dir})).created,false);
  await assert.rejects(exportLocalWalletBackup({dir,passphrase:'short'}),/BACKUP_PASSPHRASE_TOO_WEAK/);
  await assert.rejects(restoreLocalWalletBackup({dir,passphrase:'long-passphrase-over-16',backup:{}}),
   /BACKUP_FORMAT_INVALID/);
  const folder=path.join(dir,'secrets');
  const {mkdir,writeFile}=await import('node:fs/promises');
  await mkdir(folder);
  await writeFile(path.join(folder,'wallet-v1.dpapi'),'fake-ciphertext');
  await assert.rejects(getLocalWalletStatus({dir}),/WALLET_INCOMPLETE_REQUIRES_RECOVERY/);
  await assert.rejects(createLocalWallet({dir,protector:fakeProtector}),
   /WALLET_INCOMPLETE_REQUIRES_RECOVERY/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
