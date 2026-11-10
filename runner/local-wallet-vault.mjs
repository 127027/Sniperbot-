// Local self-custody wallet INITIALIZATION and portable backup. No signer, no
// transaction broadcast, no balances or payment processing. All private
// material is encrypted under the Windows user's DPAPI scope on the same PC.
// Base/Ethereum/BNB share one EVM private key. Solana uses a separate Ed25519 key.
import {spawn} from 'node:child_process';
import {randomBytes,generateKeyPairSync,createPrivateKey,createPublicKey,
 scryptSync,createCipheriv,createDecipheriv} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,unlink,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const prefix=Buffer.from('302a300506032b6570032100','hex');
const b58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const keydir=d=>path.join(d,'secrets');
const cipherfile=d=>path.join(keydir(d),'wallet-v1.dpapi');
const metafile=d=>path.join(keydir(d),'wallet-public-v1.json');
const validDir=d=>{if(typeof d!=='string'||!path.isAbsolute(d))throw Error('WALLET_DIRECTORY_REQUIRED');return d};
function base58(bytes){
 let n=BigInt('0x'+Buffer.from(bytes).toString('hex')),out='';
 while(n){out=b58[Number(n%58n)]+out;n/=58n}
 for(const b of bytes){if(b!==0)break;out='1'+out}
 return out||'1';
}
async function ps(mode,input){
 if(process.platform!=='win32')throw Error('WINDOWS_DPAPI_REQUIRED');
 return new Promise((resolve,reject)=>{
  const processChild=spawn('powershell.exe',['-NoLogo','-NoProfile',
   '-NonInteractive','-ExecutionPolicy','Bypass','-File',
   path.join(root,'wallet-dpapi.ps1'),'-Mode',mode],
   {stdio:['pipe','pipe','pipe'],windowsHide:true});
  let out='',total=0,failed=false;
  processChild.on('error',()=>{failed=true;reject(Error('WINDOWS_DPAPI_UNAVAILABLE'))});
  processChild.stdout.on('data',b=>{total+=b.length;
   if(total>16000){failed=true;processChild.kill();return}
   out+=b.toString('utf8');
  });
  // Never collect/log PowerShell stderr, which might contain sensitive material.
  processChild.stderr.resume();
  processChild.on('close',code=>{
   if(failed)return;
   if(code!==0||!out||out.length>16000)return reject(Error('WINDOWS_DPAPI_FAILED'));
   resolve(out.trim());
  });
  processChild.stdin.end(input,'utf8');
 });
}
async function metadata(dir){
 const dpapi=cipherfile(dir),publicFile=metafile(dir);
 let secretExists=false,metaExists=false;
 try{await stat(dpapi);secretExists=true}catch(e){if(e.code!=='ENOENT')throw e}
 try{await stat(publicFile);metaExists=true}catch(e){if(e.code!=='ENOENT')throw e}
 if(secretExists!==metaExists)throw Error('WALLET_INCOMPLETE_REQUIRES_RECOVERY');
 if(!secretExists)return null;
 const m=JSON.parse(await readFile(publicFile,'utf8'));
 if(m?.schema!=='local_wallet_public.v1'||m.local_only!==true||
  !/^0x[0-9a-fA-F]{40}$/.test(m.evm_address)||
  !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(m.solana_address))
  throw Error('WALLET_PUBLIC_METADATA_INVALID');
 return m;
}
export async function getLocalWalletStatus({dir}={}){
 validDir(dir);
 const m=await metadata(dir);
 return {schema:'local_wallet_status.v1',created:!!m,
  self_custody:true,local_dpapi_encrypted:!!m,
  live_trading_enabled:false,signing_api_enabled:false,
  payment_provider_connected:false,backup_recommended:!!m,
  addresses:m?{solana:m.solana_address,
   ethereum:m.evm_address,base:m.evm_address,bsc:m.evm_address}:null,
  created_at_utc:m?.created_at_utc||null};
}
async function saveNewWallet(dir,privateJSON,publicMeta,protector){
 if(await metadata(dir))throw Error('WALLET_ALREADY_EXISTS');
 const folder=keydir(dir);
 await mkdir(folder,{recursive:true,mode:0o700});
 const protectedData=await protector('protect',privateJSON);
 if(typeof protectedData!=='string'||!/^[A-Za-z0-9+/=]{40,16000}$/.test(protectedData))
  throw Error('WALLET_DPAPI_OUTPUT_INVALID');
 // On partial failure fail-closed: secret must never be silently overwritten.
 const target=cipherfile(dir);
 await writeFile(target,protectedData+'\n',{flag:'wx',mode:0o600,flush:true});
 try{await writeFile(metafile(dir),JSON.stringify(publicMeta)+'\n',
  {flag:'wx',mode:0o600,flush:true})}
 catch(e){throw Error('WALLET_INCOMPLETE_REQUIRES_RECOVERY')}
 return getLocalWalletStatus({dir});
}
function solAddress(publicDer){
 const b=Buffer.from(publicDer);
 if(b.length!==prefix.length+32||!b.subarray(0,prefix.length).equals(prefix))
  throw Error('INVALID_ED25519_PUBLIC_KEY');
 return base58(b.subarray(prefix.length));
}
async function parsePrivate(text){
 const secrets=JSON.parse(text);
 if(secrets?.schema!=='local_wallet_private.v1'||
  typeof secrets.evm_private_key!=='string'||typeof secrets.solana_private_key_pkcs8_base64!=='string')
  throw Error('INVALID_WALLET_PRIVATE_FORMAT');
 const {Wallet}=await import('ethers');
 const evm=new Wallet(secrets.evm_private_key);
 const sol=solAddress(createPublicKey(createPrivateKey({
  key:Buffer.from(secrets.solana_private_key_pkcs8_base64,'base64'),format:'der',type:'pkcs8'
 })).export({format:'der',type:'spki'}));
 return {evm:evm.address,sol};
}
export async function createLocalWallet({dir,protector=ps,platform=process.platform}={}){
 validDir(dir);
 if(platform!=='win32'&&protector===ps)throw Error('WINDOWS_DPAPI_REQUIRED');
 if(await metadata(dir))throw Error('WALLET_ALREADY_EXISTS');
 const {Wallet}=await import('ethers');
 const evm=Wallet.createRandom();
 const sol=generateKeyPairSync('ed25519');
 const solPub=solAddress(sol.publicKey.export({format:'der',type:'spki'}));
 const privateJSON=JSON.stringify({
  schema:'local_wallet_private.v1',evm_private_key:evm.privateKey,
  solana_private_key_pkcs8_base64:sol.privateKey.export({format:'der',type:'pkcs8'}).toString('base64')
 });
 const publicMeta={schema:'local_wallet_public.v1',local_only:true,
  created_at_utc:new Date().toISOString(),evm_address:evm.address,solana_address:solPub};
 return saveNewWallet(dir,privateJSON,publicMeta,protector);
}
const backupPass=p=>typeof p==='string'&&p.length>=16&&p.length<=256;
export async function exportLocalWalletBackup({dir,passphrase,protector=ps}={}){
 validDir(dir);if(!backupPass(passphrase))throw Error('BACKUP_PASSPHRASE_TOO_WEAK');
 const meta=await metadata(dir);if(!meta)throw Error('WALLET_NOT_CREATED');
 const blob=await readFile(cipherfile(dir),'utf8');
 const clear=await protector('unprotect',blob.trim());
 const keys=await parsePrivate(clear);
 if(keys.evm.toLowerCase()!==meta.evm_address.toLowerCase()||
  keys.sol!==meta.solana_address)throw Error('WALLET_BACKUP_IDENTITY_MISMATCH');
 const salt=randomBytes(16),nonce=randomBytes(12),key=scryptSync(passphrase,salt,32,{
  N:32768,r:8,p:1,maxmem:64*1024*1024});
 const cipher=createCipheriv('aes-256-gcm',key,nonce);
 const encrypted=Buffer.concat([cipher.update(clear,'utf8'),cipher.final()]);
 const backup={schema:'portable_wallet_backup.v1',kdf:'scrypt-N32768-r8-p1',
  cipher:'AES-256-GCM',salt:salt.toString('base64'),nonce:nonce.toString('base64'),
  tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64'),
  addresses:{evm:meta.evm_address,solana:meta.solana_address}};
 key.fill(0);
 return backup;
}
export async function restoreLocalWalletBackup({dir,passphrase,backup,protector=ps}={}){
 validDir(dir);if(!backupPass(passphrase))throw Error('BACKUP_PASSPHRASE_TOO_WEAK');
 if(await metadata(dir))throw Error('WALLET_ALREADY_EXISTS');
 if(backup?.schema!=='portable_wallet_backup.v1'||backup.kdf!=='scrypt-N32768-r8-p1'||
  backup.cipher!=='AES-256-GCM'||typeof backup.ciphertext!=='string'||
  backup.ciphertext.length>8192)throw Error('BACKUP_FORMAT_INVALID');
 const decode=(v,n)=>{
  if(typeof v!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(v))throw Error('BACKUP_FORMAT_INVALID');
  const b=Buffer.from(v,'base64');
  if(n&&b.length!==n||b.toString('base64')!==v)throw Error('BACKUP_FORMAT_INVALID');
  return b;
 };
 const salt=decode(backup.salt,16),nonce=decode(backup.nonce,12),tag=decode(backup.tag,16);
 const payload=decode(backup.ciphertext);
 const key=scryptSync(passphrase,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});
 let clear;
 try{
  const decipher=createDecipheriv('aes-256-gcm',key,nonce);decipher.setAuthTag(tag);
  clear=Buffer.concat([decipher.update(payload),decipher.final()]).toString('utf8');
 }catch{throw Error('BACKUP_PASSWORD_OR_INTEGRITY_INVALID')}
 finally{key.fill(0)}
 const keys=await parsePrivate(clear);
 if(keys.evm.toLowerCase()!==backup.addresses?.evm?.toLowerCase()||
   keys.sol!==backup.addresses?.solana)throw Error('BACKUP_ADDRESS_MISMATCH');
 const m={schema:'local_wallet_public.v1',local_only:true,created_at_utc:new Date().toISOString(),
  evm_address:keys.evm,solana_address:keys.sol};
 return saveNewWallet(dir,clear,m,protector);
}
