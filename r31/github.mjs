import {createHash} from 'node:crypto';
import {validateControls,nextControls,capacity} from './policy.mjs';
export const REPO='127027/Sniperbot-';
export const R30='codex/r30-hourly-research-20261124';
export const R31='codex/r31-control-center-paper';
export const CONTROL_PATH='r31/controls.json';
export function blobSha(bytes){return createHash('sha1').update('blob '+bytes.length).update(Buffer.from([0])).update(bytes).digest('hex')}
export function github({token='',fetcher=fetch}={}) {
 const base='https://api.github.com/repos/'+REPO;
 async function request(path,opts={}) {
  const r=await fetcher(base+path,{...opts,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:'Bearer '+token}:{}),...(opts.body?{'Content-Type':'application/json'}:{})}});
  if(!r.ok){const e=Error('GITHUB_HTTP_'+r.status);e.status=r.status;throw e}
  return r.json();
 }
 async function file(path,ref) {
  const v=await request('/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(ref));
  if(v.type!=='file'||v.encoding!=='base64'||typeof v.content!=='string')throw Error('INVALID_GITHUB_FILE');
  const bytes=Buffer.from(v.content,'base64');
  if(blobSha(bytes)!==v.sha)throw Error('BLOB_HASH_MISMATCH');
  return {sha:v.sha,data:JSON.parse(bytes.toString('utf8'))};
 }
 async function controls(){const v=await file(CONTROL_PATH,R31);validateControls(v.data);return v;}
 async function snapshot(){
  const heads=await request('/commits?sha='+encodeURIComponent(R30)+'&per_page=1');
  const head=heads[0]?.sha;if(!/^[0-9a-f]{40}$/.test(head??''))throw Error('INVALID_HEAD');
  const {data:p}=await file('latest-final.json',head);
  if(p.kind!=='R30_LATEST_FINAL_POINTER_V1'||!/^reports\/\d{4}-\d{2}-\d{2}\/\d{2}\/final(?:-[\w-]+)?\.json$/.test(p.final_path)||!/^[0-9a-f]{40}$/.test(p.final_blob_sha))throw Error('INVALID_POINTER');
  const f=await file(p.final_path,head);const d=f.data;
  if(f.sha!==p.final_blob_sha||d.target_utc!==p.target_utc||d.paper_ledger?.last_completed_target_utc!==d.target_utc||d.paper_ledger?.mode!=='INDICATIVE_PUBLIC_PRICE_MODEL_ONLY'||!Array.isArray(d.paper_ledger?.trades))throw Error('POINTER_LEDGER_MISMATCH');
  return {head,final_path:p.final_path,final_blob_sha:f.sha,target_utc:d.target_utc,completed_at_utc:d.completed_at_utc,ledger:d.paper_ledger,summary:d.summary,decisions:d.research_decisions??[],missing_roles:d.missing_roles??[]};
 }
 async function save(input){
  if(!token)throw Error('GITHUB_WRITE_TOKEN_REQUIRED');
  const old=await controls();const next=nextControls(old.data,input);
  await request('/contents/'+CONTROL_PATH,{method:'PUT',body:JSON.stringify({message:'R31: update staged paper controls revision '+next.revision,content:Buffer.from(JSON.stringify(next,null,2)+'\n').toString('base64'),sha:old.sha,branch:R31})});
  const verified=await controls();if(JSON.stringify(verified.data)!==JSON.stringify(next))throw Error('CONTROL_READBACK_CONFLICT');
  return verified.data;
 }
 async function state(){const [c,s]=await Promise.all([controls(),snapshot()]);return {controls:c.data,source:s,capacity:capacity(c.data,s.ledger),can_write:!!token,connected_to_dots:false,mode:'R31_STAGING_R30_READ_ONLY'};}
 return {controls,snapshot,save,state};
}
