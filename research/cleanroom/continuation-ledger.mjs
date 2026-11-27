// Isolated continuation ledger. Does not invoke a scheduler, source API or trade.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {inspect} from './scheduler-capture.mjs';
const sha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const nonempty=x=>typeof x==='string'&&!!x.trim();
const norm=x=>typeof x==='string'?x.trim().replace(/\s+/g,' '):'';
const attempts=new Set(['OK','PARTIAL','ERROR','EMPTY']);
const hash=x=>createHash('sha256').update(x).digest('hex');
export function fromDiagnosis(d){
 if(d?.schema!=='r31.controller-diagnosis.v2'||d.mode!=='RESEARCH_ONLY'||d.non_executable!==true||!Array.isArray(d.workers))throw Error('INVALID_DIAGNOSIS');
 const jobs=[];
 for(const w of d.workers){
  if(!['market','discovery'].includes(w.worker)||!w.run?.id||!sha(w.capture?.blob_sha))throw Error('INVALID_PARENT');
  for(const s of w.steps??[]){
   if(!['SOURCE_QUERY','SOURCE_READ'].includes(s.kind)||s.status!=='NOT_EXECUTED')continue;
   const request=norm(s.request);if(!request||!Number.isInteger(s.seq))throw Error('INVALID_CURSOR');
   jobs.push({id:w.run.id+':'+s.seq,worker:w.worker,parent_run:w.run.id,parent_blob:w.capture.blob_sha,seq:s.seq,request,status:'PENDING',attempts:[]});
  }
 }
 if(new Set(jobs.map(j=>j.id)).size!==jobs.length)throw Error('DUPLICATE_JOB');
 return {schema:'r31.continuation-ledger.v1',mode:'RESEARCH_ONLY',non_executable:true,revision:0,jobs,used_runs:[]};
}
export function assign(state,worker,{id,task_id,request,baseline_run,at}){
 if(!nonempty(id)||!nonempty(task_id)||!nonempty(baseline_run)||!Number.isFinite(Date.parse(at))||!nonempty(request))throw Error('INVALID_ASSIGNMENT');
 if(state.jobs.some(j=>j.worker===worker&&j.status==='ASSIGNED'))throw Error('WORKER_ALREADY_ASSIGNED');
 const i=state.jobs.findIndex(j=>j.worker===worker&&j.status==='PENDING');
 if(i<0||state.jobs[i].id!==id)throw Error('CURSOR_OUT_OF_ORDER');
 const j=state.jobs[i];
 if(state.jobs.some(x=>x.dispatch?.baseline_run===baseline_run&&x.worker===worker))throw Error('BASELINE_REUSE');
 const next=structuredClone(state);next.jobs[i]={...j,status:'ASSIGNED',dispatch:{task_id,request:norm(request),baseline_run,at}};next.revision++;return next;
}
export function receive(state,id,capture,blob){
 if(!sha(blob))throw Error('INVALID_CAPTURE_BLOB');
 const i=state.jobs.findIndex(j=>j.id===id),j=state.jobs[i];
 if(!j||j.status!=='ASSIGNED')throw Error('NOT_ASSIGNED');
 const r=inspect(capture);
 if(capture.task_id!==j.dispatch.task_id||r.worker!==j.worker||r.run_id===j.dispatch.baseline_run||state.used_runs.includes(r.run_id)||Date.parse(r.started_at)<Date.parse(j.dispatch.at))throw Error('WRONG_OR_REPLAYED_RUN');
 const source=r.parsed?.steps?.find(s=>['SOURCE_QUERY','SOURCE_READ'].includes(s.kind)&&norm(s.request)===j.dispatch.request&&attempts.has(s.status)&&nonempty(s.tool)&&s.tool.toUpperCase()!=='NONE'&&nonempty(s.result)&&(s.status!=='ERROR'||nonempty(s.error)&&s.error!=='NONE'));
 const next=structuredClone(state);next.used_runs.push(r.run_id);next.revision++;
 // Retain failures; a reported attempt is not source validation or task acceptance.
 const record={run_id:r.run_id,blob_sha:blob,raw_sha256:r.raw_sha256,reported_step:source??null,classification:source?'SOURCE_ATTEMPT_REPORTED_UNVERIFIED':'NO_MATCHING_SOURCE_ATTEMPT',verified:false};
 next.jobs[i].attempts.push(record);next.jobs[i].status=source?'ATTEMPT_REPORTED':'PENDING';
 if(!source)delete next.jobs[i].dispatch;
 return next;
}
function test(){
 const diagnosis=JSON.parse(fs.readFileSync('r31/research/cleanroom/worker-diagnostics/2026-11-27T113020Z-operational-trace-v2-summary.json','utf8'));
 const st=fromDiagnosis(diagnosis);assert.deepEqual(st.jobs.map(j=>[j.worker,j.seq]),[['market',3],['market',4],['market',5],['discovery',6],['discovery',7]]);
 const j=st.jobs[0],d={id:j.id,task_id:'fixture',request:j.request,baseline_run:j.parent_run,at:'2026-11-27T12:00:00Z'};
 const a=assign(st,'market',d);assert.throws(()=>assign(a,'market',d),/ALREADY_ASSIGNED/);assert.throws(()=>assign(st,'market',{...d,id:st.jobs[1].id}),/OUT_OF_ORDER/);
 const step={seq:1,kind:'SOURCE_QUERY',request:j.request,tool:'public search',status:'OK',action:'lookup',purpose:'test',result:'fixture result',error:'NONE',next:'report',observed_at:null};
 const payload={schema:'r31.research-return.v2',worker:'market',mode:'RESEARCH_ONLY',non_executable:true,rows:[],steps:[step,{...step,seq:2,kind:'REPORT'}],stop_reason:'fixture',next_work:'fixture',blockers:[]};
 const c={schema:'r31.scheduler-capture.v1',worker:'market',mode:'RESEARCH_ONLY',non_executable:true,task_id:'fixture',run:{id:'new-run',recorded_status:'completed',started_at:'2026-11-27T12:00:01Z',completed_at:'2026-11-27T12:00:02Z'},raw_report:JSON.stringify(payload)};
 assert.throws(()=>receive(a,j.id,{...c,run:{...c.run,id:j.parent_run}},'a'.repeat(40)),/REPLAYED/);
 const b=receive(a,j.id,c,'a'.repeat(40));assert.equal(b.jobs[0].status,'ATTEMPT_REPORTED');assert.equal(b.jobs[0].attempts[0].verified,false);assert.equal(b.jobs[1].status,'PENDING');
 const c2=assign(b,'market',{...d,id:st.jobs[1].id,request:st.jobs[1].request,baseline_run:'new-run'});
 assert.throws(()=>receive(c2,st.jobs[1].id,c,'b'.repeat(40)),/REPLAYED/);
 const c3={...c,run:{...c.run,id:'second-run'},raw_report:JSON.stringify({...payload,steps:[{...step,status:'NOT_EXECUTED'},payload.steps[1]]})};
 const c4=receive(c2,st.jobs[1].id,c3,'b'.repeat(40));assert.equal(c4.jobs[1].status,'PENDING');assert.equal(c4.jobs[1].attempts.length,1);
 console.log(JSON.stringify({test:'real historical pending-step extraction + synthetic receipt regression',jobs:st.jobs.map(j=>({worker:j.worker,seq:j.seq,status:j.status})),replay_rejected:true,skipped_stays_pending:true,verified_research:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.includes('--self-test'))test();else console.log(JSON.stringify(fromDiagnosis(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2))}
