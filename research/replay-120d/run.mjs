// Generate disposable, reproducible full 120-day reports as CI artifacts.
// Never modify live branch channels, actual laptop accounts or wallets.
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditHistorical,DEFAULT_CUTOFF} from './historical-audit.mjs';
import {runSyntheticMechanics} from './mechanics-fixture.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dest=path.join(root,'research','replay-120d','generated');
const cutoff=process.argv.find(x=>x.startsWith('--cutoff='))?.slice(9)||DEFAULT_CUTOFF;
const audit=auditHistorical({cutoff}),fixture=runSyntheticMechanics({cutoff});
if(audit.daily.length!==120||fixture.daily.length!==120||
 audit.historical_verified_complete_scans!==0||
 audit.historical_gpt_pnl_test_usdc!==null||
 fixture.source_class!=='SYNTHETIC_FIXTURE_ONLY'||
 fixture.fully_generated_gpt_model_calls!==0)
 throw Error('REPLAY_120D_FAIL_CLOSED');
mkdirSync(dest,{recursive:true});
const save=(name,txt)=>writeFileSync(path.join(dest,name),txt,{encoding:'utf8',flag:'w',mode:0o600});
const escape=x=>'"'+String(x??'').replaceAll('"','""')+'"';
const auditCsv=['day,phase,cutoff_exclusive,verified_multisource_scans,archived_real_gpt_decisions,real_trades_observable,profit_known,status'];
const fixtureCsv=['day,phase,frequency_per_day,simulated_scans,simulated_BUY,simulated_HOLD,simulated_SELL,simulated_WATCH,simulated_NO_TRADE,local_guard_exits,synthetic_open_positions_after_day,synthetic_cash_after_day,simulation_only'];
for(let i=0;i<120;i++){
 const a=audit.daily[i],f=fixture.daily[i];
 auditCsv.push([a.date,a.phase,a.asof_cutoff_exclusive_utc,0,
  a.archived_actual_gpt_decisions.length,'UNKNOWN','NO',a.status].map(escape).join(','));
 fixtureCsv.push([f.date,f.phase,f.planned_frequency_per_day,
  f.actual_simulated_scans,f.action_counts.BUY,f.action_counts.HOLD,
  f.action_counts.SELL,f.action_counts.WATCH,f.action_counts.NO_TRADE,
  f.action_counts.LOCAL_GUARD_SELL,f.open_positions_after_day,
  f.cash_after_day_test_usdc,'YES'].map(escape).join(','));
}
save('historical-summary.json',JSON.stringify({...audit,daily:undefined},null,2)+'\n');
save('historical-days.json',JSON.stringify(audit.daily,null,2)+'\n');
save('historical-days.csv',auditCsv.join('\n')+'\n');
save('synthetic-mechanics-summary.json',JSON.stringify({...fixture,daily:undefined,
 decision_journal:undefined},null,2)+'\n');
