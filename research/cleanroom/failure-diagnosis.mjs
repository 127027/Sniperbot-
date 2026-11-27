import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseReturn} from './scheduler-capture.mjs';
const text=(v,n=1000)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
export function validate(raw,worker,baseline){
 const {parsed:p,error}=parseReturn(raw),errors=[];
 if(error||!p||p.schema!=='r31.failure-diagnosis.v1'||p.worker!==worker||p.baseline_run!==baseline||p.evidence_run!=='46028677135'||p.new_test_run!=='46070602310'||p.end_marker!=='R31_END'||raw.length>6500)return {status:'INVALID_DIAGNOSIS',errors:['SCHEMA_BINDING_OR_LENGTH'],accepted:false};
 if(!Array.isArray(p.findings)||p.findings.length<3||p.findings.length>5)return {status:'INVALID_DIAGNOSIS',errors:['FINDING_COUNT'],accepted:false};
 for(const [i,f] of p.findings.entries()){
 if(!f||!['failed_step','observed_error','evidence_ref','why','proposed_change','acceptance_test','user_action_reason'].every(k=>text(f[k]))||!['PROVEN','HYPOTHESIS','UNKNOWN'].includes(f.root_cause_status)||typeof f.user_action_required!=='boolean')errors.push('MISSING_ACTIONABLE_FIELD:'+i);
 }
 if(!text(p.next_action)||!text(p.stop_reason))errors.push('MISSING_CONTINUATION');
 return {status:errors.length?'INVALID_DIAGNOSIS':'STRUCTURAL_DIAGNOSIS_PASS',errors,findings:p.findings.length,user_action_claims:p.findings.filter(f=>f?.user_action_required===true).length,accepted:false,limitations:'Structural validation only. Controller must independently verify evidence and proposed root cause before repair or escalation.'};
}
function test(){
 const b='baseline',f={failed_step:'handoff',observed_error:'missing manifest',evidence_ref:'fixture',root_cause_status:'PROVEN',why:'fixture',proposed_change:'fixture',acceptance_test:'fixture',user_action_required:false,user_action_reason:'fixture'};
 const p={schema:'r31.failure-diagnosis.v1',worker:'market',baseline_run:b,evidence_run:'46028677135',new_test_run:'46070602310',findings:[f,{...f},{...f}],next_action:'fixture',stop_reason:'fixture',end_marker:'R31_END'};
 const v=x=>validate(JSON.stringify(x),'market',b);assert.equal(v(p).status,'STRUCTURAL_DIAGNOSIS_PASS');
 for(const field of ['why','proposed_change','acceptance_test','user_action_reason']){const r=structuredClone(p);delete r.findings[0][field];assert.equal(v(r).status,'INVALID_DIAGNOSIS')}
 assert.equal(v({...p,baseline_run:'old'}).status,'INVALID_DIAGNOSIS');assert.equal(v({...p,findings:[f]}).status,'INVALID_DIAGNOSIS');console.log('FAILURE_DIAGNOSIS_FIXTURES_PASS');
}
test();if(process.argv[2]&&process.argv[2]!=='--self-test'){const c=JSON.parse(fs.readFileSync(process.argv[2]));if(c.run?.id===process.argv[4]&&c.run?.recorded_status==='completed'&&c.worker===process.argv[3]&&c.content_truncated!==true){const r=validate(c.raw_report,process.argv[3],process.argv[5]);console.log(JSON.stringify(r));if(r.status!=='STRUCTURAL_DIAGNOSIS_PASS')process.exitCode=1;}else throw Error('CAPTURE_BINDING');}
