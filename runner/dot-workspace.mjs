// V1 local Dot scratchpad. This is a DATA service, NOT an order API.
// Namespaced, role-authenticated, revisioned, quota-bounded and persisted
// outside GitHub/OneDrive in the bot's %LOCALAPPDATA% state directory.
import {mkdir,readdir,readFile,writeFile,rename,unlink,stat} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';

export const DOT_ROLES=Object.freeze([
 'news_discovery','social_acceleration','onchain_liquidity','contract_security','opportunity_qa','risk_controller'
]);
const FILE=/^[a-z0-9][a-z0-9_-]{0,63}$/;
const SECRET_KEY=/(?:private.?key|secret|passphrase|password|mnemonic|seed.?phrase|paypal|api.?token|access.?token|bearer|credential|wallet.?key|signing.?key)/i;
const MAX_BYTES=12*1024,MAX_DOCS=40;
const base=(dir,role)=>{
 if(typeof dir!=='string'||!path.isAbsolute(dir)||!DOT_ROLES.includes(role))throw Error('WORKSPACE_SCOPE_INVALID');
 return path.join(dir,'dot-workspaces-v1',role);
};
function file(dir,role,key){
 if(typeof key!=='string'||!FILE.test(key))throw Error('WORKSPACE_KEY_INVALID');
 return path.join(base(dir,role),key+'.json');
}
function validObject(v){
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('WORKSPACE_DOCUMENT_INVALID');
 if(Buffer.byteLength(JSON.stringify(v))>MAX_BYTES)throw Error('WORKSPACE_DOCUMENT_TOO_LARGE');
 const visit=(x,depth=0)=>{
  if(depth>8)throw Error('WORKSPACE_DEPTH_TOO_LARGE');
  if(x&&typeof x==='object'){
   for(const [k,val] of Object.entries(x)){
    if(SECRET_KEY.test(k))throw Error('WORKSPACE_SECRET_FIELD_FORBIDDEN');
    if(typeof val==='string'&&val.length>4000)throw Error('WORKSPACE_FIELD_TOO_LONG');
    visit(val,depth+1);
   }
  }
 };
 visit(v);
 if(v.actionable!==false||v.paper_only!==true)throw Error('WORKSPACE_RESEARCH_ONLY');
 return v;
}
const defaultDoc=()=>({revision:0,updated_at_utc:null,value:null});
export async function getDotDocument({dir,role,key}={}){
 const filename=file(dir,role,key);
 let raw;
 try{raw=await readFile(filename,'utf8')}catch(e){if(e?.code==='ENOENT')return defaultDoc();throw e}
 if(Buffer.byteLength(raw)>MAX_BYTES+1024)throw Error('WORKSPACE_STORED_TOO_LARGE');
 const doc=JSON.parse(raw);
 if(doc?.schema!=='dot_workspace_document.v1'||!Number.isSafeInteger(doc.revision)||
   doc.revision<1||!Number.isFinite(Date.parse(doc.updated_at_utc)))throw Error('WORKSPACE_STORED_INVALID');
 validObject(doc.value);
 return {revision:doc.revision,updated_at_utc:doc.updated_at_utc,value:doc.value};
}
async function putDotDocumentUnlocked({dir,role,key,value,expectedRevision=0,now=Date.now()}={}){
 const filename=file(dir,role,key),folder=path.dirname(filename);
 validObject(value);
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!Number.isFinite(now))throw Error('WORKSPACE_REVISION_INVALID');
 // Exclusive process-local critical section: one runner per state folder.
 const current=await getDotDocument({dir,role,key});
 if(current.revision!==expectedRevision)throw Error('WORKSPACE_REVISION_CONFLICT');
 await mkdir(folder,{recursive:true});
 if(current.revision===0){
  const names=(await readdir(folder)).filter(n=>FILE.test(n.slice(0,-5))&&n.endsWith('.json'));
  if(names.length>=MAX_DOCS)throw Error('WORKSPACE_QUOTA_EXCEEDED');
 }
 const next={schema:'dot_workspace_document.v1',revision:expectedRevision+1,
  updated_at_utc:new Date(now).toISOString(),value};
 const raw=JSON.stringify(next)+'\n';
 if(Buffer.byteLength(raw)>MAX_BYTES+1024)throw Error('WORKSPACE_DOCUMENT_TOO_LARGE');
 const temp=filename+'.tmp-'+randomUUID();
 try{await writeFile(temp,raw,{flag:'wx',mode:0o600,flush:true});await rename(temp,filename)}
 finally{await unlink(temp).catch(e=>{if(e?.code!=='ENOENT')throw e})}
 return {revision:next.revision,updated_at_utc:next.updated_at_utc,
  sha256:createHash('sha256').update(raw).digest('hex'),paper_only:true,actionable:false};
}
// Serialize same-key writes: simultaneous callers cannot both commit revision N+1.
const pendingWrites=new Map();
export function putDotDocument(args={}){
 const id=file(args.dir,args.role,args.key);
 const predecessor=pendingWrites.get(id)||Promise.resolve();
 const request=predecessor.catch(()=>{}).then(()=>putDotDocumentUnlocked(args));
 pendingWrites.set(id,request);
 request.finally(()=>{if(pendingWrites.get(id)===request)pendingWrites.delete(id)}).catch(()=>{});
 return request;
}
export async function listDotDocuments({dir,role}={}){
 const folder=base(dir,role);
 let names;
 try{names=await readdir(folder)}catch(e){if(e?.code==='ENOENT')return [];throw e}
 const out=[];
 for(const name of names.filter(n=>n.endsWith('.json')&&FILE.test(n.slice(0,-5))).slice(0,MAX_DOCS)){
  const d=await getDotDocument({dir,role,key:name.slice(0,-5)});
  out.push({key:name.slice(0,-5),revision:d.revision,updated_at_utc:d.updated_at_utc});
 }
 return out;
}
