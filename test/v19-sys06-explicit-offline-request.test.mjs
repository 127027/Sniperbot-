import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateManualBacktestRequest} from '../src/v19-manual-backtest-request.mjs';

test('SYS-06: explicit on-demand request reuses original 5h/24h contract, never winner inputs',()=>{
 const req=validateManualBacktestRequest({date:'2026-10-12',
  inputPath:'research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json'});
 assert.equal(req.historical_warmup_hours,5);
 assert.equal(req.decision_hours,24);
 assert.equal(req.manual_trigger_only,true);
 assert.equal(req.winner_reference_oracle_input_allowed,false);
 assert.equal(req.existing_paper_account_mutation_allowed,false);
 assert.deepEqual(req.cli_args,['--date','2026-10-12','--first-scan-at-start','--input',
  'research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json']);
 assert.throws(()=>validateManualBacktestRequest({date:'2026-10-12',
  inputPath:'research/evaluation/winner-list.json'}));
});
test('SYS-06: request-push GitHub workflow is bounded to dedicated paths, no provider or order API',async()=>{
 const y=await readFile('.github/workflows/cleanroom-v19-explicit-offline-request.yml','utf8');
 assert.match(y,/name: R29 V1\.9 Explicit Offline 29h Backtest Request/);
 assert.match(y,/branches:\s*\n\s*- codex\/r29-cleanroom-paper-20261121/);
 assert.match(y,/paths:\s*\n\s*- 'research\/offline-backtest-requests\/\*\*'/);
 assert.match(y,/contents: read/);
 assert.match(y,/persist-credentials: false/);
 assert.match(y,/node scripts\/v19-explicit-offline-backtest-request\.mjs/);
 assert.match(y,/if-no-files-found: error/);
 assert.match(y,/OFFLINE_BACKTEST_NO_CLIENT_ORDERS/);
 assert.doesNotMatch(y,/forensic-probe|probe-live-discovery|cloud-discovery-runner|secrets\.|gh api|git push|dot[- ]schedule/);
});
test('SYS-06: handler uses exactly one committed request, validates branch/date/manifest and reads original offline strategy',async()=>{
 const s=await readFile('scripts/v19-explicit-offline-backtest-request.mjs','utf8');
 assert.match(s,/EXPECTED_EXACTLY_ONE_IMMUTABLE_OFFLINE_REQUEST/);
 assert.match(s,/OFFLINE_REQUEST_WRONG_BRANCH/);
 assert.match(s,/validateManualBacktestRequest\(/);
 assert.match(s,/HINDSIGHT_EVALUATION_MANIFEST_BLOCKED/);
 assert.match(s,/scripts\/v18-backtest-on-demand\.mjs/);
 assert.match(s,/MODELED_FILL_NOT_CLIENT|MODEL_CASH_AND_LOTS_RECONCILED/);
 assert.match(s,/protected_files_unchanged/);
 assert.match(s,/provider_requests_performed:0/);
 assert.match(s,/actual_orders_published:0/);
 assert.match(s,/current_market_capture_not_started:true/);
 assert.doesNotMatch(s,/fetch\(|writeFile\(['"]signals\/|createOrder\(|cloud-discovery-runner\.mjs/);
});
test('SYS-06: synthetic fixture cannot be passed off as historical authenticated prices',async()=>{
 const fixture=JSON.parse(await readFile(
  'research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json','utf8'));
 assert.equal(fixture.synthetic_fixture_no_actual_quotes,true);
 assert.equal(fixture.real_historical_provider_evidence_count,0);
 assert.equal(fixture.selected_from_future_winner_list,false);
 assert.equal(fixture.snapshots.length,4);
 assert.ok(fixture.snapshots.every(x=>x.provenance==='SYNTHETIC_TEST'
  &&x.source_class==='SYNTHETIC_TEST'));
});
