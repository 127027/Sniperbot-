// Offline GitHub/Windows-safe read-only readiness report for one scanner wake.
// Executes zero network calls and never creates a research request or trade.
import {readFile} from 'node:fs/promises';
import {planResearchRestart} from '../src/v19-scan-restart-preflight.mjs';

const read=async path=>JSON.parse(await readFile(path,'utf8'));
const [memory,pageCoverage,providerBudget,olderState,ohlcvState]=await Promise.all([
 read('research/state/market-memory.json'),read('research/state/page-coverage.json'),
 read('research/state/provider-budget.json'),
 read('research/state/older-pool-captures.json'),
 read('research/state/ohlcv-backfill.json')
]);
const asOfUtc=process.env.R29_PREFLIGHT_ASOF_UTC??new Date().toISOString();
const maxNewPoolPages=process.env.R29_PREFLIGHT_PAGE_BUDGET===undefined?1:
 Number(process.env.R29_PREFLIGHT_PAGE_BUDGET);
const result=planResearchRestart({
 memory,pageCoverage,providerBudget,olderState,ohlcvState,asOfUtc,maxNewPoolPages
});
console.log('R29_RESEARCH_RESTART_PREFLIGHT',JSON.stringify(result));
// A blocked provider is NOT a failed research scan; callers inspect status.
// Invalid/corrupted input throws (nonzero exit) to avoid false readiness.
