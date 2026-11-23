import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inspectV21OctoberEvidenceInventory,V21_OCTOBER_ARCHIVE_PATHS}
  from '../src/v21-october-evidence-inventory.mjs';

const load=async()=>{
  const raw={};
  for(const path of Object.values(V21_OCTOBER_ARCHIVE_PATHS)){
    raw[path]=await readFile(path,'utf8');
  }
  return raw;
};
const change=(raw,path,fn)=>{
  const cloned={...raw};
  const o=JSON.parse(cloned[path]);
  fn(o);
  cloned[path]=JSON.stringify(o,null,2)+'\n';
  return cloned;
};
test('existing October originals are source-segregated, internally Git-SHA matched, not a blind trading sample',async()=>{
 const a=inspectV21OctoberEvidenceInventory(await load());
 assert.equal(a.original_document_integrity,'INTERNAL_GIT_BLOBS_MATCH');
 assert.equal(a.integrity_issues.length,0);
 assert.equal(a.file_count,5);
 assert.equal(a.archived_shadow_baseline_status,'DATA_GAP_UNABLE_TO_CERTIFY_TRADING_PERFORMANCE');
 assert.equal(a.post_event_winner_reference_rows,65);
 assert.equal(a.reported_pool_link_count,8);
 assert.deepEqual(a.synthetic_input_snapshot_counts,{qa04:4,qa80:4});
 assert.equal(a.historically_permitted_discovery_inputs_from_these_files,0);
 assert.equal(a.empirical_pnl_test_usdc,null);
 assert.equal(a.independent_winner_recall,null);
 assert.equal(a.QA04_release_authorized,false);
 assert.equal(a.orders_written,0);
});
test('original baseline SHA mismatch blocks archive acceptance, even if a header is preserved',async()=>{
 const raw=await load(),path=V21_OCTOBER_ARCHIVE_PATHS.baseline;
 const a=inspectV21OctoberEvidenceInventory(change(raw,path,o=>o.principle='Altered archive'));
 assert.equal(a.original_document_integrity,'BLOCKED_INCONSISTENT_ARCHIVE');
 assert.ok(a.integrity_issues.includes('BASELINE_GIT_BLOB_MISMATCH'));
 assert.equal(a.QA04_release_authorized,false);
});
test('changed retrospective reference cannot be promoted to discovered token',async()=>{
 const raw=await load(),path=V21_OCTOBER_ARCHIVE_PATHS.reference;
 const a=inspectV21OctoberEvidenceInventory(change(raw,path,o=>o.entries[0].usable_as_discovery_seed=true));
 assert.ok(a.integrity_issues.includes('WINNER_ROWS_NOT_SEPARATED_FROM_DECISION_INPUTS'));
 assert.ok(a.integrity_issues.includes('WINNER_REFERENCE_GIT_BLOB_MISMATCH'));
 assert.equal(a.genuine_gpt_october_reviews_verified,0);
});
test('comparison cannot assert historical fills, credible recall or leaked winner discovery',async()=>{
 const raw=await load(),path=V21_OCTOBER_ARCHIVE_PATHS.comparison;
 const a=inspectV21OctoberEvidenceInventory(change(raw,path,o=>{
  o.baseline_model_fills=1;
  o.independently_established_winner_recall=.99;
  o.reference_never_used_as_discovery_input=false;
 }));
 assert.ok(a.integrity_issues.includes('COMPARISON_PROMOTES_UNPROVEN_TRADING_OR_RECALL'));
 assert.equal(a.verified_historical_buy_sell_trades,0);
});
test('synthetic fixtures cannot be relabeled as real market evidence',async()=>{
 const raw=await load(),path=V21_OCTOBER_ARCHIVE_PATHS.qa04;
 const a=inspectV21OctoberEvidenceInventory(change(raw,path,o=>{
   o.real_historical_provider_evidence_count=4;
   o.snapshots[0].provenance='ORIGINAL_CAPTURE';
 }));
 assert.ok(a.integrity_issues.includes('QA04_UNVERIFIED_FIXTURE_CLAIMS_REAL_MARKET'));
 assert.equal(a.real_historical_quote_pairs_verified,0);
});
test('missing archive and malformed JSON are fail-closed',async()=>{
 const raw=await load();
 delete raw[V21_OCTOBER_ARCHIVE_PATHS.reference];
 assert.throws(()=>inspectV21OctoberEvidenceInventory(raw),/INVALID_OCTOBER_EVIDENCE_ARCHIVE_/);
 const good=await load();good[V21_OCTOBER_ARCHIVE_PATHS.baseline]='this is not JSON';
 assert.throws(()=>inspectV21OctoberEvidenceInventory(good),/INVALID_OCTOBER_EVIDENCE_ARCHIVE_/);
});
