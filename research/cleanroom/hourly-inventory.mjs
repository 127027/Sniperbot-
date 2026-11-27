// Independent report inventory. A fixture test is never a worker acceptance.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validate,aggregate} from './hourly-report.mjs';
export function inventory(root,cycleStart,at,workers=['market','discovery']){
 const start=Date.parse(cycleStart),time=Date.parse(at),end=start+3600000;
 if(!Number.isFinite(start)||!Number.isFinite(time)||start%3600000!==0)throw Error('INVALID_CYCLE_TIME');
 const stamp=new Date(start).toISOString().slice(0,13)+'-00Z',reports=[],results=[];
 for(const worker of workers){
  if(!/^[a-z0-9-]+$/.test(worker))throw Error('INVALID_WORKER');
  const file=path.join(root,stamp+'-'+worker+'-report.json');
  try{
   const raw=fs.readFileSync(file,'utf8');if(!raw.trim())throw Error('EMPTY_REPORT');
   const r=JSON.parse(raw),v=validate(r);
   if(r.worker!==worker||Date.parse(r.cycle_start)!==start||Date.parse(r.cycle_end)!==end||Date.parse(r.assessed_at)>time)throw Error('REPORT_BINDING');
   reports.push(r);results.push({worker,status:'STRUCTURAL_ONLY',file,rows:v.rows,buys:v.buys});
  }catch(e){results.push({worker,status:e.code==='ENOENT'?'MISSING':'INVALID',file,error:e.code==='ENOENT'?'EXPECTED_REPORT_NOT_FOUND':String(e.message).slice(0,300)})}
 }
 const counts=reports.length?aggregate(reports):{rows:0,distinct_buy_claims:0,goal_claimed:false,independent_quality_verified:false};
 const missing=results.some(x=>x.status!=='STRUCTURAL_ONLY');
 return {schema:'r31.hourly-inventory.v1',mode:'RESEARCH_ONLY',non_executable:true,cycle_start:new Date(start).toISOString(),cycle_end:new Date(end).toISOString(),observed_at:at,deadline_reached:time>=end,status:missing?(time<end?'PENDING_REPORTS':'INCOMPLETE_MISSING_OR_INVALID'):counts.goal_claimed?'STRUCTURAL_ONLY_NEEDS_INDEPENDENT_REVIEW':'INCOMPLETE_BUY_SHORTFALL',workers:results,counts,accepted:false,limitations:'No fixture result or structurally valid report proves research quality. Missing or invalid reports are not passes.'};
}
function selfTest(){
 const root=fs.mkdtempSync('/tmp/r31-report-guard-'),start='2026-11-27T09:00:00Z';
 try{
  assert.equal(inventory(root,start,'2026-11-27T09:30:00Z').status,'PENDING_REPORTS');
  const a=inventory(root,start,'2026-11-27T10:00:00Z');assert.equal(a.status,'INCOMPLETE_MISSING_OR_INVALID');assert.equal(a.counts.distinct_buy_claims,0);assert.equal(a.accepted,false);
  fs.writeFileSync(path.join(root,'2026-11-27T09-00Z-market-report.json'),'{');
  const b=inventory(root,start,'2026-11-27T10:00:00Z');assert.equal(b.workers[0].status,'INVALID');assert.equal(b.workers[1].status,'MISSING');
  console.log('Hourly inventory fixtures passed: missing before/after deadline, malformed report, no false acceptance');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--self-test'))selfTest();
 else{const [root,start,at]=process.argv.slice(2);const r=inventory(root,start,at??new Date().toISOString());console.log(JSON.stringify(r,null,2));if(r.status.startsWith('INCOMPLETE')&&r.deadline_reached)process.exitCode=1;}
}
