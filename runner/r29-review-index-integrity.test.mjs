import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditR29ReviewIndex,canonicalIndexPath} from './r29-review-index-integrity.mjs';

function fixture(){
 const x=JSON.parse(readFileSync(canonicalIndexPath,'utf8'));
 return {x,now:Date.parse(x.updated_at_utc)+10000};
}
test('V6.12 current archived web-only index is valid and every journal is present',()=>{
 const {x,now}=fixture();
 const result=auditR29ReviewIndex(x,{now});
 assert.equal(result.passed,true);
 assert.equal(result.review_count,x.reviews.length);
 assert.equal(result.journal_count_checked,x.reviews.length);
 assert.equal(result.web_only_count,x.reviews.filter(r=>r.source_mode==='GPT_INDEPENDENT_WEB_ONLY').length);
 assert.equal(result.actual_model_invocation_independently_verified,false);
 assert.equal(result.price_sources_independently_verified,false);
 assert.equal(result.real_trading_enabled,false);
});
test('V6.12 31/33-hex web-only review IDs must fail BEFORE publication',()=>{
 const {x,now}=fixture();
 for(const corrupted of ['gptreview_'+x.reviews.at(-1).web_source_evidence_sha256.slice(0,31),
  'gptreview_'+x.reviews.at(-1).web_source_evidence_sha256.slice(0,33),
  'gptreview_'+'f'.repeat(32)]){
  const y=structuredClone(x);
  y.reviews.at(-1).review_id=corrupted;
  assert.throws(()=>auditR29ReviewIndex(y,{now}),
   /GPT_FORWARD_REVIEW_STATUS_INVALID|GPT_REVIEW_ID_MUST_MATCH_SOURCE_SHA256_32HEX/);
 }
});
test('source hash, journal and duplicate paths must be traceable',()=>{
 const {x,now}=fixture();
 const last=x.reviews.at(-1);
 const fake={...x,reviews:[{...last,artifact_path:last.artifact_path}]};
 assert.throws(()=>auditR29ReviewIndex(fake,{now,readJournal:()=>''}),/GPT_REVIEW_JOURNAL_MISSING_OR_INVALID/);
 assert.throws(()=>auditR29ReviewIndex(x,{now,readJournal:()=>('SOURCE WITHOUT MATCHING DIGEST '.repeat(9))}),
  /GPT_REVIEW_JOURNAL_SOURCE_SHA_MISSING/);
 const cloned=structuredClone(x);
 cloned.reviews[1].artifact_path=cloned.reviews[0].artifact_path;
 assert.throws(()=>auditR29ReviewIndex(cloned,{now}),/GPT_REVIEW_DUPLICATE_JOURNAL_PATH/);
});
