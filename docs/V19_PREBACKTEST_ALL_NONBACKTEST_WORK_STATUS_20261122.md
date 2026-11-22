# R29 – Technische Vorbereitung OHNE Backtest, echte Dots und zusätzliche Risikoforschung
**Datum:** 22.11.2026 ab 21:00 MEZ | **Branch:** `codex/r29-cleanroom-paper-20261121` | **Keine Änderungen an main/Legacy, Windows-Konto, Signal-Inbox oder Echtgeld.**

## 1. Klare Abnahme, keine Prozentkosmetik
Die originalen **61 Aufgaben** haben unverändert **13 PASS (21,31 % streng vollständig), 46 PARTIAL und 2 OPEN**. Die bekannte Zahl **59/61=96,72 %** bezeichnet *irgendwie technisch bearbeitet*, nicht tatsächlich abgenommen. In `docs/V19_46_PARTIAL_ACCEPTANCE_AND_NEXT_BACKTEST_PLAN_20261122.md` sind alle 46 ursprünglich teilweise abgenommenen Aufgaben mit ihrem konkreten Original-Soll und fehlenden Evidenznachweis einzeln aufgeführt. Es wurde **kein** PARTIAL ohne Original-Endabnahme zu PASS erklärt.

Die weiterhin OPEN gebliebenen Risikoaufgaben:
- `D3-04`: Noch kein unabhängig vertrauenswürdig verankertes Issuer-/Git-Original-/Risiko-Authorisierungspaket über unabhängige Quellen.
- `D3-05`: Noch keine echten unabhängigen, zeitgerechten on-chain Sellability/Honeypot/Tax/Blacklist/Route-Gates für alle sechs Chains; Drittanbieteranalysen sind bestenfalls indikative Forschung.

Auch PASS+PARTIAL bedeutet **0 belegte reale BUY/SELL oder authentische Windows-Client-Paper-Fills**.