save('synthetic-mechanics-days.json',JSON.stringify(fixture.daily,null,2)+'\n');
save('synthetic-mechanics-days.csv',fixtureCsv.join('\n')+'\n');
save('synthetic-decision-journal.jsonl',fixture.decision_journal.map(x=>JSON.stringify(x)).join('\n')+'\n');
const text=['# 120 Tage Sniperbot R29 – Forschungs- und Technik-Audit',
 '',
 '**HISTORISCHER TEST:** bisher nicht valide rekonstruierbar. **TECHNIKTEST:** ausschließlich kontrollierte künstliche Testmarktdaten.',
 '',
 'Historische Phase A: 2026-07-20 bis 2026-09-17 UTC (60 Tage).',
 'Historische Phase B: 2026-09-18 bis 2026-11-16 UTC (60 Tage; letzter Tag nur bis '+cutoff+').',
 '',
 '## A. Tatsächlich belegbare Daten',
 '',
 '- Überlieferte GPT-Entscheidungen vom 15./16. November: **'+audit.actual_archived_decisions+'**, davon **'+audit.actual_archived_no_trade+' NO_TRADE**.',
 '- Nachträglich rekonstruierte, unabhängig vollständige historische GPT-Scans: **0**. Nicht gleichzusetzen mit den archivierten echten November-Entscheidungen.',
 '- Vollständige historische BUY/SELL-Signale und hypothetische 120d-Paper-P&L: **NICHT ERMITTELBAR**.',
 '- R27: Null verifizierte komplette historische Quellen; R30: historische Binance-CEX-Preis-Proxys, keine vollständigen DEX-Memecoin-Neuentdeckungen.',
 '- Jeder Tag steht mit UTC-Grenze, fehlenden Beweiskategorien und tatsächlich archivierten November-Entscheidungen in historical-days.json.',
 '- historical-days.csv: Die Anzahl historisch prüfbarer kompletter Scans ist 0, nicht 120 fingierte GPT-Aufrufe.',
 '',
 '## B. Technischer 120d-Funktionsdurchlauf mit ausschließlich erfundenen Testcoins',
 '',
 '- Fester Policy-Stand ab 18.09.2026, keine Anpassung an spätere Kurse.',
 '- **'+fixture.simulated_scan_count+'** simulierte Analysen über 120 Tage, davon **'+fixture.scans_by_phase.train+' Lern-** und **'+fixture.scans_by_phase.holdout+' Testphasen-Scans**.',
 '- Frequenzstufen: **1, 4, 12 und 24 pro Tag**, deterministisch nur aufgrund zeitlich sichtbarer künstlicher Aktivität.',
 '- Simulierte Strategieaktionen: BUY **'+fixture.actions.BUY+'**, HOLD **'+fixture.actions.HOLD+'**, SELL **'+fixture.actions.SELL+'**, WATCH **'+fixture.actions.WATCH+'**, NO_TRADE **'+fixture.actions.NO_TRADE+'**.',
 '- Zusätzliche simulierte lokale Sicherheitsverkäufe: **'+fixture.actions.LOCAL_GUARD_SELL+'** (getrennt von GPT-SELL).',
 '- Virtuelle geschlossene Positionen: **'+fixture.closed_synthetic_trade_count+'** (nur Fixture); offene Positionen: **'+fixture.open_positions+'**.',
 '- Rechenstand künstliches Wegwerf-Konto: **'+fixture.cash_test_usdc.toFixed(4)+' TEST-USDC**, vor der Simulation 5.000. **Nicht als historisch verdientes Geld ausgeben.**',
 '- In-Memory-GitHub-Pointer/Archiv + idempotente Paper-Quittungen: **'+fixture.github_archive_count+' / '+fixture.paper_receipt_count+'** (keine echten GitHub-Order-Commits).',
 '- Wirkliche GPT-Modellaufrufe im historischen Zeitraum durch dieses Script: **0**; der technische Entscheider ist ein deterministischer Test-Dummy.',
 '- Vollständige technische Tagesdaten und jedes simulierte Archiv/Receipt in synthetic-mechanics-days.json sowie synthetic-decision-journal.jsonl.',
 '',
 '## C. Beurteilung und verbleibende Arbeit',
 '',
 '**Nachgewiesen (technisch):** Datumssperre, dynamische Scantakte, Guthabenbuchung in isoliertem Testkonto, BUY, HOLD, SELL, lokaler Notverkauf, Hash-Archiv, Quittung, Wiederholungsschutz.',
 '**Nicht nachgewiesen (historisch):** Dass GPT tatsächlich 120 Tage Memecoins richtig erkannt, eine rentable Entry-/Exit-Strategie beherrscht oder selbst in den historischen 60 Handelstagen Signale generiert hätte.',
 'Für einen echten Counterfactual-Test benötigen wir separat rekonstruierte, unabhängig zeitgeprüfte Pool-Neuentdeckungen (unvoreingenommen), historische Käufer/Social/Contract/Sellability- und Executable-Quote-Daten sowie reale archivierte Modellentscheidungen oder einen versiegelten historischen Modelladapter.',
 'Reale Wallets, der aktive GitHub-Paper-Entscheidungskanal und das Laptop-Paper-Guthaben wurden nicht verändert.',
 ''];
save('REPORT_DE.md',text.join('\n'));
console.log('REPLAY120_HISTORICAL_ASOF_DATA_GAP, days='+audit.daily.length+
 ', actual_archived_no_trade='+audit.actual_archived_no_trade+
 ', historical_gpt_pnl=UNKNOWN');
console.log('REPLAY120_FIXTURE_ONLY, days='+fixture.daily.length+
 ', scans='+fixture.simulated_scan_count+
 ', BUY='+fixture.actions.BUY+', HOLD='+fixture.actions.HOLD+
 ', SELL='+fixture.actions.SELL+', LOCAL_GUARD_SELL='+fixture.actions.LOCAL_GUARD_SELL+
 ', synthetic_end_cash='+fixture.cash_test_usdc);
console.log('REPLAY120_ARTIFACTS '+dest);
