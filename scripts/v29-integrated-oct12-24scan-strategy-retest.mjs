// R29 V2.9: rerun THE ACTUAL shared Dot2/3 -> Dot4 shadow backtest with
// 61 historical SCREEN_PASS source features as strictly quarantined research.
// These are NOT authenticated Oct GPT captures, pool quotes or paper fills.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const frozenSha='3922c0d9fee93e3e54ba68e5a397d148269fdacfc38aad17459ae2ca50724fea';
const ref='refs/heads/codex/r29-cleanroom-paper-20261121',head=process.env.GITHUB_SHA;
if(process.env.GITHUB_REF!==ref||!/^[a-f0-9]{40}$/.test(head||'')
 ||!/^[0-9]{1,22}$/.test(process.env.GITHUB_RUN_ID||''))
 throw Error('V29_REQUIRES_EXPLICIT_CLEANROOM_SOURCE_RUN');
const changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',head],
 {encoding:'utf8'}).trim().split(/\r?\n/);
if(changed.length!==1||!/^research\/v29-integrated-retest-requests\/2026-11-24\/[A-Za-z0-9_-]+\.json$/.test(changed[0]))
 throw Error('V29_REQUIRES_ONE_INTEGRATED_RETEST_REQUEST');
const permission=JSON.parse(await readFile(changed[0],'utf8'));
if(permission?.schema!==1
 ||permission.kind!=='R29_V29_EXPLICIT_SHARED_STRATEGY_24_SCANS_WITH_RETRO_RESEARCH'
 ||permission.source_feature_run!==45344389914
 ||permission.source_artifact_sha256!==frozenSha
 ||permission.no_historical_price_or_provider_fabrication!==true
 ||permission.no_wallet_or_order_writes!==true
 ||permission.read_only!==true
 ||permission.no_winner_oracle_seed!==true)
 throw Error('V29_INVALID_APPROVAL_OR_SOURCE_FREEZE');
const originalProtected=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(originalProtected);
const sourcePath='probe-artifacts/v29-original-retro-source/v29-real-feature-candidate-24h-45344389914/24-scans.json';
const sourceBytes=await readFile(sourcePath);
if(sha(sourceBytes)!==frozenSha)throw Error('V29_FROZEN_24_REAL_FEATURE_SOURCE_BYTES_CHANGED');
const source=JSON.parse(sourceBytes);
if(source?.kind!=='R29_V29_24_SCAN_ACTUAL_FEATURE_FUNNEL_RESEARCH_NOT_TRADING'
 ||source.original_raw_rows!==259851
 ||source.first_scan_market_history_mints!==30181
 ||source.last_scan_market_history_mints!==63890
 ||source.research_screen_pass_occurrences!==61
 ||source.original_provider_data_delivered_to_gpt_at_october_ticks_proven!==false
 ||source.original_historical_two_way_50usdc_quotes_proven!==false
 ||source.original_actual_bot_BUY!==0
 ||source.original_actual_bot_SELL!==0
 ||source.postevent_winners_or_future_outcomes_loaded!==false
 ||source.scans?.length!==24)
 throw Error('V29_SOURCE_SCANS_OR_PROVENANCE_CHANGED');
const manifest={schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',
 date:'2026-10-12',selected_from_future_winner_list:false,
 snapshots:[],activity_observations:[],
 research_only_candidate_frames:source.scans,
 claimed_gpt_journals:[]};
const report=backtestOnRequest({date:'2026-10-12',
 manifest,forceHourlyDiagnostic:true,firstScanAtStart:true});
const events=report.role_audit.dot4_strategy.timeline;
const screens=events.reduce((a,e)=>a+
 (e.dot2_research_only_candidate_review?.research_screen_pass_count||0),0);
if(events.length!==24||screens!==61
 ||report.retro_candidate_research_only_pass_occurrences!==61
 ||report.model_replay_summary.buys!==0
 ||report.model_replay_summary.sells!==0
 ||report.model_replay_summary.dataGap!==24
 ||report.confirmed_paper_orders!==0||report.confirmed_paper_fills!==0
 ||report.historical_gpt_dot_runs!==0||report.model_open_positions.length!==0
 ||report.model_ending_cash_test_usdc!==5000)
 throw Error('V29_INTEGRATED_STRATEGY_MISREPORTED_TRADE_OR_SOURCE');
