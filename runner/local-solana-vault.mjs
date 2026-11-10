// Local self-custody Solana vault (Node built-in Ed25519, scrypt, AES-256-GCM).
// Wallet is created ONLY on the user's device upon deliberate button click.
// No keys/seeds/signatures are returned via HTTP, GitHub or research channels.
// No transaction signing or broadcasting endpoint exists in this module.
import {generateKeyPairSync,createPrivateKey,createPublicKey,randomBytes,
 createCipheriv,createDecipheriv,scrypt,createHash,sign,verify} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile,open,unlink} from 'node:fs/promises';
import path from 'node:path';

const derive=promisify(scrypt);
const SCHEMA='local_solana_encrypted_vault.v1';
const SPKI_PREFIX=Buffer.from('302a300506032b6570032100','hex');
const ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const PARAMS=Object.freeze({N:32768,r:8,p:1});
const MAX_VAULT=4096;

export function encodeBase58(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length===0)throw Error('INVALID_BASE58_INPUT');
 let n=BigInt('0x'+buffer.toString('hex'));
 let out='';
 while(n>0n){const rem=Number(n%58n);out=ALPHABET[rem]+out;n/=58n}
 let zero=0;while(zero<buffer.length&&buffer[zero]===0)zero++;
 return '1'.repeat(zero)+out;
}
export function decodeBase58(value){
 if(typeof value!=='string'||value.length<32||value.length>44)throw Error('INVALID_SOLANA_ADDRESS');
 let n=0n;for(const c of value){
  const digit=ALPHABET.indexOf(c);
  if(digit===-1)throw Error('INVALID_SOLANA_ADDRESS');
  n=n*58n+BigInt(digit);
 }
 let h=n.toString(16);if(h.length%2)h='0'+h;
 const bin=n===0n?Buffer.alloc(0):Buffer.from(h,'hex');
 const zero=value.match(/^1*/)[0].length;
 const out=Buffer.concat([Buffer.alloc(zero),bin]);
 if(out.length!==32||encodeBase58(out)!==value)throw Error('INVALID_SOLANA_ADDRESS');
 return out;
}
function addressFor(key){
 const spki=key.export({format:'der',type:'spki'});
 if(spki.length!==44||!spki.subarray(0,12).equals(SPKI_PREFIX))
  throw Error('UNKNOWN_SOLANA_PUBLIC_KEY_FORMAT');
 return encodeBase58(spki.subarray(12));
}
function passwordCheck(p){
 if(typeof p!=='string'||p.length<16||p.length>256||
  Buffer.byteLength(p,'utf8')>512)throw Error('WALLET_PASSWORD_MIN_16_CHARACTERS');
 return p;
}
function aad(x){return Buffer.from(SCHEMA+'|'+x.address+'|'+x.created_at_utc)}
function validVault(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||
  Object.keys(v).sort().join(',')!=='address,cipher,created_at_utc,kdf,network,schema'||
  v.schema!==SCHEMA||v.network!=='solana-mainnet'||
  !Number.isFinite(Date.parse(v.created_at_utc)))throw Error('INVALID_WALLET_VAULT');
 decodeBase58(v.address);
 if(!v.kdf||Object.keys(v.kdf).sort().join(',')!=='N,p,r,salt'||
  v.kdf.N!==PARAMS.N||v.kdf.p!==PARAMS.p||v.kdf.r!==PARAMS.r||
  typeof v.kdf.salt!=='string'||Buffer.from(v.kdf.salt,'base64').length!==16)
  throw Error('INVALID_WALLET_KDF');
 if(!v.cipher||Object.keys(v.cipher).sort().join(',')!=='ciphertext,iv,tag'||
  typeof v.cipher.ciphertext!=='string'||
  Buffer.from(v.cipher.iv,'base64').length!==12||
  Buffer.from(v.cipher.tag,'base64').length!==16||
  Buffer.from(v.cipher.ciphertext,'base64').length<48)
  throw Error('INVALID_WALLET_CIPHER');
 return v;
}
async function keyFor(password,salt){
 return derive(Buffer.from(password,'utf8'),salt,32,{...PARAMS,maxmem:128*1024*1024});
}
export async function createLocalSolanaVault({filename,password,now=new Date()}={}){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!filename.endsWith('.json'))
  throw Error('INVALID_WALLET_LOCATION');
 passwordCheck(password);
 if(!Number.isFinite(new Date(now).getTime()))throw Error('INVALID_WALLET_TIME');
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const address=addressFor(publicKey),created_at_utc=new Date(now).toISOString();
 const salt=randomBytes(16),iv=randomBytes(12);
 const secret=privateKey.export({format:'der',type:'pkcs8'});
 const key=await keyFor(password,salt);
 const meta={schema:SCHEMA,network:'solana-mainnet',address,created_at_utc};
 try{
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(aad(meta));
  const ciphertext=Buffer.concat([cipher.update(secret),cipher.final()]);
  const tag=cipher.getAuthTag();
  const record={...meta,kdf:{...PARAMS,salt:salt.toString('base64')},
   cipher:{iv:iv.toString('base64'),tag:tag.toString('base64'),
    ciphertext:ciphertext.toString('base64')}};
  validVault(record);
  await mkdir(path.dirname(filename),{recursive:true});
  // 'wx' refuses to replace an existing wallet, even after a crash.
  const handle=await open(filename,'wx',0o600);
  try{await handle.writeFile(JSON.stringify(record)+'\n');await handle.sync()}
  finally{await handle.close()}
  return {created:true,address,network:'solana-mainnet',encrypted:true,
   signing_enabled:false,live_trading_enabled:false,
   instruction:'Sichern Sie die verschlüsselte Vault-Datei und das Passwort getrennt offline. Kein Passwort-Reset möglich.'};
 }finally{secret.fill(0);key.fill(0)}
}
export async function readLocalSolanaVault(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('INVALID_WALLET_LOCATION');
 try{
  const raw=await readFile(filename);
  if(raw.length>MAX_VAULT)throw Error('WALLET_FILE_TOO_LARGE');
  const v=validVault(JSON.parse(raw.toString('utf8')));
  return {exists:true,address:v.address,network:v.network,created_at_utc:v.created_at_utc,
   encrypted:true,signing_enabled:false,live_trading_enabled:false};
 }catch(e){if(e?.code==='ENOENT')return {exists:false,network:'solana-mainnet',
   address:null,encrypted:false,signing_enabled:false,live_trading_enabled:false};throw e}
}
export async function checkSolanaVaultPassword({filename,password}={}){
 passwordCheck(password);
 const raw=await readFile(filename);
 if(raw.length>MAX_VAULT)throw Error('WALLET_FILE_TOO_LARGE');
 const v=validVault(JSON.parse(raw.toString('utf8')));
 const key=await keyFor(password,Buffer.from(v.kdf.salt,'base64'));
 let secret;
 try{
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(v.cipher.iv,'base64'));
  decipher.setAAD(aad(v));decipher.setAuthTag(Buffer.from(v.cipher.tag,'base64'));
  secret=Buffer.concat([decipher.update(Buffer.from(v.cipher.ciphertext,'base64')),decipher.final()]);
  const privateKey=createPrivateKey({key:secret,format:'der',type:'pkcs8'});
  if(privateKey.asymmetricKeyType!=='ed25519'||addressFor(createPublicKey(privateKey))!==v.address)
   throw Error('INVALID_WALLET_IDENTITY');
  const proof=randomBytes(32);
  const sig=sign(null,proof,privateKey);
  if(!verify(null,proof,createPublicKey(privateKey),sig))throw Error('INVALID_WALLET_IDENTITY');
  return {unlocked_for_verification:true,address:v.address,
   signing_enabled:false,live_trading_enabled:false};
 }catch{throw Error('WALLET_PASSWORD_OR_INTEGRITY_FAILED')}
 finally{key.fill(0);secret?.fill(0)}
}

