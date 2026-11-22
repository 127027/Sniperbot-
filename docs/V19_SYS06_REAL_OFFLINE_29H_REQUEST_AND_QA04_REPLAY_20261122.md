# R29 V1.9 – Echte Offline-29h-GitHub-Aufträge und abgenommene Research-CLI-Kette

**Datum:** 22.11.2026 · Repo `127027/Sniperbot-` · Branch `codex/r29-cleanroom-paper-20261121` · ausschließlich reine Research-/Paper-**Modellsimulation**, **keine Aktivierung** der fünf GPT-Dots, **keine** externe Live-API, **keine** Kunden-/Windows-Paper-Kasse und **kein** Echtgeld.

## 1. Zwei unabhängig ausgeführte, explizite 29h-GitHub-Backtests

**Auslöser:** Je eine vom Benutzer freigegebene und als einzelne unveränderliche Request-Datei auf dem isolierten Branch eingecheckte Forschungsanforderung unter `research/offline-backtest-requests/2026-11-22/`. Der neue Job `.github/workflows/cleanroom-v19-explicit-offline-request.yml` reagiert ausschließlich auf diese Request-Pfade. Der tatsächliche Vorgang ist ein **expliziter request-on-push** – **nicht** ein ausgeführter `workflow_dispatch` des früheren manuellen Workflows. Das ist der neue manuelle, nicht periodisch geplante Auftragseingang.

