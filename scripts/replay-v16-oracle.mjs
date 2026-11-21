// Research-only 12 Oct retrospective Oracle vs the frozen V1.2/V1.5 model.
// Import 65 user-provided post-event references ONLY HERE, never Dot2 discovery.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {auditOracleManifest,normalizeOracleTape,bestCloseOracle,
 forecastFeatureLabelSeparation,oracleMissReason} from '../src/oracle-training.mjs';
import {runResearchPaperLab} from '../src/research-paper-lab.mjs';
const folder='research/training/2026-10-12/frozen-v11/';
const source='research/training/2026-10-12/oracle-source/manifest-65.min.gzip.base64';
const rawCompressed=(await readFile(source,'utf8')).trim();
const reference=JSON.parse(gunzipSync(Buffer.from(rawCompressed,'base64')).toString('utf8'));
const archive=auditOracleManifest(reference);
if(archive.counts.total!==65||archive.counts.with_pool!==16||archive.counts.with_contract!==7)
 throw Error('ORACLE_MANIFEST_MISMATCH');
const frozenMeta=JSON.parse(await readFile(folder+'oct12-training-summary.json','utf8'));
const historicMeta=new Map(frozenMeta.source_candidates.map(c=>[c.chain+':'+c.pool.toLowerCase(),c]));
const sourceFiles=(await readdir(folder)).filter(f=>/^oct12-candles-\d+\.json$/.test(f)).sort();
const sourceTapes=[],oracleRows=[],featureRows=[],labelRows=[],linkedIds=new Set();
for(const f of sourceFiles){
 const raw=await readFile(folder+f,'utf8'),data=JSON.parse(raw);
 const sha=createHash('sha256').update(raw).digest('hex');
 const tape=normalizeOracleTape(data,{sourceSha256:sha});
 const meta=historicMeta.get(tape.chain+':'+tape.pool.toLowerCase());
 if(!meta?.pool_created_at_utc)throw Error('FROZEN_TIME_METADATA_MISSING_'+f);
 const manifest=archive.items.filter(r=>r.has_pool&&r.chain===tape.chain
  &&r.pool.toLowerCase()===tape.pool.toLowerCase());
 if(manifest.length!==1)throw Error('SIX_POOL_ORACLE_ARCHIVE_MATCH_FAILED '+f+' '+manifest.length);
 const matched=manifest[0];linkedIds.add(matched.id);
 const oracle=bestCloseOracle(tape);
 const temporal=forecastFeatureLabelSeparation(tape);
 featureRows.push(...temporal.features_past_only);
 labelRows.push(...temporal.labels_future_after_horizon_only);
 oracleRows.push({manifest_id:matched.id,symbol:tape.symbol,chain:tape.chain,pool:tape.pool,
   contract_from_user_archive:matched.contract,source_file:folder+f,source_sha256:sha,
   pool_origin_status:matched.identity_status,
   valid_source_candles:tape.candles.length,
   archive_rolling_24h_pct:matched.archive_pct,
   archive_rolling_metric_not_exact_day_oracle:true,
   oracle_close:oracle.best_close_to_later_close,
   oracle_wick:oracle.wick_upper_bound,
   original_oct12_r29_first_seen_utc:null,
   original_oct12_risk_approved_utc:null,
   original_oct12_paper_buy_utc:null,
   original_oct12_client_paper_fill_utc:null,
   missed_reason:oracleMissReason({pool:tape.pool}),
   source_limitations:'Retrospective 5m OHLCV; historical risk, execution, liquidity/sellability, original timestamped Dot2 capture unavailable',
   oracle_trade_is_executable:false});
 sourceTapes.push({id:tape.chain+':'+tape.pool,chain:tape.chain,
   pool:tape.pool,symbol:tape.symbol,
   contract:matched.has_contract?matched.contract:null,
   pool_created_at_utc:meta.pool_created_at_utc,candles:tape.candles});
}
if(sourceTapes.length!==6||linkedIds.size!==6||featureRows.length!==144||labelRows.length!==432)
 throw Error('SIX_POOL_ORACLE_INPUT_COUNT_MISMATCH');
