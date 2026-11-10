// Master/follower topology for independent installations.
// GitHub transports data, but it is NOT real-time proof that a laptop is on.
// Follower trading always stays blocked until a separate fresh online handshake
// exists and a production executor has been independently audited.
import {createPublicKey,createPrivateKey,sign,verify,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';

const DEVICE=/^device_[0-9a-f]{32}$/;
export const PRESENCE_SCHEMA='sniper_master_presence.v1';
export const CONFIG_SCHEMA='sniper_device_topology.v1';
export const PRESENCE_DOMAIN='MemeSniper/master_presence.v1\n';
const required=['schema','master_device_id','sequence','issued_at_utc',
 'expires_at_utc','state','signature'];
function canonical(x){
 if(x===null||typeof x!=='object')return JSON.stringify(x);
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
}
export function presencePayload(x){
 const {signature,...rest}=x;
 return PRESENCE_DOMAIN+canonical(rest);
}
function validPublicKey(pem){
 if(typeof pem!=='string'||pem.length>2048||pem.length<90)
  throw Error('INVALID_MASTER_PUBLIC_KEY');
 let key;
 try{key=createPublicKey(pem)}catch{throw Error('INVALID_MASTER_PUBLIC_KEY')}
 if(key.asymmetricKeyType!=='ed25519')throw Error('NOT_MASTER_ED25519');
 return key;
}
export function validateDeviceTopology(record,deviceId){
 if(!DEVICE.test(deviceId||''))throw Error('INVALID_LOCAL_DEVICE_ID');
 if(!record||record.schema!==CONFIG_SCHEMA||!['MASTER','FOLLOWER'].includes(record.mode)||
  !DEVICE.test(record.master_device_id)||typeof record.github_repository!=='string'||
  record.github_repository!=='127027/Sniperbot-'||
  !['coordination/master-live','coordination/master-live-v1'].includes(record.github_branch))
  throw Error('INVALID_DEVICE_TOPOLOGY');
 if(record.mode==='MASTER'){
  if(record.master_device_id!==deviceId||record.master_public_key_pem!==null)
   throw Error('MASTER_MUST_BE_THIS_DEVICE');
 }else{
  if(record.master_device_id===deviceId)throw Error('FOLLOWER_CANNOT_FOLLOW_ITSELF');
  validPublicKey(record.master_public_key_pem);
 }
 if(Object.keys(record).sort().join(',')!==
  'github_branch,github_repository,master_device_id,master_public_key_pem,mode,schema')
  throw Error('EXTRA_TOPOLOGY_FIELDS');
 return record;
}
export function loadLocalDeviceTopology(dir,deviceId){
 const file=path.join(dir,'device-topology.v1.json');
 if(!existsSync(file))return {schema:CONFIG_SCHEMA,mode:'UNPAIRED',
  master_device_id:null,connected:false,github_repository:'127027/Sniperbot-',
  github_branch:'coordination/master-live',message:'Noch keine Laptop-Zentrale gekoppelt'};
 const bytes=readFileSync(file);if(bytes.length>4096)throw Error('TOPOLOGY_TOO_LARGE');
 return validateDeviceTopology(JSON.parse(bytes.toString('utf8')),deviceId);
}
export function installLocalDeviceTopology({dir,deviceId,mode,masterDeviceId,masterPublicKeyPem,
 githubBranch='coordination/master-live'}={}){
 if(typeof dir!=='string'||!path.isAbsolute(dir))throw Error('INVALID_TOPOLOGY_DIR');
 const data={schema:CONFIG_SCHEMA,mode,master_device_id:masterDeviceId,
  master_public_key_pem:mode==='FOLLOWER'?masterPublicKeyPem:null,
  github_repository:'127027/Sniperbot-',github_branch:githubBranch};
 validateDeviceTopology(data,deviceId);
 mkdirSync(dir,{recursive:true});
 const file=path.join(dir,'device-topology.v1.json');
 writeFileSync(file,JSON.stringify(data)+'\n',{flag:'wx',mode:0o600});
 return data;
}
export function verifyMasterPresence(envelope,topology,{now=Date.now()}={}){
 if(topology?.mode!=='FOLLOWER'||!DEVICE.test(topology?.master_device_id||''))
  throw Error('MASTER_NOT_PAIRED');
 if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||
  Object.keys(envelope).length!==required.length||required.some(k=>!Object.hasOwn(envelope,k)))
  throw Error('INVALID_MASTER_PRESENCE_FIELDS');
 if(envelope.schema!==PRESENCE_SCHEMA||envelope.master_device_id!==topology.master_device_id||
  envelope.state!=='ONLINE'||!Number.isSafeInteger(envelope.sequence)||
  envelope.sequence<1||envelope.sequence>Number.MAX_SAFE_INTEGER)
  throw Error('INVALID_MASTER_PRESENCE');
 const issued=Date.parse(envelope.issued_at_utc),expiry=Date.parse(envelope.expires_at_utc);
 if(!Number.isFinite(now)||!Number.isFinite(issued)||!Number.isFinite(expiry)||
  issued>now+5000||expiry<=now||expiry<=issued||expiry-issued>120000)
  throw Error('MASTER_PRESENCE_EXPIRED_OR_STALE');
 const key=validPublicKey(topology.master_public_key_pem);
 if(typeof envelope.signature!=='string'||!/^[-A-Za-z0-9+/=]{80,100}$/.test(envelope.signature))
  throw Error('INVALID_MASTER_PRESENCE_SIGNATURE');
 const signature=Buffer.from(envelope.signature,'base64');
 if(signature.length!==64||signature.toString('base64')!==envelope.signature||
  !verify(null,Buffer.from(presencePayload(envelope)),key,signature))
  throw Error('MASTER_PRESENCE_SIGNATURE_MISMATCH');
 return {verified:true,master_device_id:envelope.master_device_id,
  sequence:envelope.sequence,expires_at_utc:envelope.expires_at_utc,
  observed_at_utc:new Date(now).toISOString()};
}
export function createSignedMasterPresence({masterDeviceId,sequence,privateKey,
 now=Date.now(),lifetimeMs=90000}={}){
 if(!DEVICE.test(masterDeviceId||'')||!Number.isSafeInteger(sequence)||sequence<1||
  !Number.isFinite(now)||lifetimeMs>120000||lifetimeMs<5000)
  throw Error('INVALID_MASTER_PRESENCE_PARAMETERS');
 const key=createPrivateKey(privateKey);
 if(key.asymmetricKeyType!=='ed25519')throw Error('NOT_MASTER_ED25519');
 const data={schema:PRESENCE_SCHEMA,master_device_id:masterDeviceId,
  sequence,issued_at_utc:new Date(now).toISOString(),
  expires_at_utc:new Date(now+lifetimeMs).toISOString(),state:'ONLINE'};
 return {...data,signature:sign(null,Buffer.from(presencePayload(data)),key).toString('base64')};
}
export function followerStatus({topology,presence=null,lastFetchError=null,now=Date.now(),
 masterPublishingActive=false}={}){
 if(topology?.mode==='MASTER')return {role:'MASTER',
  coordination_online:masterPublishingActive===true,
  trade_authorized:false,
  message:masterPublishingActive?
   'Laptop-Zentrale sendet signierte GitHub-Meldungen; Echtgeldhandel gesperrt':
   'Laptop-Zentrale; GitHub-Verbindung noch nicht gestartet'};
 if(topology?.mode!=='FOLLOWER')return {role:'UNPAIRED',coordination_online:false,
  trade_authorized:false,message:'Keine Verbindung – ruf Andreas an'};
 if(lastFetchError||!presence||!Number.isFinite(Date.parse(presence.expires_at_utc))||
  Date.parse(presence.expires_at_utc)<=now)
  return {role:'FOLLOWER',coordination_online:false,trade_authorized:false,
   message:'Keine Verbindung – ruf Andreas an'};
 return {role:'FOLLOWER',coordination_online:true,
  trade_authorized:false,
  message:'Laptop-Zentrale kürzlich bestätigt; Echtgeldhandel weiterhin gesperrt'};
}
export function operationAllowedWhenMasterOffline(type,online){
 if(online)return true;
 return ['DEPOSIT','WITHDRAW','PREVIEW_PAPER_FUNDING'].includes(type);
}
