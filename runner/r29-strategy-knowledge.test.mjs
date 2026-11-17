import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadValidatedR29Knowledge,R29_KNOWLEDGE_SCHEMA} from './r29-strategy-knowledge.mjs';
const tm='2026-09-01T10:00:00.000Z';
const later='2026-11-16T10:00:00.000Z';
const evidence=['a'.repeat(64),'b'.repeat(64)];
const good=(id,until='2026-07-01T10:00:00.000Z',validated='2026-08-01T10:00:00.000Z')=>({
 id,type:'EARLY_MOMENTUM',status:'INDEPENDENTLY_VALIDATED',
 last_training_event_utc:until,validated_at_utc:validated,
 general_rule:'Evaluate independently timestamped rising organic buyer intensity alongside verified liquidity changes; never equate early activity with a guaranteed breakout.',
 independent_holdout_ids:['holdout_1','holdout_2'],evidence_sha256:evidence
});
function withDoc(entries,fn){
 const dir=mkdtempSync(path.join(os.tmpdir(),'r29-strategy-asof-'));
 const file=path.join(dir,'validated-knowledge.json');
 writeFileSync(file,JSON.stringify({schema:R29_KNOWLEDGE_SCHEMA,created_at_utc:tm,entries}));
 try{return fn(file)}finally{rmSync(dir,{recursive:true,force:true})}
}
test('empty knowledge base carries zero fake validated winning patterns',()=>{
 const x=loadValidatedR29Knowledge({asof:tm});
 assert.equal(x.validated_general_rule_count,0);
 assert.deepEqual(x.rules,[]);
});
test('two independent holdouts and two hashes required before a general pattern enters GPT',()=>{
 withDoc([good('r29_rule_earlyorganic'),{...good('r29_rule_unconfirmed'),status:'DEVELOPMENT_OBSERVATION'}],file=>{
  const a=loadValidatedR29Knowledge({filename:file,asof:tm});
  assert.equal(a.rules.length,1);
  assert.equal(a.rules[0].id,'r29_rule_earlyorganic');
  assert.equal(a.excluded_unvalidated_or_future_count,1);
 });
});
test('late learned rules cannot leak into a historical early frame',()=>{
 withDoc([good('r29_rule_futureproof','2026-10-01T00:00:00.000Z',later)],file=>{
  const old=loadValidatedR29Knowledge({filename:file,asof:tm,mode:'HISTORICAL_ASOF'});
  assert.equal(old.rules.length,0);
  const newr=loadValidatedR29Knowledge({filename:file,asof:'2026-11-17T00:00:00.000Z'});
  assert.equal(newr.rules.length,1);
 });
});
test('known posthoc coin names and wallet-like contracts banned from general instructions',()=>{
 for(const pattern of ['PIERRE','0x'+'a'.repeat(40),'https://example.org']){
  withDoc([{...good('r29_rule_hindsight'),general_rule:
   'Always buy '+pattern+' because its later return has already been revealed.'}],file=>{
    assert.throws(()=>loadValidatedR29Knowledge({filename:file,asof:tm}),/NOT_SAFE_FOR_MODEL/);
   });
 }
});
test('duplicate ID or single-heldout fake success blocks knowledge load',()=>{
 withDoc([good('r29_rule_duplicate'),good('r29_rule_duplicate')],file=>{
  assert.throws(()=>loadValidatedR29Knowledge({filename:file,asof:tm}),/NOT_SAFE_FOR_MODEL/);
 });
 withDoc([{...good('r29_rule_onlyone'),independent_holdout_ids:['holdout_1']}],file=>{
  assert.equal(loadValidatedR29Knowledge({filename:file,asof:tm}).rules.length,0);
 });
});
