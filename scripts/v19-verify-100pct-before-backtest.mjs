// Non-trading release-gate check. Exit 0 for a successful AUDIT showing
// NOT_READY; --require-ready exits 3 when ANY genuine acceptance is missing.
// Does not execute any historical replay or call an API. No account state.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {inspectR29OriginalAcceptanceReleaseGate}
 from '../src/v19-original-acceptance-release-gate.mjs';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const args=process.argv.slice(2);
if(args.length>1||args.some(x=>x!=='--require-ready'))
 throw Error('ONLY_REQUIRE_READY_FLAG_ACCEPTED');
const [originalCatalog,taskRegister,holdout,currentMarketMemory]=await Promise.all([
 readFile('docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md','utf8'),
 read('research/audits/2026-11-22/r29-v19-offline-61-task-reconciliation.json'),
 read('research/state/prospective-holdout-freeze.json'),
 read('research/state/market-memory.json')
]);
const report=inspectR29OriginalAcceptanceReleaseGate({
 originalCatalog,taskRegister,holdout,currentMarketMemory,
 asOfUtc:new Date().toISOString()
});
await mkdir('probe-artifacts',{recursive:true});
await writeFile('probe-artifacts/v19-61-original-tasks-prebacktest-gate.json',
 JSON.stringify(report,null,2)+'\n',{flag:'w'});
console.log('R29_61_ORIGINAL_TASKS_PREBACKTEST_GATE',JSON.stringify({
 status:report.readiness,fully_accepted_pct:report.strict_fully_accepted_pct,
 non_backtest_tasks_required:report.non_backtest_original_task_count,
 non_backtest_tasks_passed:report.actual_non_backtest_pass_count,
 non_backtest_strict_pct:report.strict_non_backtest_fully_accepted_pct,
 final_QA04_backtest_status:report.final_qa04_backtest_status,
 technical_touched_pct:report.technical_touched_pct,
 counts:report.original_status_counts,
 pool_count:report.persisted_pool_count,
 blocker_count:report.blockers.length,
 blockers:report.blockers.map(x=>x.gate),
 no_historical_replay_executed:true,
 backtest_authorized:report.allow_backtest_run
}));
if(args.includes('--require-ready')&&!report.release_authorized){
 console.error('R29_PREBACKTEST_RELEASE_NOT_READY: missing original authenticated evidence');
 process.exitCode=3;
}
