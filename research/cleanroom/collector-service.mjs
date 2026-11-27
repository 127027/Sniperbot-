// Dedicated non-executable data service. Only publishes generated research data
// to one isolated branch; never mutates main, app state or wallet/order paths.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {append,coverage,emptyLedger} from './collector-cadence.mjs';
import {readInputs} from './queue-ingest.mjs';
import {packets} from './worker-lifecycle.mjs';
const ref='refs/heads/cleanroom-collector-r31-pilot-v1';
const dir='research/cleanroom/',interval=300000;
const healthPath=dir+'collector-health.json',ledgerPath=dir+'collector-cadence.json',statusPath=dir+'collector-service-status.json';
const dataPaths=[dir+'market-latest.json',dir+'evidence-latest.json',dir+'targeted-latest.json',dir+'token-registry/',dir+'candidate-pages/',dir+'watchdog-checkpoints.json',dir+'worker-packets/'];
const sha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const now=()=>new Date().toISOString(),time=x=>Date.parse(x);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function git(repo,args,{allowFail=false}={}){
 const r=spawnSync('git',['--no-replace-objects','-C',repo,...args],{encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024,env:{...process.env,GIT_AUTHOR_NAME:'R31 isolated collector',GIT_AUTHOR_EMAIL:'collector@users.noreply.github.com',GIT_COMMITTER_NAME:'R31 isolated collector',GIT_COMMITTER_EMAIL:'collector@users.noreply.github.com'}});
 if(r.error||r.status!==0){if(allowFail&&!r.error)return null;throw Error('COLLECTOR_GIT_FAILED:'+args[0]);}return r.stdout.trim();
}
function remoteHead(repo){
 const rows=git(repo,['ls-remote','--refs','origin',ref]).split('\n').filter(Boolean);
 if(!rows.length)return null;
 const [h,r]=rows[0].split(/\s+/);if(rows.length!==1||!sha(h)||r!==ref)throw Error('COLLECTOR_BAD_REMOTE_REF');return h;
}
function json(file){const s=fs.readFileSync(file,'utf8');if(!s.trim())throw Error('COLLECTOR_EMPTY_JSON:'+path.basename(file));try{return JSON.parse(s)}catch{throw Error('COLLECTOR_INVALID_JSON:'+path.basename(file))}}
function write(file,data){fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n')}
function fresh(h,idx,runId,started,at){
 return h?.schema==='cleanroom.collector-health.v1'&&h.mode==='RESEARCH_ONLY'&&h.run_id===runId&&h.status==='OK'&&time(h.started_at)>=time(started)&&time(h.finished_at)>=time(h.started_at)&&time(h.finished_at)<=time(at)&&h.snapshot===idx?.snapshot&&Number.isInteger(h.fresh_research_quotes)&&h.fresh_research_quotes>0&&Number.isFinite(time(h.snapshot))&&time(h.snapshot)<=time(at)&&time(at)-time(h.snapshot)<=300000;
}
// Data history and executable revision are deliberately independent. Copy only
// the pinned, allowlisted runtime bytes into the disposable data worktree.
// Do not stage these files on the data branch.
const runtimeFiles=['watchdog.mjs','market-probe.mjs','evidence.mjs','targeted.mjs','token-registry.mjs','collector-cadence.mjs'];
function overlayRuntime(repo,work,sourceCommit){
 if(!sha(sourceCommit))throw Error('COLLECTOR_RUNTIME_COMMIT_INVALID');
 const blobs={};
 for(const f of runtimeFiles){
  const rel=dir+f,expected=git(repo,['rev-parse',sourceCommit+':'+rel]);
  if(!sha(expected)||git(repo,['hash-object',rel])!==expected)throw Error('COLLECTOR_RUNTIME_DIRTY:'+rel);
  fs.copyFileSync(path.join(repo,rel),path.join(work,rel));
  if(git(work,['hash-object',rel])!==expected)throw Error('COLLECTOR_RUNTIME_COPY_MISMATCH:'+rel);
  blobs[rel]=expected;
 }
 return blobs;
}

async function cycle(repo,sequence){
 const sourceCommit=git(repo,['rev-parse','HEAD']);
 const expected=remoteHead(repo);
 if(expected){git(repo,['fetch','--no-tags','origin',ref]);if(git(repo,['rev-parse','FETCH_HEAD'])!==expected)throw Error('COLLECTOR_REMOTE_CHANGED_DURING_FETCH')}
 const base=expected??git(repo,['rev-parse','HEAD']);if(!sha(base))throw Error('COLLECTOR_BASE_INVALID');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r31-collector-')),work=path.join(temp,'checkout');
 let added=false;
 try{
  git(repo,['worktree','add','--detach',work,base]);added=true;
  const runtimeBlobs=overlayRuntime(repo,work,sourceCommit);
  const p=x=>path.join(work,x),previous=fs.existsSync(p(ledgerPath))?json(p(ledgerPath)):emptyLedger();
  const started=now(),runId='service-'+(process.env.GITHUB_RUN_ID??'local')+'-'+(process.env.GITHUB_RUN_ATTEMPT??'0')+'-'+Date.now()+'-'+sequence;
  const r=spawnSync(process.execPath,[dir+'watchdog.mjs','--once'],{cwd:work,stdio:'inherit',timeout:900000,env:{...process.env,GITHUB_RUN_ID:runId,GITHUB_EVENT_NAME:process.env.GITHUB_EVENT_NAME??'local-service'}});
  let h,ok=false,error=null;
  try{
   if(r.error||r.status!==0)throw Error('WATCHDOG_EXIT_'+(r.status??'UNKNOWN'));
   h=json(p(healthPath));const idx=json(p(dir+'candidate-pages/index.json'));
   if(!fresh(h,idx,runId,started,now()))throw Error('COLLECTOR_POSTCHECK_FAILED');
   const inputs=await readInputs(p(dir));if(inputs.snapshot!==h.snapshot)throw Error('COLLECTOR_INPUT_MISMATCH');
   const compact=packets(inputs,h,sourceCommit);
   fs.mkdirSync(p(dir+'worker-packets'),{recursive:true});
   // Reset generated pages so a new snapshot cannot advertise stale old pages.
   for(const f of fs.readdirSync(p(dir+'worker-packets')))if(/^(market|discovery)-page-\d+\.json$/.test(f))fs.unlinkSync(p(dir+'worker-packets/'+f));
   for(const [worker,packet] of Object.entries(compact)){
    const {pages,...entry}=packet;
    write(p(dir+'worker-packets/'+worker+'.json'),entry);
    for(const page of pages)write(p(dir+'worker-packets/'+page.file),page);
    write(p(dir+'worker-packets/'+worker+'-index.json'),{schema:'r31.packet-index.v1',mode:'RESEARCH_ONLY',non_executable:true,worker,snapshot:packet.snapshot,total_available:packet.total_available,pages:pages.map(x=>({file:x.file,offset:x.offset,count:x.rows.length,next_file:x.next_file}))});
   }
   ok=true;
  }catch(e){error=String(e.message).slice(0,500)}
  if(!ok){
   // Do not reuse a prior success or a partially written current snapshot.
   h={schema:'cleanroom.collector-health.v1',mode:'RESEARCH_ONLY',run_id:runId,event:process.env.GITHUB_EVENT_NAME??'local-service',sample:0,started_at:started,finished_at:now(),status:'FAILED',snapshot:null,fresh_research_quotes:0,steps:[],service_error:error};
   const ledger=append(previous,h);h.cadence_24h=coverage(ledger,h.finished_at);write(p(ledgerPath),ledger);write(p(healthPath),h);
  }
  const status={schema:'cleanroom.collector-service.v1',mode:'RESEARCH_ONLY',non_executable:true,status:ok?'OK':'FAILED',run_id:runId,github_run_id:process.env.GITHUB_RUN_ID??null,base_commit:base,runtime_commit:sourceCommit,runtime_blobs:runtimeBlobs,started_at:started,finished_at:now(),snapshot:ok?h.snapshot:null,fresh_research_quotes:ok?h.fresh_research_quotes:0,error,cadence_24h:h.cadence_24h,limitations:'Separate research-only data branch; no execution quotes guaranteed and no 24/7 claim until cadence passes.'};
  write(p(statusPath),status);
  const files=[healthPath,ledgerPath,statusPath,...(ok?dataPaths:[])];
  git(work,['add','--',...files]);
  const staged=git(work,['diff','--cached','--name-only']).split('\n').filter(Boolean);
  if(!staged.length||staged.some(f=>!files.some(x=>x.endsWith('/')?f.startsWith(x):f===x)))throw Error('COLLECTOR_STAGING_SCOPE_VIOLATION');
  git(work,['commit','-m','R31 isolated collector '+runId]);
  const commit=git(work,['rev-parse','HEAD']);
  if(remoteHead(repo)!==expected)throw Error('COLLECTOR_CONCURRENT_PUBLISHER');
  // Non-force push; the expected parent check and remote readback guard against lost state.
  git(work,['push','origin',commit+':'+ref]);
  const observed=remoteHead(repo);if(observed!==commit)throw Error('COLLECTOR_REMOTE_READBACK_MISMATCH');
  console.log(JSON.stringify({...status,ref,commit,readback:true,files:staged.length}));
  return ok;
 }finally{
  if(added)git(repo,['worktree','remove','--force',work],{allowFail:true});
  fs.rmSync(temp,{recursive:true,force:true});
 }
}
function selfTest(){
 const t='2026-11-27T08:00:00Z',u='2026-11-27T08:00:10Z';
 const h={schema:'cleanroom.collector-health.v1',mode:'RESEARCH_ONLY',run_id:'fixture',status:'OK',started_at:t,finished_at:u,snapshot:u,fresh_research_quotes:1};
 assert.ok(fresh(h,{snapshot:u},'fixture',t,u));
 assert.ok(!fresh(h,{snapshot:u},'other',t,u));
 assert.ok(!fresh(h,{snapshot:u},'fixture',t,'2026-11-27T08:06:00Z'));
 assert.ok(!fresh({...h,status:'FAILED'},{snapshot:u},'fixture',t,u));
 assert.ok(!fresh(h,{snapshot:t},'fixture',t,u));
 assert.ok(!fresh({...h,fresh_research_quotes:0},{snapshot:u},'fixture',t,u));
 assert.equal(ref,'refs/heads/cleanroom-collector-r31-pilot-v1');
 const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'r31-runtime-fixture-'));
 try{
  const src=path.join(fixture,'source'),dst=path.join(fixture,'old-data');
  fs.mkdirSync(path.join(src,dir),{recursive:true});fs.mkdirSync(path.join(dst,dir),{recursive:true});
  git(src,['init','-q']);git(dst,['init','-q']);
  for(const f of runtimeFiles){fs.writeFileSync(path.join(src,dir,f),'new runtime '+f+'\n');fs.writeFileSync(path.join(dst,dir,f),'old runtime '+f+'\n')}
  git(src,['add','--',dir]);git(src,['commit','-qm','fixture runtime']);
  const pin=git(src,['rev-parse','HEAD']),blobs=overlayRuntime(src,dst,pin);
  for(const f of runtimeFiles){assert.equal(fs.readFileSync(path.join(dst,dir,f),'utf8'),'new runtime '+f+'\n');assert.equal(git(dst,['hash-object',dir+f]),blobs[dir+f])}
  fs.writeFileSync(path.join(src,dir,runtimeFiles[0]),'uncommitted patch');
  assert.throws(()=>overlayRuntime(src,dst,pin),/COLLECTOR_RUNTIME_DIRTY/);
 }finally{fs.rmSync(fixture,{recursive:true,force:true})}
 console.log('Collector service fixtures passed: identity, freshness, failed cycle, scope, pinned runtime replaces stale data-branch code, rejects dirty runtime');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length===1&&args[0]==='--self-test')selfTest();
 else if(args.length===1&&/^--cycles=[2-3]$/.test(args[0])){
  const repo=git(process.cwd(),['rev-parse','--show-toplevel']),limit=Number(args[0].split('=')[1]);
  let failed=0;
  for(let i=1;i<=limit;i++){const start=Date.now();if(!await cycle(repo,i))failed++;if(i<limit)await sleep(Math.max(0,interval-(Date.now()-start)))}
  console.log(JSON.stringify({bounded_cycles:limit,failed,continuous:false}));if(failed)process.exitCode=1;
 }else if(args.length===1&&['--once','--continuous'].includes(args[0])){
  const repo=git(process.cwd(),['rev-parse','--show-toplevel']);let i=0;
  do{const start=Date.now();const ok=await cycle(repo,++i);if(args[0]==='--once'){if(!ok)process.exitCode=1;break}await sleep(Math.max(0,interval-(Date.now()-start)))}while(true);
 }else throw Error('Usage: --self-test | --once | --cycles=2 | --cycles=3 | --continuous (isolated branch only)');
}
