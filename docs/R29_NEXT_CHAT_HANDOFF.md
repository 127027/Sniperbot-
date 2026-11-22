# R29 – Verbindliche GitHub-Übergabe für neue Chats

> **Versionsstand:** R29 V1.9, 22. November 2026, Cleanroom-Branch. **Dieses Dokument zusammen mit `AGENTS.md` und `docs/V19_IMPLEMENTATION_PROGRESS.md` vor jedem Auftrag LIVE aus GitHub lesen.** Es ist kein Garant für automatische Synchronisierung mit ChatGPT; der neue Chat muss GitHub lesen können. Bei Widersprüchen gelten live verifizierter Code, GitHub-Commits und tatsächliche Test-/Evidenzdateien über ältere Chat-Aussagen.

## AKTUELLSTER Nachtrag – 22.11.2026: echte Datenlücken in HOT/REPAIR/FAIR eingereiht (25/61)

- **Live aus GitHub bestätigter technischer Code-Commit `d13784e51055114e951f417e4275d0d39edd83df`** und erfolgreich beendeter GitHub-Actions-Node22-Testworkflow [#45041098328](https://github.com/127027/Sniperbot-/actions/runs/45041098328): **428 Tests, 428 bestanden, 0 fehlgeschlagen; TEST_ONLY_NO_SIGNAL_WRITE 0**. Spätere Dokumentationscommits erzeugen keine neuen Provider-Captures oder GPT-Trades.
- **Warum?** Die vorher nachgewiesenen 18 überlangen Preisvergleichslücken und übrigen WATCH-Fälle waren nicht automatisch in der realen DEX-Paarprüf-Warteschlange priorisiert. Jetzt ermittelt `src/v19-evidence-repair-queue.mjs` aus *alten* gültigen Forward-Observations nach 5–120min überfällige zweite Preisprüfungen, nutzt den bestehenden `memory.rechecks`-Fairness-Cursor (nie geprüft vor mehrfach fehlerhaft) und sperrt jede Retro-/Winner-/Future-Label-Einspeisung. Alten Stale-Coins bleibt die allgemeine FAIR-Schlange.
- `src/v19-hot-fair-recheck.mjs` mischt bei unverändertem DEX-Budget **HOT aktuelle Funde / EVIDENCE_REPAIR Kurslücken / FAIR ältere bekannte Pools**. Bei nur 2 Checks: 1 HOT und 1 abwechselnd REPAIR/FAIR; bei mehr Budget können alle drei reserviert werden. Keine doppelten Pair-Abfragen und kein heimlicher Rückschritt auf nur Page 0.
- `scripts/cloud-discovery-runner.mjs` liest vor dem nächsten Pair-Auswahlzyklus nur **bereits gespeicherte** Forward-Observation-Batches, berechnet komplette as-of-Gaps mit `maxCandidates:100000`, wählt die passenden Repair-Pools und dokumentiert `metrics.v19_evidence_repair_rechecks`. Kein neuer Bot, keine zusätzliche API, keine GPT-Vollreviews/Orders.
- Testbelege: `test/v19-evidence-repair-queue.test.mjs`, `test/v19-hot-fair-recheck.test.mjs`, `test/v19-real-price-repair-handoff.test.mjs`, original gespeicherter `research/observations/2026-11-22/45036887325.json`. Hintergrund `docs/V19_D2_04_FORWARD_SIGNAL_FRESHNESS.md`.
- **Fortschrittsstand 25/61=41,0% / 36 OFFEN. D2-04 und SYS-11 weiter offen.** Echte erneute, zeitversetzte Provider-HTTP-200-Captures fehlen; der alte 5/6-Chain-429-Retry ist nicht durch grünes Unit-CI behoben. 4/8/12/24 bezeichnet GPT-Vollanalysen und ist getrennt von häufigerem Markt-/Positions-Monitoring. Alle fünf R29-Dots pausiert, `main`/Legacy/Windows-Paper-Guthaben bleiben unverändert, kein Echtgeld.

## AKTUELLSTER Nachtrag – 22.11.2026: D2-04 echte Kursaktualität nachgewiesen (25/61 unverändert)

- **Neuer technisch verifizierter Code-Commit** `c5f6ab708d79ded0e1c713cec1ef266e9b61a62b`, grüner vollständiger Node-22-CI [#45040031378](https://github.com/127027/Sniperbot-/actions/runs/45040031378), read-only Test einschließlich des **tatsächlichen Archiv-Replays**. Die jüngeren Dokumentations-Commits sind keine neuen unabhängigen API-/Paper-Fills.
- In der echten zuletzt archivierten Nov-Research-Rangliste `research/observations/2026-11-22/45036887325-asof-ranking.json` standen **284 Pools**, davon ursprünglich **3 research-rankbar**; FNG und TRUMP waren **997 Minuten** alt, CROVIA hatte über vier Stunden Abstand zur vorherigen Preisbeobachtung. Neue vorläufige `scoreAsOf`-Gates: letzter Capture **≤120 Minuten**, zwei zeitversetzte Preisbeobachtungen **5–240 Minuten auseinander**; sonst WATCH_STALE_LAST_CAPTURE / WATCH_PRICE_OBSERVATION_GAP. Im vollständigen read-only Replay nun **0** aktuelle rankbare bei **18** langen Beobachtungslücken. **Das ist ein aktueller Datenbeweis für Lücken, NICHT ein Markt-Ruhebeweis oder Misserfolg einer tatsächlich getesteten GPT-Strategie.**
- Code `src/forward-learning.mjs`, neue Tests `test/v19-real-asof-freshness-regression.test.mjs`, erweitertes `test/v19-forward-rechecks.test.mjs`, Erklärung `docs/V19_D2_04_FORWARD_SIGNAL_FRESHNESS.md`.
- **Dot2-Automation** `R29 Cleanroom Dot 2 Discovery` mit diesen Regeln synchronisiert und explizit **PAUSIERT** belassen (`is_enabled:false`). Andere vier bestehenden Dots bleiben ebenfalls pausiert. **Keine** neue erfolgreiche API-Zeitreihe, keine aktualisierten Windows-Bestände, keine Orders, kein Echtgeld.
- **Nächste Aufgabe:** Frische echte Provider-Beobachtungen **zu zwei verschiedenen Zeitpunkten** mit korrekter Chain/Pool/Contract-Identität und archiviertem Rohdaten-/Quotezeit-Beleg, fairer HOT-/FAIR-Queue und kontrollierten Quoten (besonders bei Provider-429) sammeln; erst danach erneut blind as-of ranken. Danach externe Dot3-Sicherheit, sichere Dot4-Order-/Client-Receipt-Kette. D2-04 **noch OFFEN** und SYS-11/D2-01 ebenfalls offen. **Gesamtstand weiterhin 25/61 = 41,0 %, 36 offen**.

## AKTUELLER Nachtrag – 22.11.2026: SYS-11 Provider-429-Sperre und konservatives Gecko-Pacing

- Neuster **getesteter Code-Snapshot**: `9af740d51ecc3d37738ffeb24d01f693dfc24c6b`. GitHub-Actions-Workflow [#45038974988](https://github.com/127027/Sniperbot-/actions/runs/45038974988) ist für genau diesen Commit **completed/success**; der eigentliche echte Gecko-Capture wurde **nicht** erneut ausgeführt. Dokumentations-Commits danach ändern nicht diese Testgrundlage.
- Nach dem am 22.11., 15:11:15.734 UTC tatsächlich belegten **Ethereum-HTTP-429** greift nun eine **anbieterweite** GeckoTerminal-Sperre auch über alte Trending-/OHLCV-Checkpoints und spätere Job-Starts. Geplante, nicht versuchte Seiten bleiben explizit DEFERRED und im Backlog; DEXScreener bleibt getrennt.
- **6,1 Sekunden Mindestabstand** zwischen sämtlichen GeckoTerminal-Requeststarts statt bisher 1,7 s: konservativ gemäß ungefähr 10 Aufrufen/Minute in der öffentlichen GeckoTerminal-Doku; abweichende offizielle CoinGecko-Hilfe nennt 30/Minute. Keine Garantie für Erfolg bei gemeinsam genutzter API/IP.
- Dokumentation und Technikdetails: [V19_SYS11_PROVIDER_429_GLOBAL_GUARD.md](V19_SYS11_PROVIDER_429_GLOBAL_GUARD.md), `src/v19-gecko-provider-cooldown.mjs`, `src/v19-gecko-pacing.mjs`, `scripts/cloud-discovery-runner.mjs` und die beiden zugehörigen Regressionstestdateien.
- **Aufgabenstatus bleibt 25/61 = 41,0 % / 36 offen**. **SYS-11** ist durch die technischen Sicherungen nur TEILIMPLEMENTIERT; **D2-01** ist weiter offen, weil das letzte echte gemeinsame Original-Capture nur **5/6 HTTP 200** und einen Ethereum 429 ergab. Frühester damals gespeicherter Provider-Retry: **22.11.2026, 16:11:15.734 UTC**. Vor diesem Zeitpunkt keine neue Gecko-Abfrage auslösen; nachher nur explizit genehmigte, einmalige Research-Captures mit echtem Audit.
- Ältere Aussagen weiter unten „1,7 s“ oder „kein CI“ beziehen sich auf historische Zwischenstände und sind für den neuen Code **überholt**. Alle fünf Dots **pausiert**; keine Orders, kein Echtgeld, kein `main` oder Legacy/Windows-Paper-State verändert.

## Wichtigste neue Erkenntnisse (22.11.2026, Stand 15:17 UTC)

**Bei Widersprüchen zu chronologisch älteren Absätzen weiter unten gilt diese jüngste verifizierte Schicht.**
- **25/61 = 41,0 %, 36 offen.** **QA-06 erledigt:** Echter grüner GitHub-Actions-Node-22-Run [#45037393426](https://github.com/127027/Sniperbot-/actions/runs/45037393426), Commit `e4c381f6687b2db24957c9d1d444a59ce981afe1`, **400 PASS / 0 FAIL**; Artefakt `r29-v19-node-tests-45037393426` ID **14759204311** mit Test-TAP und Commit-gepinnter JSON-Quittung, Digest `bad75b5068d646c35f0df564bda0f83a72d7c195c11198f3a29610ec19dfad67`. `TEST_ONLY_NO_SIGNAL_WRITE 0`. Code/Test-Status ist **kein** Beweis für autonome GPT-Dots oder echte Paper-Fills. Detail `docs/V19_QA06_TEST_WORKFLOW.md`.
- **D2-01 weiterhin offen:** ECHTER eigener öffentlicher Multi-Chain-Actions-Capture [#45036887325](https://github.com/127027/Sniperbot-/actions/runs/45036887325) durch EXPLIZITE EINMALIGE request-Datei `research/requests/2026-11-22/20261122T151054735Z-v19-six-chain-capture.json`. 6 Chains budgetiert/versucht, **5 HTTP200** (BSC/Robinhood/Cronos/Solana/Base) und **Ethereum Page1 HTTP429**. Alle 6 Seiten samt 429 Originalantwort in `research/feeds/2026-11-22/45036887325/evidence.json`. **99** angenommene Pools, **1** parser-rejected, 77 Dot3 WATCH/22 DATA_GAP, Dot5 101 Evidenzereignisse, 0 Paper-Orders, 0 tatsächliche GPT-Ausführungen. `research/feeds/latest.json` zeigt das neue Archiv. `research/state/page-coverage.json` hat ETH Seite1 als offenes Gap; **Retry frühestens 22.11.2026 16:11:15.734 UTC / 17:11:15.734 MEZ**. Nicht automatisch neu anfragen oder als 6/6 verkaufen.
- **SYS-11 nur teilweise:** Quelllog zeigt sechs Gecko-Anfragen innerhalb etwa 1,4 Sekunden vor dem ETH-429. Danach `src/v19-gecko-pacing.mjs` plus `scripts/cloud-discovery-runner.mjs` geändert: **1,7 s Mindestabstand zwischen Gecko-Requeststarts**, auch Trending/OHLCV, ohne HTTP-429-Cooldown zu umgehen. Fünf neue Node-Tests, **400/400 CI**. **Kein** Beweis, dass nächster Capture garantiert 6/6 schafft. Endpoint-Ratenlimit/Cache/History-Reservierung bleibt offen.
- Sicherheitsfreigabe D3-04/D3-05 und tatsächliche sichere D4-08-SELL-/Quittungskette **OFFEN**; alle fünf bestehenden Dots bleiben PAUSIERT, keine Echtgeldtransaktion und keine Änderung an main/Legacy/Windows-Paper-Konto.
- Alte frühere Handoff-Abschnitte über „kein CI-PASS“ oder „noch kein neuer Multi-Chain-Capture“ sind nur **historischer Stand vor diesen tatsächlichen erfolgreichen Läufen**; nicht als aktuellen Faktenstand verwenden. Vollständige Originalbelege: `docs/V19_IMPLEMENTATION_PROGRESS.md`, `docs/V19_D2_01_SIX_CHAIN_CAPTURE_AUDIT.md`, `docs/V19_QA06_TEST_WORKFLOW.md`.

## 0. Projekt – 30 Sekunden

| Schlüssel | Verbindliche Vorgabe |
|---|---|
| Repository | `127027/Sniperbot-` |
| EXAKTER Arbeitsbranch | `codex/r29-cleanroom-paper-20261121` |
| Verbotene Änderungen | Kein `main`, kein Legacy-Bot, keine Echtgeldtransaktionen, kein Überschreiben existierender Paper-Konten/Orders/Receipts |
| Steuerung | **Genau fünf bestehende Dots**, alle fünf Automationen **pausiert** |
| Architektur | **Ein** gemeinsamer Decision-Kern `src/unified-decision-v18.mjs`; Live-Paper und historischer Replay verwenden dieselben Entscheider, unterscheiden nur Uhr/Datenquelle |
| Kapital für isolierten Backtest | 5.000 TEST-USDC, maximal 50 TEST-USDC pro Coin (keine Änderung des echten lokalen Testguthabens) |
| Datum / Uhr | 11.10.2026, 19:00 UTC bis 12.10.2026, 00:00 UTC (Vorlauf); dann 12.10.2026, 00:00–24:00 UTC (Handelssimulation) |
| Frequenz | 4/8/12/24 tatsächliche GPT-Vollreviews pro Tag, automatisch je nach Aktivität; **API-Aufrufe/Exit-Beobachtungen unabhängig** von diesem Limit |
| Datenbelege | Vorhandene frühere Originaldaten und Retro-Rekonstruktionen strikt trennen, niemals später bekannte Gewinner als frühe Discovery verwenden |
| Aktuelle Zielgröße | **61 definierte V1.9-Maßnahmen**, `COMPLETE (targeted)` bedeutet Commit + gezielte Funktionsprüfungen, **nicht** vollständige CI- oder End-to-End-Abnahme |

## 1. Verifizierter Übergabestand

**Die verbindliche aktuelle Zählung steht in [V19_IMPLEMENTATION_PROGRESS.md](V19_IMPLEMENTATION_PROGRESS.md).** Aktueller Stand nach belegtem QA-06-CI und echtem D2-01-Sechs-Chain-Teilcapture: **25/61 = 41,0 %**, 36 offen. **QA-06 ist COMPLETE (targeted, 400/400 auf Commit e4c381f6), D2-01 weiter OFFEN (5/6 bei HTTP 429), D2-02 bereits COMPLETE (targeted)**. Bei späteren Fortsetzungen **immer zuerst** den aktuellen Stand in der Fortschrittsdatei prüfen. Diese Zählung nicht aus Gewohnheit fortschreiben: alle späteren Commits/Abnahmen prüfen.

Bisher als `COMPLETE (targeted)` dokumentiert:

- `D2-06`: echtes Originalcapture vom **22.11.2026** erneut entschlüsselt: Uniswap-V4-DEX-ID ist `uniswap-v4-ethereum`, NICHT `uniswap-v4-eth` (Gecko-API-Slug `eth` darf nicht für DEX-Domänen-ID verwendet werden). Einzeilige Korrektur in `src/live-pool-discovery.mjs`, V4-Typ-Erhaltung in `src/v19-dot3-risk-status.mjs`, `test/v19-ethereum-v4-original-capture.test.mjs`. SHA-256 des Ethereum-Originals stimmt unabhängig; **2/20→20/20 Pools, 18 V4**, alle 20 separate Contracts. Base-Kontrolle **9/20→20/20, 11 V4**. 22/22 gezielte Integrationschecks, 7 Node-Regressionen eingecheckt, volle CI noch offen. Keine rückwirkende ursprüngliche Dot2-Entdeckung; `docs/V19_ETHEREUM_V4_ORIGINAL_CAPTURE_ABNAHME.md`.

- `D5-02` neutraler Dot5-Ereignistrichter `src/v19-dot5-event-ledger.mjs` und Integration in `scripts/cloud-discovery-runner.mjs` samt `dot5_event_ledger_path` im Feeds-Latestpointer. Konserviert jede erfasste Chain/Page/Zeile/Quellpool-ID (auch Parser-Rejections und 429-Gaps), verknüpft durch `event_id` Dot2-Discovery mit der Dot3-Risikovorschau, hält Prognose/Order/Receipt/Outcome bis echte Belege vorliegen `null`. Archivierter 22.11. Ethereum-Page3-Fall: **20 Zeilen – 2 Kandidaten (Bigfoot/Mfer), 18 Uniswap-V4-Parserablehnungen**, ohne behauptete Gewinner oder echten GPT-/Paper-Trade. 13/13 gezielte Checks erfolgreich; 10 Node-Tests eingecheckt, gesamtes npm test/Actions offen. `docs/V19_DOT5_EVENT_LEDGER.md`.

- `D4-09` neue lokale read-only PAPER-UI-Fortschrittsdarstellung in `src/v19-paper-monitor.mjs`, `src/dashboard.mjs`, Policy-Übergabe aus `src/runner.mjs`: Cash, Einsatz/Coin, Kostenbasis, echte offene Positionen, Opening-BUY-ID, gemeldete HTTP-Zeit/Alter, Quittungs-Delay/-Blocker; fehlende unabhängige Preis-/Dot3-/Sellability-Daten ausdrücklich UNKNOWN, niemals Phantom-PnL. 11/11 gezielte direkte Checks bestanden, sieben Node-Tests eingecheckt, volle Node/Actions noch offen. Detail `docs/V19_PAPER_UI_MONITORING.md`.

- `D4-07` gemeinsames versioniertes Paper-Budget (`research/config/paper-budget-v19.json`, `src/v19-paper-budget-policy.mjs`) für Windows-Runner, Dot4 Live-Forschung, On-Demand-Replay; Standard **5.000/50 TEST-USDC, 30 offene Positionen**. Kein Reset des tatsächlichen Paper-Kontos bei Konfigurationsänderung. `src/core.mjs` verhindert mehrfachen Token-BUY über andere Pools und führt chronologische Trade-Historie; prospektive SELLs binden sich an `exit_position_source_order_id`. 9+8+11 isolierte/integrative Funktionskontrollen bestanden; 15 Node-Fälle eingecheckt, volle Node/Actions-Abnahme weiter offen. Details: `docs/V19_DOT4_BUDGET_AND_EXIT.md`.

- `SYS-09` isolierte Research-Wallet/Dateibeweise: `src/v19-replay-isolation.mjs`, `scripts/v18-backtest-on-demand.mjs`, `test/v19-replay-isolation.test.mjs`; echter Node-22-Funktionstest 7/7 PASS, Modul-SHA passt GitHub-Blob `9ab05f7e863aff01823770fcf596784d1e8d7aa1`. Forschungs-Quittung `research-...`, `probe-artifacts` exklusiv, kein Zugriff auf vorhandenes Windows-Konto außerhalb lokaler Ausführung; `docs/V19_REPLAY_ISOLATION.md`.

- `D3-03` gemeinsamer Quotezeit-Prüfer für drei Datenklassen und denselben Live-/Replay-Entscheidungsprozess (`src/v19-dot3-quote-time.mjs`, `src/risk-authorization-v18.mjs`, `src/v19-dot3-source-pairs.mjs`, `src/market-observer-v18.mjs`). HTTP-Erfassungszeit nicht mit Provider-Quotezeit verwechseln; fehlende Providerzeit INDICATIVE, aber keine SELL-/BUY-Autorisierung. 12/12 Zeit-/Observer-Prüfungen und 5/5 Gegenkontrollen zum Preflight. `docs/V19_DOT3_QUOTE_TIME.md`; vollständiger Node/CI-Lauf weiterhin offen.
- `D3-02` zwei-Domänen-Quellenbeobachtungen mit eigener Upstream-/Quotezeit-Diagnostik ohne falsche echte Authentizität (`src/v19-dot3-source-pairs.mjs`, `src/feed-handoff.mjs`, `src/v19-dot3-risk-status.mjs`, `src/v19-dot3-recheck-scheduler.mjs`). 21/21 gezielte isolierte Prüfungen, weitere echte Provider-/Node-CI-Abnahme offen; `docs/V19_DOT3_SOURCE_CAPABILITY.md`.

- `SYS-01` 29h as-of-Zeitplan
- `SYS-02` neutrales historisches Pool-/Contract-Register; 65 Excel-Meldungen nur Evaluations-Oracle
- `SYS-03` Zeit-/Herkunftsklassen für Original/Retro/Synthetic/Oracle
- `SYS-04` ältere Research-Historie getrennt von frischen Ausführungsquotes
- `SYS-05` budgetierte Sechs-Chain-/Multi-Page-Dot2-Erfassung (ohne Live-Capture-Beweis)
- `SYS-06` manueller 29h-Backtest-Workflow (ohne Actions-Run-Beweis)
- `SYS-07` archivierte Original-HTTP-Dateien mit SHA-256 und optionaler GitHub-Blob-ID gegenprüfen; zeitgerechte Verfügbarkeit getrennt behandeln
- `SYS-08` Herkunftsaudit in `src/v19-dot-execution-audit.mjs`, `src/v18-requested-backtest.mjs` und `test/v19-dot-execution-audit.test.mjs`: Alle fünf Rollen im Replay `SIMULATED`, keine echte GPT-Ausführung ohne unabhängig überprüfte Artefakte; selbst ein `verified:true`-Feld zählt nicht als Nachweis. 24 Takte/120 Modell-Rollenbeiträge/4 Modell-Vollreviews/0 bestätigte GPT-Ausführungen und 0 echte Paper-Fills. 8 direkte +10 integrierte gezielte Prüfungen, vollständige CI weiterhin ausstehend.
- `D1-01` vergleichbare Chain/Page-Aktivitätsmessung
- `D1-02` gezielte API-Wiederholungsaufträge bei DATA_GAP
- `D1-03` adaptive Review-Frequenz mit sofortigem 4→24 und geregeltem 24→12→8→4
- `D2-02` Offset-Paging- und Gap-Journal
- `D2-07` Hot-/Fair-Warteschlange und Servicezeiten
- `D2-08` alle neuen Pools priorisieren statt nur zwei erste crosschecken
- `D2-05` erstmals **ältere** trending Pools je Chain/1h-/24h-Fenster erkennen, as-of vorwärts testen und in denselben Hot/Fair/Dot3-Handoff geben (`src/v19-older-pool-discovery.mjs`, `test/v19-older-pool-discovery.test.mjs`; 13/13 isolierte Prüfungen, echter Anbieter-Capture noch ausstehend).
- `D2-09` nur ein Fair-Recheck-Planer: `src/market-memory.mjs::planIncrementalScan` delegiert an `src/discovery-fair-queue.mjs::fairRecheckPlan`; Dot2-Anweisungen bleiben pausiert, zielgerichtete Regression `test/v19-unified-recheck-planner.test.mjs`

**Nicht als erledigt zählen:** `D2-01` echte Sechs-Chain-Abdeckung, `D2-03` Contract-Resolver, `D2-04` wiederholte Preis-/OHLCV-Beobachtungen, `SYS-09` isolierte Wallet-Abnahme, `SYS-11` echte per-Endpoint API-Budgets und Caches, `D3-02..07` weiterhin offene Dot3-Quellen-/Freigabeaufgaben, `QA-06` echtes abgeschlossenes npm-test-/Actions-Resultat. Vollständige Liste: [V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md](V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md).

### Bisher tatsächlich überprüfte Datenlage

- Oktober-Excel: 65 historische Anbieter-Meldungen, acht Pool-URLs und 57 nicht eindeutig identifizierte Referenzen. Die Datei gehört **nicht** zum Marktuniversum des Backtests.
- Sechs post-hoc ausgewählte Kursreihen aus `research/training/2026-10-12/frozen-v11/`; nicht ausreichend für einen ehrlichen historischen Fünf-GPT-Dot-Erfolgsnachweis.
- Ohne contemporaneous Oktober-Manifest: strenger Oktober-V1.8-Replay ergab 24 DATA_GAP-Stunden, vier simulierte Reviews, 0 BUY, 0 SELL, **keine echten GPT-Orders oder Paper-Fills**.
- `signals/index.json` zuletzt mit 0 Orders geprüft. **Aktuellen Stand vor erneutem Bericht abfragen.**
- Getestete Module wurden vielfach durch isolierte JS-Funktionsprüfungen validiert; **kein bestätigter vollständiger GitHub-Actions-/Node-Testlauf**.

### Nachtrag vom 22.11.2026: Trending/ältere Pools (D2-05)

- `D2-05` ist **COMPLETE (targeted)**: `src/v19-older-pool-discovery.mjs` plant bei ausdrücklichem Capture-Auftrag optional `max_older_pool_requests=0..2` innerhalb des Gecko-Gesamtbudgets. Wiederholte `1h`/`24h`-Trending-Samples pro Chain, ein persistenter und gerechter Chain-Checkpoint, 429-Cooldown, Original-Rohantworten und Kennzeichnung des eigenen Capture-Zeitpunkts. `scripts/cloud-discovery-runner.mjs` speichert Kandidaten im **selben** Marktgedächtnis und `src/feed-handoff.mjs` reicht sie an den bestehenden Dot3-Risk-Review weiter.
- **Grenze:** Trending ist nur eine Stichprobe und belegt weder vollständige ältere Poolabdeckung noch tatsächliche Wiederbelebung, Sellability oder Erfolg. Ein angebliches `pool_created_at` nach Capture wird ausgeschlossen. **13/13 isolierte Prüfungen plus Runner-Syntax erfolgreich; kein echter Anbieter-/GitHub-Actions-Trending-Capture ausgeführt.** Keine Orders, keine Dot-Reaktivierung.
- Nächster Schwerpunkt: D2-04 abschließen durch tatsächliche wiederholte Preis-/OHLCV-Captures und saubere As-of-Artefakte; dann Dot3 positive Risk-Freigabekette und End-to-End.

### Nachtrag vom 22.11.2026: SYS-08 und offene Dot3-Nachprüfung

- **SYS-08 gezielt abgeschlossen**: Per-Rollen-Nachweis für fünf simulierte Dot-Rollen implementiert. Keines der 120 virtuellen Rollenereignisse ist automatisch eine tatsächliche GPT-Ausführung. Alle fünf weiterhin pausierten Dot-Prompts sind synchronisiert.
- **D3-07 teilimplementiert, weiterhin OFFEN**: `src/v19-dot3-recheck-scheduler.mjs` und `test/v19-dot3-recheck-scheduler.test.mjs` erzeugen aus einem bestehenden Dot2-Handoff konkrete `DATA_GAP`-Nachprüfungsaufträge. Im bestehenden `scripts/cloud-discovery-runner.mjs` wird das nur als `research/feeds/.../dot3-next-evidence-rechecks.json` archiviert. Die Warteschlange führt KEINE API-Aufrufe und KEINE Paper-Käufe aus.
- Konkrete Archivkontrolle: `research/feeds/2026-11-22/45002280249/dot2-to-dot3-handoff.json` zeigt Bigfoot und Mfer, beide Ethereum, Kursdivergenz deutlich über 100 %, extrem geringe Liquidität, unbestätigte Sellability/Security. Neuer Plan: beide `DATA_GAP` mit konkretem Quellen-Recheck, nicht nachweislich endgültig `REJECTED`, nicht `PAPER_ELIGIBLE`.
- 429-Wiedervorlage gezielt geprüft. Seit D3-01 kommt die gemeinsame Klassifikation **2 × WATCH** (statt alter pauschaler DATA_GAP-Notiz). Echte Provider-Nachprüfung, Time-to-Risk-Statistik und positive authentische Dot3-Freigabe bleiben offen.
- Historischer Zwischenstand **nach SYS-08**: 17/61 = 27,9 %, 44 offen; **nicht aktueller Zähler**. Vollständiger Node-/Actions-Testlauf weiterhin nicht nachgewiesen.
### Nachtrag vom 22.11.2026: OHLCV/Source-SHA

- `D2-04` bleibt **TEILWEISE**, nicht abgeschlossen: `src/v19-gecko-ohlcv.mjs` dekodiert echte OHLCV-Arrayform `[unix_seconds,open,high,low,close,volume]`; `src/v19-ohlcv-backfill-queue.mjs` verwaltet per Pool rückwärtige `before_timestamp`-Cursor, Cache-/Restart-Status und 429. `src/discovery-feed.mjs` akzeptiert optional `max_ohlcv_requests=0..2`, solange mindestens ein Gecko-Slot für Discovery bleibt; `scripts/cloud-discovery-runner.mjs` archiviert OHLCV mit tatsächlicher HTTP-Erfassungszeit. `test/v19-gecko-ohlcv.test.mjs` und `test/v19-ohlcv-backfill-queue.test.mjs` sind eingecheckt. Acht isolierte Integrations-/Budget-/Cursorprüfungen plus Syntaxprüfung bestanden. **Noch kein echter OHLCV-Provider-Capture/Actions-Run.**
- `SYS-07` ist **COMPLETE (targeted)**: `src/v19-source-integrity.mjs` und Dot2-Runner prüfen Raw SHA256 gegen tatsächlich gelesene Dateien, optional Git Blob SHA1. Echte `research/feeds/2026-11-22/44997708364/gecko-base-page3.raw.json`: 37.031 Bytes; Byte-SHA256 stimmt mit `evidence.json` überein, GitHub-Blob `b078886e87fe35e538403844de24f19d1601b2a5`. Ein solcher November-Capture bleibt am Oktober-As-of **nicht verfügbar**. Node-Regressionsdateien vorhanden, komplette CI-Abnahme weiterhin offen.
- GeckoTerminal-Dokumentation hat zwei widersprüchliche öffentliche Angaben: ungefähr **10/min** laut öffentlicher API-Doku, **30/min** laut CoinGecko-Hilfe. Bis zum echten Anbieterbeleg konservativ planen und bei 429 zurückstellen; `max_gecko_requests` pro Auftrag ist keine zeitbasierte Rate-Limit-Garantie.
- Dot2 und Dot3 gespeicherte Anweisungen wurden aktualisiert, ohne Aktivierung. Alle fünf Dots bleiben pausiert. **Fortschritt siehe stets live in V19_IMPLEMENTATION_PROGRESS.md.**

### Nachtrag vom 22.11.2026: D3-01 – gemeinsame positive und negative Risikostatuskette

- **D3-01 = COMPLETE (targeted), 17/61 = 27,9 %:** `src/v19-dot3-risk-status.mjs` ist **der eine Dot3-Statusentscheider** für `DISCOVERED`, `DATA_GAP`, `WATCH`, `REJECTED`, `PAPER_ELIGIBLE` in Live-Paper, Replay und Nachprüfungsqueue. Die gleiche Funktion wird in `scripts/cloud-discovery-runner.mjs`, `src/v19-dot3-recheck-scheduler.mjs` und `src/v18-requested-backtest.mjs` verwendet, keine neue Handelsstrategie.
- Der **positive synthetische Test** erreicht `PAPER_ELIGIBLE`, aber `trade_authorized:false` und `paper_filled:false`. In echten Live- und historischen Modi reicht ein selbst behauptetes Paket nicht: `DATA_GAP` bis die unabhängige Quellen-/Issuer-Verifikation von **D3-04** implementiert und nachgewiesen wurde. **D3-02/03/04/05/07 weiter offen**. Permanent `REJECTED` nur nach tatsächlich belegter schwerer Gefahr.
- Das originale archivierte Handoff vom 22.11. (`research/feeds/2026-11-22/45002280249/dot2-to-dot3-handoff.json`) ergibt Bigfoot/Mfer: **2 × WATCH**, beide hoher Preiswiderspruch und sehr niedrige Liquidität, **0 × bestätigte REJECTED**, **0 × positive reale PAPER_ELIGIBLE**.
- **Tests:** 12/12 gezielte Statuskontrollen und 10/10 Live-/historischer Replay-/Queue-Integrationskontrollen bestanden; Node-Testdateien hinzugefügt, vollständige `npm test`-/Actions-Ausführung weiterhin unbestätigt. Dot3-/Dot4-/Dot5-Prompts während Pausierung synchronisiert.
- Vollständiger Vertrag, Implementierung und Abnahme: **[`docs/V19_DOT3_RISK_STATE_MACHINE.md`](V19_DOT3_RISK_STATE_MACHINE.md)**.
- Bestehende `test/v19-dot3-recheck-scheduler.test.mjs` wurde auf `WATCH`-Einstufung aktualisiert. Nicht behaupten, echte Dot3-Provider-Sicherheitschecks seien schon ausgeführt worden.

### Nachtrag vom 22.11.2026: D3-02 – Domain ≠ unabhängiger Upstream

- **18/61 = 29,5 %**, 43 Maßnahmen offen. D3-02 ist gezielt geprüft, aber nicht extern provider-validiert.
- Dot2 übergibt `source_observations` mit HTTP-Erfassungszeit sowie `provider_quote_asof_utc:null`, sofern nicht wirklich belegt. Die gemeinsame Dot3-Statusmaschine nutzt `source_pair_audit` für Live-Paper und As-of-Replay. Nachprüfungsplan fordert noch unabhängigen Upstream, Providerzeit und Sellability nach.
- **Kein unabhängig verifizierter Upstream, keine gültige Original-Oktober-Bestätigung, keine realen Paper-Orders**. D3-03, D3-04 und D3-05 bleiben offen; `npm test`/Actions-CI ebenfalls.

### Nachtrag vom 22.11.2026: D3-03 – Time-Provenance

- **19/61 = 31,1 %, 42 offen.** Seit D3-03 klassifiziert `src/v19-dot3-quote-time.mjs` einheitlich `HTTP_CAPTURE_ONLY_INDICATIVE`, `PROVIDER_TIMESTAMP_CLAIMED_FRESH/STALE`, Zukunfts- und ungültige Zeitfälle. `src/risk-authorization-v18.mjs` nutzt dieselbe Zeitprüfung und bleibt SHADOW / `trade_authorized:false`.
- **NICHT als echte Belege darstellen:** Eigenes JSON `provider_quote_asof_utc`, selbst behauptete SHA-/Issuer-Zeichenfolgen, heutiges OHLCV als ursprüngliches Oktober-Archiv oder zwei Domains als bewiesen unabhängigen Upstream.
- Priorität anschließend: D3-04 Quellen-/Issuer-Authentifizierung, D3-05 echte Sellability-/Chain-Safety-Beobachtung und D3-07 tatsächlich erledigte Rechecks. Volle Node-/GitHub-Actions-Abnahme ausstehend.

### Nachtrag 22.11.2026: SYS-09 abgeschlossen, D3-04 und D3-05 noch offen

- **Aktueller Zähler 20/61 = 32,8 %, 41 offen.** SYS-09 ist gezielt geprüft (7/7 echte Node-22-Kontrollen und exakt übereinstimmender SHA des GitHub-Moduls). Voller `npm test`-/GitHub-Actions-Lauf weiterhin NICHT nachgewiesen.
- **D3-04 – nur TEILIMPLEMENTIERT:** `src/v19-dot3-authenticated-gate.mjs` prüft Ed25519-Bindung an Order/Pool/Blob/TTL mit **extern gepinntem** Public-Key; `src/publisher.mjs` und `src/runner.mjs` prüfen VOR jeder neuen PAPER-Order. **Beide sind absichtlich fail-closed**: selbst ein gültiger signierter Strukturbeleg kann ohne unabhängige Quell-/Sellability-/Issuer-Ausführung keine PAPER-Order autorisieren. Auch neue SELL-Orders bleiben aktuell blockiert; D4-08 muss sicheren Exit-Pfad gestalten. 7 neue Node-Tests auf GitHub, isolierte Struktur-/Mock-Verifikationen 8/8, **echte Ed25519-Integration im Node-Test noch nicht nachgewiesen**.
- **D3-05 – nur TEILIMPLEMENTIERT:** `src/v19-dot3-sellability.mjs` unterscheidet EVM-Sellroute/Tax/Owner/Blacklist und Solana-Mint/Freeze/Token-2022/DryRun; gleiche `src/v19-dot3-risk-status.mjs`-Logik Live/As-of; Warnsignale bleiben WATCH, unbekannte Chain-/Routingbeweise DATA_GAP. 9/9 isolierte Prüfungen, **keine echten RPC-/On-Chain-Sellability-Simulationen**. `docs/V19_DOT3_AUTH_SELLABILITY_PENDING.md`.
- Nächste Schritte: echten extern vertrauenswürdigen Dot3-Issuer und SHA-/Workflow-Quellpfad etablieren, sichere SELL-Ausnahme für offene Papierpositionen ohne Schutzumgehung klären, Chain-spezifische echte provider-verifizierte Sellability prüfen. D3-04 und D3-05 **nicht** zum Zähler hinzufügen bis abgenommen.

### Nachtrag 22.11.2026 – D4-07 abgeschlossen, D4-08 weiterhin offen

- **21/61 = 34,4 %, 40 offen.** D4-07 targeted complete, aber Live-Budget-UI und vollständige npm/CI noch nicht nachgewiesen.
- EIN gemeinsames Versionierungs-/Risikopolizymodul `src/v19-paper-budget-policy.mjs` und `research/config/paper-budget-v19.json`; DEFAULT 5.000/50/30, bei geändertem Einsatz werden bestehende Cash-, Positionen- und Quittungswerte NICHT resettet. GitHub-Konfigurationsänderungen gelangen nur nach Synchronisierung des lokalen Checkouts und Neustart in den Windows-Runner.
- D4-08 **teilimplementiert, nicht zählen**: `src/v19-paper-exit-convergence.mjs` bündelt STOP und DOT4_SELL einer ursprünglichen BUY-ID zur stabilen Forschungs-Exit-ID. `src/core.mjs` blockiert doppelte SELL-Gutschriften und abweichende Lot-IDs, prospektive SELLs verlangen identische Opening-BUY-ID im Publisher/Runner. 7/7 isolierte Exit-Checks bestanden, 5 Node-Tests eingecheckt. **Die Vertrauenssperre D3-04 blockiert weiterhin sowohl BUY als auch SELL**, bis echte Provider-/Sellability-/Issuer-Provenienz und sichere Exit-Abnahme vorhanden sind.
- Vollständige technische Doku: `docs/V19_DOT4_BUDGET_AND_EXIT.md`; nächste Prioritäten D3-04, D3-05, D4-08, QA-06. Keine Phantom-Fills / Echtgeld / Dot-Aktivierung.

### Nachtrag 22.11.2026 – D4-09 gezielt abgeschlossen

- **22/61 = 36,1 %, 39 offen.** Die lokale Oberfläche ist ein reiner **Kontostands-Monitor**, keine echte Marktdaten-/Sicherheitsbewertung und keine Trading-Steuerung. `src/v19-paper-monitor.mjs` liefert nur aus gespeichertem `PAPER_ONLY`-State bekannte Werte; unbekannter Marktpreis/PnL/Riskstatus bleibt ausdrücklich unbekannt.
- `src/dashboard.mjs` zeigt offene Kostenbasis, Coin/Pool, Opening-BUY-Lot, HTTP-Capture-Zeit/Alter, ausstehende lokale Quittungen und konkrete PAPER_REJECTED-Gründe wie `DOT3_AUTH_NOT_VERIFIED`. Einsatz/Positionslimit kommen über `src/runner.mjs` aus der gemeinsamen `executionPolicy`; 11/11 gezielte Modul-/UI-Kontrollen erfolgreich, sieben Node-Tests im Branch; vollständige Node-/CI-Abnahme noch nicht belegt.
- D3-04/D3-05, D4-08, QA-06 weiterhin OFFEN. Keine eigentlichen BUY-/SELL-Aufträge, keine fünf Dots aktiviert, kein Zugriff auf Nutzer-Windows-Konto, kein main. Neuer Chat liest `docs/V19_PAPER_UI_MONITORING.md` sowie `docs/V19_IMPLEMENTATION_PROGRESS.md`.

### Nachtrag 22.11.2026 – QA-06 Code-Testworkflow bereit, CI-PASS weiterhin offen

- `.github/workflows/cleanroom-v19-ci.yml` liegt im Cleanroom-Branch. Es läuft **nur** auf Branch-Push für Code/Test/Config-Änderungen (oder manuell): read-only Checkout, Node 22 Syntaxcheck, `npm test`, Prüfung auf keine neuen Signal-/Receipt-Dateien. **Keine** Dot-Automation, kein `src/runner.mjs`-Start, kein Publisher, kein Order-Auftrag, keine Secrets.
- Die GitHub-Statusabfrage für den Workflow-Commit lieferte `statuses:[]`; der Connector kann bei `fetch_commit_workflow_runs` nur PR-ausgelöste Runs auflisten (dort 0), nicht die vollständige Push-CI-Aktivität. Darum wurde **kein** erfolgreicher oder fehlgeschlagener voller Testlauf bewiesen. QA-06 und D4-08 bleiben offen. Details `docs/V19_QA06_TEST_WORKFLOW.md`.
- Stand weiterhin **22/61 = 36,1 %**, 39 offen. D4-09 mit 11/11 gezielten Modul-/UI-Checks abgeschlossen, kein lokales Windows-Konto berührt.

### Nachtrag 22.11.2026 – D5-02 und Quellseiten-Verlustnachweis

- **Fortschritt 23/61 = 37,7 %, 38 offen**. D5-02 gezielt abgeschlossen, nicht voll CI- oder Handels-abgenommen. GitHub-Dokumentation: `docs/V19_DOT5_EVENT_LEDGER.md`.
- Der Dot2-Mehrseiten-Runner hatte bisher `decoded.rejected` beim Zusammenführen von Chains/Seiten verloren; das wurde jetzt behoben. Die Original-Quellzeilen, auch abgewiesene **Uniswap-V4-IDs**, werden im Dot5-Journal als eigenständige Fehlerereignisse persistiert. HTTP 429, fehlgeschlagene und zurückgestellte Seiten bleiben als Coverage-Gaps sichtbar, ohne daraus Coins oder Trades zu erfinden.
- Aktuelle Originalarchiv-Prüfung: 22.11.2026, Ethereum-Seite 3, 20 Quellzeilen, 2 akzeptiert, 18 Parserrejections. **Dies beweist keine 18 verpassten Gewinner**, aber eine präzise Stelle des Kandidatenverlusts. D5-01/D5-04 (ganzer Markt-Nenner und Fehlchancen-Messung) sowie D3-04/D3-05, D4-08 und QA-06 weiter OFFEN.
- **13/13 isolierte Funktionsprüfungen + Runner-/Modul-/Test-Syntax erfolgreich.** Die Funktionsprüfung verwendete einen deterministischen V8-Hash-Mock; die eingecheckten Node-Regressionen benutzen Node SHA-256. **Volle Node-/GitHub-Actions-Resultate noch nicht belegt**. Dots deaktiviert, Branch only, keine Orders, keine Echtgeld-/Windows-Paper-Änderung.

### Nachtrag 22.11.2026 – D2-06 Uniswap-V4 Original-Regressionsabnahme

- **24/61 = 39,3 %, 37 offen.** D2-06 gezielt abgeschlossen. **Keine echte positive Sicherheitsfreigabe und kein neuer Echt-/Paper-Handel.**
- Ursprüngliches Problem in `src/live-pool-discovery.mjs`: Falsche DEX-ID `uniswap-v4-eth` aus dem Gecko-API-Netzwerkslug abgeleitet; die tatsächliche `relationships.dex.data.id` für Ethereum heißt `uniswap-v4-ethereum`. Die 32-Byte-`PoolId` darf nicht mit 20-Byte-Contract verwechselt werden.
- Der unveränderte originale Ethereum-Page-3-Rohbeleg `research/feeds/2026-11-22/45002280249/gecko-ethereum-page3.raw.json` (22.11.2026) wurde mit eigenständig neu berechnetem SHA-256 `3ddf82cda515d3001aeb4ed6312a926ba19e213f2f91918b211bb3ecee3788c2` und 34.888 Bytes überprüft. Der zuvor archivierte Fehlerbericht bleibt als Nachweis 2/20 akzeptiert, 18 V4-Rejects unverändert bestehen. Der jetzt gefixte Decoder rekonstruiert **20/20** mit **18 typisierten V4** und **20 separat identifizierten Token-Contracts**.
- `src/v19-dot3-risk-status.mjs` trägt jetzt `pool_kind` explizit auch im Dot3-Status. Gezielter Originaldatenpfad `decode → Marktgedächtnis → Handoff → Dot3 → Dot5 → Hot/Fair`: 22/22 isolierte Integrationschecks bestanden, 7 Node-Regressionsfälle eingecheckt. Base-Originalgegencheck `9+11=20` weiterhin bestanden. Ein unabhängiger SHA-Test war **kein** Nachweis tatsächlicher alter Dot2-GPT-Ausführung, globaler Marktabdeckung oder gesicherter DEX-Quotes.
- `D2-01/02` (alle Chains/Paging), `D3-04/05` (echte Sicherheits-/Sellability-Quelle), `D4-08` (sichere Verkäufe) und `QA-06` (erfolgreich abgeschlossene komplette Node-/Actions-Tests) sind **weiter offen**. Voller Bericht `docs/V19_ETHEREUM_V4_ORIGINAL_CAPTURE_ABNAHME.md`.

### Nachtrag 22.11.2026 – D2-01 echte sechs Original-HTTP-Captures geprüft, Fünf-Stunden-Ziel noch offen

- **Zähler weiterhin 24/61 = 39,3 %; 37 Aufgaben offen**. **D2-02 ist schon COMPLETED (targeted)** und darf nicht doppelt gezählt werden. **D2-01 bleibt in Arbeit.**
- Neue reine Source-Auditfunktion `src/v19-six-chain-capture-audit.mjs`, sechs GitBlob-Pins in `research/audits/v19-six-chain-originals-2026-11-22.json`, acht Node-Tests `test/v19-six-chain-original-coverage.test.mjs`; die sechs ursprünglichen echten Gecko-HTTP-Rohdateien vom 22.11. (BSC 03:18, Robinhood 04:14, Cronos 05:11, Solana 06:16, Base 07:19, ETH 08:19 UTC) wurden unabhängig auf ihre aufgezeichneten SHA256 und tatsächlichen Git-Blob-SHA1 überprüft: **6/6 beide Hashes stimmen**. Originaldaten **nicht** überschreiben. Cronos hat HTTP200, aber `data:[]` (0 Pools). Nicht als Coin-Erkennung ausgeben.
- Nachweis der **24h-Sample-Abdeckung 6/6**, aber im separat geprüften **5h-Fenster 5/6**; letzter ETH-Abruf kommt erst nach 301,21 Minuten. Es sind sechs **separate historische November-Abrufe**, kein bestätigter aktueller Multi-Chain-Run, keine ursprüngliche Oktober-GPT-/Dot2-Forschung.
- Zweiter tatsächlicher Fehler gefunden: `scripts/cloud-discovery-runner.mjs` schrieb `raw_bytes_utf8:text.length` statt `Buffer.byteLength(text,'utf8')`. BSC Original 35.882 UTF16-Länge / **35.996 echte UTF-8-Bytes**; Robinhood 37.055 / **37.063**. SHA256 und Git-Blob stimmen trotzdem; alte Reports bleiben unverändert, künftige Capture-Bytes korrekt.
- Letzte archivierte Dot2-Anfrage `research/requests/2026-11-22/20261122T081936481Z-dot2-dot2-v16-wake11-20261122T081936481Z.json` hat **sechs Networks, aber `max_gecko_requests:1`**. Die realen API-/Budgetlimits müssen berücksichtigt werden. `src/v19-discovery-budget-plan.mjs` markiert ab jetzt fehlende Chains wegen Budget oder 429 als expliziten DATA_GAP; `scripts/cloud-discovery-runner.mjs` meldet unter `metrics.v19_actual_chain_capture` **tatsächlich empfangene**, nicht nur eingeplante Chains. Bei sechs Chains sind mindestens sechs Seitenanfragen pro *einem* Baseline-Run nötig, sofern das freie API-Ratenlimit und die übrigen OHLCV-/Older-Reservierungen es erlauben.
- **12/12 Audit-Integrationschecks** (isoliert mit Testverifier, sechs reale Hashduplikate separat nachgerechnet) und **12/12 isolierte Scheduler-Checks** bestanden, zusätzliche **8+3 Node-Regressionen** eingecheckt. Ein kompletter `npm test`- oder GitHub-Actions-PASS wurde nicht beobachtet; QA-06 bleibt offen. Volle technische Notizen: `docs/V19_D2_01_SIX_CHAIN_CAPTURE_AUDIT.md`.
- **Nächster Schritt für D2-01:** echten neuen Multi-Chain-Capture mit ausreichendem per-run Budget und tatsächlichen Rohantworten für alle sechs Chains auf separatem Cleanroom-Branch durchführen, Retry/429-Abdeckung und die kontinuierliche 5h-Abdeckung mit echten Originalbelegen abnehmen; beim Oktober-Backtest nicht mit November-Daten rückdatieren. Bis dahin nicht als abgeschlossen zählen.

## 2. Arbeitsreihenfolge – aktuelle nächsten Schritte

1. **Sofort regressionssichere Laufzeitfehler beheben:** Beim V1.9 Multi-Chain-Runner war `oldCheckpoint` nach Umbau nicht mehr definiert. Mit zusätzlichem per-Chain-Checkpoint-Metrikfeld in `scripts/cloud-discovery-runner.mjs` korrigiert; Runner-Integrationstest und echtes Actions-Run noch offen.
2. **P0 Dot2 – `D2-04`:** **Teilimplementiert, offen.** `src/forward-learning.mjs` kann inzwischen zeitgerechte DEX-Preis-Nachprüfung und bis vier Stunden alte Gecko-Volumenbeobachtung desselben Pool-Keys für reine Research-Priorisierung kombinieren, ohne sie als neue unabhängige Quote oder Paper-Freigabe auszugeben. `test/v19-forward-rechecks.test.mjs` mit 12 isolierten Prüfpunkten, alter Ranking-Basistest weiterhin logisch korrekt. **Nicht abgeschlossen**: echtes mehrfaches Rohcapture/zeitgerechter OHLCV-Backfill mit Quellenbelegen und End-to-End-Nachweis. Der volle Rest:  Zwei zeitlich getrennte **echte** Quellen-/Marktbeobachtungen je Pool plus OHLCV-Historie korrekt erfassen, durch Raw-Archive und as-of verfügbar; aktuelle `src/forward-learning.mjs` verlangt unabhängige Capture-Zeitpunkte, doch öffentliche Captures fehlen. Keine nachträglichen OHLCV-Daten als Original-Oktober-Capture ausgeben.
3. **P0 Dot2 – `D2-01` und `D2-05`:** echte sechs Chains und ältere reaktivierte Pools abdecken (mehr als `new_pools`-Endpoint); reale Providerfehler/Rate-Limits auditieren. Nicht als abgeschlossen deklarieren ohne tatsächlichen belegten Capture.
4. **P0 Dot3 – `D3-02..05` und `D3-07`:** D3-01 hat die gemeinsame Statuslogik und synthetischen Positivpfad geprüft; für eine echte `PAPER_ELIGIBLE`-Freigabe fehlen weiterhin unabhängige Anbieterzeiten, authentische GitHub-/Issuer-Belege und tatsächliche Sellability-/Security-Prüfungen. `src/risk-authorization-v18.mjs` ist noch nicht kaufautorisierend.
5. **P0 Dot4 – `D4-01,D4-04,D4-08`:** gemeinsame Entscheider/Belege an vorhandenen Paper-Client anbinden; eigenständige Exit-Preisbeobachtung und einmalige Receipts – weiterhin shadow bis E2E-Abnahme.
6. **QA-06:** vollständiges `npm test` und ggf. Actions-Job-Protokolle wirklich ausführen/prüfen. Aus GitHub-Workflow-Definition allein keinen Erfolg behaupten.

Der Nutzer möchte nach **jedem** abgeschlossenen Arbeitspaket sofort eine verständliche Meldung mit `x/61` und Prozentstand. Dokumentation ohne konkrete Maßnahmen-ID **nicht** als neue Abnahme zählen.

## 3. Dateien und Datenfluss

```text
GeckoTerminal / DEX Screener / weitere dokumentierte Anbieter
   → scripts/cloud-discovery-runner.mjs
   → src/v19-discovery-budget-plan.mjs + src/v19-page-coverage.mjs
   → src/market-memory.mjs + src/forward-learning.mjs
   → src/v19-market-activity.mjs + src/v19-adaptive-cadence.mjs [Dot 1]
   → src/v19-hot-fair-recheck.mjs + Dot2-Priorisierung [Dot 2]
   → src/risk-recheck-queue.mjs / src/risk-authorization-v18.mjs [Dot 3]
   → src/unified-decision-v18.mjs [Dot 4]
   → vorhandener Windows-Paper-Client, nach Freigabe / ausschließlich virtuelle Order
   → Dot 5 Audits, Label-/Forecast-/Receipt-Journale
Historischer Modus verwendet die selben Entscheidungen:
   → src/v19-backtest-window.mjs / src/v18-requested-backtest.mjs
   → src/point-in-time-strategy.mjs
   → dieselbe src/unified-decision-v18.mjs
```

Relevante Daten liegen in `research/feeds/`, `research/observations/`, `research/state/`, `research/forecasts/`. Verifizierte Belege tragen Originalquelle und Erfassungszeit. Unbekannt bleibt unbekannt.

## 4. Synchronisierung mit ChatGPT-Dots

Die GitHub-Dateien und gespeicherten Dot-Automationsprompts sind **getrennte Speicherorte**. Wenn der Code oder der Vertrag einer Dot-Rolle geändert wird, muss **dieselbe Änderung auch in den Anweisungen des betroffenen pausierten Dots** dokumentiert werden. `is_enabled:false` beim Aktualisieren belassen. Vorher und nachher den Status abfragen, niemals einen Dot automatisch reaktivieren.

## 5. Weiterer Prüfschritt ohne neue Entwicklungs-Aufgabe

- `scripts/cloud-discovery-runner.mjs` enthielt nach Multi-Chain-Umbau einen Laufzeitfehler `oldCheckpoint` (nicht mehr definiert). Er wurde durch per-Chain-Checkpoint-Metriken ersetzt. Prüfe in einem echten Node-/Actions-Lauf, dass der Capture-Runner tatsächlich beendet und archiviert.
- `test/v19-cleanroom-handoff-and-runner.test.mjs` validiert Node-`--check` und Dokumentationslinks. **Noch nicht** als vollständig ausgeführter CI-Test ausgegeben.
- Alle Dot2-Vertragsänderungen in den weiterhin deaktivierten gespeicherten Dot2-Anweisungen synchronisiert.
- Historischer Zwischenstand **bei D2-04-Teilprüfung**: 16/61 = 26,2 %; **nicht aktueller Zähler**. D2-04 ist weiterhin offen.

## 6. Sicherer Prompt für jeden neuen Chat

> **R29 FORTSETZEN**: Lies über den verbundenen GitHub-Zugang im Repository `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`, zuerst `AGENTS.md`, `docs/R29_NEXT_CHAT_HANDOFF.md`, `docs/V19_IMPLEMENTATION_PROGRESS.md` und `docs/V19_BAUSTELLEN_5DOTS_29H_BACKTEST_AUDIT.md`. Prüfe den tatsächlichen Branch-Stand und korrigiere gegebenenfalls die Fortschrittszählung. Arbeite danach die nächste offene P0-Maßnahmen-ID ab, implementiere sie ausschließlich im Cleanroom-Branch, prüfe gezielt und protokolliere die Änderung. Berichte nach jeder Aufgabe `x/61` und Prozent. Synchronisiere bei Rollenänderungen die gespeicherten **pausierten** Dot-Anweisungen. Keine Dot-Reaktivierung, kein `main`, kein alter Bot, kein Echtgeld und kein Überschreiben des vorhandenen Paper-Guthabens. Halte Live-Paper und Backtest als **ein einziges Entscheidungssystem** ohne Zukunftswissen.
