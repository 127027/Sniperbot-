import {blobSha,REPO,R31} from './github.mjs';
import {validateBroadcast} from './broadcast.mjs';
// No client account state ever goes to GitHub. Only GET requests; optional read-only token.
export function broadcastFeed({token='',fetcher=fetch}={}){
 const base='https://api.github.com/repos/'+REPO;
 async function get(path){const r=await fetcher(base+path,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/vnd.github+json',...(token?{Authorization:'Bearer '+token}:{})}});if(!r.ok)throw Error('GITHUB_HTTP_'+r.status);return r.json()}
 async function file(path,ref){const x=await get('/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(ref));if(x.type!=='file'||x.encoding!=='base64'||typeof x.content!=='string')throw Error('INVALID_FILE');const b=Buffer.from(x.content,'base64');if(blobSha(b)!==x.sha)throw Error('BLOB_HASH_MISMATCH');return {data:JSON.parse(b.toString('utf8')),sha:x.sha}}
 return {async latest(){
  const h=(await get('/commits?sha='+encodeURIComponent(R31)+'&per_page=1'))[0]?.sha;if(!/^[a-f0-9]{40}$/.test(h??''))throw Error('INVALID_HEAD');
  const {data:p}=await file('r31/broadcast/latest.json',h);
  if(p.schema!=='r31.broadcast.pointer.v1')throw Error('INVALID_POINTER');
  if(p.status==='NOT_PUBLISHING')return null;
  if(p.status!=='PUBLISHED'||!Number.isSafeInteger(p.sequence)||p.sequence<1||p.path!=='r31/broadcast/signals/'+String(p.sequence).padStart(10,'0')+'.json'||!/^[a-f0-9]{40}$/.test(p.blob_sha??''))throw Error('INVALID_POINTER');
  const f=await file(p.path,h);validateBroadcast(f.data);if(f.sha!==p.blob_sha||f.data.sequence!==p.sequence)throw Error('SIGNAL_POINTER_MISMATCH');return {signal:f.data,blob_sha:f.sha,head:h};
 }};
}
