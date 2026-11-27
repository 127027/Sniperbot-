import fs from 'node:fs';
import assert from 'node:assert/strict';
import {replayCaptured,evaluate} from './prefetched-analysis.mjs';
import {parseReturn} from './scheduler-capture.mjs';
const root='r31/research/cleanroom/';
const p=JSON.parse(fs.readFileSync(root+'worker-diagnostics/2026-11-27-prefetched-analysis-packet-v1.json','utf8'));
for(const [worker,id] of [['market','98c5d1ec-a980-8328-b7ac-405a9fdc32c3'],['discovery','942d14c8-8024-8329-964d-6176442aa3ef']]){
 const c=JSON.parse(fs.readFileSync(root+'scheduler-captures/'+id+'.json','utf8'));
 const v=replayCaptured(p,c,worker,id);
 assert.equal(v.status,'STRUCTURAL_PACKET_ANALYSIS_ONLY',JSON.stringify(v.errors));assert.equal(v.assessed,2);assert.equal(v.verified_buys,0);assert.equal(v.accepted,false);
 const r=parseReturn(c.raw_report).parsed;
 for(const k of ['fix_hypothesis','next_test','acceptance'])assert.equal(evaluate(p,JSON.stringify({...r,[k]:{}}),worker).status,'INCOMPLETE');
 assert.equal(evaluate(p,JSON.stringify({...r,rows:r.rows.slice(0,1)}),worker).status,'INCOMPLETE');
 assert.throws(()=>replayCaptured(p,c,worker,'wrong'),/CAPTURE_BINDING/);
 console.log(JSON.stringify({worker,run_id:id,status:v.status,assessed:v.assessed,verified_buys:0,negative_checks:'PASS',actual_original:true}));
}