const A=runResearchPaperLab({date:'2026-10-12',pools:sourceTapes,preset:'guarded_reentry'});
const M=runResearchPaperLab({date:'2026-10-12',pools:sourceTapes,preset:'guarded_reentry',mediaEvidence:[]});
const V12=JSON.parse(await readFile('research/backtests/2026-10-12/iterations/09-v12-risk-guarded-frozen.json','utf8'));
if(Math.abs(A.realized_hypothetical_pnl_test_usdc-V12.new.realized_model_pnl_test_usdc)>1e-7
 ||A.counts.buys!==6||A.counts.sells!==6)throw Error('ORACLE_ALTERS_V12_COMPARABLE_MODEL');
if(JSON.stringify(A.events)!==JSON.stringify(M.events))throw Error('ORACLE_LEAKS_POST_EVENT_TO_MODEL');
const missing=archive.items.filter(x=>!linkedIds.has(x.id));
const status_counts={
 matched_frozen_ohlcv_tapes:oracleRows.length,
 archive_pool_without_corresponding_tape:missing.filter(x=>x.pool!==null).length,
 invalid_supplied_pool_addresses:missing.filter(x=>x.pool!==null&&!x.has_pool).length,
 archive_rows_without_pool_identity:missing.filter(x=>x.pool===null).length,
 exact_contract_in_archive:archive.counts.with_contract,
 archive_contract_proven_by_second_independent_source:0,
 original_october_dot2_discovery_proven:0,
 original_october_dot3_risk_approval_proven:0,
 confirmed_paper_orders:0,
 original_historical_client_fills:0
};
const labelSummary={total:labelRows.length,
 observed:labelRows.filter(x=>x.label_status==='POST_EVENT_FUTURE_PROVIDER_CANDLES').length,
 unknown:labelRows.filter(x=>x.label_status!=='POST_EVENT_FUTURE_PROVIDER_CANDLES').length};
const clocks=Array.from({length:24},(_,h)=>{
 const at=new Date(Date.parse('2026-10-12T00:35:00Z')+h*3600000).toISOString();
 const model=A.scans[h],markets=A.events.filter(x=>x.at_utc===at);
 return {scan:h+1,at_utc:at,mesz:new Date(Date.parse(at)+2*3600000).toISOString().slice(11,16),
  model_buy:markets.filter(x=>x.action==='BUY_EXPERIMENT').length,
  model_sell:markets.filter(x=>x.action==='SELL_EXPERIMENT').length,
  model_realized_pnl:markets.reduce((s,x)=>s+(x.modelled_pnl_test_usdc||0),0),
  hindsight_oracle_consulted_before_decision:false,
  future_labels_consulted_before_decision:false,
  actual_gpt_dot_scans_verified:0,
  actual_paper_orders_verified:0};
});
const report={schema:1,kind:'R29_V16_ISOLATED_ORACLE_TRAINING_AND_AUDIT',
 trained_on_user_oracle_package:true,uploaded_original_manifest_sha256:'e61a5cec7201a118c99df0a4988239776ae4685b358e576bcc57034cf3333760',
 original_source_is_post_event:true,
 day_utc:'2026-10-12',start_cash_test_usdc:5000,amount_per_coin_test_usdc:50,
 manifest:archive.counts,status_counts,oracle_coins:oracleRows,
 features_past_only_count:featureRows.length,
 future_labels_only:labelSummary,
 probability_forecasts_calibrated:false,
 min_blind_non_winner_controls:0,
 original_65_coin_independent_blind_recall:null,
 model_v12:{buys:A.counts.buys,sells:A.counts.sells,open:A.open_positions.length,
  realized_pnl_test_usdc:A.realized_hypothetical_pnl_test_usdc},
 model_v15:{buys:M.counts.buys,sells:M.counts.sells,
  realized_pnl_test_usdc:M.realized_hypothetical_pnl_test_usdc},
 model_v16:{model_trade_policy:'UNCHANGED_GUARDED_REENTRY_AS_OF',
  buys:A.counts.buys,sells:A.counts.sells,
  realized_pnl_test_usdc:A.realized_hypothetical_pnl_test_usdc,
  delta_from_v12_test_usdc:0,
  oracle_data_used_to_place_orders:false,
  buying_just_because_oracle_was_high:false},
 timeline:clocks,
 warnings:[
  'The uploaded ZIP includes no executed Oct12 Oracle quotes or raw minute tapes. Six pre-existing frozen 5m tapes provide retrospective reference only.',
  '16 post-event pool strings include one syntactically invalid Solana MarsX pool (manifest row 22), not 16 independently verified token-pool identities.',
  '49 source rows have no historical verified pool ID; 10 more source pools have no corresponding frozen OHLCV.',
  'Never feed 65 names, ORACLE or LABEL_FUTURE into market as-of research inputs.',
  'No claim that 0 PnL delta means learning ineffective. Strategy has not been independently modified or validated.',
  'BNBCAT Dextape rolling +50327% and Coinranking claimed $93.77 ATH are incompatible metric types and not 12 Oct paper fills.',
  'Public provider data are later reconstructed and cannot retroactively prove original Oct12 Dot2 discovery, Dot3 risk, tax/sellability, or client execution.'
 ]};
