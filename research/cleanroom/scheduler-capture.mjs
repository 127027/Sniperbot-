import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const nonempty=x=>typeof x==='string'&&!!x.trim();
const statuses=new Set(['OK','ERROR','EMPTY','SKIPPED','NOT_EXECUTED','PARTIAL']);
export function parseReturn(raw){
 let text=raw.trim(),format='PLAIN';
 // Unwrap only an exact whole-response presentation envelope. Never salvage arbitrary prose.
 const e=text.match(/^<escape>([\s\S]*)<\/escape>$/),f=text.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
 if(e){text=e[1].trim();format='ESCAPE_WRAPPER'}else if(f){text=f[1].trim();format='JSON_FENCE'}
 try{return {format,parsed:JSON.parse(text),error:null}}catch{return {format,parsed:null,error:'INVALID_JSON'}}
}
export function auditSteps(p){
 if(p?.schema!=='r31.research-return.v2')return {status:'LEGACY_NO_STEP_TRACE',errors:[],steps:[],reported_source_calls:0};
 const errors=[],steps=Array.isArray(p.steps)?p.steps:[];
 if(!steps.length)errors.push('MISSING_STEPS');
 for(let i=0;i<steps.length;i++){
  const x=steps[i];
  if(x?.seq!==i+1||!['RECEIVE','SOURCE_QUERY','SOURCE_READ','IDENTITY_CHECK','MARKET_CHECK','RISK_CHECK','COST_CHECK','DECISION','DISCOVERY','REPORT','OTHER'].includes(x.kind)||!statuses.has(x.status)||!['action','purpose','tool','request','result','error','next'].every(k=>nonempty(x[k])))errors.push('STEP_FIELDS_'+(i+1));
  if(x?.status==='ERROR'&&['NONE','N/A','-'].includes(x.error?.toUpperCase()))errors.push('MISSING_ERROR_'+(i+1));
  if(x?.status==='OK'&&x.error!=='NONE')errors.push('OK_WITH_ERROR_'+(i+1));
  if(x?.observed_at!==null&&(!nonempty(x?.observed_at)||!Number.isFinite(Date.parse(x.observed_at))))errors.push('BAD_TIME_'+(i+1));
 }
 const sourceCalls=steps.filter(x=>['SOURCE_QUERY','SOURCE_READ'].includes(x.kind)&&['OK','PARTIAL','EMPTY','ERROR'].includes(x.status));
 const succeeded=sourceCalls.filter(x=>['OK','PARTIAL'].includes(x.status));
 const rows=Array.isArray(p.rows)?p.rows:[];
 const seen=new Set();
 for(const row of rows){
  const id=row?.chain+':'+row?.contract;
  if(!nonempty(row?.chain)||!nonempty(row?.contract)||seen.has(id)||!['BUY','HOLD','SELL','WATCH','REJECT','DATA_GAP'].includes(row.decision)||!nonempty(row.reason)||!Array.isArray(row.sources)||!row.sources.length||!Array.isArray(row.step_refs)||!row.step_refs.length||!row.step_refs.every(n=>Number.isInteger(n)&&n>=1&&n<=steps.length)||!row.step_refs.some(n=>succeeded.some(x=>x.seq===n)))errors.push('ROW_TRACE_INVALID_'+id);
  seen.add(id);
 }
 if(!sourceCalls.length)errors.push('NO_SOURCE_ATTEMPT_REPORTED');
 if(rows.length&&!succeeded.length)errors.push('ROWS_WITHOUT_SOURCE_RESULT');
 if(steps.at(-1)?.kind!=='REPORT')errors.push('MISSING_REPORT_STEP');
 return {status:errors.length?'STEP_TRACE_INCOMPLETE':'STEP_TRACE_STRUCTURAL_ONLY',errors,steps,reported_source_calls:sourceCalls.length,reported_successful_source_calls:succeeded.length};
}

