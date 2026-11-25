import {mkdir,open,readFile,rename,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAccount} from './device-account.mjs';
// Single writer per account folder. A crash can leave a lock: recover manually only after checking no writer exists.
export async function openAccountStore(dir,{initial,now=()=>new Date().toISOString()}={}){
 const root=resolve(dir);await mkdir(root,{recursive:true,mode:0o700});
 const lockPath=join(root,'writer.lock'),statePath=join(root,'account.json');
 const lock=await open(lockPath,'wx',0o600);
 await lock.writeFile(JSON.stringify({pid:process.pid,started_at_utc:now()}));await lock.sync();
 let state,closed=false,queue=Promise.resolve();
 async function persist(v){
  const temp=join(root,'account-'+randomUUID()+'.tmp');const f=await open(temp,'wx',0o600);
  try{await f.writeFile(JSON.stringify(v,null,2)+'\n');await f.sync()}finally{await f.close()}
  try{await rename(temp,statePath)}catch(e){await unlink(temp).catch(()=>{});throw e}
 }
 try{
  try{state=JSON.parse(await readFile(statePath,'utf8'));if(state.schema!=='r31.device.account.v1')throw Error('INVALID_ACCOUNT_FILE')}
  catch(e){if(e.code!=='ENOENT')throw e;state=createAccount({...initial,now:now()});await persist(state)}
 }catch(e){await lock.close();await unlink(lockPath);throw e}
 function mutate(fn){
  if(closed)throw Error('STORE_CLOSED');
  const task=queue.then(async()=>{const next=await fn(structuredClone(state));if(!next||next.account_id!==state.account_id)throw Error('ACCOUNT_ID_CHANGED');await persist(next);state=next;return structuredClone(state)});
  queue=task.catch(()=>{});return task;
 }
 return {read:()=>structuredClone(state),mutate,async close(){closed=true;await queue;await lock.close();await unlink(lockPath)}};
}
