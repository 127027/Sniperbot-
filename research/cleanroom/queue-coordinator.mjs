// Isolated RESEARCH_ONLY coordinator. Atomic Git ref CAS for state and inboxes.
// Run against a dedicated local state repository, never the production branch.
// Only the trusted coordinator may invoke this module; worker input is untrusted.
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {empty,reduce} from './research-queue.mjs';
import {prepare} from './queue-ingest.mjs';
import {applyPinned,blobSha} from './queue-artifact.mjs';
const zero='0'.repeat(40),sha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const schema='cleanroom.coordinator.v1';
const name=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(x)&&!['constructor','prototype'].includes(x);
const own=(o,k)=>Object.hasOwn(o,k);
function git(repo,args,input){
 const r=spawnSync('git',['--no-replace-objects','-C',repo,...args],{input,encoding:'utf8',timeout:30000,maxBuffer:64*1024*1024,env:{...process.env,GIT_AUTHOR_NAME:'Cleanroom coordinator',GIT_AUTHOR_EMAIL:'coordinator@example.invalid',GIT_COMMITTER_NAME:'Cleanroom coordinator',GIT_COMMITTER_EMAIL:'coordinator@example.invalid'}});
 if(r.error||r.status!==0)throw Error('GIT_FAILED:'+args[0]+':'+String(r.stderr||r.error||r.status).slice(0,300));
 return r.stdout.trim();
}
function validate(b){
 if(b?.schema!==schema||b.mode!=='RESEARCH_ONLY'||b.non_executable!==true||!b.queue||!b.packets||Array.isArray(b.packets))throw Error('INVALID_COORDINATOR_STATE');
 return b;
}
export function openCoordinator(repo,ref='refs/heads/cleanroom-coordinator-isolated'){
 if(!/^refs\/heads\/cleanroom-coordinator-[A-Za-z0-9_-]+$/.test(ref))throw Error('INVALID_ISOLATED_STATE_REF');
 if(git(repo,['rev-parse','--show-object-format'])!=='sha1')throw Error('UNSUPPORTED_GIT_OBJECT_FORMAT');
 function head(){
  const r=spawnSync('git',['-C',repo,'show-ref','--verify','--hash',ref],{encoding:'utf8',timeout:15000});
  if(r.status===0&&sha(r.stdout.trim()))return r.stdout.trim();
  // show-ref --verify may exit 128 when missing. Distinguish with a verified repo and list.
  if(r.error)throw r.error;
  const existing=git(repo,['for-each-ref','--format=%(refname)',ref]).split('\n');
  if(existing.includes(ref))throw Error('STATE_REF_UNREADABLE');
  return zero;
 }
 function read(){
  const h=head();
  const bundle=h===zero?{schema,mode:'RESEARCH_ONLY',non_executable:true,queue:empty(),packets:{}}:validate(JSON.parse(git(repo,['show',h+':state.json'])));
  return {head:h,bundle};
 }
 function commit(expected,bundle){
  validate(bundle);
  if(!sha(expected)||head()!==expected)throw Error('STATE_CAS_CONFLICT');
  const blob=git(repo,['hash-object','-w','--stdin'],JSON.stringify(bundle)+'\n');
  const tree=git(repo,['mktree'],'100644 blob '+blob+'\tstate.json\n');
  const h=git(repo,['commit-tree',tree,...(expected===zero?[]:['-p',expected]),'-m','Research coordinator revision '+bundle.queue.revision]);
  try{git(repo,['update-ref',ref,h,expected])}catch(e){if(head()!==expected)throw Error('STATE_CAS_CONFLICT');throw e}
  // The atomic commit is authoritative even if a later writer has advanced the ref.
  return {head:h,bundle:validate(JSON.parse(git(repo,['show',h+':state.json'])))};
 }
 function transact(expected,fn){
  const current=read();if(current.head!==expected)throw Error('STATE_CAS_CONFLICT');
  const b=structuredClone(current.bundle);const changed=fn(b);
  if(changed===false)return current;
  return commit(expected,b);
 }
 function assign(expected,{scan_id,worker,at,registry,candidates,limit=8}){
  if(!name(scan_id)||!name(worker)||!Array.isArray(registry)||!Array.isArray(candidates))throw Error('BAD_ASSIGNMENT');
  return transact(expected,b=>{
   if(own(b.packets,scan_id)){
    if(b.packets[scan_id].worker!==worker)throw Error('PACKET_WORKER_MISMATCH');
    return false;
   }
   const p=prepare(b.queue,registry,candidates,at,scan_id,limit);
   b.queue=p.state;b.packets[scan_id]={...p.inbox,worker};
  });
 }
 function checkPacket(b,a){
  if(!name(a.scan_id)||!name(a.worker)||!own(b.packets,a.scan_id)||b.packets[a.scan_id].worker!==a.worker)throw Error('PACKET_WORKER_MISMATCH');
 }
 function claim(expected,{scan_id,worker,chain,contract,at,lease_seconds=300,event_id}){
  return transact(expected,b=>{
   const a={type:'CLAIM',scan_id,worker,chain,contract,at,lease_seconds,event_id,expected_revision:b.queue.revision,token:randomUUID()};
   checkPacket(b,a);
   const old=b.queue.events.find(e=>e.id===event_id);
   if(old){const o=JSON.parse(old.payload);for(const k of ['type','scan_id','worker','chain','contract','at','lease_seconds'])if(o[k]!==a[k])throw Error('EVENT_ID_COLLISION');return false;}
   b.queue=reduce(b.queue,a);
  });
 }
 function trustedCommit(artifactRepo,authorizedRef,commitId){
  if(!sha(commitId)||!/^refs\/(?:heads|remotes)\/[A-Za-z0-9_./-]+$/.test(authorizedRef)||authorizedRef.includes('..'))throw Error('BAD_TRUSTED_REF');
  if(git(artifactRepo,['rev-parse','--verify',commitId+'^{commit}'])!==commitId)throw Error('UNPINNED_ARTIFACT');
  const tip=git(artifactRepo,['rev-parse','--verify',authorizedRef+'^{commit}']);
  try{git(artifactRepo,['merge-base','--is-ancestor',commitId,tip])}catch{throw Error('ARTIFACT_NOT_ON_AUTHORIZED_REF')}
 }
 function receipt(expected,artifactRepo,authorizedRef,r){
  return transact(expected,b=>{
   checkPacket(b,r);trustedCommit(artifactRepo,authorizedRef,r.commit);
   const old=b.queue.events.find(e=>e.id===r.event_id);
   const revision=old?JSON.parse(old.payload).expected_revision:b.queue.revision;
   b.queue=applyPinned(b.queue,artifactRepo,{...r,expected_revision:revision});
   return old?false:undefined;
  });
 }
 function close(expected,artifactRepo,authorizedRef,a){
  return transact(expected,b=>{
   if(!name(a.scan_id)||!own(b.packets,a.scan_id))throw Error('UNKNOWN_PACKET');
   trustedCommit(artifactRepo,authorizedRef,a.diagnosis_commit);
   const old=b.queue.events.find(e=>e.id===a.event_id);
   const revision=old?JSON.parse(old.payload).expected_revision:b.queue.revision;
   b.queue=reduce(b.queue,{...a,type:'CLOSE_SCAN',expected_revision:revision},{repo:artifactRepo});
   return old?false:undefined;
  });
 }
 return {read,assign,claim,receipt,close};
}
function selfTest(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'cleanroom-coordinator-'));
 try{
 const repo=path.join(base,'state'),art=path.join(base,'artifacts');fs.mkdirSync(repo);fs.mkdirSync(art);
 git(repo,['init','-q','--bare']);git(art,['init','-q','-b','worker-results']);
 const c=openCoordinator(repo),t='2026-11-27T07:00:00Z',t1='2026-11-27T07:01:00Z',t2='2026-11-27T07:02:00Z';
 const rows=['a','b','c','d'].map(x=>({chain:'ethereum',contract:'0x'+x.repeat(40),sources:[{url:'https://example.org/discovery',retrieved_at:t}]}));
 const job=(scan_id,worker,at=t,limit=1)=>({scan_id,worker,at,limit,registry:rows,candidates:[]});
 const h0=c.read().head,p1=c.assign(h0,job('scan1','dot1'));
 assert.throws(()=>c.assign(h0,job('scan2','dot2')),/STATE_CAS_CONFLICT/);
 const p2=c.assign(p1.head,job('scan2','dot2'));
 assert.notEqual(p1.bundle.packets.scan1.rows[0].id,p2.bundle.packets.scan2.rows[0].id);
 assert.equal(c.assign(p2.head,job('scan2','dot2')).head,p2.head);
 const r=p1.bundle.packets.scan1.rows[0];
 const a={scan_id:'scan1',worker:'dot1',chain:r.chain,contract:r.contract,at:t,lease_seconds:60,event_id:'claim1'};
 assert.throws(()=>c.claim(p2.head,{...a,worker:'dot2'}),/PACKET_WORKER_MISMATCH/);
 const p3=c.claim(p2.head,a);assert.equal(c.claim(p3.head,a).head,p3.head);
 const restarted=openCoordinator(repo);assert.deepEqual(restarted.read(),p3);
 const root='r31/research/cleanroom/autonomy-acceptance/',file=root+'fixture.json';
 const doc={schema:'cleanroom.worker-artifact.v1',mode:'RESEARCH_ONLY',non_executable:true,scan_id:'scan1',worker:'dot1',chain:r.chain,contract:r.contract,token:p3.bundle.queue.jobs[r.id].lease.token,assessed_at_utc:t,status:'NOT_FINAL',sources:[{url:'https://example.org',observed_at:t}]};
 function publish(file,doc){const bytes=JSON.stringify(doc);fs.mkdirSync(path.dirname(path.join(art,file)),{recursive:true});fs.writeFileSync(path.join(art,file),bytes);git(art,['add','--',file]);git(art,['-c','core.hooksPath=/dev/null','commit','-qm','Isolated fixture']);return {commit:git(art,['rev-parse','HEAD']),artifact:file,blob_sha:blobSha(bytes)};}
 const pin=publish(file,doc),trusted='refs/heads/worker-results';
 const receipt={...pin,scan_id:doc.scan_id,worker:doc.worker,chain:doc.chain,contract:doc.contract,token:doc.token,at:'2026-11-27T07:00:20Z',event_id:'receipt1'};
 assert.throws(()=>restarted.receipt(p3.head,art,trusted,{...receipt,blob_sha:zero}),/PINNED_RECEIPT_MISMATCH/);
 const p4=restarted.receipt(p3.head,art,trusted,receipt);assert.equal(p4.bundle.queue.jobs[r.id].checkpoint.blob_sha,pin.blob_sha);
 assert.equal(restarted.receipt(p4.head,art,trusted,receipt).head,p4.head);
 const p5=restarted.assign(p4.head,job('scan3','dot3',t1,4));
 const recovery=p5.bundle.packets.scan3.rows.find(x=>x.id===r.id);assert.ok(recovery?.checkpoint);
 assert.throws(()=>restarted.claim(p5.head,{...a,event_id:'late1',at:t1}),/JOB_RESERVED_OTHER_SCAN/);
 const p6=restarted.claim(p5.head,{...a,scan_id:'scan3',worker:'dot3',event_id:'claim3',at:t1});
 assert.equal(p6.bundle.queue.jobs[r.id].checkpoint.blob_sha,pin.blob_sha);
 const finalDoc={...doc,scan_id:'scan3',worker:'dot3',token:p6.bundle.queue.jobs[r.id].lease.token,assessed_at_utc:t1,status:'FINAL',decision:'WATCH',reason:'isolated fixture'};
 const finalPin=publish(root+'final.json',finalDoc);
 const finalReceipt={...finalPin,scan_id:finalDoc.scan_id,worker:finalDoc.worker,chain:r.chain,contract:r.contract,token:finalDoc.token,at:'2026-11-27T07:01:10Z',event_id:'final3'};
 const p7=restarted.receipt(p6.head,art,trusted,finalReceipt);
 assert.equal(p7.bundle.queue.jobs[r.id].history.length,1);
 assert.equal(restarted.receipt(p7.head,art,trusted,finalReceipt).head,p7.head);
 const s=p7.bundle.queue.scans.scan3,diag={schema:'cleanroom.scan-diagnosis.v1',mode:'RESEARCH_ONLY',non_executable:true,scan_id:'scan3',queue_revision:p7.bundle.queue.revision,assessed_at_utc:t2,reason:'isolated incomplete scan',completed_ids:[r.id],unfinished_ids:s.ids.filter(x=>x!==r.id),buy_count:0};
 const dp=publish(root+'diagnosis.json',diag);
 const p8=restarted.close(p7.head,art,trusted,{scan_id:'scan3',diagnosis_commit:dp.commit,diagnosis_artifact:dp.artifact,diagnosis_sha:dp.blob_sha,event_id:'close3',at:t2});
 assert.equal(p8.bundle.queue.scans.scan3.status,'INCOMPLETE');assert.equal(openCoordinator(repo).read().head,p8.head);
 console.log('Coordinator fixtures passed: atomic CAS, distinct worker packets, idempotent replay, restart, worker binding, actual committed checkpoint and final receipt, lease recovery, pinned incomplete diagnosis.');
 }finally{fs.rmSync(base,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--self-test'))selfTest();
 else throw Error('Library only; use --self-test. Production deployment is not enabled.');
}
