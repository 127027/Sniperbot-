// Apply independently written research artifacts only after verified Git readback.
// This is a research-only receipt adapter, not a trade executor or investment validator.
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {reduce,empty} from './research-queue.mjs';
const root='r31/research/cleanroom/autonomy-acceptance/';
const sha40=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const url=x=>typeof x==='string'&&x.startsWith('https://');
const time=x=>{const t=Date.parse(x);if(!Number.isFinite(t))throw Error('INVALID_ARTIFACT_TIME');return t};
export function blobSha(bytes){const b=Buffer.from(bytes);return createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex')}
function readPinned(repo,commit,artifact){
 if(!sha40(commit)||typeof artifact!=='string'||!artifact.startsWith(root)||!/^[-a-zA-Z0-9_.]+\.json$/.test(artifact.slice(root.length))||artifact.includes('..'))throw Error('INVALID_PINNED_LOCATOR');
 const git=args=>{const r=spawnSync('git',['-C',repo,...args],{timeout:15000,maxBuffer:2*1024*1024});if(r.status!==0)throw Error('PINNED_GIT_READ_FAILED');return r.stdout};
 const actual=git(['rev-parse',commit+':'+artifact]).toString('utf8').trim();
 const bytes=git(['show',commit+':'+artifact]);
 if(!sha40(actual)||blobSha(bytes)!==actual)throw Error('BLOB_HASH_MISMATCH');
 return {bytes,actual};
}
function actionFromBytes(q,bytes,receipt){
 const sha=blobSha(bytes);
 if(!sha40(receipt.blob_sha)||sha!==receipt.blob_sha)throw Error('RECEIPT_HASH_MISMATCH');
 const a=JSON.parse(Buffer.from(bytes).toString('utf8'));
 if(a?.schema!=='cleanroom.worker-artifact.v1'||a.mode!=='RESEARCH_ONLY'||a.non_executable!==true)throw Error('BAD_ARTIFACT_SCHEMA');
 for(const field of ['chain','contract','scan_id','worker','token'])if(typeof a[field]!=='string'||!a[field]||a[field]!==receipt[field])throw Error('ARTIFACT_BINDING_MISMATCH:'+field);
 if(time(a.assessed_at_utc)>time(receipt.at))throw Error('FUTURE_ARTIFACT');
 if(!Array.isArray(a.sources)||!a.sources.length||a.sources.some(s=>!url(s.url)||!Number.isFinite(Date.parse(s.observed_at))||time(s.observed_at)>time(a.assessed_at_utc)))throw Error('INVALID_SOURCE_PROVENANCE');
 const base={event_id:receipt.event_id,expected_revision:receipt.expected_revision,at:receipt.at,chain:a.chain,contract:a.contract,worker:a.worker,token:a.token,artifact:receipt.commit+':'+receipt.artifact,blob_sha:sha,readback_verified:true};
 const j=q.jobs[a.chain+':'+(a.chain==='solana'?a.contract:a.contract.toLowerCase())];
 if(j?.lease?.scan_id!==a.scan_id)throw Error('ARTIFACT_SCAN_MISMATCH');
 if(a.status==='NOT_FINAL')return {...base,type:'CHECKPOINT'};
 if(a.status!=='FINAL'||!['PAPER_BUY','WATCH','REJECT','DATA_GAP'].includes(a.decision)||typeof a.reason!=='string'||!a.reason.trim())throw Error('INVALID_FINAL_ARTIFACT');
 if(a.decision==='PAPER_BUY'){
  const quote=a.quote;
  if(!quote||!Number.isFinite(quote.price_eur)||quote.price_eur<=0||!url(quote.source)||time(quote.observed_at)>time(a.assessed_at_utc)||time(a.assessed_at_utc)-time(quote.observed_at)>900000)throw Error('BUY_QUOTE_AT_DECISION_INVALID');
  if(a.risk?.reviewed!==true||!Array.isArray(a.risk.sources)||!a.risk.sources.length||a.risk.sources.some(s=>!url(s.url)||time(s.observed_at)>time(a.assessed_at_utc)||time(a.assessed_at_utc)-time(s.observed_at)>1800000))throw Error('BUY_RISK_PROVENANCE_REQUIRED');
  if(a.costs?.reviewed!==true||!Array.isArray(a.costs.sources)||!a.costs.sources.length||a.costs.sources.some(s=>!url(s.url)||time(s.observed_at)>time(a.assessed_at_utc)||time(a.assessed_at_utc)-time(s.observed_at)>1800000))throw Error('BUY_COST_PROVENANCE_REQUIRED');
  // Unknown costs cannot masquerade as zero; keep them explicit and do not
  // accept a buy with unresolved costs in this isolated acceptance test.
  for(const k of ['gas_eur','dex_fee_pct','slippage_pct','buy_tax_pct','sell_tax_pct'])if(!Number.isFinite(a.costs[k])||a.costs[k]<0||(k!=='gas_eur'&&a.costs[k]>100))throw Error('BUY_COST_UNKNOWN:'+k);
 }
 return {...base,type:'FINAL',decision:a.decision,reason:a.reason,quote:a.quote,stake_eur:a.stake_eur,exit_rule:a.exit_rule,risk_reviewed:a.risk?.reviewed===true,costs_reviewed:a.costs?.reviewed===true};
}
export function applyPinned(q,repo,receipt){
 const {bytes,actual}=readPinned(repo,receipt.commit,receipt.artifact);
 if(actual!==receipt.blob_sha)throw Error('PINNED_RECEIPT_MISMATCH');
 const old=q.events.find(e=>e.id===receipt.event_id);
 if(old){
  const a=JSON.parse(old.payload);
  if(a.artifact!==receipt.commit+':'+receipt.artifact||a.blob_sha!==receipt.blob_sha||a.worker!==receipt.worker||a.token!==receipt.token||a.chain!==receipt.chain||a.contract!==receipt.contract||a.expected_revision!==receipt.expected_revision||a.at!==receipt.at)throw Error('RECEIPT_EVENT_COLLISION');
  return reduce(q,a);
 }
 return reduce(q,actionFromBytes(q,bytes,receipt));
}
async function selfTest(){
 const t='2026-11-27T07:00:00Z',at='2026-11-27T07:00:15Z',contract='0x'+'a'.repeat(40),chain='ethereum',id=chain+':'+contract;
 let q=empty(),i=0;
 const act=(type,x)=>q=reduce(q,{type,...x,event_id:'fixture-'+(++i),expected_revision:q.revision,at:t});
 const lease={chain,contract,scan_id:'scan1',worker:'dot1',token:'lease1',lease_seconds:60};
 act('ENQUEUE',{rows:[{chain,contract,source:'https://example.org',observed_at:t}]});
 act('START_SCAN',{scan_id:'scan1',ids:[id]});
 act('CLAIM',lease);
 const doc={schema:'cleanroom.worker-artifact.v1',mode:'RESEARCH_ONLY',non_executable:true,...lease,assessed_at_utc:t,status:'NOT_FINAL',sources:[{url:'https://example.org',observed_at:t}]};
 const receipt=(a,extra={})=>{const bytes=Buffer.from(JSON.stringify(a));return {bytes,r:{...lease,commit:'b'.repeat(40),artifact:root+'fixture.json',blob_sha:blobSha(bytes),event_id:'receipt-'+(++i),expected_revision:q.revision,at,...extra}}};
 const apply=(a,extra)=>{const {bytes,r}=receipt(a,extra);return reduce(q,actionFromBytes(q,bytes,r))};
 assert.throws(()=>apply(doc,{blob_sha:'0'.repeat(40)}),/RECEIPT_HASH_MISMATCH/);
 assert.throws(()=>apply({...doc,worker:'dot2'}),/ARTIFACT_BINDING_MISMATCH/);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cleanroom-artifact-'));
 try{
  const run=args=>{const r=spawnSync('git',['-C',dir,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim()};
  run(['init','-q']);run(['config','user.name','Fixture']);run(['config','user.email','fixture@example.invalid']);
  const artifact=root+'fixture.json',bytes=Buffer.from(JSON.stringify(doc));
  await fs.mkdir(path.join(dir,root),{recursive:true});await fs.writeFile(path.join(dir,artifact),bytes);
  run(['add','--',artifact]);run(['commit','-qm','Fixture']);
  const r={...lease,commit:run(['rev-parse','HEAD']),artifact,blob_sha:blobSha(bytes),event_id:'pinned-fixture',expected_revision:q.revision,at};
  q=applyPinned(q,dir,r);assert.deepEqual(applyPinned(q,dir,r),q);
  assert.throws(()=>applyPinned(q,dir,{...r,blob_sha:'0'.repeat(40)}),/PINNED_RECEIPT_MISMATCH/);
  assert.throws(()=>applyPinned(q,dir,{...r,worker:'different'}),/RECEIPT_EVENT_COLLISION/);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
 assert.equal(q.jobs[id].checkpoint.blob_sha,blobSha(Buffer.from(JSON.stringify(doc))));
 const final={...doc,status:'FINAL',decision:'PAPER_BUY',reason:'test only',quote:{chain,contract,source:'https://example.org',price_eur:1,observed_at:t},risk:{reviewed:true,sources:doc.sources},costs:{reviewed:true,sources:doc.sources,gas_eur:null,dex_fee_pct:0,slippage_pct:0,buy_tax_pct:0,sell_tax_pct:0},stake_eur:50,exit_rule:'test rule'};
 assert.throws(()=>apply(final),/BUY_COST_UNKNOWN/);
 assert.throws(()=>apply({...final,quote:{...final.quote,observed_at:'2026-11-27T07:01:00Z'}}),/BUY_QUOTE_AT_DECISION_INVALID/);
 q=apply({...final,decision:'WATCH'});assert.equal(q.jobs[id].history[0].decision,'WATCH');
 console.log('Worker artifact fixtures passed: content-addressed readback, scan/lease binding, time provenance, unknown cost refusal, valid WATCH receipt');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--self-test'))await selfTest();
 else{const [stateFile,repo,receiptFile]=process.argv.slice(2);if(!stateFile||!repo||!receiptFile)throw Error('Usage: queue-artifact.mjs STATE REPOSITORY RECEIPT');const q=JSON.parse(await fs.readFile(stateFile,'utf8')),r=JSON.parse(await fs.readFile(receiptFile,'utf8'));console.log(JSON.stringify(applyPinned(q,repo,r),null,2))}
}