await mkdir('probe-artifacts',{recursive:true});
const file=(name,obj)=>writeFile('probe-artifacts/'+name,JSON.stringify(obj,null,2)+'\n');
const csv=(rows,columns)=>columns.join(',')+'\n'+rows.map(r=>columns.map(k=>JSON.stringify(r[k]??'')).join(',')).join('\n')+'\n';
await Promise.all([
 file('r29-v16-oracle-audit.json',report),
 file('r29-v16-features-past-only.json',{kind:'FEATURES_PAST_ONLY',rows:featureRows}),
 file('r29-v16-label-future-only.json',{kind:'LABEL_FUTURE_ONLY',rows:labelRows}),
 writeFile('probe-artifacts/r29-v16-oracle-coins.csv',
  csv(oracleRows.map(x=>({id:x.manifest_id,coin:x.symbol,chain:x.chain,candles:x.valid_source_candles,
   theoretical_buy_utc:x.oracle_close?.buy_close_at_utc,price_buy_usd:x.oracle_close?.buy_price_usd,
   theoretical_sell_utc:x.oracle_close?.sell_close_at_utc,price_sell_usd:x.oracle_close?.sell_price_usd,
   ideal_close_pct:x.oracle_close?.gain_pct,archive_claim_24h_pct:x.archive_rolling_24h_pct,
   source_sha256:x.source_sha256,status:x.missed_reason})),
   ['id','coin','chain','candles','theoretical_buy_utc','price_buy_usd',
    'theoretical_sell_utc','price_sell_usd','ideal_close_pct','archive_claim_24h_pct','source_sha256','status'])),
 writeFile('probe-artifacts/r29-v16-24-scans.csv',csv(clocks,
  ['scan','at_utc','mesz','model_buy','model_sell','model_realized_pnl',
   'hindsight_oracle_consulted_before_decision','future_labels_consulted_before_decision',
   'actual_paper_orders_verified']))
]);
console.log('R29_V16_ORACLE_FINISH',JSON.stringify({
  source_counts:archive.counts,status_counts,
  labels:labelSummary,oracle_coins:oracleRows.map(x=>({
   coin:x.symbol,ideal_close_pct:x.oracle_close?.gain_pct,
   theoretical_buy:x.oracle_close?.buy_close_at_utc,
   theoretical_sell:x.oracle_close?.sell_close_at_utc})),
  baseline_v12:A.realized_hypothetical_pnl_test_usdc,after_v16:A.realized_hypothetical_pnl_test_usdc,
  model_buys:A.counts.buys,model_sells:A.counts.sells,
  actual_orders:0,client_receipts:0,verifiable_forecast_accuracy:null}));
