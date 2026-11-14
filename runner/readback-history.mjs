// Prospective local append-only cross-provider evidence. Not a trade ledger.
// Research history deliberately separate from %LOCALAPPDATA%\MemeSniperPaper cash.
import {mkdir,readFile,rename,writeFile,unlink} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';

export async function saveReadbackBatch({folder,batch}={}){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||
  batch?.schema!=='pool_readback_batch.v1'||batch.paper_only!==true||
  batch.actionable!==false||!Array.isArray(batch.results)||batch.results.length>3||
  !Number.isFinite(Date.parse(batch.checked_at_utc)))
  throw Error('INVALID_READBACK_ARCHIVE_DATA');
 const raw=JSON.stringify(batch)+'\n';
 if(Buffer.byteLength(raw)>128*1024)throw Error('READBACK_RECORD_TOO_LARGE');
 const observed=new Date(batch.checked_at_utc).toISOString();
 const stamp=observed.replace(/[-:.]/g,'');
 const hash=createHash('sha256').update(raw).digest('hex').slice(0,16);
 const history=path.join(folder,'history');
 const file=path.join(history,'readback-'+stamp+'-'+hash+'.json');
 await mkdir(history,{recursive:true});
 // Never alter an existing historical capture, including corrupted files.
 try{await writeFile(file,raw,{flag:'wx',encoding:'utf8',flush:true})}
 catch(e){if(e?.code!=='EEXIST')throw e;
  if(await readFile(file,'utf8')!==raw)throw Error('READBACK_ARCHIVE_CONFLICT');
 }
 const latest=path.join(folder,'latest.json');
 // Fail closed on corrupt existing latest record rather than erase evidence.
 try{
  const old=JSON.parse(await readFile(latest,'utf8'));
  if(old.schema!=='pool_readback_batch.v1'||old.paper_only!==true||
   old.actionable!==false)throw Error('READBACK_PREVIOUS_LATEST_INVALID');
 }catch(e){if(e?.code!=='ENOENT')throw e}
 const temp=latest+'.tmp-'+randomUUID();
 try{
  await writeFile(temp,raw,{flag:'wx',encoding:'utf8',flush:true});
  await rename(temp,latest);
 }finally{await unlink(temp).catch(e=>{if(e?.code!=='ENOENT')throw e})}
 return {archived:true,file_sha256:createHash('sha256').update(raw).digest('hex'),
  captured_at_utc:observed,attempted:batch.results.length};
}
