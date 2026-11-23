import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('actual tracked latest feed produces read-only Dot2-Dot3 queue audit',()=>{
 const c=spawnSync(process.execPath,['scripts/v21-five-dot-handoff-audit.mjs'],
  {encoding:'utf8',timeout:15000});
 assert.equal(c.status,0,c.stderr);
 const prefix='R29_V21_FIVE_DOT_HANDOFF ';
 assert.ok(c.stdout.trim().startsWith(prefix),c.stdout);
 const r=JSON.parse(c.stdout.trim().slice(prefix.length));
 assert.equal(r.kind,'R29_V21_CURRENT_FIVE_DOT_RESEARCH_HANDOFF_AUDIT');
 assert.equal(r.orders_written,0);
 assert.equal(r.client_account_mutated,false);
 assert.equal(r.qa04_original_historical_backtest_authorized,false);
 assert.equal(r.dot3_independently_proven_eligible,0);
 assert.equal(r.actual_gpt_invocations_confirmed,0);
 assert.equal(r.dot4_buy_orders_authorized,0);
 assert.equal(r.dot5_verified_client_fills,0);
 assert.ok(r.candidates_with_open_rechecks>=r.selected_rechecks);
 assert.ok(r.candidate_count>=r.selected_rechecks);
});
test('handoff audit CLI rejects command args which could imply an active trade',()=>{
 const c=spawnSync(process.execPath,
   ['scripts/v21-five-dot-handoff-audit.mjs','--publish-buy'],
   {encoding:'utf8',timeout:15000});
 assert.notEqual(c.status,0);
 assert.match(c.stderr,/NO_ARGS_ALLOWED_READONLY_ONLY/);
});
