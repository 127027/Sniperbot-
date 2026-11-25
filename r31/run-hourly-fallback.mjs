import {r46FallbackPlan} from './r46-fallback.mjs';
import {REPO,R30,R31,blobSha} from './github.mjs';
const token=process.env.GITHUB_TOKEN;
const base='https://api.github.com/repos/'+REPO;
const pack=x=>JSON.stringify(x,null,2)+'\n';
const t0=Math.floor(Date.now()/3600000)*3600000,target=new Date(t0).toISOString();
const guard=()=>{const n=Date.now();if(n<t0+420000||n>t0+600000)throw Error('FALLBACK_WINDOW_CLOSED')};
if(!token)throw Error('MISSING_WORKFLOW_TOKEN');
async function req(path,method='GET',body){const res=await fetch(base+path,{method,redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!res.ok){const e=Error('HTTP_'+res.status+' '+path);e.status=res.status;throw e}return res.json()}
async function head(b){return (await req('/commits?sha='+encodeURIComponent(b)+'&per_page=1'))[0]}
async function file(ref,path){const x=await req('/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(ref));const bytes=Buffer.from(x.content,'base64');if(x.type!=='file'||x.encoding!=='base64'||blobSha(bytes)!==x.sha)throw Error('BLOB_MISMATCH '+path);return {path,sha:x.sha,data:JSON.parse(bytes.toString('utf8'))}}
async function atomic(b,h,files,message){guard();const entries=await Promise.all(files.map(async f=>{const x=await req('/git/blobs','POST',{content:f.content,encoding:'utf-8'});if(x.sha!==blobSha(Buffer.from(f.content)))throw Error('BLOB_CREATE_MISMATCH');return {path:f.path,mode:'100644',type:'blob',sha:x.sha}}));const tree=await req('/git/trees','POST',{base_tree:h.commit.tree.sha,tree:entries});const co=await req('/git/commits','POST',{message,tree:tree.sha,parents:[h.sha]});if((await head(b)).sha!==h.sha)throw Error('HEAD_CHANGED');guard();const up=await req('/git/refs/heads/'+b.split('/').map(encodeURIComponent).join('/'),'PATCH',{sha:co.sha,force:false});if(up.object?.sha!==co.sha)throw Error('REF_MISMATCH');const read=await Promise.all(entries.map(e=>file(co.sha,e.path)));if(read.some((x,i)=>x.sha!==entries[i].sha))throw Error('READBACK_MISMATCH');return co.sha}
async function run(){try{guard()}catch{console.log('Skipped: outside actual :07–:10 window');return}
 const [a,b]=await Promise.all([head(R30),head(R31)]);const [fp,sp,u]=await Promise.all([file(a.sha,'latest-final.json'),file(b.sha,'r31/broadcast/latest.json'),file(b.sha,'r31/broadcast/strategy-universe.json')]);
 if(sp.data.status!=='PUBLISHED')throw Error('NO_PREVIOUS_SIGNAL');const [pf,ps]=await Promise.all([file(a.sha,fp.data.final_path),file(b.sha,sp.data.path)]);
 if(pf.sha!==fp.data.final_blob_sha||ps.sha!==sp.data.blob_sha||pf.data.target_utc!==fp.data.target_utc||pf.data.paper_ledger.last_completed_target_utc!==pf.data.target_utc||pf.data.paper_ledger.mode!=='INDICATIVE_PUBLIC_PRICE_MODEL_ONLY'||ps.data.sequence!==sp.data.sequence)throw Error('POINTER_INTEGRITY');
 if(Date.parse(ps.data.target_utc)>=t0||Date.parse(pf.data.target_utc)>=t0){console.log('Already published or newer target; do not overwrite primary');return}
 const stem='reports/'+target.slice(0,10)+'/'+target.slice(11,13)+'/';
 const reports=(await Promise.all([1,2,3,4].map(async role=>{try{const x=await file(a.sha,stem+'dot-'+role+'.json');if(Date.parse(x.data.target_utc)!==t0||x.data.mode!=='PAPER_ONLY'||x.data.role!==role&&x.data.dot!==role)return null;return {...x,role}}catch(e){if(e.status===404)return null;throw e}}))).filter(Boolean);
 const [reg,idx]=await Promise.all([file(a.sha,'r38/pool-registry.json'),file(a.sha,'r34/index.json')]);
 if(!Array.isArray(reg.data.coins)||!Array.isArray(idx.data.coins))throw Error('REGISTRY_SCHEMA');
 const result=r46FallbackPlan({registry:reg.data.coins,index:idx.data.coins,previous:{signal:ps.data,blob_sha:ps.sha},universe:u.data,priorFinal:pf.data,reports,target,published:new Date().toISOString(),head:a.sha,priorPointer:fp.data});
 const c=await atomic(R31,b,result.plan.files,'R36 fallback '+target);console.log('R31 verified',c,result.plan.pointer.sequence);
 const path=stem+'final.json',sidePath=stem+'r46-signals.json',sideBytes=pack(result.sidecar);result.final.r46_signals={path:sidePath,blob_sha:blobSha(Buffer.from(sideBytes))};const bytes=pack(result.final),sha=blobSha(Buffer.from(bytes));const pointer={...fp.data,administrative_reset:false,target_utc:result.final.target_utc,final_path:path,final_blob_sha:sha,summary:result.final.summary};
 try{const latest=await head(R30);const p=await file(latest.sha,'latest-final.json');if(p.sha!==fp.sha)throw Error('R30_FINAL_CHANGED');try{await file(latest.sha,path);throw Error('FINAL_EXISTS')}catch(e){if(e.status!==404)throw e}const c2=await atomic(R30,latest,[{path,content:bytes},{path:sidePath,content:sideBytes},{path:'latest-final.json',content:pack(pointer)}],'R36 fallback final '+target);console.log('R30 verified',c2)}catch(e){console.error('R31 completed; R30 independent failure',e.message);process.exitCode=1}
}
await run();
