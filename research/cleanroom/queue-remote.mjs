// Isolated state-ref transport. No trading, scheduling or production branch writes.
// The authenticated coordinator owns this state ref; workers read their packets
// and publish research artifacts elsewhere. Git remote access is preconfigured.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {openCoordinator} from './queue-coordinator.mjs';
const zero='0'.repeat(40),validSha=x=>/^[0-9a-f]{40}$/.test(x);
const validRef=x=>/^refs\/heads\/cleanroom-coordinator-[A-Za-z0-9_-]+$/.test(x);
function git(repo,args,allowFailure=false){
 const r=spawnSync('git',['--no-replace-objects','-C',repo,...args],{encoding:'utf8',timeout:45000,maxBuffer:64*1024*1024});
 if(r.error||r.status!==0){if(allowFailure&&!r.error)return null;throw Error('STATE_TRANSPORT_FAILED:'+args[0]);}
 return r.stdout.trim();
}
export function openRemoteCoordinator(repo,ref='refs/heads/cleanroom-coordinator-isolated'){
 if(!validRef(ref))throw Error('INVALID_ISOLATED_STATE_REF');
 const coordinator=openCoordinator(repo,ref);
 // Dedicated bare cache only: no reset of a user's working tree.
 if(git(repo,['rev-parse','--is-bare-repository'])!=='true')throw Error('BARE_STATE_CACHE_REQUIRED');
 const remoteHead=()=>{
  const lines=git(repo,['ls-remote','--refs','origin',ref]).split('\n').filter(Boolean);
  if(!lines.length)return zero;
  const p=lines[0].split(/\s+/);
  if(lines.length!==1||!validSha(p[0])||p[1]!==ref)throw Error('BAD_REMOTE_HEAD');
  return p[0];
 };
 function refresh(){
  const h=remoteHead(),local=coordinator.read().head;
  if(h!==zero){
   git(repo,['fetch','--no-tags','origin',ref]);
   if(git(repo,['rev-parse','FETCH_HEAD'])!==h)throw Error('REMOTE_CHANGED_DURING_FETCH');
   if(local!==h)git(repo,['update-ref',ref,h,local]);
  }else if(local!==zero)git(repo,['update-ref','-d',ref,local]);
  const current=coordinator.read();
  if(current.head!==h)throw Error('LOCAL_STATE_CHANGED');
  return current;
 }
 function transact(expected,operation,...args){
  if(!validSha(expected))throw Error('INVALID_EXPECTED_HEAD');
  if(!['assignClaimed','receipt','close'].includes(operation))throw Error('INVALID_REMOTE_OPERATION');
  const current=refresh();if(current.head!==expected)throw Error('REMOTE_STATE_CAS_CONFLICT');
  const result=coordinator[operation](expected,...args);
  if(result.head===expected)return result;
  // The new commit must descend from expected. Force-with-lease compares the
  // actual remote ref atomically; it is never a general force push.
  if(expected!==zero)git(repo,['merge-base','--is-ancestor',expected,result.head]);
  const lease='--force-with-lease='+ref+':'+(expected===zero?'':expected);
  const pushed=git(repo,['push',lease,'origin',result.head+':'+ref],true);
  const observed=remoteHead();
  if(observed!==result.head){
   if(observed!==zero){
    git(repo,['fetch','--no-tags','origin',ref]);
    if(git(repo,['merge-base','--is-ancestor',result.head,'FETCH_HEAD'],true)!==null)return result;
   }
   if(pushed===null)throw Error('REMOTE_STATE_CAS_CONFLICT_OR_PUSH_FAILED');
   throw Error('REMOTE_READBACK_MISMATCH');
  }
  return result;
 }
 return {refresh,transact};
}
function selfTest(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'remote-queue-'));
 try{
  const origin=path.join(dir,'origin'),a=path.join(dir,'a'),b=path.join(dir,'b');
  for(const p of [origin,a,b]){fs.mkdirSync(p);git(p,['init','--bare','-q']);}
  for(const p of [a,b])git(p,['remote','add','origin',origin]);
  const x=openRemoteCoordinator(a),y=openRemoteCoordinator(b);
  const t='2026-11-27T08:00:00Z',rows=Array.from({length:40},(_,i)=>({chain:'ethereum',contract:'0x'+(i+1).toString(16).padStart(40,'0'),sources:[{url:'https://example.org/discovery',retrieved_at:t}]}));
  const packet=(i)=>({scan_id:'hour1-dot'+i,worker:'dot'+i,at:t,registry:rows,candidates:[],limit:8,lease_seconds:900});
  const h0=x.refresh().head;assert.equal(y.refresh().head,h0);
  let result=x.transact(h0,'assignClaimed',packet(1));
  assert.throws(()=>y.transact(h0,'assignClaimed',packet(2)),/REMOTE_STATE_CAS_CONFLICT/);
  for(let i=2;i<=5;i++){const z=i%2?x:y;result=z.transact(z.refresh().head,'assignClaimed',packet(i));}
  const restarted=openRemoteCoordinator(b),read=restarted.refresh(),packets=Object.values(read.bundle.packets);
  assert.equal(read.head,result.head);assert.equal(packets.length,5);
  const assigned=packets.flatMap(p=>p.rows);assert.equal(assigned.length,40);assert.equal(new Set(assigned.map(r=>r.id)).size,40);
  assert.equal(new Set(assigned.map(r=>r.token)).size,40);
  for(const p of packets)for(const r of p.rows){const lease=read.bundle.queue.jobs[r.id].lease;assert.equal(lease.worker,p.worker);assert.equal(lease.token,r.token);assert.equal(lease.expires_at,r.lease_expires_at);}
  assert.equal(restarted.transact(read.head,'assignClaimed',packet(5)).head,read.head);
  assert.throws(()=>openRemoteCoordinator(a,'refs/heads/main'),/INVALID_ISOLATED_STATE_REF/);
  console.log(JSON.stringify({test:'five-worker remote handoff',workers:5,assigned:40,unique:40,remote_readback:true,stale_writer_rejected:true,replay_idempotent:true,mode:'RESEARCH_ONLY',fixture_only:true}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.includes('--self-test'))selfTest();else throw Error('Isolated library only; no deployment enabled.');}
