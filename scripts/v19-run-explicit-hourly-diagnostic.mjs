// Explicit user-requested R29 OCT12 24-scan source-gap DIAGNOSTIC ONLY.
// This is deliberately NOT QA-04's fully approved five-GPT-Dot backtest.
// The strict 60-of-60 production/backtest release gate stays untouched.
// No network calls, no orders, no wallet state, no API, no GPT invocation.
// The 65 future winner records are read only AFTER 24 decisions are frozen.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';
import {compare24HourlyScansAfterReplay} from '../src/v19-hourly-scanner-comparison.mjs';
import {auditRetrospectiveNeutral24HourlySource}
 from '../src/v19-retrospective-neutral-source-overlay.mjs';
import {auditOfflineReplayLedger} from '../src/v19-offline-replay-ledger-audit.mjs';
import {resolveSharedPaperPolicy} from '../src/v19-paper-budget-policy.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged}
 from '../src/v19-replay-isolation.mjs';

const branch='refs/heads/codex/r29-cleanroom-paper-20261121';
const commit=process.env.GITHUB_SHA,runId=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!==branch||!/^[0-9a-f]{40}$/.test(commit||'')
 ||!/^[0-9]{1,20}$/.test(runId||''))
 throw Error('REQUIRES_APPROVED_CLEANROOM_GITHUB_ACTION');
const files=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],
 {encoding:'utf8'}).trim().split(/\r?\n/);
const request=files.filter(p=>/^research\/diagnostic-24-requests\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\.json$/.test(p));
if(files.length!==1||request.length!==1)
 throw Error('EXACT_ONE_USER_APPROVED_REQUEST_FILE_REQUIRED');
const raw=await readFile(request[0],'utf8'),q=JSON.parse(raw);
if(q.schema!==1||q.kind!=='R29_V19_USER_EXPLICIT_24H_SOURCE_GAP_DIAGNOSTIC'
 ||q.date!=='2026-10-12'||q.hourly_scans!==24
 ||q.first_decision_at_utc!=='2026-10-12T00:00:00.000Z'
 ||q.warmup_at_utc!=='2026-10-11T19:00:00.000Z'
 ||q.offline_only!==true||q.no_winner_seed!==true
 ||q.no_client_or_order_writes!==true||q.not_final_backtest_qa04!==true
 ||q.selected_from_future_winner_list!==false)
 throw Error('UNAUTHORIZED_HISTORICAL_DIAGNOSTIC_REQUEST');
