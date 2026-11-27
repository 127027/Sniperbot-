// Research-only state machine. No wallets, orders, signals or automatic BUYs.
// Distributed writers MUST use a compare-and-swap on the entire queue blob;
// a local file is suitable only for a single writer.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const schema='cleanroom.research-queue.v1';
const chains=new Set(['solana','ethereum','bsc','base','arbitrum','polygon','optimism','avalanche']);
const time=t=>{const n=Date.parse(t);if(!Number.isFinite(n))throw Error('INVALID_TIME');return n};
const iso=t=>new Date(time(t)).toISOString();
function key(chain,contract){
 if(!chains.has(chain)||typeof contract!=='string'||!(chain==='solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(contract):/^0x[0-9a-fA-F]{40}$/.test(contract)))throw Error('INVALID_IDENTITY');
 return chain+':'+(chain==='solana'?contract:contract.toLowerCase());
}
export function empty(){return {schema,mode:'RESEARCH_ONLY',non_executable:true,revision:0,jobs:{},scans:{},events:[]}}
function validate(q){if(q?.schema!==schema||q.mode!=='RESEARCH_ONLY'||q.non_executable!==true||!Number.isSafeInteger(q.revision)||!q.jobs||!q.scans||!Array.isArray(q.events))throw Error('INVALID_QUEUE')}
export function reduce(input,action){
 validate(input);const q=structuredClone(input),at=iso(action.at),ms=time(at);
 if(typeof action.event_id!=='string'||!action.event_id||action.event_id.length>200)throw Error('EVENT_ID_REQUIRED');
 const previous=q.events.find(e=>e.id===action.event_id);
 if(previous){if(previous.payload!==JSON.stringify(action))throw Error('EVENT_ID_COLLISION');return q}
 if(action.expected_revision!==q.revision)throw Error('REVISION_CONFLICT');
 if(q.events.length&&ms<time(q.events.at(-1).at))throw Error('NON_MONOTONIC_EVENT_TIME');
 const job=()=>{const j=q.jobs[key(action.chain,action.contract)];if(!j)throw Error('UNKNOWN_JOB');return j};
 const owned=()=>{const j=job();if(j.status!=='RESEARCHING'||j.lease?.worker!==action.worker||j.lease?.token!==action.token||time(j.lease.expires_at)<=ms||q.scans[j.lease.scan_id]?.status!=='OPEN')throw Error('LEASE_INVALID');return j};
 switch(action.type){
 case 'ENQUEUE': {
  if(!Array.isArray(action.rows))throw Error('ROWS_REQUIRED');
  for(const r of action.rows){
   const id=key(r.chain,r.contract),observed=iso(r.observed_at);
   if(time(observed)>ms||typeof r.source!=='string'||!r.source.startsWith('https://'))throw Error('INVALID_DISCOVERY_EVIDENCE');
   const j=q.jobs[id]??{id,chain:r.chain,contract:id.slice(r.chain.length+1),first_seen:observed,status:'QUEUED',attempts:0,evidence:[],history:[]};
   if(time(observed)<time(j.first_seen))j.first_seen=observed;
   if(!j.evidence.some(e=>e.source===r.source&&e.observed_at===observed))j.evidence.push({source:r.source,observed_at:observed});
   if(!j.last_seen||time(observed)>time(j.last_seen))j.last_seen=observed;
   // A new sighting is not itself a buy or a completed assessment.
   q.jobs[id]=j;
  }break;
 }
 case 'START_SCAN': {
  const s=action.scan_id;if(typeof s!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,100}$/.test(s)||Object.hasOwn(q.scans,s))throw Error('INVALID_SCAN');
  if(!Array.isArray(action.ids)||!action.ids.length)throw Error('SCAN_IDS_REQUIRED');const ids=[...new Set(action.ids)];if(ids.some(id=>!Object.hasOwn(q.jobs,id)))throw Error('UNKNOWN_SCAN_JOB');
  q.scans[s]={started_at:at,ids,status:'OPEN'};break;
 }
 case 'CLAIM':{
  const j=job(),s=q.scans[action.scan_id];
  if(!s||s.status!=='OPEN'||!s.ids.includes(j.id))throw Error('JOB_NOT_IN_OPEN_SCAN');
  if(!['QUEUED','RETRY','RESEARCHING'].includes(j.status))throw Error('NOT_ELIGIBLE');
  if(j.status==='RETRY'&&time(j.retry_at)>ms)throw Error('RETRY_NOT_DUE');
  if(j.status==='RESEARCHING'&&time(j.lease.expires_at)>ms)throw Error('ALREADY_CLAIMED');
  if(typeof action.worker!=='string'||!action.worker||typeof action.token!=='string'||!action.token||!Number.isInteger(action.lease_seconds)||action.lease_seconds<10||action.lease_seconds>3600)throw Error('INVALID_LEASE');
  j.status='RESEARCHING';j.attempts++;j.lease={worker:action.worker,token:action.token,scan_id:action.scan_id,expires_at:new Date(ms+1000*action.lease_seconds).toISOString()};break;
 }
 case 'CHECKPOINT':{
  const j=owned();
  if(typeof action.artifact!=='string'||!action.artifact||!/^[0-9a-f]{40}$/.test(action.blob_sha??'')||action.readback_verified!==true)throw Error('CHECKPOINT_NOT_VERIFIED');
  j.checkpoint={artifact:action.artifact,blob_sha:action.blob_sha,at};break;
 }
 case 'FINAL':{
  const j=owned(),d=action.decision;
  if(!['PAPER_BUY','WATCH','REJECT','DATA_GAP'].includes(d)||!j.checkpoint||typeof action.artifact!=='string'||!action.artifact||!/^[0-9a-f]{40}$/.test(action.blob_sha??'')||action.readback_verified!==true||typeof action.reason!=='string'||!action.reason.trim())throw Error('FINAL_NOT_VERIFIED');
  if(d==='PAPER_BUY'){
   const e=action.quote;
   if(!e||!Number.isFinite(e.price_eur)||e.price_eur<=0||typeof e.source!=='string'||!e.source.startsWith('https://')||ms-time(e.observed_at)<0||ms-time(e.observed_at)>900000||key(e.chain,e.contract)!==j.id)throw Error('BUY_QUOTE_INVALID');
   if(action.stake_eur!==50||typeof action.exit_rule!=='string'||!action.exit_rule.trim()||action.risk_reviewed!==true||action.costs_reviewed!==true)throw Error('BUY_EVIDENCE_INCOMPLETE');
  }
  j.history.push({scan_id:j.lease.scan_id,at,decision:d,reason:action.reason,artifact:action.artifact,blob_sha:action.blob_sha});
  j.status='DECIDED';delete j.lease;delete j.checkpoint;break;
 }
 case 'RETRY':{
  const j=owned(),due=iso(action.retry_at);
  if(time(due)<ms||typeof action.reason!=='string'||!action.reason)throw Error('RETRY_REASON_REQUIRED');
  j.status='RETRY';j.retry_at=due;j.last_error=action.reason;delete j.lease;break;
 }
 case 'REOPEN':{
  const j=job();if(j.status!=='DECIDED'||typeof action.reason!=='string'||!action.reason||!action.evidence_at||time(action.evidence_at)>ms||time(action.evidence_at)<=time(j.history.at(-1).at))throw Error('REOPEN_NEEDS_NEW_EVIDENCE');
  j.status='QUEUED';j.reopen_reason=action.reason;break;
 }
 case 'CLOSE_SCAN':{
  const s=q.scans[action.scan_id];if(!s||s.status!=='OPEN')throw Error('INVALID_SCAN');
  if(typeof action.diagnosis_artifact!=='string'||!action.diagnosis_artifact||!/^[0-9a-f]{40}$/.test(action.diagnosis_sha??'')||action.readback_verified!==true)throw Error('DIAGNOSIS_NOT_VERIFIED');
  const results=s.ids.map(id=>q.jobs[id].history.findLast(h=>h.scan_id===action.scan_id));
  s.completed=results.filter(Boolean).length;s.buy_count=results.filter(h=>h?.decision==='PAPER_BUY').length;
  s.unfinished=s.ids.filter((id,i)=>!results[i]);
  for(const id of s.unfinished){const j=q.jobs[id];if(j.lease?.scan_id===action.scan_id){j.status='QUEUED';delete j.lease;}}
  s.status=s.unfinished.length?'INCOMPLETE':'COMPLETE';s.closed_at=at;s.diagnosis_artifact=action.diagnosis_artifact;s.diagnosis_sha=action.diagnosis_sha;break;
 }
 default:throw Error('UNKNOWN_ACTION');
 }
 q.revision++;q.events.push({id:action.event_id,at,type:action.type,payload:JSON.stringify(action)});return q;
}
export function next(q,at){validate(q);const ms=time(at);return Object.values(q.jobs).filter(j=>j.status==='QUEUED'||j.status==='RETRY'&&time(j.retry_at)<=ms||j.status==='RESEARCHING'&&time(j.lease.expires_at)<=ms).sort((a,b)=>a.attempts-b.attempts||a.first_seen.localeCompare(b.first_seen)||a.id.localeCompare(b.id)).map(j=>j.id)}
function selfTest(){
 let q=empty(),seq=0;const a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),id=key('ethereum',a),sha='c'.repeat(40),t='2026-11-27T07:00:00Z';
 const evt=(type,x={},at=t)=>({type,event_id:'test-'+(++seq),expected_revision:q.revision,at,...x});
 const apply=(type,x={},at=t)=>q=reduce(q,evt(type,x,at));
 const row=contract=>({chain:'ethereum',contract,source:'https://example.org/source',observed_at:t});
 const identity={chain:'ethereum',contract:a};
 const lease={...identity,worker:'dot1',token:'lease1',scan_id:'scan1',lease_seconds:60};
 apply('ENQUEUE',{rows:[row(a),row(a.toUpperCase().replace('0X','0x')),row(b)]});assert.equal(Object.keys(q.jobs).length,2);
 const e=evt('START_SCAN',{scan_id:'scan1',ids:[id,key('ethereum',b)]});q=reduce(q,e);assert.deepEqual(reduce(q,e),q);
 assert.throws(()=>reduce(q,{...e,at:'2026-11-27T07:00:01Z'}),/EVENT_ID_COLLISION/);
 assert.throws(()=>reduce(q,{...evt('CLAIM',lease),expected_revision:0}),/REVISION_CONFLICT/);
 apply('CLAIM',lease);assert.throws(()=>reduce(q,evt('CLAIM',{...lease,worker:'dot2'})),/ALREADY_CLAIMED/);
 apply('CHECKPOINT',{...lease,artifact:'checkpoint.json',blob_sha:sha,readback_verified:true});
 q=JSON.parse(JSON.stringify(q));assert.ok(next(q,'2026-11-27T07:01:00Z').includes(id));
 assert.throws(()=>reduce(q,evt('FINAL',{...lease,decision:'WATCH',reason:'test',artifact:'final.json',blob_sha:sha,readback_verified:true},'2026-11-27T07:01:00Z')),/LEASE_INVALID/);
 const l2={...lease,worker:'dot2',token:'lease2'};
 apply('CLAIM',l2,'2026-11-27T07:01:00Z');assert.equal(q.jobs[id].checkpoint.artifact,'checkpoint.json');
 const final={...l2,decision:'PAPER_BUY',artifact:'final.json',blob_sha:sha,readback_verified:true,reason:'fixture',stake_eur:50,exit_rule:'fixture',risk_reviewed:true,costs_reviewed:true};
 assert.throws(()=>reduce(q,evt('FINAL',{...final,quote:{...identity,source:'https://example.org',price_eur:1,observed_at:'2026-11-27T06:00:00Z'}},'2026-11-27T07:01:01Z')),/BUY_QUOTE_INVALID/);
 assert.throws(()=>reduce(q,evt('FINAL',{...final,quote:{chain:'ethereum',contract:b,source:'https://example.org',price_eur:1,observed_at:t}},'2026-11-27T07:01:01Z')),/BUY_QUOTE_INVALID/);
 apply('FINAL',{...final,decision:'WATCH'},'2026-11-27T07:01:01Z');
 apply('CLOSE_SCAN',{scan_id:'scan1',diagnosis_artifact:'diag.json',diagnosis_sha:sha,readback_verified:true},'2026-11-27T07:01:02Z');
 assert.equal(q.scans.scan1.status,'INCOMPLETE');assert.equal(q.scans.scan1.buy_count,0);assert.equal(q.scans.scan1.unfinished.length,1);
 apply('REOPEN',{...identity,reason:'new evidence',evidence_at:'2026-11-27T07:01:03Z'},'2026-11-27T07:01:03Z');
 assert.equal(q.jobs[id].status,'QUEUED');assert.equal(q.jobs[id].history.length,1);
 assert.throws(()=>reduce(q,evt('CLAIM',{...lease,token:'new'},'2026-11-27T07:01:04Z')),/JOB_NOT_IN_OPEN_SCAN/);
 console.log('Queue fixtures passed: identity deduplication, CAS revision, event replay, competing claims, expired lease recovery, checkpoint persistence, stale/wrong-contract BUY rejection, incomplete scan, reopening');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--self-test'))selfTest();
 else if(process.argv[2]==='init')console.log(JSON.stringify(empty(),null,2));
 else if(process.argv[2]==='apply'){const q=JSON.parse(await fs.readFile(process.argv[3],'utf8')),a=JSON.parse(await fs.readFile(process.argv[4],'utf8'));console.log(JSON.stringify(reduce(q,a),null,2))}
 else if(process.argv[2]==='next'){const q=JSON.parse(await fs.readFile(process.argv[3],'utf8'));console.log(JSON.stringify(next(q,process.argv[4])))}
 else throw Error('Use --self-test, init, apply QUEUE ACTION, or next QUEUE ISO_TIME');
}