- **Run A ohne historische Originaldaten:** [GitHub Actions #45061091065](https://github.com/127027/Sniperbot-/actions/runs/45061091065), Quelle `0459cee492c18b4e796cf395b5d2b2a77bc223a6`. Ergebnisdatei und exakt referenziertes SHA-256 im hochgeladenen Artefakt `r29-v19-offline-backtest-45061091065`: `DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE`, 0 akzeptierte historische Original-Snapshots, 24/24 Entscheidungsstunden Datenlücke, **0 modellierte BUY, 0 SELL, 0 Client-Fills**, Anfang/Ende 5.000 TEST-USDC.
- **Run B ausschließlich SYNTHETIC_TEST:** [GitHub Actions #45061181476](https://github.com/127027/Sniperbot-/actions/runs/45061181476), Quelle `f56da95a57b77bbe8e77b7ed0291d6222be966f7`. Explizit unter `research/backtest-inputs/2026-10-12/qa04-synthetic-three-observations.json` gespeicherte Fixture mit **vier** synthetischen Kursbeobachtungen inklusive eines Warmup-Snapshots. Ergebnis- und Auditdateien als `r29-v19-offline-backtest-45061181476` archiviert. **Ein** modellierter BUY und **ein** modellierter SELL mit **zwei** isolierten Replay-Quittungen, **0** echte Paper-Fills, **0** echte GPT-Dot-Ausführungen, **0** veröffentlichte GitHub-Orders. Der simulierte Modell-Endcash beträgt **5.012,01063839 TEST-USDC**, simuliertes realisiertes Modell-PnL **+12,01063839 TEST-USDC** inklusive Modellgebühren/-Spread/-Impact. **Das ist keine historische Rendite und keinesfalls eine reale Trading-Performance.** Die Statuszeile bleibt wegen null originaler Oktober-Snapshots richtigerweise `DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE`.

**Für beide Aufträge gilt:** Exakt **11.10.2026 19:00 UTC bis 13.10.2026 00:00 UTC**, also **5 Stunden Vorlauf + 24 Stunden Entscheidungsfenster**, identische ursprüngliche Strategie `src/unified-decision-v18.mjs`, keine zweite Trading-Engine. Der jeweilige Job führte **13/13 gezielte Sicherheits-/Backtest-Node-Tests** aus, lief mit GitHub-Actions-Status **success**, hinterlegte ein echtes herunterladbares Forschungsartefakt (30 Tage Aufbewahrung), beendete die Signal-Inbox-Prüfung mit **`OFFLINE_BACKTEST_NO_CLIENT_ORDERS 0`**. Checkout ohne Schreib-Credentials, Workflow-GitHub-Permission `contents: read`.

## 2. Zusätzlich reproduzierbarer Zwei-Szenario-Test in der regulären CI

[GitHub-Actions-CI #45060909954](https://github.com/127027/Sniperbot-/actions/runs/45060909954), Quellcommit `482e64f07e1088f29b09790165fe03ff7da148f4`, hat **579/579 Unit-/Regressionstests PASS, 0 FAIL, `TEST_ONLY_NO_SIGNAL_WRITE 0`** und danach **beide 29h-CLIs selbst gestartet**. `R29_V19_29H_OFFLINE_ACCEPTANCE` laut Job-Log: PASS mit zwei SHA-256-gesicherten Modellreports; Artefakt `r29-v19-node-tests-45060909954` enthält diese JSON-Dateien.

Die zwei Szenarien unterscheiden konsequent:
1. **Oktober ohne Originaluniversum:** 24 Stunden `DATA_GAP`, keine erfundenen Käufe.
2. **Synthetische Testquotes:** 21 Stunden `DATA_GAP`, ein modellierter BUY, ein modellierter SELL, Endcash +12,01 **synthetische** TEST-USDC.

## 3. Implementierung und Manipulationssicherheit

- `src/point-in-time-strategy.mjs`: dieselben vom bestehenden virtuellen `src/core.mjs` modellierten Buchungsquittungen als **`MODELED_FILL_NOT_CLIENT`** und `SYNTHETIC_REPLAY_ONLY` in ein separates isoliertes Forschungsledger aufnehmen; **niemals** als tatsächliche `PAPER_FILLED`-Client-Quittung ausgeben. In-memory-Order-ID, Lotquelle, Zeit und zugrunde liegendes Gebührenmodell bleiben erhalten.
- `src/v18-requested-backtest.mjs`: `isolated_model_receipts` und `isolated_model_trade_history` explizit in der bestehenden fünf-Rollen-Backtestauswertung.
- `src/v19-offline-replay-ledger-audit.mjs`: prüft pro modellem BUY/SELL Quittungssequenz, eindeutige Order-ID, Lot-Bindung, Gebühren, Kaufbetrag, modellierte Verkaufserlöse, Cashänderungen, Endcash, Zahl offener Lots und tatsächliche Anzahl der modellierten Handlungen. **Falsche Balance, fehlende Quittung, erfundene Client-Fills oder gefälschte Lotquelle führen fail-closed zum Fehler.**
- `scripts/v18-backtest-on-demand.mjs`: prüft Ledger **vor** der einzigen erlaubten Artefakterstellung unter `probe-artifacts/`, mit Schutz-Fingerprints der erreichbaren lokalen Paperdateien und der GitHub-Signal-Inbox davor/danach. GitHub-CI kann den Nutzer-Windows-PC **nicht** prüfen oder beweisen, dass dessen Dateien unverändert sind; `SYS-09` bleibt deshalb PARTIAL.
- `scripts/v19-offline-backtest-acceptance.mjs`: ruft dieselbe reale CLI zweimal im aktuellen GitHub-Runner auf und archiviert getrennte Hashes/Ergebnisse.
- `scripts/v19-explicit-offline-backtest-request.mjs`: fordert genau eine Git-Commit-Request-Datei, Branch, Testzeit, erlaubten neutralen Dateipfad, `do_not_publish_orders=true`, kein Dot/Live-API/Clientstate; lehnt den 65-Gewinner-Oraclepfad explizit ab, startet denselben CLI-Code und schreibt ein isoliertes Prüf-Receipt mit SHA.
- `.github/workflows/cleanroom-v19-explicit-offline-request.yml`: nur Request-Push auf dem Cleanroom, kein Cron, nur `contents:read`, kein Git-Push, kein HTTP-/API-Capture, kein echter Handel.
- `test/v19-qa04-offline-model-ledger-audit.test.mjs`, `test/v19-sys06-explicit-offline-request.test.mjs`: echte 29h-Timeline, 4-Snapshot-Synthesefall, No-Source/No-BUY, gefälschte Receipts und historische Datenabgrenzung.

## 4. Strenge Original-61-Abnahme nach neuer Evidenz

**`SYS-06`: von PARTIAL auf PASS**, für die *konkrete ursprüngliche Abnahme* „Ein expliziter Auftrag erzeugt isolierte Forschungsartefakte und keine Signale/Orderdateien“. Zwei unabhängige echte GitHub-Ausführungen, Original-SHA, 29h, Read-Only-Workflow, Exitstatus success, archivierte Artefakte und 0 Signal-Orders sind belegt. Der ursprüngliche workflow_dispatch-Eingang wurde **nicht** selbst ausgelöst; stattdessen ist ein gleichwertiger expliziter Request-Commit-Eingang tatsächlich in Betrieb. Andere Anforderungen zu tatsächlichen historischen Quellen sind nicht dadurch erfüllt.

**`QA-04`: bleibt PARTIAL.** Modellierter isolierter BUY/SELL samt Quittungs- und Cashkonvergenz ist reproduzierbar, **aber** kein authentisches Oktober-Marktuniversum und keine unabhängig signierten Windows-Client-Fills. Der separate reale 24/7-Live-Markt-Capture unter SYS-11 bleibt unangetastet.

**`SYS-09`: bleibt PARTIAL**, da ein GitHub-Runner nur die **auf diesem Runner zugänglichen** Dateien schützen kann und nicht die lokalen Windows-Dateien des Nutzers.

**Neuer gezählter Stand: 13 PASS (21,3 %), 30 PARTIAL (49,2 %), 18 OPEN (29,5 %); 43/61 (70,5 %) technisch bearbeitet.** Technisch bearbeitet bleibt gleich, da eine bereits teilweise umgesetzte Originalaufgabe jetzt erstmals wirklich im GitHub-Einzeljob abgenommen wurde.

## 5. Was noch NICHT bewiesen ist

- Historische Oktoberdaten sind noch unvollständig. Die 65 Gewinnerreferenzen und sechs nachträglich ausgewählten OHLCV-Tapes beweisen keine neutrale, damals tatsächlich bekannte 29h-gesamte Poolpopulation; das Daten-Gap darf nicht „repariert“ werden, indem Preise nachträglich zu Original-Quotes erklärt werden.
- Die fünf ChatGPT-Dots wurden nicht gestartet; es liegen **keine tatsächlichen GPT-Review-Ausgaben**, keine autorisierten frischen unabhängigen Quotes für risikobewusste Client-Käufe, keine Sellability-Prüfung und keine tatsächlichen Client-Receipts vor.
- Keine Änderungen am Windows-Kontostand (in CI **nicht** überprüfbar), am `main`, am Legacy-Code oder echten Wallets. Keine Anbieter-API-Aufrufe in diesem Auftrag; er wartet **nicht** auf den Gecko-429-Cooldown. Die 24/7-Provider-Retry-Arbeit ist ein **unabhängiges** Folgepaket.