const protectedPaths=[resolve('signals/index.json'),
 resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(protectedPaths);
const config=JSON.parse(await readFile('research/config/paper-budget-v19.json','utf8'));
const budget=resolveSharedPaperPolicy(config);
const report=backtestOnRequest({
 date:q.date,paperBudgetSettings:budget.settings,
 forceHourlyDiagnostic:true,firstScanAtStart:true});
const ledger=auditOfflineReplayLedger({report});
if(ledger.status!=='MODEL_CASH_AND_LOTS_RECONCILED'
 ||report.confirmed_paper_orders!==0||report.confirmed_paper_fills!==0
 ||report.historical_proven_trades!==0||report.historical_gpt_dot_runs!==0
 ||report.start_capital_test_usdc!==5000||report.amount_per_coin_test_usdc!==50
 ||report.role_audit.dot4_strategy.timeline.length!==24)
 throw Error('UNSAFE_OR_INVALID_ISOLATED_24H_MODEL_RESULT');
// Decisions and their ledger are frozen in memory BEFORE opening the oracle.
const reportJson=JSON.stringify(report);
// Pin the original source bytes; never use late-November source features as
// October quote inputs. These retrospective files are opened ONLY AFTER the
// completed replay decision JSON has been frozen in memory.
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const retroBase='probe-artifacts/neutral-source-v2/';
const priorBytes=await readFile(retroBase+'2026-10-11.json');
const dayBytes=await readFile(retroBase+'2026-10-12.json');
const priorDigest=sha(priorBytes),dayDigest=sha(dayBytes);
if(priorDigest!=='7b4e917ec5904ab089452029564baf09fa99bbda9c11e91db8d54a79cd49097c'
 ||dayDigest!=='8a03d0b3f065a6f6fd35867cd7c61719fb37f2cca06134aef6a81f14b3d7ab')
 throw Error('POSTRUN_NEUTRAL_ARCHIVE_SHA256_MISMATCH');
const retro=auditRetrospectiveNeutral24HourlySource({
 priorDay:JSON.parse(priorBytes.toString('utf8')),
 tradingDay:JSON.parse(dayBytes.toString('utf8')),
 artifactDownloadedAtUtc:new Date().toISOString()
});
const referencePath='research/evaluation/2026-10-12/v19-winner-reference-identity-status.json';
const reference=JSON.parse(await readFile(referencePath,'utf8'));
const comparison=compare24HourlyScansAfterReplay({
 replay:report,oracle:reference,retrospectiveNeutral:retro});
if(retro.distinct_sample_mints!==192
 ||retro.retrospective_mint_occurrences_in_24_last5min_windows!==2598
 ||retro.retrospective_feature_rows_in_24_last5min_windows!==11226
 ||retro.sampled_mint_occurrences!==192
 ||retro.claimed_age_field_disagrees_with_recomputed_observation_age_count!==191
 ||comparison.post_decision_retrospective_neutral_research?.joined_only_after_decisions!==true)
 throw Error('POSTRUN_NEUTRAL_ARCHIVE_COVERAGE_CHANGED_OR_NOT_FROZEN');
const receipt={schema:1,kind:'R29_V19_EXPLICIT_USER_24H_DIAGNOSTIC_RECEIPT',
 source_request_path:request[0],request_sha256:sha(raw),
 source_commit:commit,github_run_id:runId,started_from_actual_actions:true,
 original_release_gate_unchanged:true,
 formal_qa04_not_accepted:true,not_an_automated_gpt_backtest:true,
 date:q.date,first_scan_utc:comparison.first_scan_at_utc,
 scan_count:comparison.scan_count,model_buys:comparison.model_buys,
 model_sells:comparison.model_sells,
 verified_actual_paper_orders:0,verified_actual_client_fills:0,
 original_october_capture_claims:comparison.original_october_capture_claims,
 winner_oracle_consulted_only_after_decisions:true,
 comparison_reference_count:comparison.winner_reference.reported_rows,
 archive_was_read_only_after_frozen_model_decisions:true,
 retro_source_prior_day_json_sha256:priorDigest,
 retro_source_trade_day_json_sha256:dayDigest,
 retro_mint_occurrences:retro.retrospective_mint_occurrences_in_24_last5min_windows,
 retro_distinct_sample_mints:retro.distinct_sample_mints,
 retro_unverified_provider_age_field_mismatch_count:
   retro.claimed_age_field_disagrees_with_recomputed_observation_age_count,
 modeled_decision_sha256:sha(reportJson),
 model_ledger_receipts:ledger.model_receipt_count,
 client_wallet_modified:false,provider_api_calls:0};
await mkdir('probe-artifacts',{recursive:true});
const pref='probe-artifacts/v19-hourly-user-oct12-'+runId;
await writeFile(pref+'-decisions.json',reportJson+'\n',{flag:'wx'});
await writeFile(pref+'-comparison.json',JSON.stringify(comparison,null,2)+'\n',{flag:'wx'});
await writeFile(pref+'-neutral-retro-source.json',JSON.stringify(retro,null,2)+'\n',{flag:'wx'});
await writeFile(pref+'-receipt.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
await writeFile(pref+'-scans.md',[
 '# R29 Oktober – 24 exakt stündliche Offline-Diagnose-Scans',
 '',
 '**NICHT** die endgültige QA-04-Backtest-Abnahme: fehlende historische Originalquellen und externe Sicherheitsbelege.',
 '',
 '| Scan | UTC | Rückblickende Mint-Nennungen (letzte 5m) | Rückblickende Merkmalszeilen | Modell-BUY | Modell-SELL | Modell-HOLD |',
 '|---:|---|---:|---:|---|---|---|',
 ...comparison.scans.map(x=>
  '| '+x.scan+' | '+x.scan_at_utc.slice(11,16)+' | '+
  (x.post_decision_retrospective_source?.mint_occurrences_last_five_minutes??'?')+' | '+
  (x.post_decision_retrospective_source?.feature_rows_last_five_minutes??'?')+' | '+
  (x.buy.map(a=>a.symbol||a.pool).join(', ')||'—')+' | '+
  (x.sell.map(a=>a.symbol||a.pool).join(', ')||'—')+' | '+
  (x.hold.map(a=>a.symbol||a.pool).join(', ')||'—')+' |'),
 '',
 '### Ergebnis',
 '',
 '- Tatsächliche unabhängige historische GPT-Dot-Reviews: 0',
 '- Tatsächliche historische Windows-Paper-Fills: 0',
 '- Modell-BUY: '+comparison.model_buys,
 '- Modell-SELL: '+comparison.model_sells,
 '- Oktober-Originalquotes im Manifest: '+comparison.original_october_capture_claims,
 '- Neutrale Solana-Archivquelle NUR POST-RUN: '+retro.retrospective_mint_occurrences_in_24_last5min_windows+
   ' Mint-Nennungen / '+retro.distinct_sample_mints+' verschiedene Stichproben-Mints.',
 '- 191/192 Quell-Age-Felder stimmen nicht mit UTC-Event→Scan-Zeitabstand überein; UTC-Differenz wurde neu berechnet.',
 '- Die 192 Adressen sind TOKEN-Mints ohne bestätigten Chain-Pool, kein identifizierter Gewinner bzw. BUY.',
 '- 65 rückblickende Referenzmeldungen: **nur Post-Run**, keine vollständige Marktmenge',
 '- Fehlende Quelldaten sind keine nachweislich verpassten Kaufgelegenheiten.',
 '- Startguthaben des ISOLIERTEN Modells: 5000 TEST-USDC; Position: 50 TEST-USDC.',
 '',
 '## 192 neutrale Mint-Beispiele, NUR nachträglich aus dem Forschungsarchiv',
 '',
 ...comparison.scans.flatMap(x=>[
  '### Scan '+String(x.scan).padStart(2,'0')+' – '+x.scan_at_utc,
  '',
  ...x.post_decision_retrospective_source.selected_research_mints.map(s=>
   '- '+s.mint+' – beobachtet '+s.source_observed_at_utc+
   ', '+s.seconds_before_scan.toFixed(3)+' Sekunden vor dem Scan; Quelle nachträglich, BUY nicht verifiziert'),
  ''
 ]),
 'Detaillierte JSON-Berichte, Source-SHA und alle Disclaimer siehe GitHub-Actions-Artefakt.'
 ].join('\n')+'\n',{flag:'wx'});
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(protectedPaths));
console.log('R29_USER_24_SCANS_COMPLETED',JSON.stringify(receipt));
console.log('R29_24_SCANNER_ROWS',JSON.stringify(comparison.scans.map(x=>({
 scan:x.scan,utc:x.scan_at_utc,buy:x.buy.map(a=>a.symbol),
 sell:x.sell.map(a=>a.symbol),hold:x.hold.map(a=>a.symbol),
 source_status:x.historical_coin_selection_status
}))));
