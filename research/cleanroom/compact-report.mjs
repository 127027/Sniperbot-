import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {inspect,parseReturn} from './scheduler-capture.mjs';
import {evaluate} from './prefetched-analysis.mjs';
const max=7500,observedLimit=12000;
const text=(x,n)=>typeof x==='string'&&x.trim().length>0&&x.length<=n;
const codes=['IDENTITY','FRESHNESS','SECURITY','CATALYST','ENTRY_EXIT','COSTS','POOL_COVERAGE','POOL_DISAGREEMENT','LOW_ACTIVITY'];
export function check(p,c,worker,runId){
 const a=inspect(c);
 if(a.worker!==worker||a.run_id!==runId||a.recorded_status!=='completed')throw Error('CAPTURE_BINDING');
 const n=p.candidates.length,profile=n===4?'COMPACT_4_V1':n===10?'COMPACT_10_V1':null,reasonLimit=n===10?160:320,stepLimit=n===10?80:150;
 const raw=c.raw_report,{parsed:r,error}=parseReturn(raw),errors=[];
 if(error)return {status:raw.length===observedLimit?'SUSPECTED_TRANSPORT_TRUNCATION':'INVALID_JSON',length:raw.length,errors:['INVALID_JSON'],accepted:false,verified_buys:0};
 if(raw.length>max)errors.push('RESPONSE_BUDGET_EXCEEDED');
 if(r?.schema!=='r31.packet-analysis.v1'||r?.end_marker!=='R31_END'||!profile||r?.report_profile!==profile)errors.push('PROFILE_OR_END_MARKER');
 if(!Array.isArray(r?.rows)||r.rows.length!==n)errors.push('ROW_COUNT');
 for(const x of r?.rows??[]){
  if(!text(x.reason,reasonLimit)||!Array.isArray(x.gaps)||!x.gaps.length||x.gaps.length>codes.length||x.gaps.some(g=>!codes.includes(g))||new Set(x.gaps).size!==x.gaps.length)errors.push('ROW_BUDGET_OR_GAP_CODES');
  if(!Array.isArray(x.source_ids)||new Set(x.source_ids).size!==x.source_ids.length||!Array.isArray(x.failed_source_ids)||new Set(x.failed_source_ids).size!==x.failed_source_ids.length)errors.push('DUPLICATE_OR_MISSING_SOURCE_IDS');
 }
 if(!Array.isArray(r?.steps)||r.steps.length!==n+2||r.steps.some(s=>!text(s?.action,45)||!text(s?.result,stepLimit))||r.steps[0]?.action!=='RECEIVE'||r.steps[n+1]?.action!=='REPORT'||r.steps.slice(1,-1).some((s,i)=>s.action!=='ASSESS_'+(i+1)))errors.push('TRACE_BUDGET');
 if(!['fix_hypothesis','next_test','acceptance','stop_reason'].every(k=>text(r?.[k],240)))errors.push('DIAGNOSIS_BUDGET');
 const v=evaluate(p,raw,worker);
 errors.push(...v.errors);
 return {status:errors.length?'INCOMPLETE':'COMPACT_STRUCTURAL_PASS',errors,length:raw.length,assessed:v.assessed??0,accepted:false,verified_buys:0};
}
function test(p){
 const make=()=>({schema:'r31.packet-analysis.v1',report_profile:p.candidates.length===10?'COMPACT_10_V1':'COMPACT_4_V1',packet_id:p.id,worker:'market',mode:'RESEARCH_ONLY',non_executable:true,rows:p.candidates.map(c=>({chain:c.chain,contract:c.contract,decision:'DATA_GAP',reason:'Fixture only',source_ids:c.sources.filter(s=>s.status==='READ').map(s=>s.id),failed_source_ids:c.sources.filter(s=>s.status!=='READ').map(s=>s.id),gaps:['IDENTITY','ENTRY_EXIT']})),steps:['RECEIVE',...p.candidates.map((_,i)=>'ASSESS_'+(i+1)),'REPORT'].map((action,i)=>({seq:i+1,action,status:'OK',result:'Fixture only'})),fix_hypothesis:'Fixture',next_test:'Fixture',acceptance:'Fixture',stop_reason:'Fixture',end_marker:'R31_END'});
 const wrap=raw=>({schema:'r31.scheduler-capture.v1',mode:'RESEARCH_ONLY',non_executable:true,worker:'market',task_id:'fixture',run:{id:'fixture',recorded_status:'completed',started_at:'2026-11-27T13:00:00Z',completed_at:'2026-11-27T13:00:01Z'},raw_report:raw});
 const testRaw=r=>check(p,wrap(JSON.stringify(r)),'market','fixture');
 assert.equal(testRaw(make()).status,'COMPACT_STRUCTURAL_PASS');
 const cut=('<escape>{"broken":"'+ 'x'.repeat(12000)).slice(0,12000);
 assert.equal(check(p,wrap(cut),'market','fixture').status,'SUSPECTED_TRANSPORT_TRUNCATION');
 for(const mutate of [r=>delete r.end_marker,r=>r.rows.pop(),r=>r.rows[0].source_ids.push(r.rows[0].source_ids[0]),r=>r.rows[0].reason='x'.repeat(321),r=>r.steps.pop(),r=>r.fix_hypothesis='x'.repeat(241),r=>r.rows[0].decision='BUY']){
  const r=make();mutate(r);assert.equal(testRaw(r).status,'INCOMPLETE');
 }
 console.log('Compact fixtures passed: truncation, missing end, missing row, duplicated sources, field budgets, trace and BUY rejection.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 if(process.argv.includes('--self-test'))test(p);
 else{const c=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));const result=check(p,c,process.argv[4],process.argv[5]);console.log(JSON.stringify(result));if(result.status!=='COMPACT_STRUCTURAL_PASS')process.exitCode=1;}
}