const rows=events.map((e,i)=>{
 const research=e.dot2_research_only_candidate_review;
 if(research?.original_market_quote_snapshots_contributed!==0
  ||research?.order_authorized!==false
  ||e.status!=='DATA_GAP_NO_FRESH_QUOTES'
  ||e.actions.some(a=>['BUY','SELL'].includes(a.action)))
  throw Error('V29_RETRO_DOT2_DOT3_IS_NOT_EXECUTABLE_TRADE');
 return {scan:i+1,at_utc:e.at_utc,
  hindsight_source_cumulative_mints:source.scans[i].cumulative_distinct_mints_retro,
  hindsight_source_fresh_mints:source.scans[i].fresh_distinct_mints_in_last_10m_retro,
  dot2_screen_passes_research_only:research.research_screen_pass_count,
  dot3_original_buy_quote_authentic:0,
  dot3_original_sell_quote_authentic:0,
  dot3_independent_risk_approvals:0,
  dot4_model_buy:[],dot4_model_hold:[],dot4_model_sell:[],
  actual_client_buy:[],actual_client_hold:[],actual_client_sell:[],
  research_candidate_mints:research.representatives.map(r=>r.mint),
  source_quote_gap_reason:e.status,
  candidate_provenance:research.provenance,
  real_historical_gpt_full_reviews_authenticated:0,
  executable_order_authorized:false};
});
const out='probe-artifacts/v29-integrated-strategy-'+process.env.GITHUB_RUN_ID;
await mkdir(out,{recursive:true});
const final={schema:1,
 kind:'R29_V29_SHARED_STRATEGY_REPLAY_FULL_RESEARCH_INPUT_WITH_HARD_TRADE_GATES',
 date:'2026-10-12',source_sha256:frozenSha,
 source_artifact_run_id:45344389914,
 current_github_run_id:process.env.GITHUB_RUN_ID,
 original_source_rows:259851,scans:24,
 research_screen_pass_occurrences:61,
 research_passes_are_not_buy_fills:true,
 genuine_historical_gpt_full_reviews:0,
 model_buy:0,model_hold:0,model_sell:0,
 true_client_buy:0,true_client_hold:0,true_client_sell:0,
 original_historical_50usdc_buy_sell_quotes:0,
 isolated_replay_cash_start_test_usdc:5000,
 isolated_replay_cash_end_test_usdc:5000,
 historical_pnl_not_empirically_measurable:true,
 source_hindsight_from_later_publication:true,
 real_original_october_provider_source_proven:false,
 winner_oracle_used_for_trade_selection:false,
 original_qa04_accepted:false,
 full_strategy_status:report.status,
 stage_details:rows};
await writeFile(out+'/24-scans-strategy.json',JSON.stringify(final,null,2)+'\n',{flag:'wx'});
const lines=[
 '# R29 – V2.9 tatsächlich neu gestarteter integrierter 24-Scan-Strategie-Test',
 '',
 '**12. Oktober 2026, UTC.** Echte historische Feature-Zeilen sind jetzt als **Research-Only-Kandidaten** an denselben gemeinsamen Dot2→Dot3→Dot4-Softwareablauf angeschlossen. Die geteilte BUY-Quote-/Risikofreigabe wurde **nicht umgangen**.',
 '',
 '| Scan | UTC | Solana-Mints im Forschungsstand | Frisch in 10m | SCREEN-PASS, Quote fehlt | BUY | HOLD | SELL | Top-Mint-Adressen zur Prüfung |',
 '|---:|:---:|---:|---:|---:|:---:|:---:|:---:|---|'];
for(const e of rows)lines.push('| '+e.scan+' | '+e.at_utc.slice(11,16)+' | '+
 e.hindsight_source_cumulative_mints.toLocaleString('de-DE')+' | '+
 e.hindsight_source_fresh_mints.toLocaleString('de-DE')+' | '+
 e.dot2_screen_passes_research_only+' | – | – | – | '+
 (e.research_candidate_mints.slice(0,3).map(x=>x.slice(0,8)+'…'+x.slice(-5)).join(', ')||'–')+' |');
lines.push('','**Endergebnis:** 61 unterschiedliche (pro Scan einmal gezählte) Research-Kandidaten; alle warten auf unabhängige ursprüngliche Pool-, Token-, BUY-/SELL-Quote-/Risikonachweise. 0 echte historische GPT-Reviews, 0 tatsächliche Paper-BUY/HOLD/SELL-Order-/Client-Fills, kein empirischer Gewinn. Diese 24 Stunden sind Software-Uhrpunkte, keine 24 realen GPT-Reviews.','',
 'Die 259.851 Feature-Zeilen wurden erst nach dem historischen Tag als öffentliche Forschungsquelle veröffentlicht. Ein Screening-PASS gilt ausdrücklich NICHT als ein im Oktober verfügbares originales Marktsignal oder ausführbarer 50-TEST-USDC-Trade. Die Original-Oktober-QA-04-Gates bleiben offen.','','Vollständige Mint-Adressen stehen für jeden Scan in der JSON-Datei; der frühere eingefrorene 24-Scan-Entscheidungsledger wurde nicht überschrieben.','','');
await writeFile(out+'/24-scans-strategy.md',lines.join('\n'),{flag:'wx'});
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(originalProtected));
console.log('R29_V29_INTEGRATED_24_SCAN_RETEST_SUCCESS',JSON.stringify({
 scans:24,nontrading_candidate_screenings:61,
 first_scan_source_mints:source.first_scan_market_history_mints,
 last_scan_source_mints:source.last_scan_market_history_mints,
 actual_model_buy:0,actual_model_sell:0,
 real_client_fills:0,original_gpt_reviews:0,
 source_gap:'NO_PROVEN_ORIGINAL_OCTOBER_TWO_WAY_TRADE_QUOTES',
 report_path:out+'/24-scans-strategy.md'
}));
