// Master coordination key (NOT a crypto wallet key). It signs short-lived
// public GitHub presence. PKCS8 is encrypted with a user-chosen passphrase
// and NEVER written unencrypted or sent to GitHub/follower devices.
import {generateKeyPairSync,createPrivateKey,createPublicKey,sign,verify,randomBytes} from 'node:crypto';
import {mkdir,open,readFile} from 'node:fs/promises';
import path from 'node:path';
import {decodeBase58} from './local-solana-vault.mjs';
const MIN=16,MAX=256;
function checkPassphrase(passphrase){
 if(typeof passphrase!=='string'||passphrase.length<MIN||passphrase.length>MAX||
  Buffer.byteLength(passphrase,'utf8')>512)throw Error('MASTER_PASSPHRASE_MIN_16');
}
function checkFolder(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder))throw Error('INVALID_COORDINATION_PATH');
}
const files=folder=>({
 privateFile:path.join(folder,'master-signing-private.encrypted.pem'),
 publicFile:path.join(folder,'master-signing-public.pem')
});
export async function createMasterCoordinationKey({folder,passphrase}={}){
 checkFolder(folder);checkPassphrase(passphrase);
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 // OpenSSL PKCS8 uses PBES2/PBKDF; protect passphrase offline as with any hot key.
 const privatePem=privateKey.export({type:'pkcs8',format:'pem',
  cipher:'aes-256-cbc',passphrase});
 const publicPem=publicKey.export({type:'spki',format:'pem'});
 await mkdir(folder,{recursive:true});
 const f=files(folder);
 // Both filenames are exclusive: no master key rotation without a separate
 // explicit migration procedure. Never overwrite a possibly funded ecosystem.
 const handle=await open(f.privateFile,'wx',0o600);
 try{
  await handle.writeFile(privatePem);
  await handle.sync();
 }finally{await handle.close()}
 const publicHandle=await open(f.publicFile,'wx',0o600);
 try{await publicHandle.writeFile(publicPem);await publicHandle.sync()}
 finally{await publicHandle.close()}
 return {initialized:true,master_public_key_pem:publicPem,
  private_key_encrypted:true,local_only:true,
  wallet_keys_separate:true,github_published:false};
}
export async function getMasterCoordinationPublicKey(folder){
 checkFolder(folder);
 const s=await readFile(files(folder).publicFile,'utf8');
 const key=createPublicKey(s);
 if(key.asymmetricKeyType!=='ed25519')throw Error('INVALID_MASTER_PUBLIC_SIGNER');
 return s;
}
export async function unlockMasterCoordinationKey({folder,passphrase}={}){
 checkFolder(folder);checkPassphrase(passphrase);
 const content=await readFile(files(folder).privateFile,'utf8');
 if(content.length>4096||!content.includes('ENCRYPTED PRIVATE KEY'))
  throw Error('INVALID_MASTER_SIGNING_KEY');
 let privateKey;
 try{privateKey=createPrivateKey({key:content,format:'pem',passphrase})}
 catch{throw Error('MASTER_PASSPHRASE_OR_KEY_INTEGRITY_FAILED')}
 const publicPem=await getMasterCoordinationPublicKey(folder);
 const generated=createPublicKey(privateKey).export({type:'spki',format:'pem'});
 if(generated!==publicPem)throw Error('MASTER_KEYPAIR_MISMATCH');
 const proof=randomBytes(32),signature=sign(null,proof,privateKey);
 if(!verify(null,proof,createPublicKey(publicPem),signature))
  throw Error('MASTER_SIGNING_KEY_NOT_USABLE');
 return privateKey; // caller retains key only in memory while visible bot runs
}
