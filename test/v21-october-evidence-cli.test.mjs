import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('V2.1 real on-disk October source audit is read-only and reports 65 post-event winners',()=>{
 const c=spawnSync(process.execPath,['scripts/v21-october-evidence-audit.mjs'],
   {encoding:'utf8',timeout:15000});
 assert.equal(c.status,0,c.stderr);
 const prefix='R29_V21_OCTOBER_EVIDENCE ';
 assert.ok(c.stdout.trim().startsWith(prefix),c.stdout);
 const r=JSON.parse(c.stdout.trim().slice(prefix.length));
 assert.equal(r.original_document_integrity,'INTERNAL_GIT_BLOBS_MATCH');
 assert.equal(r.post_event_winner_reference_rows,65);
 assert.equal(r.source_classification,'SYNTHETIC_AND_POST_EVENT_ONLY_NO_ASOF_MARKET');
 assert.equal(r.historically_permitted_discovery_inputs_from_these_files,0);
 assert.equal(r.QA04_release_authorized,false);
 assert.equal(r.orders_written,0);
});
test('V2.1 audit cannot be invoked with production or mutating arguments',()=>{
 const c=spawnSync(process.execPath,
   ['scripts/v21-october-evidence-audit.mjs','--live'],
   {encoding:'utf8',timeout:15000});
 assert.notEqual(c.status,0);
 assert.match(c.stderr,/R29_V21_NO_ARGS_AND_NO_LIVE_IO/);
});