// A user-initiated encrypted backup is a copy of ciphertext only, not a seed export.
// Never auto-sync the backup or send it to GitHub, dots or payment services.
export async function encryptedSolanaBackup(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('INVALID_WALLET_LOCATION');
 const raw=await readFile(filename);
 if(raw.length>MAX_VAULT)throw Error('WALLET_FILE_TOO_LARGE');
 return validVault(JSON.parse(raw.toString('utf8')));
}
async function validateProvidedEncryptedBackup({filename,record,password}){
 passwordCheck(password);
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!filename.endsWith('.json'))
  throw Error('INVALID_WALLET_LOCATION');
 const json=JSON.stringify(record)+'\n';
 if(Buffer.byteLength(json,'utf8')>MAX_VAULT)throw Error('WALLET_FILE_TOO_LARGE');
 const payload=validVault(JSON.parse(json));
 await mkdir(path.dirname(filename),{recursive:true});
 const temp=filename+'.backup-verify-'+randomBytes(8).toString('hex');
 try{
  await writeFile(temp,json,{flag:'wx',mode:0o600});
  const verified=await checkSolanaVaultPassword({filename:temp,password});
  if(verified.address!==payload.address)throw Error('INVALID_BACKUP_ADDRESS');
  return {json,address:payload.address};
 }finally{await unlink(temp).catch(()=>{})}
}
export async function verifyEncryptedSolanaBackup({filename,record,password}={}){
 const checked=await validateProvidedEncryptedBackup({filename,record,password});
 return {valid:true,address:checked.address,
  encrypted:true,restored:false,private_key_exposed:false};
}
export async function restoreEncryptedSolanaBackup({filename,record,password}={}){
 const checked=await validateProvidedEncryptedBackup({filename,record,password});
 // Exclusive create: refuses overwriting an already funded wallet.
 const f=await open(filename,'wx',0o600);
 try{await f.writeFile(checked.json);await f.sync()}
 finally{await f.close()}
 return {restored:true,address:checked.address,
  encrypted:true,signing_enabled:false,live_trading_enabled:false};
}

