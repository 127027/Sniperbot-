import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
// Raw scheduler capture is evidence of what the worker reported, never a trade.
export function inspect(c){
 const r=c?.run,t=Date.parse(r?.started_at),e=Date.parse(r?.completed_at);
 if(c?.schema!=='r31.scheduler-capture.v1'||c.mode!=='RESEARCH_ONLY'||c.non_executable!==true||!['market','discovery'].includes(c.worker)||typeof c.task_id!=='string'||!r?.id||!['completed','failed','no_update'].includes(r.recorded_status)||!Number.isFinite(t)||!Number.isFinite(e)||e<t||typeof c.raw_report!=='string'||!c.raw_report.trim())throw Error('CAPTURE_INVALID');
 let parsed=null;
 try{parsed=JSON.parse(c.raw_report)}catch{}
 const valid=parsed?.schema==='r31.research-return.v1'&&parsed.worker===c.worker&&parsed.mode==='RESEARCH_ONLY'&&parsed.non_executable===true&&Array.isArray(parsed.rows)&&typeof parsed.stop_reason==='string'&&parsed.stop_reason.trim()&&typeof parsed.next_work==='string'&&parsed.next_work.trim()&&Array.isArray(parsed.blockers);
 return {worker:c.worker,run_id:r.id,started_at:r.started_at,completed_at:r.completed_at,duration_ms:e-t,raw_sha256:createHash('sha256').update(c.raw_report).digest('hex'),capture_status:'RAW_REPORT_PRESERVED',return_status:valid?'STRUCTURED_RETURN_PRESENT_UNVERIFIED':'UNSTRUCTURED_OR_INCOMPLETE_RETURN',research_quality_verified:false,qualified_buys_verified:0,accepted:false,parsed:valid?parsed:null};
}
function test(){
 const c={schema:'r31.scheduler-capture.v1',mode:'RESEARCH_ONLY',non_executable:true,worker:'market',task_id:'fixture',run:{id:'fixture',recorded_status:'completed',started_at:'2026-11-27T10:00:00Z',completed_at:'2026-11-27T10:00:10Z'},raw_report:'some reported BUY'};
 assert.equal(inspect(c).qualified_buys_verified,0);assert.equal(inspect(c).duration_ms,10000);
 assert.throws(()=>inspect({...c,raw_report:''}),/CAPTURE_INVALID/);
 const p={schema:'r31.research-return.v1',mode:'RESEARCH_ONLY',non_executable:true,worker:'market',rows:[],stop_reason:'fixture',next_work:'fixture',blockers:[]};
 assert.equal(inspect({...c,raw_report:JSON.stringify(p)}).return_status,'STRUCTURED_RETURN_PRESENT_UNVERIFIED');
 assert.equal(inspect({...c,raw_report:JSON.stringify(p)}).accepted,false);
 console.log('Capture regression passed: raw report preserved, no implied BUY or research acceptance, invalid capture rejected.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.includes('--self-test'))test();else{const files=process.argv.slice(2);if(!files.length)throw Error('NO_CAPTURE_FILES');const out=files.map(f=>inspect(JSON.parse(fs.readFileSync(f,'utf8'))));if(new Set(out.map(x=>x.run_id)).size!==out.length)throw Error('DUPLICATE_RUN');console.log(JSON.stringify(out,null,2));}}
