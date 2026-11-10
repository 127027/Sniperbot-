// Pseudonymous per-installation identity. This is NOT a hardware fingerprint.
// The local private wallet remains in the SAME installation-specific data folder.
// Never transfer this folder between running devices to "reuse" a bot identity.
import {randomBytes} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';

export const DEVICE_SCHEMA='sniper_local_device_identity.v1';
const ID=/^device_[a-f0-9]{32}$/;
export function validateDeviceIdentity(record){
 if(!record||typeof record!=='object'||Array.isArray(record)||
  Object.keys(record).sort().join(',')!=='created_at_utc,device_id,schema'||
  record.schema!==DEVICE_SCHEMA||typeof record.device_id!=='string'||
  !ID.test(record.device_id)||
  typeof record.created_at_utc!=='string'||
  !Number.isFinite(Date.parse(record.created_at_utc)))
  throw Error('INVALID_LOCAL_DEVICE_IDENTITY');
 return record;
}
export function loadOrCreateDeviceIdentity(dir,{now=new Date(),generate=randomBytes}={}){
 if(typeof dir!=='string'||!path.isAbsolute(dir))
  throw Error('INVALID_LOCAL_DEVICE_DIRECTORY');
 const filename=path.join(dir,'device-identity.v1.json');
 const read=()=>{
  const bytes=readFileSync(filename);
  if(bytes.length>1024)throw Error('LOCAL_DEVICE_IDENTITY_TOO_LARGE');
  return validateDeviceIdentity(JSON.parse(bytes.toString('utf8')));
 };
 if(existsSync(filename))return read();
 if(!Number.isFinite(new Date(now).getTime()))throw Error('INVALID_LOCAL_DEVICE_TIME');
 const identity={
  schema:DEVICE_SCHEMA,
  device_id:'device_'+generate(16).toString('hex'),
  created_at_utc:new Date(now).toISOString()
 };
 validateDeviceIdentity(identity);
 mkdirSync(dir,{recursive:true});
 try{
  writeFileSync(filename,JSON.stringify(identity)+'\n',{flag:'wx',mode:0o600});
 }catch(e){if(e?.code!=='EEXIST')throw e}
 return read();
}
