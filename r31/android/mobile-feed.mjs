import {validateBroadcast} from './broadcast.mjs';
export const BASE='https://raw.githubusercontent.com/127027/Sniperbot-/refs/heads/codex/r31-control-center-paper/r31/broadcast/';
export async function gitBlobSha(bytes){
 const prefix=new TextEncoder().encode('blob '+bytes.length+'\0'),joined=new Uint8Array(prefix.length+bytes.length);joined.set(prefix);joined.set(bytes,prefix.length);
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',joined)),x=>x.toString(16).padStart(2,'0')).join('');
}
export function mobileFeed({fetcher=fetch}={}){
 async function file(path){const r=await fetcher(BASE+path,{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('GITHUB_HTTP_'+r.status);const b=new Uint8Array(await r.arrayBuffer());if(b.length>2*1024*1024)throw Error('SIGNAL_TOO_LARGE');return {data:JSON.parse(new TextDecoder().decode(b)),sha:await gitBlobSha(b)}}
 return {async latest(){const p=(await file('latest.json')).data;if(p.schema!=='r31.broadcast.pointer.v1')throw Error('INVALID_POINTER');if(p.status==='NOT_PUBLISHING')return null;
 if(p.status!=='PUBLISHED'||!Number.isSafeInteger(p.sequence)||p.sequence<1||p.path!=='r31/broadcast/signals/'+String(p.sequence).padStart(10,'0')+'.json'||!/^[a-f0-9]{40}$/.test(p.blob_sha??''))throw Error('INVALID_POINTER');
 const f=await file(p.path.slice('r31/broadcast/'.length));validateBroadcast(f.data);if(f.sha!==p.blob_sha||f.data.sequence!==p.sequence)throw Error('SIGNAL_POINTER_MISMATCH');return {signal:f.data,blob_sha:f.sha}}};
}