import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freezeProspectiveHoldout,validateFrozenHoldout,assignProspectiveHoldout}
 from '../src/v19-prospective-holdout-freeze.mjs';
const freezeAt='2026-11-22T20:00:00Z';
const at='2026-11-25T09:00:00Z';
const record=(stamp,n)=>({pool_key:'base:0x'+n.toString(16).padStart(40,'0'),
 decision_at_utc:stamp,available_at_utc:stamp,
 source_path:'research/decisions/verified-original-'+n+'.json'});
test('QA-05: immutable 6h purged windows are fixed before any prospective evaluation',()=>{
 const frozen=freezeProspectiveHoldout({frozenAtUtc:freezeAt,
  purgeHours:6,validationHours:24,holdoutHours:24});
 assert.equal(frozen.training_outcomes_must_be_available_before_utc,
  '2026-11-22T20:00:00.000Z');
 assert.equal(frozen.validation_start_utc,'2026-11-23T02:00:00.000Z');
 assert.equal(frozen.validation_end_utc,'2026-11-24T02:00:00.000Z');
 assert.equal(frozen.holdout_start_utc,'2026-11-24T08:00:00.000Z');
 assert.equal(frozen.holdout_end_utc,'2026-11-25T08:00:00.000Z');
 assert.equal(frozen.rules.paper_entry_amount_test_usdc,50);
 assert.equal(frozen.rules.buyer_and_sell_risk_gates_unchanged,true);
 assert.match(frozen.freeze_sha256,/^[a-f0-9]{64}$/);
 assert.equal(validateFrozenHoldout(JSON.parse(JSON.stringify(frozen))),true);
});
test('QA-05: future observations never enter training and 6-hour purges are excluded',()=>{
 const frozen=freezeProspectiveHoldout({frozenAtUtc:freezeAt});
 const observations=[
  record('2026-11-22T19:00:00Z',1),
  record('2026-11-22T22:00:00Z',2), // purge
  record('2026-11-23T04:00:00Z',3), // validation
  record('2026-11-24T04:00:00Z',4), // purge
  record('2026-11-24T09:00:00Z',5), // holdout
  record('2026-11-25T10:00:00Z',6), // future
  {...record('2026-11-23T09:00:00Z',7),source_class:'POST_EVENT_ORACLE'},
  {...record('2026-11-24T10:00:00Z',8),reported_gain_pct:4000}
 ];
 const r=assignProspectiveHoldout({freeze:frozen,observations,asOfUtc:at});
 assert.equal(r.train_count,1);
 assert.equal(r.validation_count,1);
 assert.equal(r.holdout_count,1);
 assert.equal(r.excluded.length,5);
 assert.equal(r.recall,null);
 assert.equal(r.false_positive_rate,null);
 assert.equal(r.holdout_outcome_coverage_verified,false);
 assert.equal(r.orders_authorized,0);
 assert.equal(r.future_winners_used_for_discovery,false);
});
test('QA-05: later changed stop loss, exit scheme or strategic rule hash is rejected',()=>{
 const f=freezeProspectiveHoldout({frozenAtUtc:freezeAt});
 const altered=JSON.parse(JSON.stringify(f));
 altered.rules.experimental_exit.pop();
 assert.throws(()=>validateFrozenHoldout(altered),
 /INVALID_FROZEN_HOLDOUT|FROZEN_HOLDOUT_HASH_OR_RULES_MISMATCH/);
 const different={...f,holdout_start_utc:'2026-11-24T07:00:00.000Z'};
 assert.throws(()=>validateFrozenHoldout(different),
 /FROZEN_HOLDOUT_HASH_OR_RULES_MISMATCH/);
 const f2=freezeProspectiveHoldout({frozenAtUtc:'2026-11-22T20:01:00Z'});
 assert.notEqual(f2.freeze_sha256,f.freeze_sha256);
});
test('QA-05: unlabeled 65 historical winner reference rows never seed an October holdout',async()=>{
 const historical=JSON.parse(await readFile(
 'research/evaluation/2026-10-12/v19-winner-reference-identity-status.json','utf8'));
 assert.equal(historical.entries.length,65);
 const frozen=freezeProspectiveHoldout({frozenAtUtc:freezeAt});
 const after=assignProspectiveHoldout({freeze:frozen,
  observations:historical.entries.map((x,i)=>({
   ...x,...record('2026-11-24T09:00:00Z',i+1),
   source_class:'POST_EVENT_ORACLE'})),asOfUtc:at});
 assert.equal(after.train_count,0);
 assert.equal(after.validation_count,0);
 assert.equal(after.holdout_count,0);
 assert.equal(after.excluded.length,65);
});
test('QA-05: live capture runner creates one frozen GitHub state and only reuses it after restart',async()=>{
 const source=await readFile('scripts/cloud-discovery-runner.mjs','utf8');
 const frozen=source.indexOf("const holdoutFreezePath='research/state/prospective-holdout-freeze.json'");
 const capture=source.indexOf('const capturePlan=planMultiChainCapture');
 assert.ok(frozen>=0&&frozen<capture);
 assert.match(source,/validateFrozenHoldout\(holdoutFreeze\)/);
 assert.match(source,/if\(error.code!=='ENOENT'\)throw error;/);
 assert.match(source,/holdoutFreeze=freezeProspectiveHoldout\(\{frozenAtUtc:now\(\)\}\)/);
 assert.match(source,/assignProspectiveHoldout\(\{/);
 assert.match(source,/observations:\[\]/);
 assert.doesNotMatch(source,/writeFile\('signals\/orders\//);
});
