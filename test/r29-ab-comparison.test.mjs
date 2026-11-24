import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openComparison,comparisonInputs,commitComparisonHour,closeComparisonHour,comparisonSummary} from '../src/r29-ab-comparison.mjs';
const h='a'.repeat(64),start='2026-10-12T00:00:00.000Z',roles=['TEMPO','DISCOVERY','RISK','STRATEGY','QA'];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const tick=i=>new Date(Date.parse(start)+i*3600000).toISOString();
const prep=i=>({tickUtc:tick(i),requiredSources:['archive'],coverage:[{source:'archive',status:'VERIFIED_DECLARED_SCOPE_COMPLETE',evidence_sha256:h,knowledge_at_utc:'2026-10-11T23:58:00Z'}],candidates:[{mint:'m',status:'REJECTED_WITH_EVIDENCE',reason:'fixture only',knowledge_at_utc:'2026-10-11T23:58:00Z',evidence_sha256:h}],screenedCount:1,preparedBeforeDecision:true,sourceScope:'fixture'});
const open=()=>openComparison({comparisonId:'fixture',preparation:prep(0),marketManifestSha256:h,policySha256:h}).comparison;
function make(s,p,action='NO_TRADE'){
 const inputs=comparisonInputs(s,p);
 const ds=[{mint:'m',action,reason:'fixture only'}],dhash=hash(ds);
 const base=arm=>({arm,session_id:s.arms[arm].session_id,input_sha256:inputs[arm].input_sha256,tick_utc:p.tickUtc,analysis:'synthetic test, not GPT'});
 const singleReview={...base('SINGLE_GPT'),review_id:'single'+p.tickUtc,journal_sha256:hash(['single',p.tickUtc]),scope:roles,decisions_sha256:dhash};
 const roleReviews=roles.map(role=>({...base('FIVE_DOTS'),role,review_id:role+p.tickUtc,journal_sha256:hash([role,p.tickUtc]),dependency_sha256s:({TEMPO:[],DISCOVERY:[],RISK:['DISCOVERY'],STRATEGY:roles.slice(0,3),QA:roles.slice(0,4)})[role].map(r=>hash([r,p.tickUtc])),decisions_sha256:dhash}));
 return {SINGLE_GPT:{arm:'SINGLE_GPT',input_sha256:inputs.SINGLE_GPT.input_sha256,singleReview,decisions:structuredClone(ds)},FIVE_DOTS:{arm:'FIVE_DOTS',input_sha256:inputs.FIVE_DOTS.input_sha256,roleReviews,decisions:structuredClone(ds)}};
}
const commit=(s,i,reviews=make(s,prep(i)))=>commitComparisonHour({comparison:s,preparation:prep(i),reviews});
const close=(s,i,coverageStatus='DECLARED_SCOPE_VERIFIED')=>closeComparisonHour(s,{atUtc:tick(i+1),coverageStatus,coverageSha256:h,reason:'fixture'});
test('paired 24-hour fixture keeps independent arm journals and equal market digest',()=>{
 let s=open();assert.notEqual(s.arms.SINGLE_GPT.ledger,s.arms.FIVE_DOTS.ledger);
 for(let i=0;i<24;i++){const input=comparisonInputs(s,prep(i));assert.equal(input.SINGLE_GPT.preparation_sha256,input.FIVE_DOTS.preparation_sha256);assert.notEqual(input.SINGLE_GPT.input_sha256,input.FIVE_DOTS.input_sha256);s=commit(s,i);s=close(s,i);}
 const r=comparisonSummary(s);assert.equal(r.hours,24);assert.equal(r.finished,true);for(const arm of ['SINGLE_GPT','FIVE_DOTS']){assert.equal(r.arms[arm].reviews,24);assert.equal(r.arms[arm].complete_hours,24);assert.equal(r.arms[arm].cash_micro,'5000000000');}assert.equal(r.winner,null);assert.equal(r.actual_gpt_identity_verified,false);assert.throws(()=>comparisonInputs(s,prep(24)),/OUT_OF_ORDER/);
});
test('single GPT must not fabricate five roles; arm and review hashes bind',()=>{
 const s=open();let r=make(s,prep(0));r.SINGLE_GPT.roleReviews=r.FIVE_DOTS.roleReviews;assert.throws(()=>commit(s,0,r),/SINGLE_GPT_REVIEW_REQUIRED/);
 r=make(s,prep(0));r.SINGLE_GPT.input_sha256=r.FIVE_DOTS.input_sha256;assert.throws(()=>commit(s,0,r),/ARM_INPUT_MISMATCH/);
 r=make(s,prep(0));r.SINGLE_GPT.singleReview.decisions_sha256=h;assert.throws(()=>commit(s,0,r),/SINGLE_GPT_REVIEW_REQUIRED/);
 r=make(s,prep(0));r.FIVE_DOTS.roleReviews[2].dependency_sha256s=[];assert.throws(()=>commit(s,0,r),/ROLE_DEPENDENCY_MISMATCH/);
 r=make(s,prep(0));r.FIVE_DOTS.roleReviews[4].journal_sha256=r.FIVE_DOTS.roleReviews[3].journal_sha256;assert.throws(()=>commit(s,0,r),/FIVE_ROLE_HANDOFF_REQUIRED/);
});
test('duplicate hour, omitted candidate, future evidence, and no fake successful gap',()=>{
 let s=open();let r=make(s,prep(0));r.SINGLE_GPT.decisions=[];assert.throws(()=>commit(s,0,r),/DECISION_COVERAGE_INCOMPLETE/);
 const p=prep(0);p.candidates[0].knowledge_at_utc=tick(1);assert.throws(()=>comparisonInputs(s,p),/DECISION_EVIDENCE_NOT_READY/);
 assert.throws(()=>close(s,0),/UNREVIEWED_HOUR/);
 s=commit(s,0,make(s,prep(0),'DATA_GAP'));assert.throws(()=>comparisonInputs(s,prep(0)),/OUT_OF_ORDER/);s=close(s,0);assert.equal(comparisonSummary(s).arms.SINGLE_GPT.complete_hours,0);assert.equal(s.arms.FIVE_DOTS.interval_history[0].status,'INCOMPLETE_OR_DATA_GAP');
});
test('missing or changed preparation cannot open comparison or reuse a review',()=>{
 const p=prep(0);p.preparedBeforeDecision=false;assert.equal(openComparison({comparisonId:'gap',preparation:p,marketManifestSha256:h,policySha256:h}).comparison,null);
 const s=open();const r=make(s,prep(0));const changed=prep(0);changed.coverage[0].evidence_sha256='b'.repeat(64);assert.throws(()=>commitComparisonHour({comparison:s,preparation:changed,reviews:r}),/FIRST_REVIEW/);
});
