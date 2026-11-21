// Runs after scripts/train-oct12-24-scans.mjs, reads only its actual recorded
// source captures. Research coins are selected post event and this is NOT a blind test.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {replayFirstScanMemory} from '../src/first-scan-memory-replay.mjs';
import {runResearchPaperLab} from '../src/research-paper-lab.mjs';
const day='2026-10-12';
const summary=JSON.parse(await readFile('probe-artifacts/oct12-training-summary.json','utf8'));
const baseline=JSON.parse(await readFile('research/backtests/2026-10-12/iterations/07-v10-memory-24-scans.json','utf8'));
const files=(await readdir('probe-artifacts')).filter(f=>/^oct12-candles-\d+\.json$/.test(f));
const sourceMap=new Map((summary.source_candidates||[]).map(c=>[c.chain+':'+c.pool,c]));
const pools=[],missing=[];
for(const f of files){
 const doc=JSON.parse(await readFile('probe-artifacts/'+f,'utf8'));
 if(!doc?.tape?.candles?.length)continue;
 const id=doc.chain+':'+doc.pool,metadata=sourceMap.get(id);
 if(!metadata?.pool_created_at_utc){missing.push(id+':NO_POOL_CREATION');continue;}
 pools.push({id,chain:doc.chain,symbol:doc.symbol,pool_created_at_utc:metadata.pool_created_at_utc,
   candles:doc.tape.candles});
}
const strategyResults={};
for(const preset of ['exploratory','conservative','volatility_guard']){
 const result=runResearchPaperLab({date:day,pools,preset});
 strategyResults[preset]={counts:result.counts,model_pnl_test_usdc:result.realized_hypothetical_pnl_test_usdc,
  events:result.events,open_positions:result.open_positions.length};
 if(preset==='exploratory')strategyResults[preset].scans=result.scans;
}
const replay=replayFirstScanMemory({date:day,pools,modelScans:strategyResults.exploratory.scans});
delete strategyResults.exploratory.scans;
const report={schema:1,kind:'R29_V11_FIRST_RUN_24_SCAN_MOST_COMPLETE_AVAILABLE',
 date:day,start_utc:'2026-10-12T00:00:00Z',end_utc:'2026-10-13T00:00:00Z',
 scanning_mode:'INITIAL_FULL_AVAILABLE_AS_OF_THEN_23_INCREMENTAL',
 research_claims_only:true,
 source_baseline_reference_coins:summary.spreadsheet_reference_count,
 source_explicit_pool_links:summary.exact_pool_links_in_uploaded_sheet,
 actual_reconstructed_historical_pools:pools.length,
 pre_day_candles:summary.prior_day_candles_loaded,
 attempt_older_history:summary.backfill_attempts,
 rate_limit_stop:summary.source_candidates.some(c=>c.status==='RATE_LIMIT_429'),
 source_statuses:summary.source_candidates,
 research_missing_metadata:missing,
 initial_snapshot_pool_count:replay.steps[0].retained_pool_count,
 final_known_pool_count:replay.total_cumulative_pool_count,
 first_scan:replay.steps[0],
 models:strategyResults,
 previously_recorded_v10_models:baseline.model_results,
 actually_published_orders:0,confirmed_client_fills:0,
 caveat:'Neither this selected retrospective population nor Github Nov21 market-memory is evidence of Oct12 original Dot discoveries; source gaps remain, including 57/65 without direct pool URL.',
 timeline:replay.steps};
await writeFile('probe-artifacts/oct12-v11-firstscan-24h-report.json',JSON.stringify(report,null,2)+'\n');
const head=['scan','MESZ','phase','new_model_pools','known_model_pools','closed_candles_known_as_of_dot2','modeled_buy','modeled_sell','actual_dot_buy','actual_dot_sell','client_fills','candidate_ids'];
const csv=[head.join(',')];
for(const s of replay.steps){
 const row=[s.scan,s.germany_mesz,s.phase,s.newly_appeared_count,s.retained_pool_count,
 s.total_known_prior_closed_candles,s.modeled_buys,s.modeled_sells,0,0,0,s.retained_candidates.map(p=>p.symbol).join(';')];
 csv.push(row.map(v=>JSON.stringify(v)).join(','));
}
await writeFile('probe-artifacts/oct12-v11-firstscan-24h-report.csv',csv.join('\n')+'\n');
console.log('V11_FIRST_SCAN_RESULT',JSON.stringify({
 scanned_hourly:replay.steps.length,initial_backfill_pools:replay.steps[0].retained_pool_count,
 final_known_pools:replay.total_cumulative_pool_count,
 historical_pool_tapes:pools.length,
 pre_day_candles:summary.prior_day_candles_loaded,
 source_links:summary.exact_pool_links_in_uploaded_sheet,
 rate_limit_stop:report.rate_limit_stop,
 model_summary:Object.fromEntries(Object.entries(strategyResults).map(([k,v])=>[k,{counts:v.counts,pnl:v.model_pnl_test_usdc}])),
 real_paper_orders:0,client_fills:0}));
