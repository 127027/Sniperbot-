import test from 'node:test';
import assert from 'node:assert/strict';
import {validateManualBacktestRequest} from '../src/v19-manual-backtest-request.mjs';

test('manual requested day without input produces on-demand data-gap replay, not a live Dot run',()=>{
 const r=validateManualBacktestRequest({date:'2026-10-12'});
 assert.deepEqual(r.cli_args,['--date','2026-10-12']);
 assert.equal(r.historical_warmup_hours,5);
 assert.equal(r.decision_hours,24);
 assert.equal(r.manual_trigger_only,true);
 assert.equal(r.paper_order_publication_allowed,false);
 assert.equal(r.automations_activated,0);
});
test('a genuine neutral as-of manifest is permitted in one-system existing replay',()=>{
 const r=validateManualBacktestRequest({date:'2026-10-12',
  inputPath:'research/backtest-inputs/2026-10-12/neutral.json'});
 assert.deepEqual(r.cli_args,['--date','2026-10-12',
  '--input','research/backtest-inputs/2026-10-12/neutral.json']);
});
test('winner evaluation paths, path traversal, malformed dates and main are blocked',()=>{
 assert.throws(()=>validateManualBacktestRequest({date:'2026-10-12',
  inputPath:'research/evaluation/2026-10-12/v19-winner-reference-identity-status.json'}));
 assert.throws(()=>validateManualBacktestRequest({date:'2026-10-12',
  inputPath:'research/backtest-inputs/../evaluation/winners.json'}));
 assert.throws(()=>validateManualBacktestRequest({date:'2026-02-31'}),
  /NONEXISTENT_BACKTEST_DATE/);
 assert.throws(()=>validateManualBacktestRequest({date:'2026-10-12',
  ref:'refs/heads/main'}),/CLEANROOM_BRANCH_REQUIRED/);
});
