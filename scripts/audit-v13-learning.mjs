// Current evidence-gapped forward audit. Never manufacture 2026-10-12
// unlabeled non-winners from the post-hoc winner spreadsheet.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {scoreAsOf,labelAfterHorizon,evaluateBlindRankings} from '../src/forward-learning.mjs';
import {trainForwardThreshold} from '../src/temporal-learning.mjs';
import {fairRecheckPlan} from '../src/discovery-fair-queue.mjs';
const memory=JSON.parse(await readFile('research/state/market-memory.json','utf8'));
const now=process.env.GITHUB_RUN_ID?new Date().toISOString():memory.generated_at_utc;
const known=[];
try{
 const entries=(await readdir('research/observations',{recursive:true})).filter(x=>/^\d+\.json$/.test(x));
 for(const file of entries){const j=JSON.parse(await readFile('research/observations/'+file,'utf8'));
  if(j.kind==='R29_FORWARD_UNFILTERED_POOL_OBSERVATIONS')known.push(j);
 }
}catch(error){if(error.code!=='ENOENT')throw error;}
const ranking=scoreAsOf({batches:known,asOfUtc:now});
const fullyMature=known.filter(b=>Date.parse(b.captured_at_utc)+24*3600000<=Date.parse(now))
 .sort((a,b)=>b.captured_at_utc.localeCompare(a.captured_at_utc))[0];
const outcomes=fullyMature?labelAfterHorizon({batches:known,decisionAtUtc:fullyMature.captured_at_utc}):null;
const matched=outcomes?evaluateBlindRankings({ranking:scoreAsOf({batches:known,asOfUtc:fullyMature.captured_at_utc}),labels:outcomes,topK:10}):null;
const train=trainForwardThreshold({samples:outcomes?.labels.map(l=>({
 score:l.score,label:l.label,decision_at_utc:fullyMature.captured_at_utc,
 outcome_available_at_utc:new Date(Date.parse(fullyMature.captured_at_utc)+24*3600000).toISOString()}))||[],
 validationStartUtc:now});
const plan=fairRecheckPlan(memory,{asOfUtc:now,maxRechecks:6});
const report={schema:1,kind:'R29_V13_PROSPECTIVE_ONLY_AUDIT',generated_at_utc:now,
 prospective_batches:known.length,prospective_ranked:ranking.counts,
 matured_evaluations:outcomes?.counts??null,precision_recall_at_10:matched,
 learnability:train,market_memory_pools:memory.stats.total_discovered,
 fair_queue:{known_pools:plan.valid_recheck_pools,never_rechecked:plan.never_checked_count,backlog:plan.backlog_count},
 october_2026:{source:'WINNER_ONLY_POST_EVENT_SPREADSHEET',reported_100_percent_gainers:65,
 direct_pool_links:8,retrospective_tapes:6,
 original_independent_pre_oct13_capture_samples:0,
 verified_october_blind_recall:null,verified_october_blind_precision:null,
 note:'No timeline of all objectively discoverable winning and losing pools exists for October in current source.'},
 orders_published:0,paper_client_fills:0,
 conclusions:['Do not claim 10% blind recall without independent historical data and negatives.',
 'The first live observed cohort is deliberately unlabeled until its actual forward horizon has elapsed.',
 'Observed endpoint doubling is distinct from any intraday 100% spike.',
 'Current heuristic is research ranking, NOT automatically trained strategy or risk clearance.']};
await mkdir('probe-artifacts',{recursive:true});
await writeFile('probe-artifacts/r29-v13-prospective-audit.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log('V13_PROSPECTIVE_AUDIT',JSON.stringify({batches:known.length,known_memory:report.market_memory_pools,
 asof:ranking.counts,mature:report.matured_evaluations,train_status:train.status,queue:report.fair_queue,
 historical_verified_recall:report.october_2026.verified_october_blind_recall}));
