import {identity,validateBroadcast} from './broadcast.mjs';
import {blobSha,REPO,R31} from './github.mjs';
export const POINTER='r31/broadcast/latest.json',UNIVERSE='r31/broadcast/strategy-universe.json';
const hash=x=>/^[0-9a-f]{40}$/.test(x??'');
const pack=x=>JSON.stringify(x,null,2)+'\n';
export function preparePublication({previous=null,universe,decisions,target_utc,published_at_utc,expires_at_utc}){
 if(!Array.isArray(decisions)||decisions.length>500||universe?.schema!=='r31.strategy.universe.v1'||!Array.isArray(universe.coins))throw Error('INVALID_PUBLISH_INPUT');
 if(previous){validateBroadcast(previous.signal);if(!hash(previous.blob_sha)||universe.sequence!==previous.signal.sequence||universe.last_signal_blob_sha!==previous.blob_sha||Date.parse(target_utc)<=Date.parse(previous.signal.target_utc))throw Error('STALE_PUBLISHER_STATE')}
 else if(universe.sequence!==0||universe.last_signal_blob_sha!==null||universe.coins.length)throw Error('INVALID_INITIAL_UNIVERSE');
 const next=new Map();
 for(const c of universe.coins){const k=identity(c);if(next.has(k)||!['LONG','EXIT'].includes(c.intent)||typeof c.coin!=='string')throw Error('INVALID_UNIVERSE');next.set(k,{coin:c.coin,chain:c.chain,contract:c.contract,intent:c.intent})}
 const supplied=new Map();
 for(const d of decisions){const k=identity(d);if(supplied.has(k))throw Error('DUPLICATE_DECISION');supplied.set(k,d);
 if(d.action==='BUY'||d.action==='SELL')next.set(k,{coin:d.coin,chain:d.chain,contract:d.contract,intent:d.action==='BUY'?'LONG':'EXIT'});
 if(d.action==='HOLD'&&next.get(k)?.intent==='EXIT')throw Error('EXIT_INTENT_NEEDS_REVIEW');
 }
 // A previously broadcast BUY may exist on any offline device. Never silently delete it from coverage.
 // Missing observations produce DATA_GAP; the strategy retains LONG/EXIT intent for future reviews.
 for(const [k,c] of next){if(!supplied.has(k))supplied.set(k,{coin:c.coin,chain:c.chain,contract:c.contract,action:'DATA_GAP',reason:'Prior '+c.intent+' intent: fresh review/price missing; do not invent an exit or entry'});}
 const sequence=(previous?.signal.sequence??0)+1;
 const signal=validateBroadcast({schema:'r31.broadcast.v1',mode:'PAPER_ONLY',sequence,target_utc,published_at_utc,expires_at_utc,decisions:[...supplied.values()],previous_blob_sha:previous?.blob_sha??null});
 const signalJson=pack(signal),signalSha=blobSha(Buffer.from(signalJson)),path='r31/broadcast/signals/'+String(sequence).padStart(10,'0')+'.json';
 const pointer={schema:'r31.broadcast.pointer.v1',status:'PUBLISHED',sequence,path,blob_sha:signalSha};
 const updated={schema:'r31.strategy.universe.v1',sequence,last_signal_blob_sha:signalSha,coins:[...next.values()]};
 return {signal,pointer,universe:updated,files:[{path,content:signalJson},{path:POINTER,content:pack(pointer)},{path:UNIVERSE,content:pack(updated)}]};
}
// Explicit publisher command only. No cron or client funds. The device feed remains independent.
export async function publishBroadcast({input,token,fetcher=fetch,now=()=>new Date().toISOString()}){
 if(!token)throw Error('PUBLISH_TOKEN_REQUIRED');
 const base='https://api.github.com/repos/'+REPO;
 async function req(path,method='GET',body){const r=await fetcher(base+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('GITHUB_HTTP_'+r.status);return r.json()}
 async function head(){const a=(await req('/commits?sha='+encodeURIComponent(R31)+'&per_page=1'))[0];if(!hash(a?.sha)||!hash(a?.commit?.tree?.sha))throw Error('INVALID_HEAD');return a}
 async function file(path,ref){const v=await req('/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(ref));if(v.type!=='file'||v.encoding!=='base64'||typeof v.content!=='string')throw Error('INVALID_FILE');const bytes=Buffer.from(v.content,'base64');if(blobSha(bytes)!==v.sha)throw Error('BLOB_HASH_MISMATCH');return {data:JSON.parse(bytes.toString('utf8')),sha:v.sha}}
 const h=await head(),p=(await file(POINTER,h.sha)).data,u=(await file(UNIVERSE,h.sha)).data;
 let previous=null;
 if(p.schema!=='r31.broadcast.pointer.v1')throw Error('INVALID_POINTER');
 if(p.status==='PUBLISHED'){
  if(!Number.isSafeInteger(p.sequence)||p.sequence<1||p.path!=='r31/broadcast/signals/'+String(p.sequence).padStart(10,'0')+'.json')throw Error('INVALID_POINTER');
  const f=await file(p.path,h.sha);if(f.sha!==p.blob_sha||f.data.sequence!==p.sequence)throw Error('POINTER_MISMATCH');previous={signal:f.data,blob_sha:f.sha};
 }else if(p.status!=='NOT_PUBLISHING')throw Error('INVALID_POINTER');
 const plan=preparePublication({...input,previous,universe:u});
 const nowMs=Date.parse(now());
 if(!Number.isFinite(nowMs)||Date.parse(plan.signal.published_at_utc)>nowMs||nowMs-Date.parse(plan.signal.published_at_utc)>60000||Date.parse(plan.signal.expires_at_utc)<=nowMs)throw Error('PUBLISH_WINDOW_CLOSED');
 const tree=await req('/git/trees/'+h.commit.tree.sha+'?recursive=1');
 if(tree.truncated||!Array.isArray(tree.tree)||tree.tree.some(x=>x.path===plan.pointer.path))throw Error('SIGNAL_ALREADY_EXISTS_OR_TREE_INCOMPLETE');
 const entries=[];
 for(const f of plan.files){const b=await req('/git/blobs','POST',{content:f.content,encoding:'utf-8'});if(b.sha!==blobSha(Buffer.from(f.content)))throw Error('CREATED_BLOB_MISMATCH');entries.push({path:f.path,mode:'100644',type:'blob',sha:b.sha})}
 const t=await req('/git/trees','POST',{base_tree:h.commit.tree.sha,tree:entries});if(!hash(t.sha))throw Error('INVALID_TREE');
 const c=await req('/git/commits','POST',{message:'R31 broadcast '+plan.signal.sequence,tree:t.sha,parents:[h.sha]});if(!hash(c.sha))throw Error('INVALID_COMMIT');
 if((await head()).sha!==h.sha)throw Error('HEAD_CHANGED_RETRY_FROM_LATEST');
 if(Date.parse(now())>=Date.parse(plan.signal.expires_at_utc))throw Error('PUBLISH_WINDOW_CLOSED');
 // Non-force update also rejects concurrent non-fast-forward commits.
 const r=await req('/git/refs/heads/'+R31.split('/').map(encodeURIComponent).join('/'),'PATCH',{sha:c.sha,force:false});if(r.object?.sha!==c.sha)throw Error('REF_UPDATE_NOT_CONFIRMED');
 const readback=(await file(POINTER,c.sha)).data,signal=(await file(plan.pointer.path,c.sha));
 if(readback.blob_sha!==plan.pointer.blob_sha||signal.sha!==plan.pointer.blob_sha)throw Error('PUBLISH_READBACK_MISMATCH');
 return {commit_sha:c.sha,pointer:plan.pointer};
}
