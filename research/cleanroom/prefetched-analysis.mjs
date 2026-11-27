import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {parseReturn} from './scheduler-capture.mjs';
const str=x=>typeof x==='string'&&!!x.trim();
const identity=x=>x.chain+':'+(x.chain==='solana'?x.contract:x.contract.toLowerCase());
export function validatePacket(p){
 if(p?.schema!=='r31.prefetched-analysis-packet.v1'||p.mode!=='RESEARCH_ONLY'||p.non_executable!==true||!str(p.id)||!Array.isArray(p.candidates)||!p.candidates.length)throw Error('BAD_PACKET');
 const ids=new Set(),sources=new Set();
 for(const c of p.candidates){
  if(!str(c.chain)||!str(c.contract)||ids.has(identity(c))||!Array.isArray(c.sources)||!c.sources.length||!Array.isArray(c.gaps)||!c.gaps.length)throw Error('BAD_CANDIDATE');
  ids.add(identity(c));
  for(const s of c.sources){if(!str(s.id)||sources.has(s.id)||!/^https:\/\//.test(s.url)||!str(s.summary)||!['READ','HTTP_ERROR'].includes(s.status)||s.status==='HTTP_ERROR'&&!(s.http_status>=400))throw Error('BAD_SOURCE');sources.add(s.id);}
 }
 return p;
}
export function evaluate(p,raw,worker){
 validatePacket(p);const {parsed:r,error}=parseReturn(raw);const errors=[];
 if(error||r?.schema!=='r31.packet-analysis.v1'||r.packet_id!==p.id||r.worker!==worker||r.mode!=='RESEARCH_ONLY'||r.non_executable!==true||!Array.isArray(r.rows))return {status:'INVALID_RETURN',errors:['RETURN_SCHEMA'],verified_buys:0,accepted:false};
 const seen=new Set();
 for(const x of r.rows){
  if(!str(x.chain)||!str(x.contract)){errors.push('MISSING_IDENTITY');continue}
  const id=identity(x),c=p.candidates.find(y=>identity(y)===id);
  if(!c||seen.has(id)){errors.push('UNASSIGNED_OR_DUPLICATE:'+id);continue}seen.add(id);
  if(!['WATCH','REJECT','DATA_GAP'].includes(x.decision)||!str(x.reason)||!Array.isArray(x.source_ids)||!x.source_ids.length||x.source_ids.some(s=>!c.sources.some(y=>y.id===s))||!Array.isArray(x.gaps)||!x.gaps.length)errors.push('ROW_INVALID:'+id);
  if(c.sources.some(s=>s.status==='HTTP_ERROR')&&(!Array.isArray(x.failed_source_ids)||c.sources.filter(s=>s.status==='HTTP_ERROR').some(s=>!x.failed_source_ids.includes(s.id))))errors.push('FAILED_SOURCE_OMITTED:'+id);
 }
 if(seen.size!==p.candidates.length)errors.push('MISSING_CANDIDATES');
 if(!Array.isArray(r.steps)||!r.steps.length||r.steps.some((s,i)=>s.seq!==i+1||!str(s.action)||!str(s.result)||!str(s.status))||r.steps.at(-1)?.action!=='REPORT')errors.push('MISSING_TRACE');
 if(!str(r.fix_hypothesis)||!str(r.next_test)||!str(r.acceptance)||!str(r.stop_reason))errors.push('MISSING_DIAGNOSIS');
 return {status:errors.length?'INCOMPLETE':'STRUCTURAL_PACKET_ANALYSIS_ONLY',errors,assessed:seen.size,verified_buys:0,accepted:false,worker_report:r};
}
function test(p){
 const rows=p.candidates.map(c=>({chain:c.chain,contract:c.contract,decision:'DATA_GAP',reason:'fixture',source_ids:c.sources.map(s=>s.id),failed_source_ids:c.sources.filter(s=>s.status==='HTTP_ERROR').map(s=>s.id),gaps:c.gaps}));
 const r={schema:'r31.packet-analysis.v1',packet_id:p.id,worker:'market',mode:'RESEARCH_ONLY',non_executable:true,rows,steps:[{seq:1,action:'REPORT',result:'fixture',status:'OK'}],fix_hypothesis:'fixture',next_test:'fixture',acceptance:'fixture',stop_reason:'fixture'};
 const run=x=>evaluate(p,JSON.stringify(x),'market');
 assert.equal(run(r).status,'STRUCTURAL_PACKET_ANALYSIS_ONLY');
 assert.equal(run({...r,rows:[{...rows[0],decision:'BUY'},rows[1]]}).status,'INCOMPLETE');
 assert.equal(run({...r,rows:[rows[0]]}).status,'INCOMPLETE');
 assert.equal(run({...r,rows:[rows[0],{...rows[1],failed_source_ids:[]}]}).status,'INCOMPLETE');
 assert.equal(run({...r,rows:[{...rows[0],source_ids:['invented']},rows[1]]}).status,'INCOMPLETE');
 console.log('Prefetched packet regression: exact candidate coverage, source references, failed-source reporting, no BUY promotion; fixture only');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const p=validatePacket(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));if(process.argv.includes('--self-test'))test(p);else if(process.argv[3])console.log(JSON.stringify(evaluate(p,fs.readFileSync(process.argv[3],'utf8'),process.argv[4]),null,2));else console.log(JSON.stringify({packet:p.id,candidates:p.candidates.length,valid:true,verified_buys:0}));}