// Raw scheduler capture is evidence of what the worker reported, never a trade.
export function inspect(c){
 const r=c?.run,t=Date.parse(r?.started_at),e=Date.parse(r?.completed_at);
 if(c?.schema!=='r31.scheduler-capture.v1'||c.mode!=='RESEARCH_ONLY'||c.non_executable!==true||!['market','discovery'].includes(c.worker)||typeof c.task_id!=='string'||!r?.id||!['completed','failed','no_update'].includes(r.recorded_status)||!Number.isFinite(t)||!Number.isFinite(e)||e<t||typeof c.raw_report!=='string'||!c.raw_report.trim())throw Error('CAPTURE_INVALID');
 const {parsed,format,error}=parseReturn(c.raw_report);
 const valid=['r31.research-return.v1','r31.research-return.v2'].includes(parsed?.schema)&&parsed.worker===c.worker&&parsed.mode==='RESEARCH_ONLY'&&parsed.non_executable===true&&Array.isArray(parsed.rows)&&typeof parsed.stop_reason==='string'&&parsed.stop_reason.trim()&&typeof parsed.next_work==='string'&&parsed.next_work.trim()&&Array.isArray(parsed.blockers);
 return {worker:c.worker,run_id:r.id,started_at:r.started_at,completed_at:r.completed_at,duration_ms:e-t,raw_sha256:createHash('sha256').update(c.raw_report).digest('hex'),capture_status:'RAW_REPORT_PRESERVED',format,parse_error:error,trace:valid?auditSteps(parsed):null,return_status:valid?'STRUCTURED_RETURN_PRESENT_UNVERIFIED':'UNSTRUCTURED_OR_INCOMPLETE_RETURN',research_quality_verified:false,qualified_buys_verified:0,accepted:false,parsed:valid?parsed:null};
}
function test(){
 const c={schema:'r31.scheduler-capture.v1',mode:'RESEARCH_ONLY',non_executable:true,worker:'market',task_id:'fixture',run:{id:'fixture',recorded_status:'completed',started_at:'2026-11-27T10:00:00Z',completed_at:'2026-11-27T10:00:10Z'},raw_report:'some reported BUY'};
 assert.equal(inspect(c).qualified_buys_verified,0);assert.equal(inspect(c).duration_ms,10000);
 assert.throws(()=>inspect({...c,raw_report:''}),/CAPTURE_INVALID/);
 const p={schema:'r31.research-return.v1',mode:'RESEARCH_ONLY',non_executable:true,worker:'market',rows:[],stop_reason:'fixture',next_work:'fixture',blockers:[]};
 assert.equal(inspect({...c,raw_report:JSON.stringify(p)}).return_status,'STRUCTURED_RETURN_PRESENT_UNVERIFIED');
 assert.equal(inspect({...c,raw_report:JSON.stringify(p)}).accepted,false);
 assert.equal(inspect({...c,raw_report:'<escape>'+JSON.stringify(p)+'</escape>'}).format,'ESCAPE_WRAPPER');
 assert.equal(inspect({...c,raw_report:'<escape>'+JSON.stringify(p)+'</escape>'}).return_status,'STRUCTURED_RETURN_PRESENT_UNVERIFIED');
 assert.equal(inspect({...c,raw_report:'prose '+JSON.stringify(p)}).return_status,'UNSTRUCTURED_OR_INCOMPLETE_RETURN');
 const step={seq:1,kind:'SOURCE_QUERY',status:'OK',action:'exact query',purpose:'identity',tool:'public search',request:'fixture contract',result:'fixture result',error:'NONE',next:'report',observed_at:null};
 const report={...step,seq:2,kind:'REPORT',tool:'none',action:'return',request:'JSON',result:'report prepared'};
 const v2={...p,schema:'r31.research-return.v2',steps:[step,report]};
 assert.equal(inspect({...c,raw_report:JSON.stringify(v2)}).trace.status,'STEP_TRACE_STRUCTURAL_ONLY');
 assert.equal(auditSteps({...v2,steps:[{...step,status:'NOT_EXECUTED'},report]}).status,'STEP_TRACE_INCOMPLETE');
 assert.equal(auditSteps({...v2,steps:[{...step,seq:2},report]}).status,'STEP_TRACE_INCOMPLETE');
 assert.equal(auditSteps({...v2,rows:[{chain:'base',contract:'fixture',decision:'WATCH',reason:'fixture',sources:[{}],step_refs:[2]}]}).status,'STEP_TRACE_INCOMPLETE');
 console.log('Capture regression passed: raw report preserved, no implied BUY or research acceptance, invalid capture rejected.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.includes('--self-test'))test();else{const files=process.argv.slice(2);if(!files.length)throw Error('NO_CAPTURE_FILES');const out=files.map(f=>inspect(JSON.parse(fs.readFileSync(f,'utf8'))));if(new Set(out.map(x=>x.run_id)).size!==out.length)throw Error('DUPLICATE_RUN');console.log(JSON.stringify(out,null,2));}}
