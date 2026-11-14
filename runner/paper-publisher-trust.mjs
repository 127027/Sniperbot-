// Explicit local Paper-only trust enrollment for Ed25519 agent publishers.
// Stores PUBLIC keys only. No private key/seed, secret, wallet access or live
// trading capability is involved. Caller must be a local user gesture.
import {createPublicKey,createHash,randomBytes} from 'node:crypto';
import {readFile,mkdir,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
const ID=/^[a-zA-Z0-9_.-]{3,80}$/;
const MAX_BYTES=32768,MAX_KEYS=20;
export async function enrollPaperPublisherPublicKey({filename,issuer,keyId,publicKeyPem}={}){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!filename.endsWith('.json')||
  !ID.test(issuer||'')||!ID.test(keyId||'')||
  typeof publicKeyPem!=='string'||publicKeyPem.length>2000||
  !/^-----BEGIN PUBLIC KEY-----\s/.test(publicKeyPem.trim())||
  !/-----END PUBLIC KEY-----\s*$/.test(publicKeyPem))
  throw Error('INVALID_PAPER_PUBLISHER_REQUEST');
 let key;
 try{key=createPublicKey(publicKeyPem)}
 catch{throw Error('INVALID_ED25519_PUBLIC_KEY')}
 if(key.asymmetricKeyType!=='ed25519')throw Error('NOT_AN_ED25519_PUBLIC_KEY');
 const normalized=key.export({type:'spki',format:'pem'});
 const fingerprint=createHash('sha256').update(normalized).digest('hex');
 let registry=[];
 try{
  const bytes=await readFile(filename);
  if(bytes.length>MAX_BYTES)throw Error('PUBLISHER_REGISTRY_TOO_LARGE');
  registry=JSON.parse(bytes.toString('utf8'));
 }catch(e){if(e.code!=='ENOENT')throw e}
 if(!Array.isArray(registry)||registry.length>=MAX_KEYS)
  throw Error('PUBLISHER_REGISTRY_INVALID_OR_FULL');
 if(registry.some(k=>k.issuer===issuer&&k.key_id===keyId))
  throw Error('PUBLISHER_ALREADY_REGISTERED');
 if(registry.some(k=>k.public_key_pem===normalized))
  throw Error('PUBLISHER_PUBLIC_KEY_ALREADY_TRUSTED');
 const next=[...registry,{issuer,key_id:keyId,scope:'agent_execution',
  public_key_pem:normalized,revoked:false}];
 const bytes=Buffer.from(JSON.stringify(next,null,2)+'\n');
 if(bytes.length>MAX_BYTES)throw Error('PUBLISHER_REGISTRY_TOO_LARGE');
 await mkdir(path.dirname(filename),{recursive:true});
 const temporary=filename+'.tmp-'+randomBytes(8).toString('hex');
 try{
  await writeFile(temporary,bytes,{flag:'wx',mode:0o600});
  await rename(temporary,filename);
 }finally{await unlink(temporary).catch(()=>{})}
 return {issuer,key_id:keyId,scope:'agent_execution',
  public_key_fingerprint_sha256:fingerprint,private_key_received:false,
  live_trading_enabled:false,registered:true};
}
