// Byte-stable six-pool training evaluation after Dot3 triage and Dot4 cooldown patch.
// No network, wallet, live quotes, orders or history from future times.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {runResearchPaperLab} from '../src/research-paper-lab.mjs';
import {buildRiskRecheckQueue} from '../src/risk-recheck-queue.mjs';
import {replayFirstScanMemory} from '../src/first-scan-memory-replay.mjs';
const prefix='research/training/2026-10-12/frozen-v11/';
const source=JSON.parse(await readFile(prefix+'oct12-training-summary.json','utf8'));
const previous=JSON.parse(await readFile(prefix+'oct12-v11-firstscan-24h-report.json','utf8'));
const files=(await readdir(prefix)).filter(x=>/^oct12-candles-\d+\.json$/.test(x)).sort();
const meta=new Map(source.source_candidates.map(x=>[x.chain+':'+x.pool,x]));
const pools=[];
for(const f of files){
 const data=JSON.parse(await readFile(prefix+f,'utf8'));
 const id=data.chain+':'+data.pool,info=meta.get(id);
 if(!info?.pool_created_at_utc||!data.tape?.candles?.length)throw Error('FROZEN_TAPE_METADATA_INCOMPLETE '+f);
 pools.push({id,chain:data.chain,symbol:data.symbol,
  pool_created_at_utc:info.pool_created_at_utc,candles:data.tape.candles});
}
if(pools.length!==6)throw Error('EXPECTED_SIX_LOCKED_OCTOBER_POOLS');
const presets=['exploratory','conservative','volatility_guard','guarded_reentry'];
const models={};
for(const preset of presets){
 const v=runResearchPaperLab({date:'2026-10-12',pools,preset});
 models[preset]={counts:v.counts,realized_pnl_test_usdc:v.realized_hypothetical_pnl_test_usdc,
  open_positions:v.open_positions.length,
  open_position_spend_test_usdc:v.open_positions.reduce((sum,x)=>sum+x.spent_test_usdc,0),
  cash_remaining_test_usdc:v.remaining_cash_test_usdc,
  events:v.events,scans:v.scans};
 if(preset!=='guarded_reentry'){
  const old=previous.models[preset];
  if(!old||Math.abs(v.realized_hypothetical_pnl_test_usdc-old.model_pnl_test_usdc)>1e-7||
     v.counts.buys!==old.counts.buys||v.counts.sells!==old.counts.sells)
   throw Error('FROZEN_BASELINE_CHANGED '+preset);
 }
}
const dot3=JSON.parse(await readFile('research/latest/dot-3.json','utf8'));
const realNow=process.env.GITHUB_RUN_ID?new Date().toISOString():dot3.updated_at_utc;
const risk=Array.isArray(dot3.candidates)
 ?buildRiskRecheckQueue({report:dot3,asOfUtc:realNow,limit:50})
 :{schema:1,kind:'CURRENT_DOT3_PRIORITIZED_RISK_CODES_ONLY',
   source_status:dot3.status||'UNKNOWN',source_dot3_updated_utc:dot3.updated_at_utc,
   counts:dot3.counts||{},worklist:Array.isArray(dot3.risk_queue)?dot3.risk_queue:[],
   actual_eligible_from_worklist:0,actual_orders:0,
   caveat:'New Dot3 report contains diagnostic risk_queue without original paired provider quotes; no false reconstruction of missing data.'};
const history=replayFirstScanMemory({date:'2026-10-12',pools,
 modelScans:models.guarded_reentry.scans});
const oldExploratory=models.exploratory,guard=models.guarded_reentry;
const result={schema:1,kind:'R29_V12_FROZEN_SIX_COIN_DOT3_DOT4_PATCH_EVALUATION',
 date:'2026-10-12',training_only:true,source_freeze_path:prefix,
 no_independent_future_validity_claim:true,github_run_id:process.env.GITHUB_RUN_ID||null,
 frozen_pools:pools.length,model_scans:24,first_scan_pools:history.steps[0].retained_pool_count,
 last_scan_pools:history.steps.at(-1).retained_pool_count,
 historical_dot3_buy_eligible_proven:0,actual_published_orders:0,actual_client_fills:0,
 model_presets:models,
 performance:{
  exploratory_realized_model_pnl_test_usdc:oldExploratory.realized_pnl_test_usdc,
  guarded_realized_model_pnl_test_usdc:guard.realized_pnl_test_usdc,
  delta_realized_model_pnl_test_usdc:guard.realized_pnl_test_usdc-oldExploratory.realized_pnl_test_usdc,
  old_buys:oldExploratory.counts.buys,guarded_buys:guard.counts.buys,
  old_sells:oldExploratory.counts.sells,guarded_sells:guard.counts.sells,
  old_open_positions:oldExploratory.open_positions,guarded_open_positions:guard.open_positions,
  pnl_comparison_has_open_position_bias:oldExploratory.open_positions>0||guard.open_positions>0,
  unpriced_unrealized_pnl_is_unknown:true
 },
 actual_current_dot3_recheck_issues:risk,
 chronological_model_scans:history.steps,
 warnings:[
  'History universe consists of SIX post-event selected pools. No independent blind validation.',
  'Original historic Dot3 sellability and two-source risk proofs do not exist; any modeled BUY is hypothetical only.',
  'Realized-only model PnL ignores unknown outcome of open positions; do not infer expected returns.',
  'GitHub cloud Dot3 risk queue is from November, NOT a risk condition from October.'
 ]};
await mkdir('probe-artifacts',{recursive:true});
await writeFile('probe-artifacts/oct12-v12-frozen-risk-strategy.json',JSON.stringify(result,null,2)+'\n');
const headers=['scan','MESZ','known_pools','exploratory_buy','exploratory_sell','guarded_buy','guarded_sell','guarded_watches','guarded_holds','historical_dot4_orders','client_fills'];
const csv=[headers.join(',')];
for(let i=0;i<24;i++){
 const v=result.chronological_model_scans[i],a=oldExploratory.scans[i],g=guard.scans[i];
 csv.push([i+1,v.germany_mesz,v.retained_pool_count,
 a.decisions.filter(x=>x.action==='BUY_EXPERIMENT').length,
 a.decisions.filter(x=>x.action==='SELL_EXPERIMENT').length,
 g.decisions.filter(x=>x.action==='BUY_EXPERIMENT').length,
 g.decisions.filter(x=>x.action==='SELL_EXPERIMENT').length,
 g.decisions.filter(x=>x.action==='WATCH_EXPERIMENT').length,
 g.decisions.filter(x=>x.action==='HOLD_EXPERIMENT').length,0,0].join(','));
}
await writeFile('probe-artifacts/oct12-v12-frozen-risk-strategy.csv',csv.join('\n')+'\n');
console.log('V12_FROZEN_COMPARISON',JSON.stringify({frozen_pools:result.frozen_pools,
 tests_date:result.date,performance:result.performance,
 risk_recheck_counts:risk.counts,current_report_at:dot3.updated_at_utc,
 real_orders:0,client_fills:0}));