// Single-purpose LOCAL SOL send signer. Never accepts arbitrary instructions,
// program IDs, a user-supplied transaction or a wallet-exposure request.
// The calling server must perform explicit user confirmation and fee checks.
const SYSTEM_PROGRAM=Buffer.alloc(32);
const TRANSFER_LIMIT=2_000_000_000n; // deliberate per-transfer 2 SOL beta ceiling
function checkedNativeTransfer({destination,amountLamports,blockhash,source}={}){
 const from=decodeBase58(source),to=decodeBase58(destination),block=decodeBase58(blockhash);
 if(from.equals(to))throw Error('SENDER_AND_DESTINATION_IDENTICAL');
 if(to.equals(SYSTEM_PROGRAM))throw Error('SYSTEM_PROGRAM_CANNOT_BE_RECIPIENT');
 if(typeof amountLamports!=='string'||!/^[1-9][0-9]{0,18}$/.test(amountLamports))
  throw Error('INVALID_LAMPORT_AMOUNT');
 const n=BigInt(amountLamports);
 if(n<10000n||n>TRANSFER_LIMIT)throw Error('TRANSFER_OUTSIDE_BETA_LIMIT');
 const payload=Buffer.alloc(12);
 payload.writeUInt32LE(2,0); // Solana SystemProgram::Transfer
 payload.writeBigUInt64LE(n,4);
 const message=Buffer.concat([
  Buffer.from([1,0,1,3]), // 1 writable signer, 1 readonly non-signer
  from,to,SYSTEM_PROGRAM,block,
  Buffer.from([1,2,2,0,1,12]),payload
 ]);
 return {message,from};
}
export function createUnsignedSolanaTransferMessage(args){
 return checkedNativeTransfer(args).message;
}
export async function signLocalSolanaSystemTransfer({
 filename,password,destination,amountLamports,blockhash
}={}){
 passwordCheck(password);
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('INVALID_WALLET_LOCATION');
 const raw=await readFile(filename);
 if(raw.length>MAX_VAULT)throw Error('WALLET_FILE_TOO_LARGE');
 const v=validVault(JSON.parse(raw.toString('utf8')));
 const {message,from}=checkedNativeTransfer({
  destination,amountLamports,blockhash,source:v.address
 });
 const key=await keyFor(password,Buffer.from(v.kdf.salt,'base64'));
 let secret;
 try{
  const decrypt=createDecipheriv('aes-256-gcm',key,Buffer.from(v.cipher.iv,'base64'));
  decrypt.setAAD(aad(v));
  decrypt.setAuthTag(Buffer.from(v.cipher.tag,'base64'));
  secret=Buffer.concat([
   decrypt.update(Buffer.from(v.cipher.ciphertext,'base64')),decrypt.final()
  ]);
  const priv=createPrivateKey({format:'der',type:'pkcs8',key:secret});
  if(priv.asymmetricKeyType!=='ed25519'||addressFor(createPublicKey(priv))!==v.address)
   throw Error('WALLET_IDENTITY_MISMATCH');
  const signed=sign(null,message,priv);
  if(signed.length!==64||!verify(null,message,createPublicKey(priv),signed))
   throw Error('INVALID_LOCAL_SIGNATURE');
  const transaction=Buffer.concat([Buffer.from([1]),signed,message]);
  if(transaction.length>1232)throw Error('SOLANA_PACKET_TOO_LARGE');
  return {schema:'local_signed_system_sol_transfer.v1',
   from:v.address,to:destination,lamports:amountLamports,
   signature:encodeBase58(signed),
   signed_transaction_base64:transaction.toString('base64'),
   network:'solana-mainnet',program:'SYSTEM_PROGRAM_TRANSFER_ONLY',
   secret_exported:false};
 }catch{throw Error('WALLET_PASSWORD_OR_TRANSFER_SIGNING_FAILED')}
 finally{key.fill(0);secret?.fill(0)}
}
