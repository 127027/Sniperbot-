import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {selectObservationArchivePaths,parseResearchJsonWithLegacyTrailer}
 from '../src/v19-observation-archive-reader.mjs';

test('actual immutable Nov archive paths are found by suffix, not double-escaped regex',async()=>{
 const names=await readdir('research/observations',{recursive:true});
 const forward=selectObservationArchivePaths({paths:names,kind:'FORWARD',limit:2000});
 const pages=selectObservationArchivePaths({paths:names,kind:'ACTIVITY',limit:2000});
 assert.ok(forward.some(x=>x.endsWith('45036887325.json')));
 assert.ok(pages.some(x=>x.endsWith('45036887325-activity-pages.json')));
 assert.ok(forward.length>pages.length);
});
test('legacy archived DOT1 activity is recovered transparently, never modified',async()=>{
 const original=await readFile('research/observations/2026-11-22/45036887325-activity-pages.json','utf8');
 assert.throws(()=>JSON.parse(original),SyntaxError);
 const parsed=parseResearchJsonWithLegacyTrailer(original,{sourcePath:'ARCHIVED_DOT1'});
 assert.equal(parsed.raw_json_was_valid,false);
 assert.equal(parsed.legacy_trailer_recovered,true);
 assert.equal(parsed.recovered_suffix_hex,'5c6e');
 assert.equal(parsed.value.kind,'R29_V19_PAGE_CAPTURE_ACTIVITY_JOURNAL');
 assert.ok(parsed.value.pages.length>0);
});
test('actual prior dot1 state recovers exactly one literal suffix, preserving cadence state',async()=>{
 const original=await readFile('research/state/dot1-cadence-advice.json','utf8');
 const result=parseResearchJsonWithLegacyTrailer(original,{sourcePath:'DOT1_STATE'});
 assert.equal(result.value.kind,'R29_V19_DOT1_CADENCE_RECOMMENDATION');
 assert.equal(result.value.target,12);
 assert.equal(result.value.state.target,12);
 assert.equal(result.value.orders_authorized,0);
});
test('normal JSON and newline remain clean; arbitrary malformed payload is rejected',()=>{
 for(const s of ['{"a":1}','{"a":1}\n']){
  const r=parseResearchJsonWithLegacyTrailer(s);
  assert.equal(r.raw_json_was_valid,true);
  assert.equal(r.value.a,1);
 }
 for(const s of ['{"a":1}x','{"a":1}\\nTRAIL','{"a":1,}\\n','{"a":1}}\\n']){
  assert.throws(()=>parseResearchJsonWithLegacyTrailer(s),SyntaxError);
 }
});
test('production writer and archive selectors use real suffixes and actual newline writes',async()=>{
 const source=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 assert.match(source,/selectObservationArchivePaths/);
 assert.match(source,/parseResearchJsonWithLegacyTrailer/);
 assert.match(source,/metrics\.v19_legacy_json_suffix_recovery/);
 assert.ok(!source.includes('activity-pages\\\\.json$'));
 assert.ok(!source.includes('/\\\\.json$'));
 const oldWriter='+'+"'"+String.fromCharCode(92,92)+'n'+"'";
 assert.ok(!source.includes(oldWriter));
});
