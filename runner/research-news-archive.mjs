// Durable, locally scoped first-seen evidence. Do not publish private archive to GitHub.
// Each event is an immutable file in a stable ID-hash shard, created atomically on NTFS.
// The bounded news journal is only a hot cache, not the historical source of truth.
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,link,unlink} from 'node:fs/promises';
import path from 'node:path';

function safeEvent(event){
 const first=Date.parse(event?.first_observed_at_utc);
 if(typeof event?.event_id!=='string'||!/^news-[0-9a-f]{32}$/.test(event.event_id)||
  !Number.isFinite(first)||!event.first_observed_at_utc.endsWith('Z')||
  event?.paper_only!==true||event?.actionable!==false||
  typeof event?.source_url!=='string'||!event.source_url.startsWith('https://'))
  throw Error('INVALID_NEWS_ARCHIVE_EVENT');
 return event;
}
export function newsArchivePath(filename,event){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('INVALID_NEWS_ARCHIVE_PATH');
 safeEvent(event);
 const hash=createHash('sha256').update(event.event_id).digest('hex');
 // Identity must not depend on observation month: a repeated RSS URL may
 // reappear years later, but must resolve to its original immutable record.
 return path.join(path.dirname(filename),'news-archive',hash.slice(0,2),hash+'.json');
}
async function existing(file,eventId){
 try{
  const raw=await readFile(file,'utf8');
  const e=JSON.parse(raw);
  if(e?.event_id!==eventId||!e?.first_observed_at_utc)throw Error('NEWS_ARCHIVE_IDENTITY_CONFLICT');
  safeEvent(e);
  return e;
 }catch(error){if(error?.code==='ENOENT')return null;throw error}
}
export async function archiveNewsEvent(filename,event){
 safeEvent(event);
 const file=newsArchivePath(filename,event);
 const old=await existing(file,event.event_id);
 if(old)return {event:old,created:false};
 await mkdir(path.dirname(file),{recursive:true});
 const temporary=file+'.tmp-'+randomUUID();
 try{
  // Write and flush a full snapshot before atomically linking the immutable name.
  await writeFile(temporary,JSON.stringify(event)+'\n',{encoding:'utf8',flag:'wx',flush:true});
  try{await link(temporary,file)}catch(e){if(e?.code!=='EEXIST')throw e}
  const saved=await existing(file,event.event_id);
  if(!saved)throw Error('NEWS_ARCHIVE_COMMIT_MISSING');
  return {event:saved,created:saved.first_observed_at_utc===event.first_observed_at_utc};
 }finally{await unlink(temporary).catch(e=>{if(e?.code!=='ENOENT')throw e})}
}
export async function archivedNewsEvent(filename,event){
 const file=newsArchivePath(filename,event);
 return existing(file,event.event_id);
}