## 2. Verifizierte neue API-Wiederaufnahme und Persistenz
- [Run #45064131641](https://github.com/127027/Sniperbot-/actions/runs/45064131641): Base Seite 2 nach altem providerweiten HTTP429-Cooldown mit echtem HTTP200 wiederhergestellt; 19 neue Pools, 2 DEX-Abfragen, Memory 488→507, echte Dot2 Erstentdeckungen 79→98.
- [Run #45064898786](https://github.com/127027/Sniperbot-/actions/runs/45064898786): Ethereum Seite 4 und BSC Seite 1, 39 neue Pools, 2 DEX-Abfragen, Memory 507→546, echte Dot2 Erstentdeckungen 98→137.
- [Run #45065920534](https://github.com/127027/Sniperbot-/actions/runs/45065920534): Robinhood Seite 3, Solana-Trending, ein BSC-OHLCV Backfill mit **29 historischen Kerzen** und DEX-Rechecks: **alle 5 HTTP200 und Raw-SHA persistiert**, Memory 546→586, echte Dot2-Ersterfassungen 137→177. **Dieser GitHub-Workflow selbst war FAILED** wegen falscher Klassifizierung von Trending als unplantes `new_pools`-Paging; **nicht** wegen echter providerseitiger HTTP-Fehler. Codedifferenz/Regressionsbeleg: `src/v19-capture-completion-gate.mjs`, `test/v19-qa03-multiendpoint-capture-gate.test.mjs`. Alte Fehlermeldung und Originalbytes nicht überschrieben.
- [Run #45066246697](https://github.com/127027/Sniperbot-/actions/runs/45066246697): Bestätigender **SUCCESSFUL** echter Mixed-Endpoint-Nachfolgelauf: Cronos Seite 3 HTTP200 + Base Trending HTTP200; Memory 586→**606** Pools, Dot2-Ersterfassungen 177→**197**, keine neue providerweite 429 und keine Order. Qualitätsgate `BOUNDED_SAMPLE_COMPLETE_COVERAGE_INCOMPLETE`, nicht „gesamter Markt erfasst“.
- Original-HTTP-Rohkörper, Content-SHA256, erste tatsächliche Beobachtung, unveränderliche Chain/Contract/Pool-IDs, Providerbudget und ausstehende Seiten sind im jeweiligen `research/feeds/2026-11-22/<run_id>/` + `research/state/` archiviert. Kein retrospektives Oktober-Quellvorwissen. Die aktuellen 606 Pools sind die bisher **gespeicherte Quellenpopulation**, nicht globale Meme-Coin-Marktdeckung.

## 3. Zusätzlicher D3-05-Sicherheitsanbieter – begrenzt und ehrlich
Laut offizieller API-Dokumentation `https://docs.honeypot.is/ishoneypot` und `https://docs.honeypot.is/chains` wird **Honeypot.is** zu Forschungszwecken für ETH/BSC/Base V2/V3 angeboten; V4, Robinhood, Cronos oder Solana werden durch diesen Anbieter NICHT abgedeckt. Keine API-Keys laut dokumentiertem Stand, kein Kauf-/Wallet-Aufruf. Implementiert:
- `src/v19-honeypot-risk-research.mjs`: exakte typed Token/Pool/Chain/Pair/Typ-Prüfung, Zeittor, Original-Raw-SHA; simulierte Third-Party-Resultate bleiben `WATCH`, `DATA_GAP` oder höchstens `INDICATIVE_ONLY`, **niemals `PAPER_ELIGIBLE`**. HTTP-Daten sind keine authentifizierten Provider-Quote-As-of-Zeitpunkte, Cached Status ist nicht onchain ausführbare Sellability.
- `scripts/cloud-honeypot-risk-research.mjs`: exakter GitHub-Branch- und Einzelrequestbezug, 1 kostenloser öffentlicher Provider-GET mit **10 Minuten persistiertem Cooldown**, explizitem 429-/Retry-After-Archiv; 0 BUY/SELL.
- `.github/workflows/cleanroom-dot3-honeypot-research.yml`: triggered NUR auf neue `research/risk-requests/**`, immer branch-isoliert, raw/sha selbst bei Providerfehler committet; final Job-Fehler bei HTTP Fehler bleibt sichtbar.
- [Original Live-Run #45066522539](https://github.com/127027/Sniperbot-/actions/runs/45066522539): exakte BSC Pool-/Contract-Abfrage erhielt **HTTP404**, bytegerecht mit SHA256 archiviert, der Workflow endet ehrlicherweise `failure`. Resultat **`DATA_GAP`**, weder `HONEYPOT` noch `SELLABLE` bewiesen. `research/feeds/2026-11-22/45066522539/honeypot-research-evidence.json` + zugehörige Raw-Datei. Kein Handel. Regressionsbeleg `test/v19-d305-real-thirdparty-404.test.mjs`.

## 4. Die fünf ChatGPT-Dots
**Alle fünf existierenden, jeweils stündlichen Dot-Automationen sind auf ausdrückliche aktuelle Nutzerfreigabe nun wieder aktiviert**, die früheren widersprüchlichen Anweisungen `AUTOMATION DEAKTIVIERT LASSEN` und `WEITER PAUSIERT` wurden aus den fünf aktuellen Auftrags-Prompts vollständig entfernt. `Dot3` führte nach erster Freigabe am **22.11.20:24 UTC** einen echten, von der ChatGPT-Automation erstellten Quell-/Risk-Forschungsreview durch, **hatte sich jedoch wegen einer alten Anweisung selbst deaktiviert**. Ursache im Prompt nachträglich korrigiert; alle fünf erneut `is_enabled=true` bestätigt. Der eine reale Dot3-Lauf berichtete 40 Pool-Kandidaten, davon 13 WATCH / 27 DATA_GAP, 0 PAPER_ELIGIBLE und 0 Orders. **Dieser Review liegt in der ChatGPT-Automation, nicht als authentifiziertes Dot3-Full-Review-Journal auf GitHub**, und darf nicht als fertige GitHub-E2E-Order-Route gezählt werden.

Die fünf Promptaufträge erlauben nur `PAPER_RESEARCH_ONLY`, quellennachvollziehbare Risiko-/Kandidaten-/Modellentscheidungsjournale; bis D3-04/D3-05 und unabhängiger lokaler Paper-Receipt autorisiert sind, keine realen oder Paper-BUY/SELL-Signale. Dot5 hat eine laufende **Abschluss-Überwachung**: Benutzer nur bei tatsächlich vollständiger Abnahme aller Nicht-Backtest-Kriterien benachrichtigen; sonst ehrliche Blocker. Das ersetzt **keine** echten Client-/externen Providerbelege.

## 5. Ausdrücklicher Ausschluss des Backtests und CI-Regressionen
Auf ausdrücklichen Nutzerwunsch wurde in den beiden automatischen CI-Workflows
- `.github/workflows/cleanroom-v19-ci.yml`: die automatische separate 29h-CLI **entfernt**;
- `.github/workflows/cleanroom-tests.yml`: ALLE sieben historischen Training-/Replay-Schritte hinter optionales `workflow_dispatch.inputs.run_training_replays == true` (Default: false) gestellt. Echt live öffentliche Provider-Probes ebenfalls separat opt-in. Unit-/Regressionstests und reine Quellarchive laufen wie bisher.

Ein eigenes Regressionstestmodul `test/v19-no-backtest-auto-run-guard.test.mjs` prüft die Trennung. Die bestehenden expliziten und manuellen Backtest-Workflows bleiben vorhanden, wurden in diesem Auftrag aber **nicht ausgelöst**. Eine normale Unit-Test-Prüfung ist **kein** vom Nutzer ausgelöster Oktober-Gesamtbacktest.

**[Verifizierter source-only GitHub Node22 Run #45066644819](https://github.com/127027/Sniperbot-/actions/runs/45066644819): 626/626 PASS, 0 FAIL, 0 Signalwrites, inkl. aller 46 Original-PARTIAL-Abnahmen und des echten Honeypot-404-Original-SHA.**

## 6. Was vor der Original-Endabnahme zwingend noch fehlt
Ein echtes neutrales und damals zeitgerecht verfügbares Oktober-29h-Quellenuniversum ist nicht durch heute beschaffte Daten rekonstruierbar; der Oktober-Backtest bleibt ausdrücklich unangetastet. Beim prospektiv fest eingefrorenen Holdout sind die **24.11./25.11.2026-Fenster noch nicht abgeschlossen**; unabhängige negative/positive Labels und identische Poolpreis-Zeitreihen sind noch ausstehend. Vollständig echte fünf GPT-Reviews und signierte GitHub-Journale, E2E-GitHub→Windows-Paper-Client-Signale/Receipts, unabhängige Quote-As-of- und Chain-Sellability-Provenienz fehlen. Das sind **externe oder zeitgebundene Voraussetzungen**; sie lassen sich ohne Wahrheitsverlust nicht einfach als `PASS` deklarieren.

Daher gibt es **noch keine ehrliche „alles erledigt“-Abnahme**, obwohl die technische Vorbereitung und aktuelle Research-Erfassung weiterlaufen. Sobald die konkreten echten Nachweise vorliegen, zuerst vollständige Originalabnahme durchführen, **danach** nur auf getrennte ausdrückliche Nutzerfreigabe den Backtest starten.
